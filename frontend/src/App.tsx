import { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';

// v4.6.3: Global Axios & Fetch Security Defaults
axios.defaults.withCredentials = true;

// Utility for authenticated fetch calls
const authFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    credentials: 'include'
  });
};

import { CartItem, SecurePayPayload, ViewType, Product } from './types';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import SquareView from './components/SquareView';
import AIButlerView from './components/AIButlerView';
import LoungeView from './components/LoungeView';
import MessagesView from './components/MessagesView';
import ContactsView from './components/ContactsView';
import FeedView from './components/FeedView';
import SecurePayView from './components/SecurePayView';
import StashView from './components/StashView';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import WelcomeView from './components/WelcomeView';
import FloatingButler from './components/FloatingButler';
import CheckInView from './components/CheckInView';
import PrimeView from './components/PrimeView';
import ReferralView from './components/ReferralView';
import ProductDetailView from './components/ProductDetailView';
import MerchantDetailView from './components/MerchantDetailView';
import MeView from './components/MeView';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceType } from './hooks/useDeviceType';
import { useTranslation } from 'react-i18next';
import { Attachment } from 'stream-chat-react';

import 'stream-chat-react/dist/css/v2/index.css';
import BAPAttachmentRenderer from './components/BAPAttachmentRenderer';
import { useStreamVCC } from './hooks/useStreamVCC';
import { useRewards } from './hooks/useRewards';

import { getApiUrl } from './utils/api';

import AdminDashboard from './pages/AdminDashboard';
import { useLocation, useNavigate } from 'react-router-dom';

