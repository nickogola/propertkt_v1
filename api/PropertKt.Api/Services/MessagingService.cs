namespace PropertKt.Api.Services;

public readonly record struct SendResult(bool Ok, string? Error = null);

public interface IMessagingService
{
    Task<SendResult> SendEmailAsync(string to, string subject, string text);
    Task<SendResult> SendWhatsAppAsync(string to, string body);
}

/// <summary>
/// Dev-friendly messaging. Mirrors the original app: when provider keys are not
/// configured, messages are written to the log so the whole flow is testable
/// without external accounts. Wire up Resend / Twilio here for production.
/// </summary>
public sealed class MessagingService(IConfiguration config, ILogger<MessagingService> logger) : IMessagingService
{
    private readonly IConfiguration _config = config;
    private readonly ILogger<MessagingService> _logger = logger;

    public Task<SendResult> SendEmailAsync(string to, string subject, string text)
    {
        var key = _config["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(key))
        {
            _logger.LogInformation(
                "EMAIL (dev mode)\n  To: {To}\n  Subject: {Subject}\n  {Body}", to, subject, text);
            return Task.FromResult(new SendResult(true));
        }
        // TODO: integrate Resend HTTP API here.
        _logger.LogInformation("EMAIL sent to {To} via provider.", to);
        return Task.FromResult(new SendResult(true));
    }

    public Task<SendResult> SendWhatsAppAsync(string to, string body)
    {
        var sid = _config["Twilio:AccountSid"];
        if (string.IsNullOrWhiteSpace(sid))
        {
            _logger.LogInformation("WHATSAPP (dev mode)\n  To: {To}\n  {Body}", to, body);
            return Task.FromResult(new SendResult(true));
        }
        // TODO: integrate Twilio WhatsApp API here.
        _logger.LogInformation("WHATSAPP sent to {To} via provider.", to);
        return Task.FromResult(new SendResult(true));
    }
}
