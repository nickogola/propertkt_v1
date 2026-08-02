using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using PropertKt.Api.Models;

namespace PropertKt.Api.Data;

public sealed class ContractorRepository(SqlConnectionFactory factory)
{
    private readonly SqlConnectionFactory _factory = factory;

    public async Task<ContractorRow?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_GetByEmail", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Email", email);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapRow(r) : null;
    }

    public async Task<ContractorRow?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_GetById", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapRow(r) : null;
    }

    public async Task<List<ContractorListRow>> GetAllAsync(CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_GetAll", conn) { CommandType = CommandType.StoredProcedure };
        return await ReadListAsync(cmd, withCount: true, ct);
    }

    public async Task<List<ContractorListRow>> GetActiveAsync(CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_GetActive", conn) { CommandType = CommandType.StoredProcedure };
        return await ReadListAsync(cmd, withCount: false, ct);
    }

    public async Task<Guid> CreateAsync(ContractorCreateRequest req, string passwordHash, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_Create", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Name", req.Name);
        cmd.AddParam("@Company", req.Company);
        cmd.AddParam("@Email", req.Email);
        cmd.AddParam("@Phone", req.Phone);
        cmd.AddParam("@Trades", JsonSerializer.Serialize(req.Trades));
        cmd.AddParam("@PasswordHash", passwordHash);
        cmd.AddParam("@Active", req.Active);
        return (Guid)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<Guid> CreateFromSignupAsync(ContractorSignupRequest req, string passwordHash, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_Create", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Name", req.Name);
        cmd.AddParam("@Company", req.Company);
        cmd.AddParam("@Email", req.Email);
        cmd.AddParam("@Phone", req.Phone);
        cmd.AddParam("@Trades", JsonSerializer.Serialize(req.Trades));
        cmd.AddParam("@PasswordHash", passwordHash);
        cmd.AddParam("@Active", true);
        return (Guid)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<int> UpdateAsync(Guid id, ContractorUpdateRequest req, string? passwordHash, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_Update", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        cmd.AddParam("@Name", req.Name);
        cmd.AddParam("@Company", req.Company);
        cmd.AddParam("@Email", req.Email);
        cmd.AddParam("@Phone", req.Phone);
        cmd.AddParam("@Trades", req.Trades is null ? null : JsonSerializer.Serialize(req.Trades));
        cmd.AddParam("@Active", req.Active);
        cmd.AddParam("@PasswordHash", passwordHash);
        cmd.AddParam("@SetPassword", passwordHash is not null);
        cmd.AddParam("@SetCompany", req.Company is not null);
        cmd.AddParam("@SetPhone", req.Phone is not null);
        return (int)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<int> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Contractor_Delete", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        return (int)(await cmd.ExecuteScalarAsync(ct))!;
    }

    private static async Task<List<ContractorListRow>> ReadListAsync(SqlCommand cmd, bool withCount, CancellationToken ct)
    {
        var list = new List<ContractorListRow>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            list.Add(new ContractorListRow
            {
                Id = r.GetGuidVal("Id"),
                Name = r.GetStr("Name"),
                Company = r.GetStrOrNull("Company"),
                Email = r.GetStr("Email"),
                Phone = r.GetStrOrNull("Phone"),
                Trades = ParseTrades(r.GetStrOrNull("Trades")),
                Active = r.GetBoolVal("Active"),
                TicketCount = withCount ? r.GetIntVal("TicketCount") : 0,
            });
        }
        return list;
    }

    public static string[] ParseTrades(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return [];
        try
        {
            return JsonSerializer.Deserialize<string[]>(raw) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static ContractorRow MapRow(SqlDataReader r) => new()
    {
        Id = r.GetGuidVal("Id"),
        Name = r.GetStr("Name"),
        Company = r.GetStrOrNull("Company"),
        Email = r.GetStr("Email"),
        Phone = r.GetStrOrNull("Phone"),
        Trades = r.GetStrOrNull("Trades") ?? "[]",
        PasswordHash = r.GetStrOrNull("PasswordHash"),
        Active = r.GetBoolVal("Active"),
        CreatedAt = r.GetDate("CreatedAt"),
        UpdatedAt = r.GetDate("UpdatedAt"),
    };
}
