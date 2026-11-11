import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Only accept user if explicitly verified with OTP for this session
    const saved = sessionStorage.getItem('subguard_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.otp_verified) return parsed;
      } catch (e) {
        // Ignore parse error
      }
    }
    return null;
  });

  const login = (userData, token) => {
    const verifiedUser = { ...userData, otp_verified: true };
    sessionStorage.setItem('subguard_user', JSON.stringify(verifiedUser));
    sessionStorage.setItem('subguard_token', token);
    localStorage.removeItem('subguard_user'); // Clear legacy permanent auto-login
    setUser(verifiedUser);
  };

  const logout = () => {
    sessionStorage.removeItem('subguard_user');
    sessionStorage.removeItem('subguard_token');
    localStorage.removeItem('subguard_user');
    localStorage.removeItem('subguard_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!(user && user.otp_verified) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
