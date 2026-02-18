import { db } from '../db/connection.js';
import {
  getAccounts,
  getTransactions,
  getCreditCards,
  getCreditCardInvoices,
  getInvestments,
} from './pluggy.js';

/**
 * Sync all Pluggy data for a given itemId
 */
export async function syncPluggyData(userId: string, itemId: string): Promise<void> {
  try {
    console.log(`Starting sync for user ${userId}, itemId ${itemId}`);

    // Sync accounts
    await syncPluggyAccounts(userId, itemId);

    // Sync transactions for all accounts
    await syncPluggyTransactions(userId, itemId);

    // Sync credit cards
    await syncPluggyCreditCards(userId, itemId);

    // Sync investments
    await syncPluggyInvestments(userId, itemId);

    console.log(`Sync completed for user ${userId}, itemId ${itemId}`);
  } catch (error: any) {
    console.error(`Error syncing Pluggy data for itemId ${itemId}:`, error);
    throw error;
  }
}

/**
 * Sync Pluggy accounts
 */
async function syncPluggyAccounts(userId: string, itemId: string): Promise<void> {
  try {
    const accounts = await getAccounts(itemId);

    for (const account of accounts) {
      const accountId = account.id?.toString() || '';
      const name = account.name || account.number || 'Conta';
      const type = account.subtype || account.type || 'checking';
      const currency = account.currencyCode || 'BRL';
      
      // Handle balance - can be a number or an object with current/available
      let currentBalance = 0;
      let availableBalance = null;
      
      if (typeof account.balance === 'number') {
        currentBalance = account.balance;
      } else if (account.balance?.current !== undefined) {
        currentBalance = parseFloat(account.balance.current.toString()) || 0;
        availableBalance = account.balance.available 
          ? parseFloat(account.balance.available.toString()) 
          : null;
      } else if (account.balance !== undefined) {
        currentBalance = parseFloat(account.balance.toString()) || 0;
      }

      await db.query(
        `INSERT INTO pluggy_accounts (
          user_id, item_id, pluggy_account_id, name, type, currency,
          current_balance, available_balance, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (user_id, pluggy_account_id)
        DO UPDATE SET
          name = $4,
          type = $5,
          currency = $6,
          current_balance = $7,
          available_balance = $8,
          updated_at = NOW()`,
        [userId, itemId, accountId, name, type, currency, currentBalance, availableBalance]
      );
    }

    console.log(`Synced ${accounts.length} accounts for itemId ${itemId}`);
  } catch (error: any) {
    console.error(`Error syncing accounts for itemId ${itemId}:`, error);
    throw error;
  }
}

/**
 * Sync Pluggy transactions
 */
async function syncPluggyTransactions(userId: string, itemId: string): Promise<void> {
  try {
    // First get all accounts to sync transactions for each
    const accountsResult = await db.query(
      'SELECT pluggy_account_id FROM pluggy_accounts WHERE user_id = $1 AND item_id = $2',
      [userId, itemId]
    );

    let totalTransactions = 0;

    for (const accountRow of accountsResult.rows) {
      const accountId = accountRow.pluggy_account_id;
      
      // Fetch transactions for this account
      const transactionsData = await getTransactions(accountId, {
        pageSize: 500, // Get up to 500 transactions per account
      });

      for (const tx of transactionsData.results || []) {
        const txId = tx.id?.toString() || '';
        const date = tx.date ? new Date(tx.date) : new Date();
        const amount = tx.amount ? parseFloat(tx.amount.toString()) : 0;
        const description = tx.description || tx.merchant || '';
        const category = tx.category || null;
        const merchant = tx.merchant || null;
        const status = tx.status || null;

        await db.query(
          `INSERT INTO pluggy_transactions (
            user_id, item_id, pluggy_transaction_id, pluggy_account_id,
            date, amount, description, category, merchant, status, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (user_id, pluggy_transaction_id)
          DO UPDATE SET
            date = $5,
            amount = $6,
            description = $7,
            category = CASE WHEN pluggy_transactions.category_is_manual THEN pluggy_transactions.category ELSE $8 END,
            merchant = $9,
            status = $10`,
          [userId, itemId, txId, accountId, date, amount, description, category, merchant, status]
        );
        totalTransactions++;
      }
    }

    console.log(`Synced ${totalTransactions} transactions for itemId ${itemId}`);
  } catch (error: any) {
    console.error(`Error syncing transactions for itemId ${itemId}:`, error);
    throw error;
  }
}

/**
 * Sync Pluggy credit cards
 * Credit cards come as accounts with type CREDIT and subtype CREDIT_CARD
 */
