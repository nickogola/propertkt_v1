# ProperTkt API (.NET 10 + MSSQL)

A .NET Core Web API backend for ProperTkt, replacing the original Next.js API
routes and Prisma/SQLite. All data access goes through **stored procedures**;
tables, procedures, and seed data are provided as SQL scripts.

## Layout

```
api/
  database/
    00_database.sql          -- creates the PropertKt database
    01_schema.sql            -- tables (Tenants, Contractors, Tickets, TicketOffers, Notifications, MagicLinks)
    02_stored_procedures.sql -- all CRUD + workflow procedures
    03_seed.sql              -- demo tenants, contractors, and sample tickets
  PropertKt.Api/             -- ASP.NET Core Web API (controllers)
  PropertKt.sln
```

## 1. Create the database

Run the SQL scripts in order against your SQL Server instance (SQLCMD shown; SSMS
or Azure Data Studio work too):

```powershell
sqlcmd -S localhost -E -i database\00_database.sql
sqlcmd -S localhost -E -d PropertKt -i database\01_schema.sql
sqlcmd -S localhost -E -d PropertKt -i database\02_stored_procedures.sql
sqlcmd -S localhost -E -d PropertKt -i database\03_seed.sql
```

`-E` uses Windows auth. For SQL auth use `-U <user> -P <password>` and update the
connection string below to match.

## 2. Configure

Edit `PropertKt.Api/appsettings.json` (or use environment variables / user-secrets):

| Setting                      | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `ConnectionStrings:Default`  | SQL Server connection string                         |
| `Jwt:Secret`                 | **≥ 32 chars**; signs session tokens                 |
| `Admin:Email` / `Admin:Password` | Landlord/admin login (not stored in the DB)      |
| `App:Url`                    | Frontend URL used in notification links              |
| `Cors:Origins`               | Allowed browser origins                              |
| `Resend:*` / `Twilio:*`      | Optional email / WhatsApp providers (logs when blank)|

> Do not ship the sample `Jwt:Secret` / `Admin:Password`. Override them in
> production via environment variables or `dotnet user-secrets`.

## 3. Run

```powershell
cd PropertKt.Api
dotnet run
```

The API listens on the Kestrel ports in `Properties/launchSettings.json`
(https by default).

## Demo credentials

| Role       | Email                     | Password       |
| ---------- | ------------------------- | -------------- |
| Admin      | admin@localhost           | admin123       |
| Tenant     | tenant1@example.com       | tenant123      |
| Contractor | plumber@example.com       | contractor123  |

(also `tenant2@`, `tenant3@`, `electric@`, `handyman@`.)

## Endpoints

Auth (`/api/auth`): `admin/login`, `tenant/login`, `contractor/login`,
`contractor/signup`, `logout`. On success a JWT is returned in the body **and**
set as an httpOnly `pm_session` cookie; requests may authenticate with either the
cookie or an `Authorization: Bearer <token>` header.

| Method / Route                     | Role        | Purpose                             |
| ---------------------------------- | ----------- | ----------------------------------- |
| `GET  /api/tenants`                | admin       | list tenants                        |
| `POST /api/tenants`                | admin       | create tenant                       |
| `PATCH/DELETE /api/tenants/{id}`   | admin       | update / delete tenant              |
| `GET  /api/contractors`            | admin       | list contractors                    |
| `POST /api/contractors`            | admin       | create contractor                   |
| `PATCH/DELETE /api/contractors/{id}`| admin      | update / delete contractor          |
| `GET  /api/tickets`                | any         | role-scoped ticket lists            |
| `POST /api/tickets`                | tenant      | create ticket                       |
| `PATCH /api/tickets/{id}`          | admin       | update status / notes               |
| `POST /api/tickets/{id}/assign`    | admin       | direct-assign or broadcast-offer    |
| `POST /api/tickets/{id}/accept`    | contractor  | claim an offered job (one winner)   |
| `PATCH /api/tickets/{id}/progress` | contractor  | ETA / status / notes updates        |
| `POST /api/notify`                 | admin       | email / WhatsApp blast to tenants   |

## Notes

- **Passwords**: PBKDF2-SHA256, 100k iterations, stored as `<saltHex>:<keyHex>`.
  The seed hashes were pre-computed to match `Services/PasswordHasher`.
- **One contractor per ticket**: `usp_Ticket_Claim` performs an atomic
  `UPDATE ... WHERE ContractorId IS NULL`, so concurrent accepts can't double-book.
- **Ids** are `UNIQUEIDENTIFIER`, serialized as strings in JSON.
