using System.Data;
using Microsoft.Data.SqlClient;

namespace PropertKt.Api.Data;

public sealed class NotificationRepository(SqlConnectionFactory factory)
{
    private readonly SqlConnectionFactory _factory = factory;

    public async Task<Guid> CreateAsync(string subject, string body, string recipientsJson, string channelsJson, int sentCount, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Notification_Create", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Subject", subject);
        cmd.AddParam("@Body", body);
        cmd.AddParam("@Recipients", recipientsJson);
        cmd.AddParam("@Channels", channelsJson);
        cmd.AddParam("@SentCount", sentCount);
        return (Guid)(await cmd.ExecuteScalarAsync(ct))!;
    }
}
