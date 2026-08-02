/* ============================================================================
   ProperTkt — Schema (tables)
   Run against the PropertKt database:
     sqlcmd -S localhost -E -d PropertKt -i 01_schema.sql
   Mirrors the original Prisma models (Tenant, Contractor, Ticket, TicketOffer,
   Notification, MagicLink).
   ============================================================================ */

USE [PropertKt];
GO

/* Drop in reverse dependency order so the script is re-runnable. */
IF OBJECT_ID(N'dbo.TicketOffers', N'U')  IS NOT NULL DROP TABLE dbo.TicketOffers;
IF OBJECT_ID(N'dbo.Tickets', N'U')       IS NOT NULL DROP TABLE dbo.Tickets;
IF OBJECT_ID(N'dbo.Notifications', N'U') IS NOT NULL DROP TABLE dbo.Notifications;
IF OBJECT_ID(N'dbo.MagicLinks', N'U')    IS NOT NULL DROP TABLE dbo.MagicLinks;
IF OBJECT_ID(N'dbo.Contractors', N'U')   IS NOT NULL DROP TABLE dbo.Contractors;
IF OBJECT_ID(N'dbo.Tenants', N'U')       IS NOT NULL DROP TABLE dbo.Tenants;
GO

/* ---------------------------------------------------------------- Tenants -- */
CREATE TABLE dbo.Tenants
(
    Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Tenants_Id        DEFAULT NEWSEQUENTIALID(),
    Name         NVARCHAR(120)    NOT NULL,
    Email        NVARCHAR(256)    NOT NULL,
    Phone        NVARCHAR(40)     NULL,
    Unit         NVARCHAR(40)     NOT NULL,
    Notes        NVARCHAR(MAX)    NULL,
    PasswordHash NVARCHAR(512)    NULL,   -- pbkdf2: <saltHex>:<keyHex>; null until set
    CreatedAt    DATETIME2(3)     NOT NULL CONSTRAINT DF_Tenants_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2(3)     NOT NULL CONSTRAINT DF_Tenants_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Tenants        PRIMARY KEY (Id),
    CONSTRAINT UQ_Tenants_Email  UNIQUE (Email)
);
GO

/* ------------------------------------------------------------ Contractors -- */
CREATE TABLE dbo.Contractors
(
    Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Contractors_Id        DEFAULT NEWSEQUENTIALID(),
    Name         NVARCHAR(120)    NOT NULL,
    Company      NVARCHAR(120)    NULL,
    Email        NVARCHAR(256)    NOT NULL,
    Phone        NVARCHAR(40)     NULL,
    Trades       NVARCHAR(MAX)    NOT NULL CONSTRAINT DF_Contractors_Trades    DEFAULT N'[]',  -- JSON array of categories
    PasswordHash NVARCHAR(512)    NOT NULL,
    Active       BIT              NOT NULL CONSTRAINT DF_Contractors_Active     DEFAULT 1,
    CreatedAt    DATETIME2(3)     NOT NULL CONSTRAINT DF_Contractors_CreatedAt  DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2(3)     NOT NULL CONSTRAINT DF_Contractors_UpdatedAt  DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Contractors        PRIMARY KEY (Id),
    CONSTRAINT UQ_Contractors_Email  UNIQUE (Email)
);
GO

/* ---------------------------------------------------------------- Tickets -- */
CREATE TABLE dbo.Tickets
(
    Id                    UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Tickets_Id               DEFAULT NEWSEQUENTIALID(),
    TenantId              UNIQUEIDENTIFIER NOT NULL,
    Category              NVARCHAR(40)     NOT NULL,   -- Plumbing | Appliance | HVAC | Electrical | Pest | Other
    Title                 NVARCHAR(120)    NOT NULL,
    Description           NVARCHAR(MAX)    NOT NULL,
    Urgency               NVARCHAR(20)     NOT NULL CONSTRAINT DF_Tickets_Urgency          DEFAULT N'normal',
    Status                NVARCHAR(20)     NOT NULL CONSTRAINT DF_Tickets_Status           DEFAULT N'open',
    AdminNotes            NVARCHAR(MAX)    NULL,
    -- Contractor assignment
    ContractorId          UNIQUEIDENTIFIER NULL,
    AssignmentStatus      NVARCHAR(20)     NOT NULL CONSTRAINT DF_Tickets_AssignmentStatus DEFAULT N'unassigned',
    EtaAt                 DATETIME2(3)     NULL,
    EstimatedDurationMins INT              NULL,
    AssignedAt            DATETIME2(3)     NULL,
    ContractorNotes       NVARCHAR(MAX)    NULL,
    CreatedAt             DATETIME2(3)     NOT NULL CONSTRAINT DF_Tickets_CreatedAt        DEFAULT SYSUTCDATETIME(),
    UpdatedAt             DATETIME2(3)     NOT NULL CONSTRAINT DF_Tickets_UpdatedAt        DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Tickets PRIMARY KEY (Id),
    CONSTRAINT FK_Tickets_Tenant
        FOREIGN KEY (TenantId)     REFERENCES dbo.Tenants(Id)     ON DELETE CASCADE,
    CONSTRAINT FK_Tickets_Contractor
        FOREIGN KEY (ContractorId) REFERENCES dbo.Contractors(Id) ON DELETE SET NULL
);
GO

