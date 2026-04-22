import React, { createContext, useContext, useState, useMemo } from 'react';

interface SecurityContextType {
  verificationType: 'login_password' | 'pay_password' | 'email_bind' | 'backup_email_bind' | null;
  setVerificationType: (v: 'login_password' | 'pay_password' | 'email_bind' | 'backup_email_bind' | null) => void;
  dualVerification: {
    requiredMethods: ('primary_email' | 'backup_email' | 'google_2fa' | 'pay_password' | 'login_password')[];
    onSuccess: (tokens: Record<string, string>) => void;
    actionTitle?: string;
  } | null;
  setDualVerification: (v: {
    requiredMethods: ('primary_email' | 'backup_email' | 'google_2fa' | 'pay_password' | 'login_password')[];
    onSuccess: (tokens: Record<string, string>) => void;
    actionTitle?: string;
  } | null) => void;
  isGoogle2FAEnabled: boolean;
  setIsGoogle2FAEnabled: (v: boolean) => void;
  google2FASecret: string;
  setGoogle2FASecret: (v: string) => void;
  isFacebookBound: boolean;
  setIsFacebookBound: (v: boolean) => void;
  isTwitterBound: boolean;
  setIsTwitterBound: (v: boolean) => void;
  isGithubBound: boolean;
  setIsGithubBound: (v: boolean) => void;
  mfaRecoveryEnabled: boolean;
  setMfaRecoveryEnabled: (v: boolean) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [verificationType, setVerificationType] = useState<'login_password' | 'pay_password' | 'email_bind' | 'backup_email_bind' | null>(null);
  const [dualVerification, setDualVerification] = useState<{
    requiredMethods: ('primary_email' | 'backup_email' | 'google_2fa' | 'pay_password' | 'login_password')[];
    onSuccess: (tokens: Record<string, string>) => void;
    actionTitle?: string;
  } | null>(null);
  const [isGoogle2FAEnabled, setIsGoogle2FAEnabled] = useState<boolean>(false);
  const [google2FASecret, setGoogle2FASecret] = useState<string>('JBSWY3DPEHPK3PXP');
  const [isFacebookBound, setIsFacebookBound] = useState<boolean>(false);
  const [isTwitterBound, setIsTwitterBound] = useState<boolean>(false);
  const [isGithubBound, setIsGithubBound] = useState<boolean>(false);
  const [mfaRecoveryEnabled, setMfaRecoveryEnabled] = useState<boolean>(false);

  const value = useMemo(() => ({
    verificationType, setVerificationType,
    dualVerification, setDualVerification,
    isGoogle2FAEnabled, setIsGoogle2FAEnabled,
    google2FASecret, setGoogle2FASecret,
    isFacebookBound, setIsFacebookBound,
    isTwitterBound, setIsTwitterBound,
    isGithubBound, setIsGithubBound,
    mfaRecoveryEnabled, setMfaRecoveryEnabled
  }), [
    verificationType, dualVerification,
    isGoogle2FAEnabled, google2FASecret,
    isFacebookBound, isTwitterBound, isGithubBound,
    mfaRecoveryEnabled
  ]);

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurityContext must be used within SecurityProvider');
  return context;
};
