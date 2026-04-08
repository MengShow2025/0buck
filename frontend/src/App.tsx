import { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';

// v4.6.3: Global Axios & Fetch Security Defaults
axios.defaults.withCredentials = true;

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import WelcomeView from './components/WelcomeView';
import FloatingButler from './components/FloatingButler';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceType } from './hooks/useDeviceType';
import { useTranslation } from 'react-i18next';
import { useStreamVCC } from './hooks/useStreamVCC';
import { useRewards } from './hooks/useRewards';
import { getApiUrl } from './utils/api';

export default function App() {
  const { t } = useTranslation();
  const deviceType = useDeviceType();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { 
    cartItems, setCartItems, 
    agentName, setAgentName,
    setSelectedProduct, 
    securePayPayload, setSecurePayPayload,
    securePayBackView
  } = useAppContext();

  // v5.7.26: Reactive welcome screen state that updates on location changes
  const [showWelcome, setShowWelcome] = useState(false);
  
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const shouldShow = !path.startsWith('/command') && 
                      !path.startsWith('/control') && 
                      !path.startsWith('/auth/bind') &&
                      !path.startsWith('/login') &&
                      !path.startsWith('/register') &&
                      path !== '/me' &&
                      path !== '/profile';
    
    // Only set to true if we're on the root and it was previously false
    // This prevents the welcome screen from popping up again after navigation
    if (path === '/' && !localStorage.getItem('welcomeShown')) {
      setShowWelcome(true);
    } else if (shouldShow === false) {
      setShowWelcome(false);
    }
  }, [location.pathname]);

  const handleWelcomeEnter = () => {
    localStorage.setItem('welcomeShown', 'true');
    setShowWelcome(false);
  };

  const { data: authData, isLoading: isInitializing, error: authError } = useQuery<any>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const url = getApiUrl('/v1/auth/me');
        // v5.7.26: Add timeout to prevent infinite loading state
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
      } catch (e) {
        console.error('Auth check failed:', e);
        return null;
      }
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const currentUser = authData?.user || null;
  const isAuthenticated = !!currentUser;
  const [userNickname, setUserNickname] = useState(() => localStorage.getItem('userNickname') || '');

  // Sync butler name and nickname from profile
  useEffect(() => {
    // v5.7.16: Industrial-grade Sync Logic
    // If server has a name, use it. If not, use 'AI Butler'.
    const serverButlerName = currentUser?.butler_name;
    const currentLocalName = localStorage.getItem('butlerName');
    
    if (serverButlerName) {
      setAgentName(serverButlerName);
      localStorage.setItem('butlerName', serverButlerName);
    } else if (currentLocalName === '有什么好产品推荐') {
      // Force clear the old bad name if it's still in localStorage
      const defaultName = 'AI Butler';
      setAgentName(defaultName);
      localStorage.setItem('butlerName', defaultName);
    } else if (!currentLocalName) {
      setAgentName('AI Butler');
    }

    if (currentUser?.user_nickname) {
      setUserNickname(currentUser.user_nickname);
      localStorage.setItem('userNickname', currentUser.user_nickname);
    }
  }, [currentUser?.butler_name, currentUser?.user_nickname, setAgentName]);

  // Derived currentView from path for TopBar/Sidebar props
  const currentView = useMemo(() => {
    const path = location.pathname.toLowerCase().replace(/\/$/, "");
    if (path === "") return "prime";
    if (path === "/chat") return "chat";
    if (path === "/square") return "square";
    if (path === "/circle") return "circle";
    if (path === "/explore") return "explore";
    if (path === "/me") return "me";
    if (path === "/cart") return "cart";
    if (path === "/pay") return "secure-pay";
    if (path === "/checkin") return "checkin";
    if (path.startsWith("/command")) return "admin";
    if (path === "/login") return "login";
    if (path === "/register") return "register";
    return "other";
  }, [location.pathname]) as any;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authInitialStep, setAuthInitialStep] = useState<'login' | '2fa'>('login');
  const [authInitialEmail, setAuthInitialEmail] = useState('');
  const [onAuthSuccess, setOnAuthSuccess] = useState<{ callback: () => void } | null>(null);

  // v5.7.47: Preserve 'prefill' command across auth cycles
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefill = params.get('prefill');
    
    if (prefill) {
      // Store in sessionStorage to persist across redirects (like Google OAuth)
      sessionStorage.setItem('pending_prefill', prefill);
      console.log('📦 Captured pending prefill command:', prefill);
      
      // If user is already logged in, the FloatingButler will pick it up from URL.
      // If not, we'll wait for login to complete.
    }
  }, [location.search]);

  // v5.7.25: Handle OAuth callback parameters (2FA, Success, Redirect)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // 1. Handle 2FA Required
    if (params.get('2fa_required') === 'true') {
      const email = params.get('email') || '';
      setAuthInitialEmail(email);
      setAuthInitialStep('2fa');
      setAuthMode('login');
      setShowAuthModal(true);
    }
    
    // 2. Handle Auth Success (Clear params to keep URL clean)
    if (params.get('auth_success') === 'true') {
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      
      // v5.7.47: Check if we have a stored prefill from before login
      const pendingPrefill = sessionStorage.getItem('pending_prefill');
      
      // Remove params from URL without refreshing
      const newParams = new URLSearchParams(location.search);
      newParams.delete('auth_success');
      newParams.delete('email');
      
      // If we have a pending prefill, add it back to the URL so FloatingButler triggers
      if (pendingPrefill) {
        newParams.set('prefill', pendingPrefill);
        sessionStorage.removeItem('pending_prefill');
      }
      
      const newSearch = newParams.toString();
      navigate({ search: newSearch }, { replace: true });
    }
  }, [location.search, queryClient, navigate]);

  const { connect, disconnect } = useStreamVCC(isAuthenticated, currentUser);

  useEffect(() => {
    if (['circle', 'square'].includes(currentView)) {
      connect();
    }
  }, [currentView, connect]);

  useEffect(() => {
    if (!isAuthenticated) disconnect();
  }, [isAuthenticated, disconnect]);

  const handleLogout = useCallback(async () => {
    try {
      await axios.post(getApiUrl('/v1/auth/logout'));
    } catch (e) {}
    queryClient.setQueryData(['auth-me'], null);
    setCartItems([]);
    navigate('/login');
  }, [queryClient, setCartItems, navigate]);

  if (isInitializing) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4"
        />
        <p className="text-on-surface-variant font-medium animate-pulse">Securely initializing 0Buck...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-on-background font-body overflow-hidden">
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div key="welcome" className="fixed inset-0 z-[100]">
            <WelcomeView onEnter={handleWelcomeEnter} />
          </motion.div>
        ) : (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full relative">
            {!['login', 'register', 'admin'].includes(currentView) && (
              <Sidebar 
                currentView={currentView} 
                onViewChange={(view) => navigate(view === 'prime' ? '/' : `/${view}`)} 
                onLogout={handleLogout} 
                agentName={agentName} 
                isAuthenticated={isAuthenticated} 
                onLoginClick={() => { setAuthMode('login'); setShowAuthModal(true); }} 
                cartItemsCount={cartItems.length}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
              />
            )}
            <main className={`${!['login', 'register', 'admin'].includes(currentView) ? 'lg:ml-20' : ''} h-screen flex flex-col relative overflow-hidden`}>
              <TopBar 
                onMenuClick={() => setIsSidebarOpen(true)}
              />
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
                <Outlet />
              </div>
            </main>

            <FloatingButler onProductClick={(product) => { setSelectedProduct(product); navigate(`/product/${product.id}`); }} />

            {showAuthModal && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg relative">
                  <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                  {authMode === 'login' ? (
                    <LoginView 
                      isModal 
                      initialStep={authInitialStep}
                      initialEmail={authInitialEmail}
                      onLogin={() => { 
                        queryClient.invalidateQueries({ queryKey: ['auth-me'] }); 
                        setShowAuthModal(false); 
                      }} 
                      onGoRegister={() => setAuthMode('register')} 
                    />
                  ) : (
                    <RegisterView isModal onRegister={() => { queryClient.invalidateQueries({ queryKey: ['auth-me'] }); setShowAuthModal(false); }} onGoLogin={() => setAuthMode('login')} />
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
