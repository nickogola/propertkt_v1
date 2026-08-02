/* ============================================================================
   ProperTkt — Stored procedures
   Run against the PropertKt database:
     sqlcmd -S localhost -E -d PropertKt -i 02_stored_procedures.sql
   All data access from the API goes through these procedures.
   ============================================================================ */

USE [PropertKt];
GO

/* ==========================================================================
   TENANTS
   ========================================================================== */

CREATE OR ALTER PROCEDURE dbo.usp_Tenant_GetByEmail
    @Email NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Email, Phone, Unit, Notes, PasswordHash, CreatedAt, UpdatedAt
    FROM dbo.Tenants
    WHERE Email = LOWER(@Email);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Tenant_GetById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Email, Phone, Unit, Notes, PasswordHash, CreatedAt, UpdatedAt
    FROM dbo.Tenants
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Tenant_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        t.Id, t.Name, t.Email, t.Phone, t.Unit, t.Notes,
        CAST(CASE WHEN t.PasswordHash IS NULL THEN 0 ELSE 1 END AS BIT) AS HasPassword,
        t.CreatedAt, t.UpdatedAt,
        (SELECT COUNT(*) FROM dbo.Tickets tk WHERE tk.TenantId = t.Id) AS TicketCount
    FROM dbo.Tenants t
    ORDER BY t.Unit ASC;
END
GO

/* Accepts a comma-separated list of tenant ids (used by the notify endpoint). */
CREATE OR ALTER PROCEDURE dbo.usp_Tenant_GetByIds
    @Ids NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT t.Id, t.Name, t.Email, t.Phone, t.Unit
    FROM dbo.Tenants t
    INNER JOIN (
        SELECT TRY_CONVERT(UNIQUEIDENTIFIER, LTRIM(RTRIM(value))) AS Id
        FROM STRING_SPLIT(@Ids, ',')
        WHERE LTRIM(RTRIM(value)) <> ''
    ) s ON s.Id = t.Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Tenant_Create
    @Name         NVARCHAR(120),
    @Email        NVARCHAR(256),
    @Phone        NVARCHAR(40)  = NULL,
    @Unit         NVARCHAR(40),
    @Notes        NVARCHAR(MAX) = NULL,
    @PasswordHash NVARCHAR(512) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @out TABLE (Id UNIQUEIDENTIFIER);
    INSERT INTO dbo.Tenants (Name, Email, Phone, Unit, Notes, PasswordHash)
    OUTPUT inserted.Id INTO @out
    VALUES (@Name, LOWER(@Email), @Phone, @Unit, @Notes, @PasswordHash);
    SELECT Id FROM @out;
END
GO

/* Partial update: NULL parameters leave the column unchanged. Password is only
   changed when @SetPassword = 1 (so callers can clear vs. keep). */
CREATE OR ALTER PROCEDURE dbo.usp_Tenant_Update
    @Id           UNIQUEIDENTIFIER,
    @Name         NVARCHAR(120) = NULL,
    @Email        NVARCHAR(256) = NULL,
    @Phone        NVARCHAR(40)  = NULL,
    @Unit         NVARCHAR(40)  = NULL,
    @Notes        NVARCHAR(MAX) = NULL,
    @PasswordHash NVARCHAR(512) = NULL,
    @SetPassword  BIT           = 0,
    @SetPhone     BIT           = 0,
    @SetNotes     BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Tenants
    SET
        Name         = COALESCE(@Name, Name),
        Email        = COALESCE(LOWER(@Email), Email),
        Unit         = COALESCE(@Unit, Unit),
        Phone        = CASE WHEN @SetPhone = 1 THEN @Phone ELSE Phone END,
        Notes        = CASE WHEN @SetNotes = 1 THEN @Notes ELSE Notes END,
        PasswordHash = CASE WHEN @SetPassword = 1 THEN @PasswordHash ELSE PasswordHash END,
        UpdatedAt    = SYSUTCDATETIME()
    WHERE Id = @Id;
    SELECT @@ROWCOUNT AS Affected;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Tenant_Delete
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.Tenants WHERE Id = @Id;  -- tickets & offers cascade
    SELECT @@ROWCOUNT AS Affected;
END
GO

/* ==========================================================================
   CONTRACTORS
   ========================================================================== */

