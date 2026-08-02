using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropertKt.Api.Auth;
using PropertKt.Api.Data;
using PropertKt.Api.Models;
using PropertKt.Api.Services;

namespace PropertKt.Api.Controllers;

[Route("api/tickets")]
//[Authorize]
public sealed class TicketsController(
    TicketRepository tickets,
    ContractorRepository contractors,
    IMessagingService messaging,
    IConfiguration config) : ApiControllerBase
{
    private string AppUrl => config["App:Url"] ?? "http://localhost:3000";

    // GET /api/tickets — shape depends on the caller's role.
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var role = User.GetRole();

        if (role == Roles.Admin)
        {
            var rows = await tickets.GetAllForAdminAsync(ct);
            return Ok(new { tickets = rows.Select(AdminTicket) });
        }

        if (role == Roles.Contractor)
        {
            var cid = User.GetUid();
            if (cid is null) return Unauthorized();
            var available = await tickets.GetAvailableForContractorAsync(cid.Value, ct);
            var mine = await tickets.GetMyJobsForContractorAsync(cid.Value, ct);
            return Ok(new { available = available.Select(ContractorTicket), mine = mine.Select(ContractorTicket) });
        }

        // tenant
        var tid = User.GetUid();
        if (tid is null) return Unauthorized();
        var list = await tickets.GetForTenantAsync(tid.Value, ct);
        return Ok(new { tickets = list.Select(TenantTicket) });
    }

    // POST /api/tickets — tenant creates a ticket.
    [HttpPost]
    [Authorize(Roles = Roles.Tenant)]
    public async Task<IActionResult> Create([FromBody] TicketCreateRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(new { error = "Invalid input" });
        var tid = User.GetUid();
        if (tid is null) return Unauthorized();

        var id = await tickets.CreateAsync(tid.Value, req, ct);

        await messaging.SendEmailAsync(
            config["Admin:Email"] ?? "admin@localhost",
            $"[{req.Urgency.ToUpperInvariant()}] New ticket: {req.Title}",
            $"Category: {req.Category}\nUrgency: {req.Urgency}\n\n{req.Description}");

        return Ok(new { ticket = new { id } });
    }

    // PATCH /api/tickets/{id} — admin updates status / notes and emails tenant.
    [HttpPatch("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateAdmin(Guid id, [FromBody] TicketUpdateRequest req, CancellationToken ct)
    {
        var affected = await tickets.UpdateAdminAsync(id, req.Status, req.AdminNotes, setAdminNotes: true, ct);
        if (affected == 0) return NotFound(new { error = "Ticket not found." });

        if (!string.IsNullOrEmpty(req.Status))
        {
            var t = await tickets.GetByIdAsync(id, ct);
            if (t?.TenantEmail is not null)
            {
                var note = string.IsNullOrWhiteSpace(t.AdminNotes) ? "" : $"Note from landlord:\n{t.AdminNotes}\n\n";
                await messaging.SendEmailAsync(t.TenantEmail,
                    $"Update on your ticket: {t.Title}",
                    $"Your ticket status is now: {req.Status.Replace('_', ' ')}.\n\n{note}— Sent via ProperTkt");
            }
        }
        return Ok(new { ticket = new { id } });
    }

    // POST /api/tickets/{id}/assign — admin: direct-assign or broadcast-offer.
    [HttpPost("{id:guid}/assign")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Assign(Guid id, [FromBody] TicketAssignRequest? req, CancellationToken ct)
    {
        var ticket = await tickets.GetByIdAsync(id, ct);
        if (ticket is null) return NotFound(new { error = "Ticket not found." });
        if (ticket.ContractorId is not null)
            return Conflict(new { error = "A contractor is already assigned to this job." });

        // ---- Direct assignment ----
        if (req?.ContractorId is Guid chosenId)
        {
            var chosen = await contractors.GetByIdAsync(chosenId, ct);
            if (chosen is null || !chosen.Active)
                return UnprocessableEntity(new { error = "That contractor isn't available." });

            var claimed = await tickets.ClaimAsync(id, chosenId, ct);
            if (!claimed) return Conflict(new { error = "A contractor is already assigned to this job." });

            var full = await tickets.GetByIdAsync(id, ct);
            var cName = string.IsNullOrEmpty(chosen.Company) ? chosen.Name : $"{chosen.Name} ({chosen.Company})";

            var cBody = $"You've been assigned a job: {ticket.Title} ({ticket.Category}, {ticket.Urgency}).\n" +
                        $"Unit {ticket.TenantUnit}.\n\n{ticket.Description}\n\nSign in to share your arrival time:\n{AppUrl}/contractor";
            await messaging.SendEmailAsync(chosen.Email, $"You've been assigned: {ticket.Title}", cBody);
            if (!string.IsNullOrEmpty(chosen.Phone)) await messaging.SendWhatsAppAsync(chosen.Phone, cBody);

            if (full?.TenantEmail is not null)
            {
                var tBody = $"Good news — a contractor has been assigned to your request \"{ticket.Title}\".\n\n" +
                            $"Assigned to: {cName}\nThey'll share an estimated arrival time shortly.\n\n— Sent via ProperTkt";
                await messaging.SendEmailAsync(full.TenantEmail, $"Contractor assigned: {ticket.Title}", tBody);
                if (!string.IsNullOrEmpty(full.TenantPhone)) await messaging.SendWhatsAppAsync(full.TenantPhone, tBody);
            }

            return Ok(new { ok = true, assigned = chosenId });
        }

        // ---- Broadcast to matching contractors ----
        var active = await contractors.GetActiveAsync(ct);
        var matching = active.Where(c => c.Trades.Contains(ticket.Category)).ToList();
        var recipients = matching.Count > 0 ? matching : active;
        if (recipients.Count == 0)
            return UnprocessableEntity(new { error = "No contractors are signed up yet." });

        foreach (var c in recipients)
            await tickets.AddOfferAsync(id, c.Id, ct);

        foreach (var c in recipients)
        {
            var body = $"New job available: {ticket.Title} ({ticket.Category}, {ticket.Urgency}).\n" +
                       $"Unit {ticket.TenantUnit}.\n\n{ticket.Description}\n\nSign in to accept it:\n{AppUrl}/contractor";
            await messaging.SendEmailAsync(c.Email, $"New job available: {ticket.Title}", body);
            if (!string.IsNullOrEmpty(c.Phone)) await messaging.SendWhatsAppAsync(c.Phone, body);
        }

        return Ok(new { ok = true, offered = recipients.Count });
    }

    // POST /api/tickets/{id}/accept — contractor picks up a job (one winner).
    [HttpPost("{id:guid}/accept")]
    [Authorize(Roles = Roles.Contractor)]
    public async Task<IActionResult> Accept(Guid id, CancellationToken ct)
    {
        var cid = User.GetUid();
        if (cid is null) return Unauthorized();

        var contractor = await contractors.GetByIdAsync(cid.Value, ct);
        if (contractor is null || !contractor.Active)
            return StatusCode(403, new { error = "Account not available." });

        if (!await tickets.OfferExistsAsync(id, cid.Value, ct))
            return StatusCode(403, new { error = "This job isn't available to you." });

        var claimed = await tickets.ClaimAsync(id, cid.Value, ct);
        if (!claimed) return Conflict(new { error = "Sorry, another contractor already picked up this job." });

        var full = await tickets.GetByIdAsync(id, ct);
        if (full?.TenantEmail is not null)
        {
            var name = string.IsNullOrEmpty(contractor.Company) ? contractor.Name : $"{contractor.Name} ({contractor.Company})";
            var body = $"Good news — a contractor has been assigned to your request \"{full.Title}\".\n\n" +
                       $"Assigned to: {name}\nThey'll share an estimated arrival time shortly.\n\n— Sent via ProperTkt";
            await messaging.SendEmailAsync(full.TenantEmail, $"Contractor assigned: {full.Title}", body);
            if (!string.IsNullOrEmpty(full.TenantPhone)) await messaging.SendWhatsAppAsync(full.TenantPhone, body);
        }

        return Ok(new { ok = true });
    }

    // PATCH /api/tickets/{id}/progress — contractor updates ETA/status/notes.
    [HttpPatch("{id:guid}/progress")]
    [Authorize(Roles = Roles.Contractor)]
    public async Task<IActionResult> Progress(Guid id, [FromBody] TicketProgressRequest req, CancellationToken ct)
    {
        var cid = User.GetUid();
        if (cid is null) return Unauthorized();

        var affected = await tickets.UpdateProgressAsync(id, cid.Value, req, ct);
        if (affected == 0) return StatusCode(403, new { error = "This isn't your job." });

        var t = await tickets.GetByIdAsync(id, ct);
        if (t?.TenantEmail is not null)
        {
            var parts = new List<string> { $"Update on your request \"{t.Title}\":", $"Status: {AssignmentLabel(t.AssignmentStatus)}" };
            if (t.EtaAt is not null) parts.Add($"Estimated arrival: {t.EtaAt:g}");
            var dur = FormatDuration(t.EstimatedDurationMins);
            if (dur is not null) parts.Add($"Estimated time on site: {dur}");
            if (!string.IsNullOrWhiteSpace(t.ContractorNotes)) parts.Add($"Note: {t.ContractorNotes}");
            parts.Add("\n— Sent via ProperTkt");
            var body = string.Join('\n', parts);

            await messaging.SendEmailAsync(t.TenantEmail, $"Update on your request: {t.Title}", body);
            if (!string.IsNullOrEmpty(t.TenantPhone)) await messaging.SendWhatsAppAsync(t.TenantPhone, body);
        }

        return Ok(new { ok = true });
    }

    // ----- response shaping (matches the existing frontend JSON) -----

    private static object AdminTicket(TicketRow t) => new
    {
        id = t.Id,
        title = t.Title,
        description = t.Description,
        category = t.Category,
        urgency = t.Urgency,
        status = t.Status,
        adminNotes = t.AdminNotes,
        createdAt = Iso(t.CreatedAt),
        tenant = new { name = t.TenantName, unit = t.TenantUnit, email = t.TenantEmail },
        assignmentStatus = t.AssignmentStatus,
        contractorId = t.ContractorId,
        contractor = t.ContractorName is null ? null : new { name = t.ContractorName, company = t.ContractorCompany, phone = t.ContractorPhone },
        etaAt = IsoOrNull(t.EtaAt),
        estimatedDurationMins = t.EstimatedDurationMins,
        contractorNotes = t.ContractorNotes,
    };

    private static object TenantTicket(TicketRow t) => new
    {
        id = t.Id,
        title = t.Title,
        description = t.Description,
        category = t.Category,
        urgency = t.Urgency,
        status = t.Status,
        adminNotes = t.AdminNotes,
        createdAt = Iso(t.CreatedAt),
        assignmentStatus = t.AssignmentStatus,
        etaAt = IsoOrNull(t.EtaAt),
        estimatedDurationMins = t.EstimatedDurationMins,
        contractorNotes = t.ContractorNotes,
        contractor = t.ContractorName is null ? null : new { name = t.ContractorName, company = t.ContractorCompany },
    };

    private static object ContractorTicket(TicketRow t) => new
    {
        id = t.Id,
        title = t.Title,
        description = t.Description,
        category = t.Category,
        urgency = t.Urgency,
        status = t.Status,
        assignmentStatus = t.AssignmentStatus,
        etaAt = IsoOrNull(t.EtaAt),
        estimatedDurationMins = t.EstimatedDurationMins,
        contractorNotes = t.ContractorNotes,
        createdAt = Iso(t.CreatedAt),
        tenant = new { name = t.TenantName, unit = t.TenantUnit, phone = t.TenantPhone },
    };

    private static string Iso(DateTime dt) => DateTime.SpecifyKind(dt, DateTimeKind.Utc).ToString("o");
    private static string? IsoOrNull(DateTime? dt) => dt is null ? null : Iso(dt.Value);

    private static string AssignmentLabel(string s) => s switch
    {
        "unassigned" => "Not yet assigned",
        "offered" => "Finding a contractor",
        "accepted" => "Contractor assigned",
        "en_route" => "Contractor on the way",
        "on_site" => "Work in progress",
        "completed" => "Work completed",
        _ => s,
    };

    private static string? FormatDuration(int? mins)
    {
        if (mins is null or <= 0) return null;
        int h = mins.Value / 60, m = mins.Value % 60;
        if (h > 0 && m > 0) return $"{h}h {m}m";
        return h > 0 ? $"{h}h" : $"{m}m";
    }
}
