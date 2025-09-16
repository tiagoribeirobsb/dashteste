# Instruções de Entrega à Equipe (Supabase Multi-tenant 2025)

## O que enviar
- O pacote ZIP completo com as migrações.
- Destaque para o arquivo **080_hardened_patch.sql** (aplica os ajustes finais).

## Ordem sugerida de aplicação (ambiente DEV primeiro)
1. 000_init.sql
2. 010_roles_schemas.sql
3. 020_tables.sql
4. 030_rls_policies.sql
5. 040_mart_internal.sql  (opcional; se usarem MV interna)
6. 050_api_views.sql
7. 060_grants_hardening.sql
8. 070_sample_data.sql     (opcional, validação)
9. **080_hardened_patch.sql** (patch consolidado que alinha com boas práticas 09/2025)

## Ajustes no Supabase (Dashboard)
- Settings > API > Exposed Schemas: **apenas `api`**
- NOTIFY pgrst, 'reload schema' após criar/alterar views
- Nunca usar `service_role` no client; JWT `authenticated` deve carregar `tenant_id`

## Teste rápido de isolamento
-- Sessão admin:
SET LOCAL request.jwt.claims = '{"tenant_id":"11111111-1111-1111-1111-111111111111"}';
SELECT * FROM api.vw_sales_daily LIMIT 5;

SET LOCAL request.jwt.claims = '{"tenant_id":"22222222-2222-2222-2222-222222222222"}';
SELECT * FROM api.vw_sales_daily LIMIT 5;

## Observação
Aquele texto “# Fix and re-run creation of the migration package” era apenas uma anotação de console do notebook. **Não faz parte do pacote** e deve ser ignorado.
