using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace PropertKt.Api.Services;

public sealed class JwtOptions
{
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "PropertKt";
    public string Audience { get; set; } = "PropertKt";
    public int DaysValid { get; set; } = 30;
}

/// <summary>Issues the signed session token used across all three roles.</summary>
public sealed class JwtTokenService(JwtOptions options)
{
    public const string RoleClaim = ClaimTypes.Role;
    public const string EmailClaim = ClaimTypes.Email;
    public const string UidClaim = "uid"; // tenantId / contractorId (empty for admin)

    private readonly JwtOptions _o = options;

    public (string token, DateTime expiresAt) Create(string role, string email, string? id)
    {
        var claims = new List<Claim>
        {
            new(RoleClaim, role),
            new(EmailClaim, email),
            new(UidClaim, id ?? string.Empty),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_o.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddDays(_o.DaysValid);

        var jwt = new JwtSecurityToken(
            issuer: _o.Issuer,
            audience: _o.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }
}