async function syncPluggyCreditCards(userId: string, itemId: string): Promise<void> {
  try {
    // Get all accounts and filter for credit cards
    const accounts = await getAccounts(itemId);
    const creditCardAccounts = accounts.filter(
      (acc: any) => acc.type === 'CREDIT' && acc.subtype === 'CREDIT_CARD'
    );

    for (const account of creditCardAccounts) {
      const cardId = account.id?.toString() || '';
      const creditData = account.creditData || {};
      
      // Extract credit card information
      const brand = creditData.brand || account.brand || null;
      const last4 = account.number || creditData.number || null; // Last 4 digits
      const creditLimit = creditData.creditLimit 
        ? parseFloat(creditData.creditLimit.toString()) 
        : null;
      const availableCreditLimit = creditData.availableCreditLimit 
        ? parseFloat(creditData.availableCreditLimit.toString()) 
        : null;
      
      // Balance represents the current invoice balance (amount used/owed)
      // For credit cards, balance is the amount currently owed
      const currentBalance = typeof account.balance === 'number' 
        ? parseFloat(account.balance.toString()) 
        : (account.balance?.current ? parseFloat(account.balance.current.toString()) : 0);

      await db.query(
        `INSERT INTO pluggy_credit_cards (
          user_id, item_id, pluggy_card_id, brand, last4, "limit", available_limit, balance, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (user_id, pluggy_card_id)
        DO UPDATE SET
          brand = $4,
          last4 = $5,
          "limit" = $6,
          available_limit = $7,
          balance = $8,
          updated_at = NOW()`,
        [userId, itemId, cardId, brand, last4, creditLimit, availableCreditLimit, currentBalance]
      );

      // Sync invoices for this card
      try {
        const invoices = await getCreditCardInvoices(cardId);
        for (const invoice of invoices) {
          const invoiceId = invoice.id?.toString() || '';
          // Try multiple possible date fields
          const dueDate = invoice.dueDate 
            ? new Date(invoice.dueDate) 
            : (invoice.balanceDueDate ? new Date(invoice.balanceDueDate) : null);
          
          // Try multiple possible amount fields
          const amount = invoice.totalAmount 
            ? parseFloat(invoice.totalAmount.toString())
            : (invoice.amount ? parseFloat(invoice.amount.toString()) : 0);
          
          const status = invoice.status || null;

          await db.query(
            `INSERT INTO pluggy_card_invoices (
              pluggy_invoice_id, pluggy_card_id, user_id, item_id,
              due_date, amount, status, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (pluggy_invoice_id)
            DO UPDATE SET
              due_date = $5,
              amount = $6,
              status = $7,
              updated_at = NOW()`,
            [invoiceId, cardId, userId, itemId, dueDate, amount, status]
          );
        }
      } catch (invoiceError: any) {
        console.warn(`Error syncing invoices for card ${cardId}:`, invoiceError);
        // Continue with other cards
      }
    }

    console.log(`Synced ${creditCardAccounts.length} credit cards for itemId ${itemId}`);
  } catch (error: any) {
    console.error(`Error syncing credit cards for itemId ${itemId}:`, error);
    // Don't throw - credit cards might not be available for all connections
  }
}

/**
 * Sync Pluggy investments
 */
async function syncPluggyInvestments(userId: string, itemId: string): Promise<void> {
  try {
    const investments = await getInvestments(itemId);

    for (const investment of investments) {
      const investmentId = investment.id?.toString() || '';
      const name = investment.name || investment.description || 'Investimento';
      const type = investment.type || 'other';
      const quantity = investment.quantity 
        ? parseFloat(investment.quantity.toString()) 
        : null;
      const unitPrice = investment.price 
        ? parseFloat(investment.price.toString()) 
        : null;
      const currentValue = investment.value 
        ? parseFloat(investment.value.toString()) 
        : 0;
      const profitability = investment.profitability 
        ? parseFloat(investment.profitability.toString()) 
        : null;

      await db.query(
        `INSERT INTO pluggy_investments (
          user_id, item_id, pluggy_investment_id, name, type,
          quantity, unit_price, current_value, profitability, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (user_id, pluggy_investment_id)
        DO UPDATE SET
          name = $4,
          type = $5,
          quantity = $6,
          unit_price = $7,
          current_value = $8,
          profitability = $9,
          updated_at = NOW()`,
        [userId, itemId, investmentId, name, type, quantity, unitPrice, currentValue, profitability]
      );
    }

    console.log(`Synced ${investments.length} investments for itemId ${itemId}`);
  } catch (error: any) {
    console.error(`Error syncing investments for itemId ${itemId}:`, error);
    // Don't throw - investments might not be available for all connections
  }
}
