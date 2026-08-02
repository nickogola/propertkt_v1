using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropertKt.Api.Auth;
using PropertKt.Api.Data;
using PropertKt.Api.Models;
using PropertKt.Api.Services;

namespace PropertKt.Api.Controllers;

[Route("api/notify")]
//[Authorize(Roles = Roles.Admin)]
public sealed class NotifyController(
    TenantRepository tenants,
    NotificationRepository notifications,
    IMessagingService messaging) : ApiControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Send([FromBody] NotifyRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid || req.RecipientIds.Count == 0 || req.Channels.Count == 0)
            return BadRequest(new { error = "Invalid input" });

        var recipients = await tenants.GetByIdsAsync(req.RecipientIds, ct);
        var results = new Dictionary<string, object>();
        int totalSent = 0;

        if (req.Channels.Contains("email"))
        {
            int sent = 0;
            var failures = new List<string>();
            foreach (var t in recipients)
            {
                var res = await messaging.SendEmailAsync(t.Email, req.Subject,
                    $"Hi {t.Name},\n\n{req.Body}\n\n— Sent via ProperTkt");
                if (res.Ok) sent++;
                else failures.Add($"{t.Email}: {res.Error ?? "unknown"}");
            }
            totalSent += sent;
            results["email"] = new { sent, failures };
        }

        if (req.Channels.Contains("whatsapp"))
        {
            int sent = 0;
            var failures = new List<string>();
            foreach (var t in recipients)
            {
                if (string.IsNullOrEmpty(t.Phone))
                {
                    failures.Add($"Unit {t.Unit} ({t.Name}): no phone number on file");
                    continue;
                }
                var res = await messaging.SendWhatsAppAsync(t.Phone,
                    $"*{req.Subject}*\n\nHi {t.Name},\n\n{req.Body}\n\n— Sent via ProperTkt");
                if (res.Ok) sent++;
                else failures.Add($"Unit {t.Unit} ({t.Name}): {res.Error ?? "unknown"}");
            }
            totalSent += sent;
            results["whatsapp"] = new { sent, failures };
        }

        await notifications.CreateAsync(
            req.Subject, req.Body,
            JsonSerializer.Serialize(req.RecipientIds),
            JsonSerializer.Serialize(req.Channels),
            totalSent, ct);

        return Ok(new { total = recipients.Count, results });
    }
}
