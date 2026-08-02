using System.Security.Claims;
using PropertKt.Api.Services;

namespace PropertKt.Api.Auth;

public static class Roles
{
    public const string Admin = "admin";
    public const string Tenant = "tenant";
    public const string Contractor = "contractor";
}

public static class ClaimsPrincipalExtensions
{
    public static string? GetRole(this ClaimsPrincipal user) =>
        user.FindFirstValue(JwtTokenService.RoleClaim);

    public static string? GetEmail(this ClaimsPrincipal user) =>
        user.FindFirstValue(JwtTokenService.EmailClaim);

    public static Guid? GetUid(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(JwtTokenService.UidClaim);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
