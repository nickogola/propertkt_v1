using System.ComponentModel.DataAnnotations;

namespace PropertKt.Api.Models;

// ----- Auth -----
public sealed class LoginRequest
{
    [Required, EmailAddress] public string Email { get; set; } = "";
    [Required] public string Password { get; set; } = "";
}

public sealed class ContractorSignupRequest
{
    [Required, MaxLength(120)] public string Name { get; set; } = "";
    [MaxLength(120)] public string? Company { get; set; }
    [Required, EmailAddress] public string Email { get; set; } = "";
    [MaxLength(40)] public string? Phone { get; set; }
    [Required, MinLength(8)] public string Password { get; set; } = "";
    [MinLength(1)] public List<string> Trades { get; set; } = [];
}

// ----- Tenants -----
public sealed class TenantCreateRequest
{
    [Required] public string Name { get; set; } = "";
    [Required, EmailAddress] public string Email { get; set; } = "";
    public string? Phone { get; set; }
    [Required] public string Unit { get; set; } = "";
    public string? Notes { get; set; }
    [MinLength(6)] public string? Password { get; set; }
}

public sealed class TenantUpdateRequest
{
    public string? Name { get; set; }
    [EmailAddress] public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Unit { get; set; }
    public string? Notes { get; set; }
    public string? Password { get; set; }
}

// ----- Contractors (admin) -----
public sealed class ContractorCreateRequest
{
    [Required] public string Name { get; set; } = "";
    public string? Company { get; set; }
    [Required, EmailAddress] public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public List<string> Trades { get; set; } = [];
    public bool Active { get; set; } = true;
    [Required, MinLength(8)] public string Password { get; set; } = "";
}

public sealed class ContractorUpdateRequest
{
    public string? Name { get; set; }
    public string? Company { get; set; }
    [EmailAddress] public string? Email { get; set; }
    public string? Phone { get; set; }
    public List<string>? Trades { get; set; }
    public bool? Active { get; set; }
    public string? Password { get; set; }
}

// ----- Tickets -----
public sealed class TicketCreateRequest
{
    [Required] public string Category { get; set; } = "";
    [Required, MaxLength(120)] public string Title { get; set; } = "";
    [Required, MaxLength(4000)] public string Description { get; set; } = "";
    public string Urgency { get; set; } = "normal";
}

public sealed class TicketUpdateRequest
{
    public string? Status { get; set; }
    public string? AdminNotes { get; set; }
}

public sealed class TicketAssignRequest
{
    // When present, assign this specific contractor directly.
    public Guid? ContractorId { get; set; }
}

public sealed class TicketProgressRequest
{
    public string? AssignmentStatus { get; set; }
    public bool EtaProvided { get; set; }
    public DateTime? EtaAt { get; set; }
    public bool DurationProvided { get; set; }
    public int? EstimatedDurationMins { get; set; }
    public bool NotesProvided { get; set; }
    public string? ContractorNotes { get; set; }
}

// ----- Notify -----
public sealed class NotifyRequest
{
    [Required, MaxLength(200)] public string Subject { get; set; } = "";
    [Required, MaxLength(10000)] public string Body { get; set; } = "";
    [MinLength(1)] public List<string> RecipientIds { get; set; } = [];
    [MinLength(1)] public List<string> Channels { get; set; } = [];
}
