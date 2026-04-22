import React from 'react';
import { PreferenceProvider } from './contexts/PreferenceContext';
import { DrawerProvider } from './contexts/DrawerContext';
import { SessionProvider } from './contexts/SessionContext';
import { AIProvider } from './contexts/AIContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { CommerceProvider } from './contexts/CommerceContext';

export const VCCProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PreferenceProvider>
      <DrawerProvider>
        <SessionProvider>
          <AIProvider>
            <SecurityProvider>
              <CommerceProvider>
                {children}
              </CommerceProvider>
            </SecurityProvider>
          </AIProvider>
        </SessionProvider>
      </DrawerProvider>
    </PreferenceProvider>
  );
};
