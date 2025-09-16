# Supabase/Postgres Migration Package (Multi-tenant + RLS + API Views)
**Date:** 2025-09-13

## Overview
This package sets up:
- Schemas: `core` (landing), `mart` (internal analytics), `api` (exposed)
- Roles: `metaread` (read-only), `loader` (ETL)
- RLS with `FORCE ROW LEVEL SECURITY` on base tables
- Internal materialized views (`mart.*`) **not exposed** to clients
- RLS-safe API views (`api.*`) with `security_invoker=true` and `security_barrier=true`

## Files and Order
1. 000_init.sql
2. 010_roles_schemas.sql
3. 020_tables.sql
4. 030_rls_policies.sql
5. 040_mart_internal.sql
6. 050_api_views.sql
7. 060_grants_hardening.sql
8. 070_sample_data.sql (optional for validation)
9. 999_rollback.sql (DANGER)

## Supabase Configuration Notes
- In **Project Settings → API**, set **Exposed Schemas** to include **only `api`** (and any others you intentionally expose). Prefer **not** to expose `public`.
- Remember that `service_role` bypasses RLS. Never use it in the client.
- Application clients should authenticate as `authenticated` and carry a `tenant_id` claim inside the JWT.

## Validation Steps
1. Run `000` → `060`. Optionally run `070_sample_data.sql`.
2. Insert a test user/JWT with `tenant_id = 11111111-1111-1111-1111-111111111111` and query `api.vw_*`:
   ```sql
   -- Example (psql session emulation of Supabase JWT is not trivial).
   -- You can test data presence as superuser (bypasses RLS):
   SELECT * FROM api.vw_vendas_diario ORDER BY data_venda DESC LIMIT 10;
   SELECT * FROM api.vw_financeiro_mensal ORDER BY mes DESC LIMIT 10;
   ```
3. Refresh internal marts after loading data:
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY mart.mv_vendas_diario;
   ```

## Metabase
- Create a database user and attach it to role `metaread`.
- Point Metabase to the **same database**, restricting visibility to schema `api`.
- Build dashboards off `api.vw_*`. Avoid connecting Metabase to `core` or `mart` unless strictly needed.

## Notes
- Adjust column names/types to match your real ETL (Airbyte) payloads.
- Add more RLS policies for other tables as you grow (services, orders, items, etc.).
- Prefer dbt to build complex marts; keep MVs internal.
