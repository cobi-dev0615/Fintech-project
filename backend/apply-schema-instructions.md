# How to Apply Schema Changes to Database

## Option 1: Update Existing Plans (Recommended)
If your plans table already exists and you want to update the plan data:

```bash
npm run db:update-plans
```

This will:
- Update existing plans (Gratuito, Básico, Profissional) with new names, prices, and features
- Insert new plans if they don't exist

## Option 2: Full Schema Migration
If you want to apply the entire schema.sql file (creates tables if they don't exist):

```bash
npm run db:migrate:full
```

Or using psql directly:
```bash
npm run db:migrate
```

## Option 3: Manual SQL Execution
You can also run SQL commands manually using psql:

```bash
psql $DATABASE_URL -f schema.sql
```

Or connect to your database and run the UPDATE statements:

```sql
UPDATE plans SET 
  name = 'Gratuito',
  features_json = '{"features":["1 conexão bancária","Dashboard básico","Cotações de mercado"]}'::jsonb
WHERE code = 'free';

UPDATE plans SET 
  name = 'Básico',
  price_cents = 2990,
  features_json = '{"features":["3 conexões bancárias","Relatórios mensais","Câmbio e Crédito","Suporte por email"]}'::jsonb
WHERE code = 'basic';

UPDATE plans SET 
  name = 'Profissional',
  price_cents = 7990,
  features_json = '{"features":["10 conexões bancárias","IA Financeira","Relatórios ilimitados","Suporte prioritário","Alertas personalizados"]}'::jsonb
WHERE code = 'pro';
```

## Verify Changes
After applying, verify the changes in your database:

```sql
SELECT code, name, price_cents, connection_limit, features_json 
FROM plans 
WHERE code IN ('free', 'basic', 'pro');
```
