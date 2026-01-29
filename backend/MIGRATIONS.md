# Database migrations

## Strategy

- **Single migration root**: All incremental migrations live in `src/db/migrations/` and are run in **filename order** (e.g. `001_*.sql`, `002_*.sql`, … `018_*.sql`). The former root-level `backend/migrations/` (Pluggy tables, card balance, system settings) has been merged into `src/db/migrations/` as `016_pluggy_tables.sql`, `017_add_card_balance.sql`, and `018_system_settings.sql`.
- **Base schema**: `schema.sql` at the project root is the full schema for a **fresh install**. Use it when creating a new database from scratch.
- **Incremental migrations**: Use `npm run db:migrate` to apply all migrations in `src/db/migrations/` in order. Safe to run on existing DBs (migrations use `IF NOT EXISTS` / `ON CONFLICT` where appropriate).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run db:schema` | Apply base schema (fresh DB only). Runs `schema.sql` via `psql`. |
| `npm run db:migrate` | Run all migrations in `src/db/migrations/` in order. Use for existing DBs or after schema. |

## Workflows

**New database (empty):**

1. Create DB and run base schema:  
   `psql $DATABASE_URL -f schema.sql` or `npm run db:schema`
2. Run incremental migrations:  
   `npm run db:migrate`

**Existing database (already has schema):**

- Run only:  
  `npm run db:migrate`

## Adding a new migration

1. Add a new file in `src/db/migrations/` with the next number and a descriptive name, e.g. `019_add_feature_xyz.sql`.
2. Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc. so the migration is idempotent.
3. Run `npm run db:migrate` to apply it.

The runner discovers all `.sql` files in `src/db/migrations/`, sorts them by name, and runs them in order. No need to edit `run-migration.ts` when adding a new file.
