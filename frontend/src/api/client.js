/**
 * SubGuard AI - Resilient API Client
 * Ensures automated prefix matching (/api or /) and automatic fallback retry.
 */

function resolveBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const isBrowserProd =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  let base = envUrl || (isBrowserProd ? 'https://subguard-ai-4ol6.onrender.com/api' : 'http://localhost:5000/api');
  base = base.replace(/\/+$/, '');

  // If environment variable is just the origin without /api, ensure /api is attached
  if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }
  return base;
}

export const BASE_URL = resolveBaseUrl();

export async function apiRequest(endpoint, method = 'GET', body = null) {
  let token =
    sessionStorage.getItem('subguard_token') ||
    localStorage.getItem('subguard_token') ||
    'mock_jwt_token';

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If BASE_URL already ends with /api and cleanPath starts with /api/, avoid duplicate /api/api
  if (BASE_URL.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.slice(4);
  }

  const primaryUrl = `${BASE_URL}${cleanPath}`;

  try {
    const res = await fetch(primaryUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    if (res.status === 404) {
      // Automatic fallback retry: flip /api prefix between root and /api
      const altUrl = BASE_URL.endsWith('/api')
        ? `${BASE_URL.replace(/\/api$/, '')}${cleanPath}`
        : `${BASE_URL}/api${cleanPath}`;

      try {
        const altRes = await fetch(altUrl, {
          method,
          headers,
          body: body ? JSON.stringify(body) : null
        });
        if (altRes.ok) {
          return await altRes.json();
        }
      } catch (altErr) {
        // Fall back to original error
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}: Request failed` }));
      throw new Error(err.error || `Server error (${res.status})`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`API call [${endpoint}] notice:`, error.message);
    throw error;
  }
}