CREATE OR ALTER PROCEDURE dbo.usp_Contractor_GetByEmail
    @Email NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Company, Email, Phone, Trades, PasswordHash, Active, CreatedAt, UpdatedAt
    FROM dbo.Contractors
    WHERE Email = LOWER(@Email);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Contractor_GetById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Company, Email, Phone, Trades, PasswordHash, Active, CreatedAt, UpdatedAt
    FROM dbo.Contractors
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Contractor_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        c.Id, c.Name, c.Company, c.Email, c.Phone, c.Trades, c.Active, c.CreatedAt, c.UpdatedAt,
        (SELECT COUNT(*) FROM dbo.Tickets tk WHERE tk.ContractorId = c.Id) AS TicketCount
    FROM dbo.Contractors c
    ORDER BY c.Name ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Contractor_GetActive
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Company, Email, Phone, Trades, Active
    FROM dbo.Contractors
    WHERE Active = 1
    ORDER BY Name ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Contractor_Create
    @Name         NVARCHAR(120),
    @Company      NVARCHAR(120) = NULL,
    @Email        NVARCHAR(256),
    @Phone        NVARCHAR(40)  = NULL,
    @Trades       NVARCHAR(MAX) = N'[]',
    @PasswordHash NVARCHAR(512),
    @Active       BIT           = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @out TABLE (Id UNIQUEIDENTIFIER);
    INSERT INTO dbo.Contractors (Name, Company, Email, Phone, Trades, PasswordHash, Active)
    OUTPUT inserted.Id INTO @out
    VALUES (@Name, @Company, LOWER(@Email), @Phone, @Trades, @PasswordHash, @Active);
    SELECT Id FROM @out;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Contractor_Update
    @Id           UNIQUEIDENTIFIER,
    @Name         NVARCHAR(120) = NULL,
    @Company      NVARCHAR(120) = NULL,
    @Email        NVARCHAR(256) = NULL,
    @Phone        NVARCHAR(40)  = NULL,
    @Trades       NVARCHAR(MAX) = NULL,
    @Active       BIT           = NULL,
    @PasswordHash NVARCHAR(512) = NULL,
    @SetPassword  BIT           = 0,
    @SetCompany   BIT           = 0,
    @SetPhone     BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Contractors
    SET
        Name         = COALESCE(@Name, Name),
        Email        = COALESCE(LOWER(@Email), Email),
        Trades       = COALESCE(@Trades, Trades),
        Active       = COALESCE(@Active, Active),
        Company      = CASE WHEN @SetCompany = 1 THEN @Company ELSE Company END,
        Phone        = CASE WHEN @SetPhone   = 1 THEN @Phone   ELSE Phone   END,
        PasswordHash = CASE WHEN @SetPassword = 1 THEN @PasswordHash ELSE PasswordHash END,
        UpdatedAt    = SYSUTCDATETIME()
    WHERE Id = @Id;
    SELECT @@ROWCOUNT AS Affected;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Contractor_Delete
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
        -- Offers use NO ACTION, so remove them first. Tickets.ContractorId is
        -- set to NULL automatically by the FK (ON DELETE SET NULL).
        DELETE FROM dbo.TicketOffers WHERE ContractorId = @Id;
        DELETE FROM dbo.Contractors  WHERE Id = @Id;
        DECLARE @n INT = @@ROWCOUNT;
    COMMIT;
    SELECT @n AS Affected;
END
GO

/* Available (offered, still-unclaimed) jobs for a contractor. */
CREATE OR ALTER PROCEDURE dbo.usp_Contractor_GetAvailableJobs
    @ContractorId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        tk.Id, tk.Title, tk.Description, tk.Category, tk.Urgency, tk.Status,
        tk.AssignmentStatus, tk.EtaAt, tk.EstimatedDurationMins, tk.ContractorNotes,
        tk.CreatedAt,
        te.Unit AS TenantUnit, te.Name AS TenantName, te.Phone AS TenantPhone
    FROM dbo.Tickets tk
    INNER JOIN dbo.Tenants te ON te.Id = tk.TenantId
    WHERE tk.ContractorId IS NULL
      AND tk.AssignmentStatus = N'offered'
      AND EXISTS (SELECT 1 FROM dbo.TicketOffers o
                  WHERE o.TicketId = tk.Id AND o.ContractorId = @ContractorId)
    ORDER BY tk.CreatedAt DESC;
END
GO