CREATE INDEX IX_Tickets_TenantId     ON dbo.Tickets(TenantId);
CREATE INDEX IX_Tickets_ContractorId ON dbo.Tickets(ContractorId);
GO

/* ----------------------------------------------------------- TicketOffers -- */
/* A job offer to a contractor. Many contractors may be offered a ticket, but
   only one can accept it (enforced by the atomic claim in usp_Ticket_Accept). */
CREATE TABLE dbo.TicketOffers
(
    Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_TicketOffers_Id        DEFAULT NEWSEQUENTIALID(),
    TicketId     UNIQUEIDENTIFIER NOT NULL,
    ContractorId UNIQUEIDENTIFIER NOT NULL,
    Status       NVARCHAR(20)     NOT NULL CONSTRAINT DF_TicketOffers_Status    DEFAULT N'open',  -- open | declined
    CreatedAt    DATETIME2(3)     NOT NULL CONSTRAINT DF_TicketOffers_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TicketOffers PRIMARY KEY (Id),
    CONSTRAINT UQ_TicketOffers_Ticket_Contractor UNIQUE (TicketId, ContractorId),
    CONSTRAINT FK_TicketOffers_Ticket
        FOREIGN KEY (TicketId)     REFERENCES dbo.Tickets(Id)     ON DELETE CASCADE,
    -- NO ACTION to avoid multiple-cascade-path conflicts; the contractor delete
    -- proc removes offers explicitly before deleting the contractor.
    CONSTRAINT FK_TicketOffers_Contractor
        FOREIGN KEY (ContractorId) REFERENCES dbo.Contractors(Id) ON DELETE NO ACTION
);
GO

CREATE INDEX IX_TicketOffers_ContractorId ON dbo.TicketOffers(ContractorId);
GO

/* --------------------------------------------------------- Notifications -- */
CREATE TABLE dbo.Notifications
(
    Id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Notifications_Id         DEFAULT NEWSEQUENTIALID(),
    Subject    NVARCHAR(200)    NOT NULL,
    Body       NVARCHAR(MAX)    NOT NULL,
    Recipients NVARCHAR(MAX)    NOT NULL,   -- JSON array of tenant ids or "all"
    Channels   NVARCHAR(200)    NOT NULL CONSTRAINT DF_Notifications_Channels   DEFAULT N'["email"]',
    SentCount  INT              NOT NULL CONSTRAINT DF_Notifications_SentCount   DEFAULT 0,
    SentAt     DATETIME2(3)     NOT NULL CONSTRAINT DF_Notifications_SentAt      DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Notifications PRIMARY KEY (Id)
);
GO

/* ------------------------------------------------------------- MagicLinks -- */
/* Legacy table kept for parity with the original schema (tenant login is now
   password-based, so this is currently unused). */
CREATE TABLE dbo.MagicLinks
(
    Id        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_MagicLinks_Id        DEFAULT NEWSEQUENTIALID(),
    Email     NVARCHAR(256)    NOT NULL,
    TokenHash NVARCHAR(256)    NOT NULL,
    ExpiresAt DATETIME2(3)     NOT NULL,
    UsedAt    DATETIME2(3)     NULL,
    CreatedAt DATETIME2(3)     NOT NULL CONSTRAINT DF_MagicLinks_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_MagicLinks         PRIMARY KEY (Id),
    CONSTRAINT UQ_MagicLinks_TokenHash UNIQUE (TokenHash)
);
GO

CREATE INDEX IX_MagicLinks_Email ON dbo.MagicLinks(Email);
GO

PRINT 'Schema created.';
GO
