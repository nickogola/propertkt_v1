using System.Data;
using Microsoft.Data.SqlClient;
using PropertKt.Api.Models;

namespace PropertKt.Api.Data;

public sealed class TicketRepository(SqlConnectionFactory factory)
{
    private readonly SqlConnectionFactory _factory = factory;

    public async Task<List<TicketRow>> GetAllForAdminAsync(CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Ticket_GetAllForAdmin", conn) { CommandType = CommandType.StoredProcedure };
        return await ReadListAsync(cmd, ct);
    }

    public async Task<List<TicketRow>> GetForTenantAsync(Guid tenantId, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Ticket_GetForTenant", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@TenantId", tenantId);
        return await ReadListAsync(cmd, ct);
    }

    public async Task<List<TicketRow>> GetAvailableForContractorAsync(Guid contractorId, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_GetAvailableJobs", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@ContractorId", contractorId);
        return await ReadListAsync(cmd, ct);
    }

    public async Task<List<TicketRow>> GetMyJobsForContractorAsync(Guid contractorId, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_GetMyJobs", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@ContractorId", contractorId);
        return await ReadListAsync(cmd, ct);
    }

    public async Task<TicketRow?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Ticket_GetById", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var cols = Columns(r);
        return await r.ReadAsync(ct) ? MapTicket(r, cols) : null;
    }

    public async Task<Guid> CreateAsync(Guid tenantId, TicketCreateRequest req, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Ticket_Create", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@TenantId", tenantId);
        cmd.AddParam("@Category", req.Category);
        cmd.AddParam("@Title", req.Title);
        cmd.AddParam("@Description", req.Description);
        cmd.AddParam("@Urgency", req.Urgency);
        return (Guid)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<int> UpdateAdminAsync(Guid id, string? status, string? adminNotes, bool setAdminNotes, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Ticket_UpdateAdmin", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        cmd.AddParam("@Status", status);
        cmd.AddParam("@AdminNotes", adminNotes);
        cmd.AddParam("@SetAdminNotes", setAdminNotes);
        return (int)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<int> UpdateProgressAsync(Guid id, Guid contractorId, TicketProgressRequest req, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Ticket_UpdateProgress", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        cmd.AddParam("@ContractorId", contractorId);
        cmd.AddParam("@AssignmentStatus", req.AssignmentStatus);
        cmd.AddParam("@EtaAt", req.EtaAt);
        cmd.AddParam("@EstimatedDurationMins", req.EstimatedDurationMins);
        cmd.AddParam("@ContractorNotes", req.ContractorNotes);
        cmd.AddParam("@SetEta", req.EtaProvided);
        cmd.AddParam("@SetDuration", req.DurationProvided);
        cmd.AddParam("@SetNotes", req.NotesProvided);
        return (int)(await cmd.ExecuteScalarAsync(ct))!;
    }

    /// <summary>Atomic claim. Returns true only if this call assigned the ticket.</summary>
    public async Task<bool> ClaimAsync(Guid id, Guid contractorId, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Ticket_Claim", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        cmd.AddParam("@ContractorId", contractorId);
        return (int)(await cmd.ExecuteScalarAsync(ct))! == 1;
    }

    public async Task AddOfferAsync(Guid ticketId, Guid contractorId, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Ticket_AddOffer", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@TicketId", ticketId);
        cmd.AddParam("@ContractorId", contractorId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<bool> OfferExistsAsync(Guid ticketId, Guid contractorId, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_TicketOffer_Exists", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@TicketId", ticketId);
        cmd.AddParam("@ContractorId", contractorId);
        return (bool)(await cmd.ExecuteScalarAsync(ct))!;
    }

    private static async Task<List<TicketRow>> ReadListAsync(SqlCommand cmd, CancellationToken ct)
    {
        var list = new List<TicketRow>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var cols = Columns(r);
        while (await r.ReadAsync(ct))
            list.Add(MapTicket(r, cols));
        return list;
    }

    private static HashSet<string> Columns(SqlDataReader r) =>
        new(Enumerable.Range(0, r.FieldCount).Select(r.GetName), StringComparer.OrdinalIgnoreCase);

    private static TicketRow MapTicket(SqlDataReader r, HashSet<string> c)
    {
        var t = new TicketRow
        {
            Id = r.GetGuidVal("Id"),
            Category = r.GetStr("Category"),
            Title = r.GetStr("Title"),
            Description = r.GetStr("Description"),
            Urgency = r.GetStr("Urgency"),
            Status = r.GetStr("Status"),
            AssignmentStatus = r.GetStr("AssignmentStatus"),
            EtaAt = r.GetDateOrNull("EtaAt"),
            EstimatedDurationMins = r.GetIntOrNull("EstimatedDurationMins"),
            ContractorNotes = r.GetStrOrNull("ContractorNotes"),
            CreatedAt = r.GetDate("CreatedAt"),
        };
        if (c.Contains("TenantId")) t.TenantId = r.GetGuidVal("TenantId");
        if (c.Contains("AdminNotes")) t.AdminNotes = r.GetStrOrNull("AdminNotes");
        if (c.Contains("ContractorId")) t.ContractorId = r.GetGuidOrNull("ContractorId");
        if (c.Contains("AssignedAt")) t.AssignedAt = r.GetDateOrNull("AssignedAt");
        if (c.Contains("UpdatedAt")) t.UpdatedAt = r.GetDate("UpdatedAt");
        if (c.Contains("TenantName")) t.TenantName = r.GetStrOrNull("TenantName");
        if (c.Contains("TenantUnit")) t.TenantUnit = r.GetStrOrNull("TenantUnit");
        if (c.Contains("TenantEmail")) t.TenantEmail = r.GetStrOrNull("TenantEmail");
        if (c.Contains("TenantPhone")) t.TenantPhone = r.GetStrOrNull("TenantPhone");
        if (c.Contains("ContractorName")) t.ContractorName = r.GetStrOrNull("ContractorName");
        if (c.Contains("ContractorCompany")) t.ContractorCompany = r.GetStrOrNull("ContractorCompany");
        if (c.Contains("ContractorEmail")) t.ContractorEmail = r.GetStrOrNull("ContractorEmail");
        if (c.Contains("ContractorPhone")) t.ContractorPhone = r.GetStrOrNull("ContractorPhone");
        return t;
    }
}