export default function App() {
  const { t } = useTranslation();
  const deviceType = useDeviceType();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showWelcome, setShowWelcome] = useState(() => {
    // Skip welcome if accessing command center directly
    const path = window.location.pathname.toLowerCase();
    return !path.startsWith('/command') && !path.startsWith('/control');
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('0buck_auth_state') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('0buck_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    // v4.6.4: Strict Security Guard for Admin Routes
    const path = window.location.pathname.toLowerCase().replace(/\/$/, "");
    console.log("[App] Initial Path Check:", path);
    
    if (path.startsWith('/command') || path.startsWith('/control')) {
      const isAuth = localStorage.getItem('0buck_auth_state') === 'true';
      const user = JSON.parse(localStorage.getItem('0buck_user') || 'null');
      
      if (isAuth && user?.user_type === 'admin') {
        console.log("[App] Route match: authorized admin dashboard");
        return 'admin';
      } else {
        console.log("[App] Unauthorized admin access - redirecting to login");
        return 'login';
      }
    }
    
    const isAuth = localStorage.getItem('0buck_auth_state') === 'true';
    return isAuth ? 'chat' : 'login';
  });

  useEffect(() => {
    const path = location.pathname.toLowerCase().replace(/\/$/, "");
    console.log("[App] Location Path Change:", path);
    
    // v4.6.4: Strict Security Guard for Admin Routes
    if ((path.startsWith('/command') || path.startsWith('/control'))) {
      const isAuth = localStorage.getItem('0buck_auth_state') === 'true';
      const user = JSON.parse(localStorage.getItem('0buck_user') || 'null');
      
      if (isAuth && user?.user_type === 'admin') {
        if (currentView !== 'admin') {
          console.log("[App] Syncing view to admin based on path:", path);
          setCurrentView('admin');
          setShowWelcome(false);
        }
      } else {
        console.log("[App] Blocking unauthorized admin access - redirecting to login");
        if (currentView !== 'login') {
          setCurrentView('login');
          // alert("请使用管理员账号登录访问。");
        }
      }
    }
  }, [location.pathname, currentView, isAuthenticated, currentUser]);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [onAuthSuccess, setOnAuthSuccess] = useState<{ callback: () => void } | null>(null);

  const handleLogin = useCallback((email: string, user_data?: any) => {
    if (!email) return;
    
    // v4.6: Use real user data if provided by the backend login
    const user = user_data || { 
      id: email.replace(/[^a-zA-Z0-9]/g, '_'), 
      email,
      user_type: 'customer' // default
    };
    
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('0buck_auth_state', 'true');
    localStorage.setItem('0buck_user', JSON.stringify(user));
    setShowAuthModal(false);
    
    // v4.5.1: Smart redirect after login
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/command') || path.startsWith('/control')) {
      // v4.6: Verify admin privileges
      if (user.user_type === 'admin') {
        setCurrentView('admin');
      } else {
        alert("Access Denied: Admin privileges required.");
        setCurrentView('chat');
        window.history.replaceState({}, document.title, '/');
      }
    } else {
      setCurrentView('chat');
    }
    
    if (onAuthSuccess) {
      onAuthSuccess.callback();
      setOnAuthSuccess(null);
    }
  }, [onAuthSuccess]);

  // v3.4.6: Render LoginView with potential 2FA state
  const renderLoginView = useCallback((isModal: boolean = false) => {
    const urlParams = new URLSearchParams(window.location.search);
    const is2FA = urlParams.get('2fa_required') === 'true' || (currentUser?.email && !isAuthenticated && showAuthModal);
    
    return (
      <LoginView 
        onLogin={handleLogin} 
        onGoRegister={() => setAuthMode('register')} 
        onGuestAccess={() => {
          if (isModal) {
            setShowAuthModal(false);
          } else {
            setShowWelcome(false);
          }
          // v4.5.1: Smart redirect for guest
          const path = window.location.pathname.toLowerCase();
          if (path.startsWith('/command') || path.startsWith('/control')) {
            setCurrentView('admin');
          } else {
            setCurrentView('chat');
          }
        }}
        onInteraction={() => !isModal && setIsUserTyping(true)}
        isModal={isModal}
        initialStep={is2FA ? '2fa' : 'login'}
        initialEmail={currentUser?.email || ''}
      />
    );
  }, [handleLogin, currentUser, isAuthenticated, showAuthModal]);

  // v3.4.6: Handle OAuth Success and 2FA Redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth_success');
    const twoFactorRequired = urlParams.get('2fa_required');
    const email = urlParams.get('email');

    if (authSuccess === 'true' && email) {
      handleLogin(email);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (twoFactorRequired === 'true' && email) {
      // Show login modal but skip to 2FA step
      setAuthMode('login');
      setShowAuthModal(true);
      setCurrentUser({ id: email.replace(/[^a-zA-Z0-9]/g, '_'), email });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handleLogin]);

  // v3.4.3: useStreamVCC Hook for lazy initialization
  const { chatClient, isChatReady, isConnecting, connect, disconnect } = useStreamVCC(isAuthenticated, currentUser);

  const [securePayBackView, setSecurePayBackView] = useState<ViewType>('chat');
  const [securePayPayload, setSecurePayPayload] = useState<SecurePayPayload | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('0buck_cart');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [agentName, setAgentName] = useState(() => localStorage.getItem('butlerName') || '');

  useEffect(() => {
    const handleNameChange = () => {
      setAgentName(localStorage.getItem('butlerName') || '');
    };
    window.addEventListener('butlerNameChanged', handleNameChange);
    return () => window.removeEventListener('butlerNameChanged', handleNameChange);
  }, []);
  const [previousView, setPreviousView] = useState<ViewType>('prime');

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('0buck_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Lazy Initialization Trigger (v3.4.3)
  useEffect(() => {
    if (['circle', 'square'].includes(currentView)) {
      connect();
    }
  }, [currentView, connect]);

  // Cleanup on logout
  useEffect(() => {
    if (!isAuthenticated) {
      disconnect();
    }
  }, [isAuthenticated, disconnect]);

  // 针对 H5 模式的优化：如果是移动端，自动隐藏欢迎页（或者缩短时间）
  useEffect(() => {
    if (deviceType === 'h5') {
      const timer = setTimeout(() => setShowWelcome(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [deviceType]);

  // Auto-login/auto-enter timeout for unauthenticated users
  useEffect(() => {
    // If user is authenticated, or typing on login page, or it's not the initial state, don't auto-enter
    if (isAuthenticated || isUserTyping) return;

    if (currentView === 'login' || showWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
        if (currentView === 'login') {
          // v4.5.1: Prevent redirect if on command path
          const path = window.location.pathname.toLowerCase();
          if (path.startsWith('/command') || path.startsWith('/control')) {
            setCurrentView('admin');
          } else {
            setCurrentView('chat'); // Auto-enter to AI Butler as guest
          }
        }
      }, 5000); // Updated to 5 seconds as per Boss request
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, currentView, showWelcome, isUserTyping]);

  // Reset typing state when view changes
  useEffect(() => {
    if (currentView !== 'login') {
      setIsUserTyping(false);
    }
  }, [currentView]);

  const agentDisplayName = useMemo(() => {
    const name = agentName.trim();
    return name.length > 0 ? name : 'AI Butler';
  }, [agentName]);

  const hasCustomAgentName = useMemo(() => agentName.trim().length > 0, [agentName]);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('0buck_auth_state');
    localStorage.removeItem('0buck_user');
    setSecurePayPayload(null);
    setCartItems([]);
    setCurrentView('login');
  }, []);

  const requireAuth = useCallback((action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      setOnAuthSuccess({ callback: action });
      setAuthMode('login');
      setShowAuthModal(true);
    }
  }, [isAuthenticated]);

  // Custom Attachment Renderer for BAP Cards (Memoized to include current context)
  const BAPCustomAttachment = useMemo(() => {
    return (props: any) => {
      const { attachments, message } = props;
      const bapAttachment = attachments?.find((a: any) => a.type === '0B_CARD_V3');
      
      if (bapAttachment) {
        return (
          <BAPAttachmentRenderer 
            type={bapAttachment.component} 
            data={bapAttachment.data} 
            onAction={(action, params) => {
              console.log(`BAP Action: ${action}`, params);
              if (action === 'BUY') {
                requireAuth(() => {
                  setSecurePayPayload({
                    type: 'single',
                    id: params.id,
                    name: params.name,
                    price: params.price,
                    image: params.image,
                    quantity: params.quantity || 1,
                    referrer_id: message?.user?.id // v3.4.4: Pass message sender as referrer for distribution
                  });
                  setSecurePayBackView(currentView); // Return to whichever social view we were in
                  setCurrentView('secure-pay');
                });
              } else if (action === 'VIEW_PRODUCT') {
                setSelectedProduct(params as Product);
                setPreviousView(currentView);
                setCurrentView('product-detail');
              } else if (action === 'VOTE') {
                // Trigger C2M Vote logic
                const url = getApiUrl('/v1/c2m/vote');
                axios.post(url, {
                  user_id: currentUser?.id,
                  wish_id: params.wish_id
                }).then(() => alert('Vote registered!'))
                  .catch((err: any) => console.error('Vote failed:', err));
              } else if (action === 'JOIN_GROUP') {
                requireAuth(() => {
                  setSecurePayPayload({
                    type: 'single',
                    id: params.product_id,
                    name: params.product_name,
                    price: params.price,
                    image: params.product_image,
                    quantity: 1,
                    referrer_id: message?.user?.id,
                    group_share_code: params.share_code // v3.4.4: Mark as group buy entry
                  });
                  setSecurePayBackView(currentView);
                  setCurrentView('secure-pay');
                });
              }
            }} 
          />
        );
      }
      return <Attachment {...props} />;
    };
  }, [isAuthenticated, requireAuth, currentView, currentUser?.id]);

  const { status, isLoading: isRewardsLoading, checkIn, fetchStatus } = useRewards(currentUser?.id);

  const renderView = () => {
    switch (currentView) {
      case 'login':
        return renderLoginView();
      case 'register':
        return <RegisterView onRegister={handleLogin} onGoLogin={() => setCurrentView('login')} onGuestAccess={() => { setShowWelcome(false); setCurrentView('chat'); }} />;
      case 'checkin':
        return <CheckInView />;
      case 'prime':
        return <PrimeView onProductClick={(product) => {
          setSelectedProduct(product);
          setPreviousView('prime');
          setCurrentView('product-detail');
        }} onMerchantClick={(merchant) => {
          setSelectedMerchant(merchant);
          setCurrentView('merchant-detail');
        }} />;
      case 'square':
        return <SquareView 
          onRequireAuth={requireAuth} 
          onMerchantClick={(merchant) => {
            setSelectedMerchant(merchant);
            setCurrentView('merchant-detail');
          }} 
          onProductClick={(product) => {
            setSelectedProduct(product);
            setPreviousView('square');
            setCurrentView('product-detail');
          }}
          chatClient={chatClient}
          isChatReady={isChatReady}
          isConnecting={isConnecting}
          BAPCustomAttachment={BAPCustomAttachment}
          onRetry={connect}
        />;
      case 'product-detail':
        return selectedProduct ? (
          <ProductDetailView 
            product={selectedProduct} 
            onBack={() => setCurrentView(previousView)} 
            cartItemsCount={cartItems.length}
            onAddToCart={() => {
              requireAuth(() => {
                setCartItems(prev => {
                  const existing = prev.find(item => item.id === selectedProduct.id);
                  if (existing) {
                    return prev.map(item =>
                      item.id === selectedProduct.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                    );
                  }
                  return [...prev, { id: selectedProduct.id, product: selectedProduct, quantity: 1 }];
                });
                setCurrentView('cart');
              });
            }}
            onBuyNow={(product) => {
              requireAuth(() => {
                setSecurePayPayload({
                  type: 'single',
                  id: product.id,
                  name: product.name,
                  price: parseFloat(product.price.replace(/[^0-9.]/g, '')),
                  image: product.image,
                  quantity: 1
                });
                setSecurePayBackView('product-detail');
                setCurrentView('secure-pay');
              });
            }}
          />
        ) : <PrimeView onProductClick={(product) => {
          setSelectedProduct(product);
          setPreviousView('prime');
          setCurrentView('product-detail');
        }} onMerchantClick={(merchant) => {
          setSelectedMerchant(merchant);
          setCurrentView('merchant-detail');
        }} />;
      case 'merchant-detail':
        return selectedMerchant ? (
          <MerchantDetailView 
            merchant={selectedMerchant}
            onBack={() => setCurrentView('prime')}
            onProductClick={(product) => {
              setSelectedProduct(product);
              setPreviousView('merchant-detail');
              setCurrentView('product-detail');
            }}
          />
        ) : <SquareView onRequireAuth={requireAuth} onMerchantClick={(merchant) => {
          setSelectedMerchant(merchant);
          setCurrentView('merchant-detail');
        }} onProductClick={(product) => {
          setSelectedProduct(product);
          setPreviousView('square');
          setCurrentView('product-detail');
        }} />;
      case 'explore':
        return <ReferralView isAuthenticated={isAuthenticated} currentUser={currentUser} />;
      case 'chat':
        return (
          <AIButlerView 
            agentName={agentName} 
            userId={currentUser?.id}
            currentUser={currentUser}
            onProductClick={(product) => {
              setSelectedProduct(product);
              setPreviousView('chat');
              setCurrentView('product-detail');
            }}
            onBuyNow={(item: any) => {
              requireAuth(() => {
                setSecurePayPayload({
                  type: 'single', 
                  id: item.id,
                  name: item.name,
                  price: typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price,
                  image: item.image,
                  quantity: item.quantity || 1
                });
                setSecurePayBackView('chat');
                setCurrentView('secure-pay');
              });
            }}
            onAddToCart={(item: any) => {
              requireAuth(() => {
                setCartItems((prev) => {
                  const existing = prev.find((p) => p.id === item.id);
                  if (!existing) return [...prev, { 
                    id: item.id, 
                    product: item, 
                    quantity: item.quantity || 1,
                    name: item.name,
                    price: item.price,
                    image: item.image
                  }];
                  return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + (item.quantity || 1) } : p));
                });
                setCurrentView('cart');
              });
            }}
          />
        );
      case 'circle':
        return (
          <LoungeView 
            onRequireAuth={requireAuth} 
            onProductClick={(product) => {
              setSelectedProduct(product);
              setPreviousView('circle');
              setCurrentView('product-detail');
            }} 
            chatClient={chatClient}
            isChatReady={isChatReady}
            isConnecting={isConnecting}
            BAPCustomAttachment={BAPCustomAttachment}
            currentUser={currentUser}
            onRetry={connect}
          />
        );
      case 'contacts':
        return <ContactsView />;
      case 'messages':
        return <MessagesView />;
      case 'activity':
        return (
          <FeedView 
            onRequireAuth={requireAuth} 
            onProductClick={(product) => {
              setSelectedProduct(product);
              setPreviousView('activity');
              setCurrentView('product-detail');
            }}
          />
        );
      case 'secure-pay':
        return (
          <SecurePayView 
            payload={securePayPayload} 
            onBack={() => setCurrentView(securePayBackView)}
            currentUser={currentUser}
          />
        );
      case 'cart':
        return (
          <StashView
            items={cartItems}
            onUpdateQuantity={(id, quantity) => {
              setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
            }}
            onRemoveItem={(id) => {
              setCartItems((prev) => prev.filter((item) => item.id !== id));
            }}
            onBuyItNow={(id) => {
              const item = cartItems.find((i) => i.id === id);
              if (item) {
                const priceStr = String(item.price || '0');
                setSecurePayPayload({
                  type: 'single',
                  id: item.id,
                  name: item.name,
                  price: parseFloat(priceStr.replace(/[^0-9.]/g, '')),
                  image: item.image,
                  quantity: item.quantity
                });
                setSecurePayBackView('cart');
                setCurrentView('secure-pay');
              }
            }}
            onGoToSecurePay={() => {
              if (cartItems.length > 0) {
                setSecurePayPayload({
                  type: 'cart',
                  items: cartItems.map(item => {
                    const priceStr = String(item.price || '0');
                    return {
                      id: item.id,
                      name: item.name,
                      price: parseFloat(priceStr.replace(/[^0-9.]/g, '')),
                      image: item.image,
                      quantity: item.quantity
                    };
                  })
                });
                setSecurePayBackView('cart');
                setCurrentView('secure-pay');
              }
            }}
            onProductClick={(product) => {
              setSelectedProduct(product);
              setPreviousView('cart');
              setCurrentView('product-detail');
            }}
          />
        );
      case 'me':
        return <MeView 
          isAuthenticated={isAuthenticated} 
          onLoginClick={() => { setAuthMode('login'); setShowAuthModal(true); }} 
          onLogout={handleLogout} 
          agentName={agentName}
          onAgentNameChange={setAgentName}
          deviceType={deviceType}
          onMenuClick={() => setIsSidebarOpen(true)}
          status={status}
        />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-on-surface-variant">
            <p className="text-lg font-medium">{t('common.coming_soon', { view: currentView })}</p>
          </div>
        );
    }
  };

  const getHeaderProps = () => {
    switch (currentView) {
      case 'explore':
        return { title: t('nav.explore'), subtitle: t('explore.subtitle') };
      case 'chat':
        return { title: agentDisplayName, subtitle: hasCustomAgentName ? t('settings.butler_protocol') : t('nav.wait_for_naming') };
      case 'circle':
        return { title: t('nav.lounge'), subtitle: t('nav.private_talks') };
      case 'messages':
        return { title: t('nav.messages'), subtitle: t('nav.editorial_conv') };
      case 'activity':
        return { title: t('nav.feed'), subtitle: t('feed.subtitle') };
      case 'secure-pay':
        return { title: t('secure_pay.title'), subtitle: t('secure_pay.subtitle'), showSearch: false };
      case 'cart':
        return { title: t('stash.title'), subtitle: t('stash.subtitle'), showSearch: false };
      case 'merchant-detail':
        return { 
          title: selectedMerchant?.name || 'Supplier Marketplace', 
          subtitle: 'Verified Global Node',
          showSearch: false,
          onBack: () => setCurrentView('prime'),
          onShare: () => {
            if (navigator.share) {
              navigator.share({
                title: selectedMerchant?.name || 'Supplier Marketplace',
                text: `Check out ${selectedMerchant?.name} on 0Buck Global Supply Index`,
                url: window.location.href,
              }).catch(console.error);
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }
          }
        };
      case 'prime':
        return { title: t('nav.prime'), subtitle: t('prime.subtitle'), showSearch: false };
      case 'square':
        return { title: t('nav.square'), subtitle: t('square.subtitle') };
      case 'me':
        return { hideHeader: true, showSearch: false };
      case 'admin':
        return { title: '0Buck Admin', subtitle: 'Global Decision Engine', showSearch: false };
      case 'product-detail':
        return { hideHeader: true };
      case 'login':
      case 'register':
        return { hideHeader: true };
      default:
        return { title: currentView.charAt(0).toUpperCase() + currentView.slice(1) };
    }
  };

  return (
    <div className={`h-screen bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden`}>
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[100]"
          >
            <WelcomeView onEnter={() => setShowWelcome(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full w-full relative"
          >
            {!['login', 'register', 'admin'].includes(currentView) && !location.pathname.toLowerCase().startsWith('/command') && !location.pathname.toLowerCase().startsWith('/control') && (
              <Sidebar 
                currentView={currentView} 
                onViewChange={setCurrentView} 
                onLogout={handleLogout} 
                agentName={agentName} 
                isAuthenticated={isAuthenticated} 
                onLoginClick={() => { setAuthMode('login'); setShowAuthModal(true); }} 
                cartItemsCount={cartItems.length}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
              />
            )}
            <main className={`${!['login', 'register', 'admin'].includes(currentView) && !location.pathname.toLowerCase().startsWith('/command') && !location.pathname.toLowerCase().startsWith('/control') ? 'lg:ml-20' : ''} h-screen flex flex-col relative overflow-hidden`}>
              <TopBar 
                {...getHeaderProps()} 
                currentView={currentView} 
                onViewChange={setCurrentView} 
                isAuthenticated={isAuthenticated} 
                onUserClick={() => setCurrentView('me')} 
                cartItemsCount={cartItems.length} 
                onMenuClick={() => setIsSidebarOpen(true)}
              />
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentView}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {renderView()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>

            <FloatingButler 
              onProductClick={(product) => {
                setSelectedProduct(product);
                setCurrentView('product-detail');
              }}
            />

            {showAuthModal && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-lg relative"
                >
                  <button 
                    onClick={() => setShowAuthModal(false)}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                  {authMode === 'login' ? (
                    renderLoginView(true)
                  ) : (
                    <RegisterView onRegister={handleLogin} onGoLogin={() => setAuthMode('login')} isModal />
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
