const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(endpoint, method = 'GET', body = null) {
  let token =
    sessionStorage.getItem('subguard_token') ||
    localStorage.getItem('subguard_token') ||
    'mock_jwt_token';

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
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
