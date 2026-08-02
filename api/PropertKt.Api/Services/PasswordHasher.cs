using System.Security.Cryptography;

namespace PropertKt.Api.Services;

/// <summary>
/// PBKDF2-SHA256 password hashing. Stored as "&lt;saltHex&gt;:&lt;keyHex&gt;".
/// Parameters are fixed so pre-computed seed hashes verify correctly.
/// </summary>
public static class PasswordHasher
{
    private const int Iterations = 100_000;
    private const int SaltSize = 16;
    private const int KeySize = 32;

    public static string Hash(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return $"{Convert.ToHexString(salt).ToLowerInvariant()}:{Convert.ToHexString(key).ToLowerInvariant()}";
    }

    public static bool Verify(string password, string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored)) return false;
        string[] parts = stored.Split(':');
        if (parts.Length != 2) return false;
        try
        {
            byte[] salt = Convert.FromHexString(parts[0]);
            byte[] expected = Convert.FromHexString(parts[1]);
            byte[] key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(key, expected);
        }
        catch
        {
            return false;
        }
    }
}
