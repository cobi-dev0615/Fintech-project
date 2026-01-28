import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import {
  createConnectToken,
  getInstitutions as getPluggyInstitutions,
  getItem,
  getAccounts as getPluggyAccounts,
  getTransactions as getPluggyTransactions,
  getCreditCards as getPluggyCreditCards,
  getCreditCardInvoices,
  getInvestments as getPluggyInvestments,
  updateItem,
  deleteItem as deletePluggyItem,
} from '../services/pluggy.js';

// Helper function to sync account data
async function syncAccount(userId: string, connectionId: string, account: any) {
  try {
    const accountType = account.type === 'BANK' ? 
      (account.subtype === 'CHECKING_ACCOUNT' ? 'checking' : 
       account.subtype === 'SAVINGS_ACCOUNT' ? 'savings' : 
       'checking') : 'checking';

    // Insert or update account and get the account ID
    const accountResult = await db.query(
      `INSERT INTO bank_accounts (
        user_id, connection_id, external_account_id, account_type, 
        display_name, currency, balance_cents, last_refreshed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id, external_account_id)
      DO UPDATE SET
        balance_cents = $7,
        display_name = $5,
        last_refreshed_at = NOW(),
        updated_at = NOW()
      RETURNING id`,
      [
        userId,
        connectionId,
        account.id.toString(),
        accountType,
        account.name || account.number || 'Conta',
        account.currencyCode || 'BRL',
        Math.round((account.balance?.available || account.balance?.current || 0) * 100),
      ]
    );

    const accountId = accountResult.rows[0].id;

    // Sync transactions for this account
    try {
      const transactions = await getPluggyTransactions(account.id.toString(), {
        pageSize: 100,
      });

      for (const tx of transactions.results) {
        await db.query(
          `INSERT INTO transactions (
            user_id, account_id, connection_id, external_tx_id,
            occurred_at, description, merchant, category,
            amount_cents, currency, raw_payload
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (user_id, external_tx_id)
          DO UPDATE SET
            amount_cents = $9,
            description = $6,
            merchant = $7,
            category = $8,
            raw_payload = $11,
            updated_at = NOW()`,
          [
            userId,
            accountId,
            connectionId,
            tx.id?.toString() || `${account.id}-${tx.date}-${tx.amount}`,
            new Date(tx.date || tx.dateCreated || Date.now()),
            tx.description || tx.merchant || '',
            tx.merchant || null,
            tx.category || null,
            Math.round((tx.amount || 0) * 100),
            tx.currencyCode || account.currencyCode || 'BRL',
            JSON.stringify(tx),
          ]
        );
      }
    } catch (txError: any) {
      console.error('Error syncing transactions for account:', account.id, txError);
      // Don't throw - account sync succeeded even if transactions failed
    }
  } catch (error: any) {
    console.error('Error syncing account:', error);
    throw error;
  }
}

