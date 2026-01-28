# Pluggy (Open Finance) Integration

This document describes the Pluggy Open Finance integration that allows users to connect their bank accounts and view balances, transactions, investments, and credit card information.

## Configuration

### Environment Variables

The following environment variables have been added to `backend/.env`:

```env
PLUGGY_CLIENT_ID=e2b456e2-1573-4d39-9bf0-759d9b6cf675
PLUGGY_CLIENT_SECRET=5c3e7c95-67ac-43e1-aaca-75b9066031e2
PLUGGY_API_URL=https://api.pluggy.ai
```

## Backend Implementation

### 1. Pluggy Service (`backend/src/services/pluggy.ts`)

A comprehensive service that handles all Pluggy API interactions:

- **Authentication**: Automatically manages API key authentication (2-hour expiration)
- **Connect Tokens**: Creates tokens for frontend widget (30-minute expiration)
- **Institutions**: Fetches available banks from Pluggy
- **Data Fetching**: 
  - Accounts (bank accounts with balances)
  - Transactions (account transaction history)
  - Credit Cards (cards with limits and invoices)
  - Investments (CDBs, LCIs, LCAs, Funds, etc.)

### 2. Connections Route (`backend/src/routes/connections.ts`)

Updated to integrate with Pluggy:

- **GET `/connections/institutions`**: Fetches and syncs institutions from Pluggy
- **GET `/connections/connect-token`**: Generates connect token for frontend widget
- **POST `/connections`**: Creates connection after Pluggy widget success (receives `itemId`)
- **POST `/connections/:id/sync`**: Syncs all data (accounts, transactions, credit cards, investments)
- **POST `/connections/webhook/pluggy`**: Webhook handler for Pluggy status updates
- **DELETE `/connections/:id`**: Deletes connection from both Pluggy and database

### 3. Data Synchronization

The system automatically syncs:

- **Bank Accounts**: Balance, account type, currency
- **Transactions**: History with amounts, dates, descriptions, categories
- **Credit Cards**: Card details, limits, invoices, invoice items
- **Investments**: Holdings including CDBs, LCIs, LCAs, Funds, Stocks, ETFs

## Frontend Implementation

### 1. Pluggy Connect Widget

The widget is loaded from Pluggy's CDN in `index.html`:

```html
<script src="https://cdn.pluggy.ai/pluggy-connect/v1/pluggy-connect.js"></script>
```

### 2. Connections Page (`frontend/src/pages/Connections.tsx`)

Updated to use Pluggy Connect widget:

- When user selects "Open Finance" and clicks "Criar Conexão":
  1. Fetches connect token from backend
  2. Initializes Pluggy Connect widget
  3. Opens widget for user to select and connect their bank
  4. On success, creates connection in database with `itemId`
  5. Automatically syncs data

- **Sync Button**: Allows manual synchronization of connection data
- **Status Display**: Shows connection status (connected, pending, failed, needs_reauth)

### 3. Data Display Pages

The following pages already exist and will display synced data:

- **Accounts Page** (`/app/accounts`): Shows bank account balances and transactions
- **Investments Page** (`/app/investments`): Displays investment holdings
- **Cards Page** (`/app/cards`): Shows credit cards and invoices

## Available Data

Once a bank is connected, users can view:

### Current Accounts
- Balance for all accounts
- Account statements
- Account types (checking, savings, etc.)

### Investments
- CDBs (Certificados de Depósito Bancário)
- LCIs (Letras de Crédito Imobiliário)
- LCAs (Letras de Crédito do Agronegócio)
- Funds (Fundos de Investimento)
- Stocks (Ações)
- ETFs
- Other investment types

### Credit Cards
- Card limits
- Invoices (faturas)
- Invoice items (transactions on each invoice)
- Due dates and payment status

### Transactions
- Complete transaction history
- Amounts, dates, descriptions
- Categories and merchants
- Filtering and pagination

## Supported Banks

The integration supports all banks available in Pluggy's Open Finance network, including:

- Itaú
- Bradesco
- Banco do Brasil
- Santander
- Nubank
- Caixa Econômica Federal
- C6 Bank
- Inter
- And many more...

The list is automatically synced from Pluggy when institutions are fetched.

## Usage Flow

1. **User clicks "Nova Conexão"** on Connections page
2. **Selects "Open Finance"** as provider
3. **Clicks "Criar Conexão"**
4. **Pluggy Connect widget opens** showing available banks
5. **User selects their bank** and authenticates
6. **Connection is created** in database with `itemId`
7. **Data is automatically synced** (accounts, transactions, investments, credit cards)
8. **User can view data** on Accounts, Investments, and Cards pages
9. **User can manually sync** using the "Sincronizar" button

## Webhook Configuration

To receive real-time updates from Pluggy, configure the webhook URL in Pluggy dashboard:

```
https://zurt.com.br/api/connections/webhook/pluggy
```

The webhook handles:
- Connection status updates
- Automatic data synchronization when connection becomes active
- Error notifications

## Notes

- API keys are automatically cached and refreshed (2-hour expiration)
- Connect tokens expire after 30 minutes
- Data sync can be triggered manually or automatically via webhook
- All data is stored in the database for offline access
- The system handles missing data gracefully (returns empty arrays)