/* Jobs a contractor owns. */
CREATE OR ALTER PROCEDURE dbo.usp_Contractor_GetMyJobs
    @ContractorId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        tk.Id, tk.Title, tk.Description, tk.Category, tk.Urgency, tk.Status,
        tk.AssignmentStatus, tk.EtaAt, tk.EstimatedDurationMins, tk.ContractorNotes,
        tk.CreatedAt,
        te.Unit AS TenantUnit, te.Name AS TenantName, te.Phone AS TenantPhone
    FROM dbo.Tickets tk
    INNER JOIN dbo.Tenants te ON te.Id = tk.TenantId
    WHERE tk.ContractorId = @ContractorId
    ORDER BY tk.UpdatedAt DESC;
END
GO

/* ==========================================================================
   TICKETS
   ========================================================================== */

CREATE OR ALTER PROCEDURE dbo.usp_Ticket_GetById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        tk.Id, tk.TenantId, tk.Category, tk.Title, tk.Description, tk.Urgency, tk.Status,
        tk.AdminNotes, tk.ContractorId, tk.AssignmentStatus, tk.EtaAt, tk.EstimatedDurationMins,
        tk.AssignedAt, tk.ContractorNotes, tk.CreatedAt, tk.UpdatedAt,
        te.Name AS TenantName, te.Unit AS TenantUnit, te.Email AS TenantEmail, te.Phone AS TenantPhone,
        c.Name AS ContractorName, c.Company AS ContractorCompany, c.Email AS ContractorEmail, c.Phone AS ContractorPhone
    FROM dbo.Tickets tk
    INNER JOIN dbo.Tenants te ON te.Id = tk.TenantId
    LEFT JOIN dbo.Contractors c ON c.Id = tk.ContractorId
    WHERE tk.Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Ticket_GetAllForAdmin
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        tk.Id, tk.TenantId, tk.Category, tk.Title, tk.Description, tk.Urgency, tk.Status,
        tk.AdminNotes, tk.ContractorId, tk.AssignmentStatus, tk.EtaAt, tk.EstimatedDurationMins,
        tk.AssignedAt, tk.ContractorNotes, tk.CreatedAt, tk.UpdatedAt,
        te.Name AS TenantName, te.Unit AS TenantUnit, te.Email AS TenantEmail, te.Phone AS TenantPhone,
        c.Name AS ContractorName, c.Company AS ContractorCompany, c.Phone AS ContractorPhone
    FROM dbo.Tickets tk
    INNER JOIN dbo.Tenants te ON te.Id = tk.TenantId
    LEFT JOIN dbo.Contractors c ON c.Id = tk.ContractorId
    ORDER BY tk.Status ASC, tk.CreatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Ticket_GetForTenant
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        tk.Id, tk.TenantId, tk.Category, tk.Title, tk.Description, tk.Urgency, tk.Status,
        tk.AdminNotes, tk.ContractorId, tk.AssignmentStatus, tk.EtaAt, tk.EstimatedDurationMins,
        tk.AssignedAt, tk.ContractorNotes, tk.CreatedAt, tk.UpdatedAt,
        c.Name AS ContractorName, c.Company AS ContractorCompany
    FROM dbo.Tickets tk
    LEFT JOIN dbo.Contractors c ON c.Id = tk.ContractorId
    WHERE tk.TenantId = @TenantId
    ORDER BY tk.CreatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Ticket_Create
    @TenantId    UNIQUEIDENTIFIER,
    @Category    NVARCHAR(40),
    @Title       NVARCHAR(120),
    @Description NVARCHAR(MAX),
    @Urgency     NVARCHAR(20) = N'normal'
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @out TABLE (Id UNIQUEIDENTIFIER);
    INSERT INTO dbo.Tickets (TenantId, Category, Title, Description, Urgency)
    OUTPUT inserted.Id INTO @out
    VALUES (@TenantId, @Category, @Title, @Description, @Urgency);
    SELECT Id FROM @out;
END
GO

/* Admin edit: status and/or admin notes. */
CREATE OR ALTER PROCEDURE dbo.usp_Ticket_UpdateAdmin
    @Id         UNIQUEIDENTIFIER,
    @Status     NVARCHAR(20)  = NULL,
    @AdminNotes NVARCHAR(MAX) = NULL,
    @SetAdminNotes BIT        = 0
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Tickets
    SET
        Status     = COALESCE(@Status, Status),
        AdminNotes = CASE WHEN @SetAdminNotes = 1 THEN @AdminNotes ELSE AdminNotes END,
        UpdatedAt  = SYSUTCDATETIME()
    WHERE Id = @Id;
    SELECT @@ROWCOUNT AS Affected;
