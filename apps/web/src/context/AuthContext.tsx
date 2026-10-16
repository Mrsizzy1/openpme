import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../api/client';

interface AuthContextType {
  user: any | null;
  organization: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => ApiClient.getSavedUser());
  const [organization, setOrganization] = useState<any | null>(() => ApiClient.getSavedOrg());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('smart_pme_token');
    if (token) {
      ApiClient.getMe()
        .then((res) => {
          setUser(res.user);
          setOrganization(res.organization);
          ApiClient.setAuth(token, res.user, res.organization);
        })
        .catch(() => {
          ApiClient.clearAuth();
          setUser(null);
          setOrganization(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await ApiClient.login(email, pass);
    ApiClient.setAuth(res.accessToken, res.user, res.organization);
    setUser(res.user);
    setOrganization(res.organization);
  };

  const logout = () => {
    ApiClient.clearAuth();
    setUser(null);
    setOrganization(null);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    try {
      const res = await ApiClient.getMe();
      setUser(res.user);
      setOrganization(res.organization);
      const token = localStorage.getItem('smart_pme_token') || '';
      ApiClient.setAuth(token, res.user, res.organization);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