// Helper function to sync credit card data
async function syncCreditCard(userId: string, connectionId: string, card: any) {
  try {
    await db.query(
      `INSERT INTO credit_cards (
        user_id, connection_id, external_card_id, display_name,
        brand, last4, currency, limit_cents
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, external_card_id)
      DO UPDATE SET
        display_name = $4,
        limit_cents = $8,
        updated_at = NOW()`,
      [
        userId,
        connectionId,
        card.id.toString(),
        card.name || `Cartão ${card.last4 || ''}`,
        card.brand || null,
        card.last4 || null,
        card.currencyCode || 'BRL',
        card.creditLimit ? Math.round(card.creditLimit * 100) : null,
      ]
    );

    // Sync invoices for this card
    const invoices = await getCreditCardInvoices(card.id.toString());
    for (const invoice of invoices) {
      const invoiceResult = await db.query(
        `INSERT INTO card_invoices (
          user_id, card_id, external_invoice_id,
          period_start, period_end, due_date,
          total_cents, minimum_cents, status
        )
        VALUES (
          $1, 
          (SELECT id FROM credit_cards WHERE external_card_id = $2),
          $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (user_id, external_invoice_id)
        DO UPDATE SET
          total_cents = $7,
          minimum_cents = $8,
          status = $9,
          updated_at = NOW()
        RETURNING id`,
        [
          userId,
          card.id.toString(),
          invoice.id.toString(),
          invoice.startDate ? new Date(invoice.startDate) : null,
          invoice.endDate ? new Date(invoice.endDate) : null,
          invoice.dueDate ? new Date(invoice.dueDate) : null,
          invoice.totalAmount ? Math.round(invoice.totalAmount * 100) : 0,
          invoice.minimumAmount ? Math.round(invoice.minimumAmount * 100) : null,
          invoice.status || 'open',
        ]
      );

      // Sync invoice items if available
      if (invoiceResult.rows.length > 0 && invoice.items) {
        for (const item of invoice.items) {
          await db.query(
            `INSERT INTO invoice_items (
              user_id, invoice_id, external_item_id,
              occurred_at, description, merchant, category,
              amount_cents, currency, raw_payload
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (user_id, external_item_id)
            DO UPDATE SET
              amount_cents = $8,
              description = $5,
              merchant = $6,
              category = $7,
              raw_payload = $10,
              updated_at = NOW()`,
            [
              userId,
              invoiceResult.rows[0].id,
              item.id?.toString() || `${invoice.id}-${item.description}`,
              item.date ? new Date(item.date) : null,
              item.description || '',
              item.merchant || null,
              item.category || null,
              Math.round((item.amount || 0) * 100),
              item.currencyCode || 'BRL',
              JSON.stringify(item),
            ]
          );
        }
      }
    }
  } catch (error: any) {
    console.error('Error syncing credit card:', error);
    throw error;
  }
}

// Helper function to sync investment data
async function syncInvestment(userId: string, connectionId: string, investment: any) {
  try {
    // Map Pluggy investment types to our asset classes
    let assetClass = 'other';
    if (investment.type === 'FIXED_INCOME' || investment.type === 'CDB' || investment.type === 'LCI' || investment.type === 'LCA') {
      assetClass = 'fixed_income';
    } else if (investment.type === 'EQUITY' || investment.type === 'STOCK') {
      assetClass = 'equities';
    } else if (investment.type === 'MUTUAL_FUND' || investment.type === 'FUND') {
      assetClass = 'funds';
    } else if (investment.type === 'ETF') {
      assetClass = 'etf';
    } else if (investment.type === 'REIT') {
      assetClass = 'reit';
    } else if (investment.type === 'CASH') {
      assetClass = 'cash';
    }

    // Find or create asset
    let assetId = null;
    if (investment.code || investment.symbol) {
      const assetCode = investment.code || investment.symbol;
      const assetResult = await db.query(
        `SELECT id FROM assets WHERE symbol = $1 AND currency = $2`,
        [assetCode, investment.currencyCode || 'BRL']
      );

      if (assetResult.rows.length > 0) {
        assetId = assetResult.rows[0].id;
      } else {
        // Create new asset
        const newAsset = await db.query(
          `INSERT INTO assets (symbol, name, class, currency, metadata_json)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            assetCode,
            investment.name || investment.description || 'Investimento',
            assetClass,
            investment.currencyCode || 'BRL',
            JSON.stringify({ isin: investment.isin, type: investment.type }),
          ]
        );
        assetId = newAsset.rows[0].id;
      }
    }

    // Create or update holding
    const quantity = investment.quantity || investment.balance || 0;
    const currentPrice = investment.price || (investment.value && quantity > 0 ? investment.value / quantity : 0);
    const marketValue = investment.value || (currentPrice * quantity);
    const assetName = investment.name || investment.description || 'Investimento';

    // Check if holding exists
    const existingHolding = await db.query(
      `SELECT id FROM holdings 
       WHERE user_id = $1 AND connection_id = $2 
         AND (asset_id = $3 OR (asset_id IS NULL AND asset_name_fallback = $4))
         AND as_of_date = CURRENT_DATE`,
      [userId, connectionId, assetId, assetName]
    );

    if (existingHolding.rows.length > 0) {
      // Update existing holding
      await db.query(
        `UPDATE holdings 
         SET quantity = $1, current_price_cents = $2, market_value_cents = $3,
             raw_payload = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          quantity,
          Math.round(currentPrice * 100),
          Math.round(marketValue * 100),
          JSON.stringify(investment),
          existingHolding.rows[0].id,
        ]
      );
    } else {
      // Insert new holding
      await db.query(
        `INSERT INTO holdings (
          user_id, connection_id, source, asset_id, asset_name_fallback,
          quantity, current_price_cents, market_value_cents,
          as_of_date, raw_payload
        )
        VALUES ($1, $2, 'open_finance', $3, $4, $5, $6, $7, CURRENT_DATE, $8)`,
        [
          userId,
          connectionId,
          assetId,
          assetName,
          quantity,
          Math.round(currentPrice * 100),
          Math.round(marketValue * 100),
          JSON.stringify(investment),
        ]
      );
    }
  } catch (error: any) {
    console.error('Error syncing investment:', error);
    throw error;
  }
}

