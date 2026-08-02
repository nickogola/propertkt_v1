using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using PropertKt.Api.Auth;
using PropertKt.Api.Data;
using PropertKt.Api.Models;
using PropertKt.Api.Services;

namespace PropertKt.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController(
    TenantRepository tenants,
    ContractorRepository contractors,
    JwtTokenService jwt,
    IConfiguration config) : ApiControllerBase
{
    [HttpPost("admin/login")]
    public IActionResult AdminLogin([FromBody] LoginRequest req)
    {
        var email = config["Admin:Email"] ?? "admin@localhost";
        var password = config["Admin:Password"];

        var emailMatch = string.Equals(req.Email, email, StringComparison.OrdinalIgnoreCase);
        var passwordMatch = !string.IsNullOrEmpty(password) && password == req.Password;
        if (!emailMatch || !passwordMatch)
            return Unauthorized(new { error = "Invalid email or password" });

        return IssueSession(jwt, Roles.Admin, email, null);
    }

    [HttpPost("tenant/login")]
    public async Task<IActionResult> TenantLogin([FromBody] LoginRequest req, CancellationToken ct)
    {
        var tenant = await tenants.GetByEmailAsync(req.Email, ct);
        if (tenant is null || !PasswordHasher.Verify(req.Password, tenant.PasswordHash))
            return Unauthorized(new { error = "Invalid email or password." });

        return IssueSession(jwt, Roles.Tenant, tenant.Email, tenant.Id.ToString());
    }

    [HttpPost("contractor/login")]
    public async Task<IActionResult> ContractorLogin([FromBody] LoginRequest req, CancellationToken ct)
    {
        var contractor = await contractors.GetByEmailAsync(req.Email, ct);
        if (contractor is null || !PasswordHasher.Verify(req.Password, contractor.PasswordHash))
            return Unauthorized(new { error = "Invalid email or password." });
        if (!contractor.Active)
            return StatusCode(403, new { error = "This account has been deactivated." });

        return IssueSession(jwt, Roles.Contractor, contractor.Email, contractor.Id.ToString());
    }

    [HttpPost("contractor/signup")]
    public async Task<IActionResult> ContractorSignup([FromBody] ContractorSignupRequest req, CancellationToken ct)
    {
        if (req.Trades.Count == 0)
            return BadRequest(new { error = "Pick at least one trade." });

        var existing = await contractors.GetByEmailAsync(req.Email, ct);
        if (existing is not null)
            return Conflict(new { error = "An account with that email already exists. Try signing in." });

        try
        {
            var id = await contractors.CreateFromSignupAsync(req, PasswordHasher.Hash(req.Password), ct);
            return IssueSession(jwt, Roles.Contractor, req.Email.ToLowerInvariant(), id.ToString());
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            return Conflict(new { error = "An account with that email already exists. Try signing in." });
        }
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        ClearSessionCookie();
        return Ok(new { ok = true });
    }
}
