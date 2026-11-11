import dotenv from 'dotenv';
dotenv.config();

const PAYPAL_API = process.env.PAYPAL_API_BASE || process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

  if (!clientId || !clientSecret || clientId.includes('placeholder')) {
    return 'SANDBOX_MOCK_ACCESS_TOKEN_' + Date.now();
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve PayPal access token');
  }

  const data = await res.json();
  return data.access_token;
}

export { PAYPAL_API };

