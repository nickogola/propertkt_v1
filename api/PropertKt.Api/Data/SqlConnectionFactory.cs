using Microsoft.Data.SqlClient;

namespace PropertKt.Api.Data;

public sealed class SqlConnectionFactory(IConfiguration config)
{
    private readonly string _connectionString =
        config.GetConnectionString("Default")
        ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

    public async Task<SqlConnection> OpenAsync(CancellationToken ct = default)
    {
        var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        return conn;
    }
}
