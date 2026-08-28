/**
 * GEBAT 360° ERP — Auth State Context
 * Gestion dédiée de l'utilisateur connecté, du token JWT, des habilitations et déconnexion réelles
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../types';
import { PERMISSIONS_MATRIX } from '../permissions';
import { ApiService } from '../../services/api';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gebat_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gebat_jwt_token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Vérification de la validité de la session au démarrage
  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('gebat_jwt_token');
      if (!storedToken) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await ApiService.getMe();
        if (res && res.user) {
          setCurrentUser(res.user);
          setToken(storedToken);
          setIsAuthenticated(true);
          localStorage.setItem('gebat_current_user', JSON.stringify(res.user));
        } else {
          throw new Error('Session non valide');
        }
      } catch (err) {
        console.warn('⚠️ Session expirée ou jeton JWT non valide:', err);
        localStorage.removeItem('gebat_jwt_token');
        localStorage.removeItem('gebat_current_user');
        setToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await ApiService.login(email, password);
      if (res && res.accessToken && res.user) {
        setToken(res.accessToken);
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        localStorage.setItem('gebat_jwt_token', res.accessToken);
        localStorage.setItem('gebat_current_user', JSON.stringify(res.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Échec authentification:', err);
      throw err;
    }
  };

  const logout = () => {
    ApiService.logout().catch(() => {});
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('gebat_jwt_token');
    localStorage.removeItem('gebat_current_user');
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (!currentUser) return false;
    const rolePermissions = PERMISSIONS_MATRIX[currentUser.role] || [];
    return rolePermissions.includes(permissionKey as any) || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'Super Admin';
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
}