export async function connectionsRoutes(fastify: FastifyInstance) {
  // Get all connections
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Check if connections table exists
      let hasConnections = false;
      try {
        await db.query('SELECT 1 FROM connections LIMIT 1');
        hasConnections = true;
      } catch {}

      if (!hasConnections) {
        return reply.send({ connections: [] });
      }

      // Check if institutions table exists (for the JOIN)
      let hasInstitutions = false;
      try {
        await db.query('SELECT 1 FROM institutions LIMIT 1');
        hasInstitutions = true;
      } catch {}

      let query = `
        SELECT 
          c.id,
          c.provider,
          c.status,
          c.last_sync_at,
          c.last_sync_status
      `;

      if (hasInstitutions) {
        query += `,
          i.name as institution_name,
          i.logo_url as institution_logo`;
      } else {
        query += `,
          NULL as institution_name,
          NULL as institution_logo`;
      }

      query += `
         FROM connections c
      `;

      if (hasInstitutions) {
        query += `LEFT JOIN institutions i ON c.institution_id = i.id`;
      }

      query += `
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      return reply.send({ connections: result.rows });
    } catch (error) {
      fastify.log.error(error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ connections: [] });
    }
  });
  
  // Get available institutions
  fastify.get('/institutions', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { provider } = request.query as any;
      
      // If provider is open_finance, fetch from Pluggy and sync with database
      if (provider === 'open_finance') {
        try {
          // Fetch institutions from Pluggy
          const pluggyInstitutions = await getPluggyInstitutions();
          
          // Sync with database
          for (const inst of pluggyInstitutions) {
            try {
              await db.query(
                `INSERT INTO institutions (provider, external_id, name, logo_url)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (provider, external_id) 
                 DO UPDATE SET name = $3, logo_url = $4, updated_at = NOW()`,
                ['open_finance', inst.id.toString(), inst.name, inst.imageUrl || null]
              );
            } catch (err) {
              fastify.log.warn(`Error syncing institution ${inst.id}:`, err);
            }
          }
        } catch (pluggyError: any) {
          fastify.log.error('Error fetching Pluggy institutions:', pluggyError);
          // Continue to return database institutions even if Pluggy fails
        }
      }
      
      // Check if institutions table exists
      let hasInstitutions = false;
      try {
        await db.query('SELECT 1 FROM institutions LIMIT 1');
        hasInstitutions = true;
      } catch {}

      if (!hasInstitutions) {
        return reply.send({ institutions: [] });
      }
      
      let query = `
        SELECT 
          id, provider, external_id, name, logo_url,
          COALESCE(enabled, true) as enabled
        FROM institutions 
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (provider) {
        query += ` AND provider = $${paramIndex++}`;
        params.push(provider);
      }
      
      // Only return enabled institutions for non-admin users
      // Admin users can see all institutions via /admin/institutions
      query += ` AND COALESCE(enabled, true) = true`;
      
      query += ' ORDER BY name ASC';
      
      const result = await db.query(query, params);
      
      return reply.send({ institutions: result.rows });
    } catch (error) {
      fastify.log.error(error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ institutions: [] });
    }
  });

  // Get Connect Token for Pluggy widget
  fastify.get('/connect-token', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const connectToken = await createConnectToken(userId);
      
      return reply.send({ connectToken });
    } catch (error: any) {
      fastify.log.error('Error creating connect token:', error);
      return reply.code(500).send({ error: 'Failed to create connect token', details: error.message });
    }
  });

  // Create a new connection (called after Pluggy Connect widget success)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { itemId, institutionId } = request.body as any;

      if (!itemId) {
        return reply.code(400).send({ error: 'itemId is required' });
      }

      // Check if connections table exists
      let hasConnections = false;
      try {
        await db.query('SELECT 1 FROM connections LIMIT 1');
        hasConnections = true;
      } catch {}

      if (!hasConnections) {
        return reply.code(500).send({ error: 'Connections table not found' });
      }

      // Get item details from Pluggy
      let pluggyItem;
      let institutionName = null;
      let institutionLogo = null;
      let dbInstitutionId = institutionId || null;

      try {
        pluggyItem = await getItem(itemId);
        
        // Get institution info from Pluggy
        if (pluggyItem.connector) {
          institutionName = pluggyItem.connector.name;
          institutionLogo = pluggyItem.connector.imageUrl;
          
          // Find or create institution in database
          if (pluggyItem.connector.id) {
            const instResult = await db.query(
              'SELECT id FROM institutions WHERE provider = $1 AND external_id = $2',
              ['open_finance', pluggyItem.connector.id.toString()]
            );
            
            if (instResult.rows.length > 0) {
              dbInstitutionId = instResult.rows[0].id;
            } else {
              // Create institution
              const newInst = await db.query(
                `INSERT INTO institutions (provider, external_id, name, logo_url)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                ['open_finance', pluggyItem.connector.id.toString(), institutionName, institutionLogo]
              );
              dbInstitutionId = newInst.rows[0].id;
            }
          }
        }
      } catch (pluggyError: any) {
        fastify.log.error('Error fetching Pluggy item:', pluggyError);
        // Continue anyway - we'll create the connection with what we have
      }

      // Determine status from Pluggy item
      let status = 'pending';
      if (pluggyItem) {
        if (pluggyItem.status === 'UPDATED' || pluggyItem.status === 'LOGIN_ERROR') {
          status = 'connected';
        } else if (pluggyItem.status === 'WAITING_USER_ACTION') {
          status = 'pending';
        } else if (pluggyItem.status === 'UPDATING') {
          status = 'pending';
        } else if (pluggyItem.status === 'USER_INPUT') {
          status = 'needs_reauth';
        } else if (pluggyItem.status === 'INVALID_CREDENTIALS') {
          status = 'failed';
        }
      }

      // Create or update the connection
      const existingConn = await db.query(
        'SELECT id FROM connections WHERE user_id = $1 AND external_consent_id = $2',
        [userId, itemId]
      );

      let connection;
      if (existingConn.rows.length > 0) {
        // Update existing connection
        const result = await db.query(
          `UPDATE connections 
           SET status = $1, institution_id = $2, last_sync_at = NOW(), updated_at = NOW()
           WHERE id = $3
           RETURNING id, provider, status, institution_id, created_at, external_consent_id`,
          [status, dbInstitutionId, existingConn.rows[0].id]
        );
        connection = result.rows[0];
      } else {
        // Create new connection
        const result = await db.query(
          `INSERT INTO connections (user_id, provider, institution_id, status, external_consent_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, provider, status, institution_id, created_at, external_consent_id`,
          [userId, 'open_finance', dbInstitutionId, status, itemId]
        );
        connection = result.rows[0];
      }

      // Add institution info
      connection.institution_name = institutionName;
      connection.institution_logo = institutionLogo;

      return reply.code(201).send({ connection });
    } catch (error: any) {
      fastify.log.error('Error creating connection:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });

  // Sync connection data from Pluggy
  fastify.post('/:id/sync', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;

      // Get connection
      const connResult = await db.query(
        'SELECT id, external_consent_id FROM connections WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (connResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Connection not found' });
      }

      const connection = connResult.rows[0];
      const itemId = connection.external_consent_id;

      if (!itemId) {
        return reply.code(400).send({ error: 'Connection does not have a Pluggy item ID' });
      }

      // Update item in Pluggy (triggers sync)
      await updateItem(itemId);

      // Fetch and sync accounts
      const accounts = await getPluggyAccounts(itemId);
      for (const account of accounts) {
        await syncAccount(userId, connection.id, account);
      }

      // Fetch and sync credit cards
      const creditCards = await getPluggyCreditCards(itemId);
      for (const card of creditCards) {
        await syncCreditCard(userId, connection.id, card);
      }

      // Fetch and sync investments
      const investments = await getPluggyInvestments(itemId);
      for (const investment of investments) {
        await syncInvestment(userId, connection.id, investment);
      }

      // Update connection sync status
      await db.query(
        'UPDATE connections SET last_sync_at = NOW(), last_sync_status = $1, updated_at = NOW() WHERE id = $2',
        ['ok', connection.id]
      );

      return reply.send({ success: true, message: 'Connection synced successfully' });
    } catch (error: any) {
      fastify.log.error('Error syncing connection:', error);
      
      // Update connection with error
      const { id } = request.params as any;
      await db.query(
        'UPDATE connections SET last_sync_status = $1, last_error = $2, updated_at = NOW() WHERE id = $3',
        ['error', error.message, id]
      );

      return reply.code(500).send({ error: 'Failed to sync connection', details: error.message });
    }
  });

  // Delete a connection
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;

      // Check if connections table exists
      let hasConnections = false;
      try {
        await db.query('SELECT 1 FROM connections LIMIT 1');
        hasConnections = true;
      } catch {}

      if (!hasConnections) {
        return reply.code(404).send({ error: 'Connection not found' });
      }

      // Verify connection belongs to user and get Pluggy item ID
      const verifyResult = await db.query(
        'SELECT id, external_consent_id FROM connections WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (verifyResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Connection not found' });
      }

      const connection = verifyResult.rows[0];

      // Delete from Pluggy if item ID exists
      if (connection.external_consent_id) {
        try {
          await deletePluggyItem(connection.external_consent_id);
        } catch (pluggyError: any) {
          fastify.log.warn('Error deleting Pluggy item (continuing with local delete):', pluggyError);
        }
      }

      // Delete the connection from database
      await db.query('DELETE FROM connections WHERE id = $1 AND user_id = $2', [id, userId]);

      return reply.send({ success: true, message: 'Connection deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Error deleting connection:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });

  // Pluggy webhook handler (for connection status updates)
  fastify.post('/webhook/pluggy', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const webhookData = request.body as any;
      
      // Handle different webhook event types
      if (webhookData.type === 'ITEM_UPDATED' || webhookData.type === 'ITEM_ERROR') {
        const itemId = webhookData.itemId;
        
        if (!itemId) {
          return reply.code(400).send({ error: 'itemId missing' });
        }

        // Find connection by item ID
        const connResult = await db.query(
          'SELECT id, user_id FROM connections WHERE external_consent_id = $1',
          [itemId]
        );

        if (connResult.rows.length > 0) {
          const connection = connResult.rows[0];
          
          // Get updated item status from Pluggy
          try {
            const pluggyItem = await getItem(itemId);
            
            let status = 'pending';
            if (pluggyItem.status === 'UPDATED') {
              status = 'connected';
            } else if (pluggyItem.status === 'LOGIN_ERROR' || pluggyItem.status === 'INVALID_CREDENTIALS') {
              status = 'failed';
            } else if (pluggyItem.status === 'USER_INPUT') {
              status = 'needs_reauth';
            } else if (pluggyItem.status === 'WAITING_USER_ACTION') {
              status = 'pending';
            }

            // Update connection status
            await db.query(
              'UPDATE connections SET status = $1, last_sync_at = NOW(), updated_at = NOW() WHERE id = $2',
              [status, connection.id]
            );

            // If connection is now connected, sync data
            if (status === 'connected') {
              // Trigger sync in background (don't await)
              getPluggyAccounts(itemId).then(accounts => {
                accounts.forEach(account => syncAccount(connection.user_id, connection.id, account).catch(console.error));
              }).catch(console.error);
              
              getPluggyCreditCards(itemId).then(cards => {
                cards.forEach(card => syncCreditCard(connection.user_id, connection.id, card).catch(console.error));
              }).catch(console.error);
              
              getPluggyInvestments(itemId).then(investments => {
                investments.forEach(inv => syncInvestment(connection.user_id, connection.id, inv).catch(console.error));
              }).catch(console.error);
            }
          } catch (pluggyError: any) {
            fastify.log.error('Error processing Pluggy webhook:', pluggyError);
          }
        }
      }

      return reply.code(200).send({ received: true });
    } catch (error: any) {
      fastify.log.error('Error processing Pluggy webhook:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
