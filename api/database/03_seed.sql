/* ============================================================================
   ProperTkt — Demo data seeding
   Run against the PropertKt database:
     sqlcmd -S localhost -E -d PropertKt -i 03_seed.sql

   Demo credentials:
     Tenants     tenant1@example.com / tenant123      (also tenant2@, tenant3@)
     Contractors plumber@example.com / contractor123  (also electric@, handyman@)
     Admin       comes from API configuration (appsettings), not the database.

   Password hashes below are PBKDF2-SHA256, 100,000 iterations, 32-byte key,
   stored as "<saltHex>:<keyHex>" — matching PasswordHasher in the API.
   Re-runnable: existing rows (matched by email) are skipped.
   ============================================================================ */

USE [PropertKt];
GO

SET NOCOUNT ON;

/* --------------------------------------------------------------- Tenants -- */
DECLARE @Tenant1 UNIQUEIDENTIFIER, @Tenant2 UNIQUEIDENTIFIER, @Tenant3 UNIQUEIDENTIFIER;

MERGE dbo.Tenants AS tgt
USING (VALUES
    (N'Unit 1 Tenant', N'tenant1@example.com', N'555-0101', N'1',
     N'7600c5d1c9891efefc0c8eddb56f9dcc:f4e9105c0c72ca49763ac93ff192d1462c59fcc9a600dcfd687b11a76d47fdcc'),
    (N'Unit 2 Tenant', N'tenant2@example.com', N'555-0102', N'2',
     N'0704c19800772ec3d90a1641e6b61209:da038399c0c0893cda85b35a47ad1b2a5687fa0ab018ac1b3e1c12f34d60b3c1'),
    (N'Unit 3 Tenant', N'tenant3@example.com', N'555-0103', N'3',
     N'797ce212b5b2cb5df7386090dfc562da:abb152389f7c879b7fe13c05b2230f6547444738ddc6bad156481af9d47c1f13')
) AS src (Name, Email, Phone, Unit, PasswordHash)
    ON tgt.Email = src.Email
WHEN NOT MATCHED THEN
    INSERT (Name, Email, Phone, Unit, PasswordHash)
    VALUES (src.Name, src.Email, src.Phone, src.Unit, src.PasswordHash);

SELECT @Tenant1 = Id FROM dbo.Tenants WHERE Email = N'tenant1@example.com';
SELECT @Tenant2 = Id FROM dbo.Tenants WHERE Email = N'tenant2@example.com';
SELECT @Tenant3 = Id FROM dbo.Tenants WHERE Email = N'tenant3@example.com';

/* ----------------------------------------------------------- Contractors -- */
MERGE dbo.Contractors AS tgt
USING (VALUES
    (N'Pat Rivera', N'Rivera Plumbing',       N'plumber@example.com',  N'555-0201', N'["Plumbing","Appliance"]',
     N'6d294d9655ca9725ebcafd578b8a398a:46fa7fcc4622e1b68fb4326c5168b49cbb9fb72b3572cc63f94d94c9395f1d06'),
    (N'Sam Cole',   N'Cole Electric & HVAC',  N'electric@example.com', N'555-0202', N'["Electrical","HVAC"]',
     N'3aa80f05e91fb8b3593af1a758b53fb1:6923e8af2b49eb3409f6e86109b4e339edefe1c226090688580249e4517a099e'),
    (N'Jordan Fix', NULL,                      N'handyman@example.com', N'555-0203', N'["Appliance","Pest","Other"]',
     N'cfe88aa97fc8ef897fa9d757931226e3:b70a0218af64a7b6067dd9d078e13bae13a25ac661245c494fee8a916d04583b')
) AS src (Name, Company, Email, Phone, Trades, PasswordHash)
    ON tgt.Email = src.Email
WHEN NOT MATCHED THEN
    INSERT (Name, Company, Email, Phone, Trades, PasswordHash, Active)
    VALUES (src.Name, src.Company, src.Email, src.Phone, src.Trades, src.PasswordHash, 1);

/* ---------------------------------------------------------------- Tickets -- */
/* A couple of sample tickets so the portals aren't empty on first run. */
IF NOT EXISTS (SELECT 1 FROM dbo.Tickets)
BEGIN
    INSERT INTO dbo.Tickets (TenantId, Category, Title, Description, Urgency, Status)
    VALUES
        (@Tenant1, N'Plumbing',   N'Leaking kitchen faucet',
         N'The kitchen faucet drips constantly and the cabinet underneath is getting damp.', N'high',   N'open'),
        (@Tenant2, N'Electrical', N'Outlet in bedroom not working',
         N'The outlet by the window stopped working. Breaker looks fine.', N'normal', N'open'),
        (@Tenant3, N'HVAC',       N'AC not cooling',
         N'The A/C runs but only blows warm air. It is getting quite hot in the unit.', N'emergency', N'open');
END

PRINT 'Seed complete.';
PRINT 'Tenants: tenant1@example.com / tenant123  (also tenant2@, tenant3@)';
PRINT 'Contractors: plumber@example.com / contractor123  (also electric@, handyman@)';
GO
