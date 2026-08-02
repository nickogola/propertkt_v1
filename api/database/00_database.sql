/* ============================================================================
   ProperTkt — Database creation
   Run this first (against the master database) to create the PropertKt database.
   Usage (sqlcmd):
     sqlcmd -S localhost -E -i 00_database.sql
   ============================================================================ */

IF DB_ID(N'PropertKt') IS NULL
BEGIN
    PRINT 'Creating database [PropertKt]...';
    CREATE DATABASE [PropertKt];
END
ELSE
    PRINT 'Database [PropertKt] already exists.';
GO
