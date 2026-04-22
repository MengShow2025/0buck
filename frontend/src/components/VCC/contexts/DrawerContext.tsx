import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DrawerType, ChatContext } from './types';

interface DrawerContextType {
  activeDrawer: DrawerType;
  setActiveDrawer: (drawer: DrawerType) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  activeChat: ChatContext | null;
  setActiveChat: (chat: ChatContext | null) => void;
  drawerHistory: DrawerType[];
  pushDrawer: (drawer: DrawerType) => void;
  popDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const DrawerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>('none');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatContext | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<DrawerType[]>([]);

  const pushDrawer = useCallback((drawer: DrawerType) => {
    setDrawerHistory(prev => [...prev, activeDrawer]);
    setActiveDrawer(drawer);
  }, [activeDrawer]);

  const popDrawer = useCallback(() => {
    if (drawerHistory.length > 0) {
      const prev = drawerHistory[drawerHistory.length - 1];
      setDrawerHistory(prevHistory => prevHistory.slice(0, -1));
      setActiveDrawer(prev);
    } else {
      setActiveDrawer('none');
    }
  }, [drawerHistory]);

  const setAndResetActiveDrawer = useCallback((drawer: DrawerType) => {
    setDrawerHistory([]);
    setActiveDrawer(drawer);
  }, []);

  const value = useMemo(() => ({
    activeDrawer,
    setActiveDrawer: setAndResetActiveDrawer,
    selectedProductId,
    setSelectedProductId,
    activeChat,
    setActiveChat,
    drawerHistory,
    pushDrawer,
    popDrawer
  }), [activeDrawer, setAndResetActiveDrawer, selectedProductId, activeChat, drawerHistory, pushDrawer, popDrawer]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawerContext = () => {
  const context = useContext(DrawerContext);
  if (!context) throw new Error('useDrawerContext must be used within DrawerProvider');
  return context;
};
