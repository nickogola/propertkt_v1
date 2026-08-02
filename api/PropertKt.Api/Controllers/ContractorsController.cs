using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using PropertKt.Api.Auth;
using PropertKt.Api.Data;
using PropertKt.Api.Models;
using PropertKt.Api.Services;

namespace PropertKt.Api.Controllers;

[Route("api/contractors")]
[Authorize(Roles = Roles.Admin)]
public sealed class ContractorsController(ContractorRepository contractors) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var list = await contractors.GetAllAsync(ct);
        return Ok(new { contractors = list });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ContractorCreateRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(new { error = "Invalid input" });
        try
        {
            var id = await contractors.CreateAsync(req, PasswordHasher.Hash(req.Password), ct);
            return Ok(new { contractor = new { id } });
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            return BadRequest(new { error = "A contractor with that email already exists." });
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ContractorUpdateRequest req, CancellationToken ct)
    {
        var hash = string.IsNullOrEmpty(req.Password) ? null : PasswordHasher.Hash(req.Password);
        try
        {
            var affected = await contractors.UpdateAsync(id, req, hash, ct);
            if (affected == 0) return NotFound(new { error = "Contractor not found." });
            return Ok(new { contractor = new { id } });
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            return BadRequest(new { error = "A contractor with that email already exists." });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var affected = await contractors.DeleteAsync(id, ct);
        if (affected == 0) return NotFound(new { error = "Contractor not found." });
        return Ok(new { ok = true });
    }
}
