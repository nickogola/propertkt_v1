using Microsoft.AspNetCore.Mvc;
using PropertKt.Api.Services;

namespace PropertKt.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected const string SessionCookie = "pm_session";

    protected void SetSessionCookie(string token, DateTime expiresUtc)
    {
        Response.Cookies.Append(SessionCookie, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !HttpContext.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase),
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = new DateTimeOffset(expiresUtc),
        });
    }

    protected void ClearSessionCookie() => Response.Cookies.Delete(SessionCookie);

    protected IActionResult IssueSession(JwtTokenService jwt, string role, string email, string? id)
    {
        var (token, expires) = jwt.Create(role, email, id);
        SetSessionCookie(token, expires);
        return Ok(new { ok = true, token, role, email });
    }
}
