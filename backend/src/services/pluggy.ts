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

    console.log('Pluggy auth response:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : null
    });

    const { apiKey, expiresIn } = response.data;
    
    if (!apiKey) {
      console.error('Pluggy auth response missing apiKey:', response.data);
      throw new Error('Pluggy authentication failed: missing apiKey in response');
    }
    
    // Cache the key (expiresIn is in seconds)
    cachedApiKey = {
      token: apiKey,
      expiresAt: Date.now() + (expiresIn * 1000),
    };

    return apiKey;
  } catch (error: any) {
    console.error('Error getting Pluggy API key:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      fullError: error
    });
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
export async function createConnectToken(userId: string, cpf?: string): Promise<string> {
  try {
    // Validate credentials are available
    if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
      throw new Error('Pluggy credentials not configured. Please check PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET environment variables.');
    }

    const client = await createPluggyClient();
    
    // Note: CPF is handled by Pluggy Connect widget itself during the connection flow
    // We don't pass CPF to connect_token endpoint - the widget prompts for it
    const requestBody = {
      clientUserId: userId, // Link to your user ID
    };

    console.log('Creating connect token with request:', {
      clientUserId: userId,
      hasCpf: !!cpf,
      endpoint: '/connect_token'
    });

    const response = await client.post('/connect_token', requestBody);

    // Log full response for debugging
    console.log('Pluggy connect_token full response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      dataType: typeof response.data,
      dataKeys: response.data ? Object.keys(response.data) : null
    });

    // Check various possible response structures
    if (!response.data) {
      console.error('Empty response from Pluggy API');
      throw new Error('Pluggy API returned empty response');
    }

    // The response should have connectToken or accessToken at the root level
    // Pluggy API may return either field name depending on version
    if (response.data.connectToken && typeof response.data.connectToken === 'string') {
      return response.data.connectToken;
    }

    // Check for accessToken as fallback (some Pluggy API versions use this)
    if (response.data.accessToken && typeof response.data.accessToken === 'string') {
      console.log('Pluggy API returned accessToken instead of connectToken, using accessToken');
      return response.data.accessToken;
    }

    // If neither field is present, log the full response and throw detailed error
    console.error('Pluggy API response missing connectToken/accessToken:', {
      fullResponse: JSON.stringify(response.data, null, 2),
      responseType: typeof response.data,
      responseKeys: Object.keys(response.data || {}),
      responseValues: Object.values(response.data || {})
    });

    throw new Error(
      `Pluggy API returned invalid response. Expected 'connectToken' or 'accessToken' field but got: ${JSON.stringify(response.data)}`
    );
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error('Error creating Pluggy connect token:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      userId: userId,
      cpf: cpf ? '***' : undefined
    });
    
    // Provide more specific error messages
    if (error.response?.status === 401) {
      throw new Error('Pluggy authentication failed. Please check your credentials.');
    } else if (error.response?.status === 400) {
      throw new Error(`Pluggy API error: ${JSON.stringify(errorDetails)}`);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error('Cannot connect to Pluggy API. Please check your network connection.');
    }
    
    throw new Error(`Failed to create connect token: ${error.message || 'Unknown error'}`);
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
 * Credit cards come as accounts with type CREDIT and subtype CREDIT_CARD
 * This function filters accounts to return only credit cards
 */
export async function getCreditCards(itemId: string): Promise<any[]> {
  try {
    // Credit cards are returned as accounts with type CREDIT
    const accounts = await getAccounts(itemId);
    
    // Filter for credit card accounts
    const creditCards = accounts.filter(
      (acc: any) => acc.type === 'CREDIT' && acc.subtype === 'CREDIT_CARD'
    );

    return creditCards;
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
