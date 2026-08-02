using System.Data;
using Microsoft.Data.SqlClient;
using PropertKt.Api.Models;

namespace PropertKt.Api.Data;

public sealed class TenantRepository(SqlConnectionFactory factory)
{
    private readonly SqlConnectionFactory _factory = factory;

    public async Task<TenantRow?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Tenant_GetByEmail", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Email", email);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapRow(r) : null;
    }

    public async Task<TenantRow?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Tenant_GetById", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapRow(r) : null;
    }

    public async Task<List<TenantListRow>> GetAllAsync(CancellationToken ct = default)
    {
        var list = new List<TenantListRow>();
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Tenant_GetAll", conn) { CommandType = CommandType.StoredProcedure };
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            list.Add(new TenantListRow
            {
                Id = r.GetGuidVal("Id"),
                Name = r.GetStr("Name"),
                Email = r.GetStr("Email"),
                Phone = r.GetStrOrNull("Phone"),
                Unit = r.GetStr("Unit"),
                Notes = r.GetStrOrNull("Notes"),
                HasPassword = r.GetBoolVal("HasPassword"),
                TicketCount = r.GetIntVal("TicketCount"),
            });
        }
        return list;
    }

    public async Task<List<TenantContact>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken ct = default)
    {
        var list = new List<TenantContact>();
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Tenant_GetByIds", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Ids", string.Join(',', ids));
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            list.Add(new TenantContact
            {
                Id = r.GetGuidVal("Id"),
                Name = r.GetStr("Name"),
                Email = r.GetStr("Email"),
                Phone = r.GetStrOrNull("Phone"),
                Unit = r.GetStr("Unit"),
            });
        }
        return list;
    }

    public async Task<Guid> CreateAsync(TenantCreateRequest req, string? passwordHash, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Tenant_Create", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Name", req.Name);
        cmd.AddParam("@Email", req.Email);
        cmd.AddParam("@Phone", req.Phone);
        cmd.AddParam("@Unit", req.Unit);
        cmd.AddParam("@Notes", req.Notes);
        cmd.AddParam("@PasswordHash", passwordHash);
        var id = (Guid)(await cmd.ExecuteScalarAsync(ct))!;
        return id;
    }

    public async Task<int> UpdateAsync(Guid id, TenantUpdateRequest req, string? passwordHash, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Tenant_Update", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        cmd.AddParam("@Name", req.Name);
        cmd.AddParam("@Email", req.Email);
        cmd.AddParam("@Phone", req.Phone);
        cmd.AddParam("@Unit", req.Unit);
        cmd.AddParam("@Notes", req.Notes);
        cmd.AddParam("@PasswordHash", passwordHash);
        cmd.AddParam("@SetPassword", passwordHash is not null);
        cmd.AddParam("@SetPhone", req.Phone is not null);
        cmd.AddParam("@SetNotes", req.Notes is not null);
        var affected = (int)(await cmd.ExecuteScalarAsync(ct))!;
        return affected;
    }

    public async Task<int> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await _factory.OpenAsync(ct);
        await using var cmd = new SqlCommand("dbo.usp_Tenant_Delete", conn) { CommandType = CommandType.StoredProcedure };
        cmd.AddParam("@Id", id);
        return (int)(await cmd.ExecuteScalarAsync(ct))!;
    }

    private static TenantRow MapRow(SqlDataReader r) => new()
    {
        Id = r.GetGuidVal("Id"),
        Name = r.GetStr("Name"),
        Email = r.GetStr("Email"),
        Phone = r.GetStrOrNull("Phone"),
        Unit = r.GetStr("Unit"),
        Notes = r.GetStrOrNull("Notes"),
        PasswordHash = r.GetStrOrNull("PasswordHash"),
        CreatedAt = r.GetDate("CreatedAt"),
        UpdatedAt = r.GetDate("UpdatedAt"),
    };
}
