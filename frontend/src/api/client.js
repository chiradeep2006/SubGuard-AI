const DEFAULT_PROD_API = 'https://subguard-ai-4ol6.onrender.com/api';
const isBrowserProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const RAW_URL = import.meta.env.VITE_API_URL || (isBrowserProd ? DEFAULT_PROD_API : 'http://localhost:5000/api');
const BASE_URL = RAW_URL.replace(/\/+$/, '');

export async function apiRequest(endpoint, method = 'GET', body = null) {
  let token =
    sessionStorage.getItem('subguard_token') ||
    localStorage.getItem('subguard_token') ||
    'mock_jwt_token';

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const res = await fetch(`${BASE_URL}${cleanPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Network response error' }));
      throw new Error(err.error || 'Server error');
    }
    return await res.json();
  } catch (error) {
    console.warn(`API call [${endpoint}] notice:`, error.message);
    throw error;
  }
}
