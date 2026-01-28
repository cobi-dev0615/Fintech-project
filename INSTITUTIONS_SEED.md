# Institutions Database Seed

This document describes the institutions seed script that populates the database with banks and brokers from the provided image.

## Institutions Included

### Pessoa Física (Individual) - 32 Banks
1. Itaú
2. XP Banking
3. Bradesco
4. Mercado Pago
5. Santander
6. Banco do Brasil
7. Nubank
8. Caixa Econômica Federal
9. C6 Bank
10. Safra
11. Itaú Cartões
12. PicPay
13. Banco PAN
14. Sicoob
15. Banrisul
16. Sicredi
17. Unicred
18. Banco do Nordeste do Brasil
19. BTGPactual
20. Neon
21. PagBank
22. SafraPay
23. Safra Financeira
24. Banco Sofisa
25. RecargaPay
26. Bradescard
27. Necton
28. Santander Cartões
29. Banco BRB
30. Inter
31. Porto Bank
32. Dock

### Pessoa Jurídica (Legal Entity) - 5 Banks
1. Itaú Empresas
2. Bradesco Empresas
3. Santander Empresas
4. Banco do Brasil Empresas
5. Banrisul Empresas

### Corretoras (Brokers) - 11 Brokers
1. Rico Investimentos
2. BTGPactual Investimentos
3. Ágora Investimentos
4. Clear Corretora
5. Investimentos BB
6. Ion
7. Monte Bravo
8. Toro Investimentos
9. EQI
10. Santander Corretora
11. Santander Corretora Empresas

## How to Run the Seed Script

From the backend directory:

```bash
cd backend
npm run db:seed-institutions
```

Or directly with tsx:

```bash
cd backend
tsx src/db/seed-institutions.ts
```

## Database Structure

The script creates institutions with:
- `provider`: 'open_finance'
- `name`: The institution name
- `external_id`: A unique identifier based on category and name
  - Individual banks: `individual_{name}`
  - Legal entity banks: `legal_{name}`
  - Brokers: `broker_{name}`
- `enabled`: `true` (all institutions are enabled by default)

## Admin Panel Display

The admin panel at `/admin/institutions` displays institutions in three tabs:
- **Pessoa Física**: Individual banks
- **Pessoa Jurídica**: Legal entity banks
- **Corretoras**: Brokers

Each institution can be enabled/disabled individually, and changes are saved in bulk.
