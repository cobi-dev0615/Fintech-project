import dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';

dotenv.config();

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;
const PLUGGY_API_URL = process.env.PLUGGY_API_URL || 'https://api.pluggy.ai';

if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
  console.warn('PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET not found in environment variables');
}

// Cache for API key (expires after 2 hours)
let cachedApiKey: { token: string; expiresAt: number } | null = null;

/**
 * Get Pluggy API Key (authenticates with client credentials)
 * API keys expire after 2 hours
 */
async function getApiKey(): Promise<string> {
  // Check if cached key is still valid (with 5 minute buffer)
  if (cachedApiKey && cachedApiKey.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedApiKey.token;
  }

  try {
    const response = await axios.post(
      `${PLUGGY_API_URL}/auth`,
      {
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { apiKey, expiresIn } = response.data;
    
    // Cache the key (expiresIn is in seconds)
    cachedApiKey = {
      token: apiKey,
      expiresAt: Date.now() + (expiresIn * 1000),
    };

    return apiKey;
  } catch (error: any) {
    console.error('Error getting Pluggy API key:', error.response?.data || error.message);
    throw new Error(`Failed to authenticate with Pluggy: ${error.message}`);
  }
}

/**
 * Create a Pluggy client instance with authentication
 */
async function createPluggyClient(): Promise<AxiosInstance> {
  const apiKey = await getApiKey();
  
  return axios.create({
    baseURL: PLUGGY_API_URL,
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a Connect Token for frontend widget
 * Connect tokens expire after 30 minutes
 */
export async function createConnectToken(userId: string): Promise<string> {
  try {
    const client = await createPluggyClient();
    const response = await client.post('/connect_token', {
      clientUserId: userId, // Link to your user ID
    });

    return response.data.connectToken;
  } catch (error: any) {
    console.error('Error creating Pluggy connect token:', error.response?.data || error.message);
    throw new Error(`Failed to create connect token: ${error.message}`);
  }
}

/**
 * Get all institutions (banks) available in Pluggy
 */
export async function getInstitutions(): Promise<any[]> {
  try {
    const client = await createPluggyClient();
    const response = await client.get('/institutions', {
      params: {
        country: 'BR', // Brazil
        products: ['ACCOUNTS', 'CREDIT_CARDS', 'INVESTMENTS', 'TRANSACTIONS'],
      },
    });

    return response.data.results || [];
  } catch (error: any) {
    console.error('Error fetching Pluggy institutions:', error.response?.data || error.message);
    throw new Error(`Failed to fetch institutions: ${error.message}`);
  }
}

/**
 * Get an item (connection) by ID
 */
export async function getItem(itemId: string): Promise<any> {
  try {
    const client = await createPluggyClient();
    const response = await client.get(`/items/${itemId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Pluggy item:', error.response?.data || error.message);
    throw new Error(`Failed to fetch item: ${error.message}`);
  }
}

/**
 * Get all accounts for an item
 */
export async function getAccounts(itemId: string): Promise<any[]> {
  try {
    const client = await createPluggyClient();
    const response = await client.get('/accounts', {
      params: {
        itemId,
      },
    });

    return response.data.results || response.data || [];
  } catch (error: any) {
    console.error('Error fetching Pluggy accounts:', error.response?.data || error.message);
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }
}

/**
 * Get all transactions for an account
 */
export async function getTransactions(accountId: string, params?: {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ results: any[]; total: number; page: number; totalPages: number }> {
  try {
    const client = await createPluggyClient();
    const response = await client.get('/transactions', {
      params: {
        accountId,
        ...params,
      },
    });

    return {
      results: response.data.results || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      totalPages: response.data.totalPages || 1,
    };
  } catch (error: any) {
    console.error('Error fetching Pluggy transactions:', error.response?.data || error.message);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }
}

/**
 * Get all credit cards for an item
 */
export async function getCreditCards(itemId: string): Promise<any[]> {
  try {
    const client = await createPluggyClient();
    const response = await client.get('/credit-cards', {
      params: {
        itemId,
      },
    });

    return response.data.results || response.data || [];
  } catch (error: any) {
    console.error('Error fetching Pluggy credit cards:', error.response?.data || error.message);
    // Credit cards might not be available for all connections, return empty array
    if (error.response?.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch credit cards: ${error.message}`);
  }
}

/**
 * Get credit card invoices
 */
export async function getCreditCardInvoices(creditCardId: string): Promise<any[]> {
  try {
    const client = await createPluggyClient();
    const response = await client.get('/credit-cards/invoices', {
      params: {
        creditCardId,
      },
    });

    return response.data.results || response.data || [];
  } catch (error: any) {
    console.error('Error fetching Pluggy credit card invoices:', error.response?.data || error.message);
    // Invoices might not be available, return empty array
    if (error.response?.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch credit card invoices: ${error.message}`);
  }
}

/**
 * Get all investments for an item
 */
export async function getInvestments(itemId: string): Promise<any[]> {
  try {
    const client = await createPluggyClient();
    const response = await client.get('/investments', {
      params: {
        itemId,
      },
    });

    return response.data.results || response.data || [];
  } catch (error: any) {
    console.error('Error fetching Pluggy investments:', error.response?.data || error.message);
    // Investments might not be available for all connections, return empty array
    if (error.response?.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch investments: ${error.message}`);
  }
}

/**
 * Update an item (trigger sync)
 */
export async function updateItem(itemId: string): Promise<any> {
  try {
    const client = await createPluggyClient();
    const response = await client.patch(`/items/${itemId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error updating Pluggy item:', error.response?.data || error.message);
    throw new Error(`Failed to update item: ${error.message}`);
  }
}

/**
 * Delete an item (revoke connection)
 */
export async function deleteItem(itemId: string): Promise<void> {
  try {
    const client = await createPluggyClient();
    await client.delete(`/items/${itemId}`);
  } catch (error: any) {
    console.error('Error deleting Pluggy item:', error.response?.data || error.message);
    throw new Error(`Failed to delete item: ${error.message}`);
  }
}
