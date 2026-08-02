using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using PropertKt.Api.Auth;
using PropertKt.Api.Data;
using PropertKt.Api.Models;
using PropertKt.Api.Services;

namespace PropertKt.Api.Controllers;

[Route("api/tenants")]
//[Authorize(Roles = Roles.Admin)]
public sealed class TenantsController(TenantRepository tenants) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var list = await tenants.GetAllAsync(ct);
        return Ok(new { tenants = list });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TenantCreateRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(new { error = "Invalid input" });
        var hash = string.IsNullOrEmpty(req.Password) ? null : PasswordHasher.Hash(req.Password);
        try
        {
            var id = await tenants.CreateAsync(req, hash, ct);
            return Ok(new { tenant = new { id } });
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            return BadRequest(new { error = "A tenant with that email already exists." });
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] TenantUpdateRequest req, CancellationToken ct)
    {
        var hash = string.IsNullOrEmpty(req.Password) ? null : PasswordHasher.Hash(req.Password);
        try
        {
            var affected = await tenants.UpdateAsync(id, req, hash, ct);
            if (affected == 0) return NotFound(new { error = "Tenant not found." });
            return Ok(new { tenant = new { id } });
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            return BadRequest(new { error = "A tenant with that email already exists." });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var affected = await tenants.DeleteAsync(id, ct);
        if (affected == 0) return NotFound(new { error = "Tenant not found." });
        return Ok(new { ok = true });
    }
}
