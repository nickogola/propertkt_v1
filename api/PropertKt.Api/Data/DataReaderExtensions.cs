using System.Data;
using Microsoft.Data.SqlClient;

namespace PropertKt.Api.Data;

/// <summary>Null-safe column readers keyed by column name.</summary>
public static class DataReaderExtensions
{
    public static string GetStr(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return r.IsDBNull(i) ? "" : r.GetString(i);
    }

    public static string? GetStrOrNull(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return r.IsDBNull(i) ? null : r.GetString(i);
    }

    public static Guid GetGuidVal(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return r.GetGuid(i);
    }

    public static Guid? GetGuidOrNull(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return r.IsDBNull(i) ? null : r.GetGuid(i);
    }

    public static bool GetBoolVal(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return !r.IsDBNull(i) && r.GetBoolean(i);
    }

    public static int GetIntVal(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return r.IsDBNull(i) ? 0 : r.GetInt32(i);
    }

    public static int? GetIntOrNull(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return r.IsDBNull(i) ? null : r.GetInt32(i);
    }

    public static DateTime GetDate(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return r.GetDateTime(i);
    }

    public static DateTime? GetDateOrNull(this SqlDataReader r, string name)
    {
        int i = r.GetOrdinal(name);
        return r.IsDBNull(i) ? null : r.GetDateTime(i);
    }

    /// <summary>Adds a parameter, converting CLR null to <see cref="DBNull"/>.</summary>
    public static SqlParameter AddParam(this SqlCommand cmd, string name, object? value)
    {
        return cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
    }
}