END
GO

/* Contractor progress update (guarded by ownership). */
CREATE OR ALTER PROCEDURE dbo.usp_Ticket_UpdateProgress
    @Id                    UNIQUEIDENTIFIER,
    @ContractorId          UNIQUEIDENTIFIER,
    @AssignmentStatus      NVARCHAR(20)  = NULL,
    @EtaAt                 DATETIME2(3)  = NULL,
    @EstimatedDurationMins INT           = NULL,
    @ContractorNotes       NVARCHAR(MAX) = NULL,
    @SetEta                BIT           = 0,
    @SetDuration           BIT           = 0,
    @SetNotes              BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Tickets
    SET
        AssignmentStatus      = COALESCE(@AssignmentStatus, AssignmentStatus),
        -- Completing the work resolves the ticket.
        Status                = CASE WHEN @AssignmentStatus = N'completed' THEN N'resolved' ELSE Status END,
        EtaAt                 = CASE WHEN @SetEta      = 1 THEN @EtaAt                 ELSE EtaAt END,
        EstimatedDurationMins = CASE WHEN @SetDuration = 1 THEN @EstimatedDurationMins ELSE EstimatedDurationMins END,
        ContractorNotes       = CASE WHEN @SetNotes    = 1 THEN @ContractorNotes       ELSE ContractorNotes END,
        UpdatedAt             = SYSUTCDATETIME()
    WHERE Id = @Id AND ContractorId = @ContractorId;
    SELECT @@ROWCOUNT AS Affected;
END
GO

/* Atomic claim used by both direct-assign (admin) and accept (contractor).
   Only succeeds when the ticket has no contractor yet. Returns Affected (0/1). */
CREATE OR ALTER PROCEDURE dbo.usp_Ticket_Claim
    @Id           UNIQUEIDENTIFIER,
    @ContractorId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Tickets
    SET
        ContractorId     = @ContractorId,
        AssignmentStatus = N'accepted',
        Status           = N'in_progress',
        AssignedAt       = SYSUTCDATETIME(),
        UpdatedAt        = SYSUTCDATETIME()
    WHERE Id = @Id AND ContractorId IS NULL;

    DECLARE @n INT = @@ROWCOUNT;

    -- Keep an offer record for consistency (idempotent).
    IF @n = 1 AND NOT EXISTS (SELECT 1 FROM dbo.TicketOffers WHERE TicketId = @Id AND ContractorId = @ContractorId)
        INSERT INTO dbo.TicketOffers (TicketId, ContractorId) VALUES (@Id, @ContractorId);

    SELECT @n AS Affected;
END
GO

/* Create an offer to one contractor (idempotent) and mark the ticket offered. */
CREATE OR ALTER PROCEDURE dbo.usp_Ticket_AddOffer
    @TicketId     UNIQUEIDENTIFIER,
    @ContractorId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.TicketOffers WHERE TicketId = @TicketId AND ContractorId = @ContractorId)
        INSERT INTO dbo.TicketOffers (TicketId, ContractorId) VALUES (@TicketId, @ContractorId);

    UPDATE dbo.Tickets
    SET AssignmentStatus = N'offered', UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @TicketId AND ContractorId IS NULL;
END
GO

/* Does an open offer exist for this contractor? (used before accept) */
CREATE OR ALTER PROCEDURE dbo.usp_TicketOffer_Exists
    @TicketId     UNIQUEIDENTIFIER,
    @ContractorId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.TicketOffers WHERE TicketId = @TicketId AND ContractorId = @ContractorId
    ) THEN 1 ELSE 0 END AS BIT) AS OfferExists;
END
GO

/* ==========================================================================
   NOTIFICATIONS
   ========================================================================== */

CREATE OR ALTER PROCEDURE dbo.usp_Notification_Create
    @Subject    NVARCHAR(200),
    @Body       NVARCHAR(MAX),
    @Recipients NVARCHAR(MAX),
    @Channels   NVARCHAR(200),
    @SentCount  INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @out TABLE (Id UNIQUEIDENTIFIER);
    INSERT INTO dbo.Notifications (Subject, Body, Recipients, Channels, SentCount)
    OUTPUT inserted.Id INTO @out
    VALUES (@Subject, @Body, @Recipients, @Channels, @SentCount);
    SELECT Id FROM @out;
END
GO

PRINT 'Stored procedures created.';
GO
