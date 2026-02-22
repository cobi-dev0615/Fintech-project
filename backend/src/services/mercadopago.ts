import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
const webhookUrl = process.env.MERCADOPAGO_WEBHOOK_URL || 'https://zurt.com.br/api/mercadopago/webhook';

// Check if using test credentials
const isTestMode = accessToken?.startsWith('TEST-') || publicKey?.startsWith('TEST-');

if (!accessToken) {
  console.warn('MERCADOPAGO_ACCESS_TOKEN not found in environment variables');
} else if (isTestMode) {
  console.log('Mercado Pago: Using TEST credentials (Sandbox mode)');
}

// Initialize Mercado Pago client
const client = accessToken ? new MercadoPagoConfig({ accessToken }) : null;
const payment = client ? new Payment(client) : null;
const preference = client ? new Preference(client) : null;

export interface CreatePaymentData {
  amount: number; // Amount in cents (will be converted to BRL)
  description: string;
  payer: {
    name: string;
    email: string;
    identification?: {
      type: string;
      number: string;
    };
    phone?: {
      area_code: string;
      number: string;
    };
    address?: {
      zip_code: string;
      street_name: string;
      street_number?: string;
      city: string;
      state: string;
    };
  };
  metadata?: Record<string, any>;
  external_reference?: string;
}

export interface CreatePreferenceData {
  items: Array<{
    title: string;
    description?: string;
    quantity: number;
    unit_price: number; // Price in BRL (not cents)
  }>;
  payer?: {
    name: string;
    email: string;
    phone?: {
      area_code: string;
      number: string;
    };
    identification?: {
      type: string;
      number: string;
    };
    address?: {
      zip_code: string;
      street_name: string;
      street_number?: string;
      city: string;
      state: string;
    };
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference?: string;
  notification_url?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a payment preference (checkout)
 */
export async function createPreference(data: CreatePreferenceData): Promise<any> {
  if (!preference) {
    throw new Error('Mercado Pago is not configured. Please set MERCADOPAGO_ACCESS_TOKEN.');
  }

  try {
    const preferenceData = {
      items: data.items.map((item, i) => ({
        id: String(i + 1),
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      payer: data.payer,
      back_urls: data.back_urls || {
        success: `${process.env.FRONTEND_URL?.split(',')[0] || 'https://zurt.com.br'}/payment/success`,
        failure: `${process.env.FRONTEND_URL?.split(',')[0] || 'https://zurt.com.br'}/payment/failure`,
        pending: `${process.env.FRONTEND_URL?.split(',')[0] || 'https://zurt.com.br'}/payment/pending`,
      },
      auto_return: data.auto_return || 'approved',
      external_reference: data.external_reference,
      notification_url: data.notification_url || webhookUrl,
      metadata: data.metadata || {},
    };

    const response = await preference.create({ body: preferenceData });
    return response;
  } catch (error: any) {
    console.error('Error creating Mercado Pago preference:', error);
    throw new Error(`Failed to create payment preference: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create a direct payment (credit card)
 */
export async function createPayment(data: CreatePaymentData): Promise<any> {
  if (!payment) {
    throw new Error('Mercado Pago is not configured. Please set MERCADOPAGO_ACCESS_TOKEN.');
  }

  try {
    // Convert amount from cents to BRL
    const amountInBRL = data.amount / 100;

    const paymentData = {
      transaction_amount: amountInBRL,
      description: data.description,
      payment_method_id: 'credit_card', // Default to credit card
      payer: {
        email: data.payer.email,
        identification: data.payer.identification || undefined,
        first_name: data.payer.name.split(' ')[0] || data.payer.name,
        last_name: data.payer.name.split(' ').slice(1).join(' ') || '',
        phone: data.payer.phone || undefined,
        address: data.payer.address || undefined,
      },
      external_reference: data.external_reference,
      metadata: data.metadata || {},
    };

    const response = await payment.create({ body: paymentData });
    return response;
  } catch (error: any) {
    console.error('Error creating Mercado Pago payment:', error);
    throw new Error(`Failed to process payment: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get payment by ID
 */
export async function getPayment(paymentId: string): Promise<any> {
  if (!payment) {
    throw new Error('Mercado Pago is not configured. Please set MERCADOPAGO_ACCESS_TOKEN.');
  }

  try {
    const response = await payment.get({ id: paymentId });
    return response;
  } catch (error: any) {
    console.error('Error getting Mercado Pago payment:', error);
    throw new Error(`Failed to get payment: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get preference by ID
 */
export async function getPreference(preferenceId: string): Promise<any> {
  if (!preference) {
    throw new Error('Mercado Pago is not configured. Please set MERCADOPAGO_ACCESS_TOKEN.');
  }

  try {
    const response = await preference.get({ preferenceId });
    return response;
  } catch (error: any) {
    console.error('Error getting Mercado Pago preference:', error);
    throw new Error(`Failed to get preference: ${error.message || 'Unknown error'}`);
  }
}

export { publicKey };
