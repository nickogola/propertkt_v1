namespace PropertKt.Api.Models;

// Row shapes returned by the data layer (mapped 1:1 from stored-procedure results).

public sealed class TenantRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string Unit { get; set; } = "";
    public string? Notes { get; set; }
    public string? PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class TenantListRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string Unit { get; set; } = "";
    public string? Notes { get; set; }
    public bool HasPassword { get; set; }
    public int TicketCount { get; set; }
}

public sealed class TenantContact
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string Unit { get; set; } = "";
}

public sealed class ContractorRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Company { get; set; }
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string Trades { get; set; } = "[]";
    public string? PasswordHash { get; set; }
    public bool Active { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class ContractorListRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Company { get; set; }
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string[] Trades { get; set; } = [];
    public bool Active { get; set; }
    public int TicketCount { get; set; }
}

// A superset row that covers admin, tenant, and contractor ticket views.
// Joined columns are nullable and only populated by the relevant procedure.
public sealed class TicketRow
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Category { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Urgency { get; set; } = "normal";
    public string Status { get; set; } = "open";
    public string? AdminNotes { get; set; }
    public Guid? ContractorId { get; set; }
    public string AssignmentStatus { get; set; } = "unassigned";
    public DateTime? EtaAt { get; set; }
    public int? EstimatedDurationMins { get; set; }
    public DateTime? AssignedAt { get; set; }
    public string? ContractorNotes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Joined display fields
    public string? TenantName { get; set; }
    public string? TenantUnit { get; set; }
    public string? TenantEmail { get; set; }
    public string? TenantPhone { get; set; }
    public string? ContractorName { get; set; }
    public string? ContractorCompany { get; set; }
    public string? ContractorEmail { get; set; }
    public string? ContractorPhone { get; set; }
}
