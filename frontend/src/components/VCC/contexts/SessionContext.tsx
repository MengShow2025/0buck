import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile } from './types';
import { authApi, userApi } from '../../../services/api';
import { useDrawerContext } from './DrawerContext';
import { extractUserFromMeResponse } from '../utils/meResponseParser';

interface SessionContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  refreshUser: () => Promise<void>;
  pendingAuthAction: (() => void) | null;
  setPendingAuthAction: (action: (() => void) | null) => void;
  requireAuth: (action: () => void) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);
  const { setActiveDrawer } = useDrawerContext();

  const refreshUser = useCallback(async () => {
    const loadUser = async () => {
      const meResponse = await userApi.getMe();
      return extractUserFromMeResponse(meResponse.data);
    };

    const loadAuthUser = async () => {
      const meResponse = await authApi.me();
      return extractUserFromMeResponse(meResponse.data);
    };

    try {
      const userFromMe = await loadUser();
      if (userFromMe) {
        setUser(userFromMe);
        return;
      }
    } catch (error) {
      // Fall back to the wrapped auth payload when the direct profile endpoint is unavailable.
    }

    try {
      const userFromAuth = await loadAuthUser();
      if (userFromAuth) {
        setUser(userFromAuth);
        return;
      }
    } catch (error) {
      // Ignore and clear session state below.
    }

    setUser(null);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const isAuthenticated = !!user;

  const requireAuth = useCallback((action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      setPendingAuthAction(() => action);
      setActiveDrawer('auth');
    }
  }, [isAuthenticated, setActiveDrawer]);

  const value = useMemo(() => ({
    user, setUser, isAuthenticated, refreshUser,
    pendingAuthAction, setPendingAuthAction, requireAuth
  }), [user, isAuthenticated, refreshUser, pendingAuthAction, requireAuth]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionContext must be used within SessionProvider');
  return context;
};
