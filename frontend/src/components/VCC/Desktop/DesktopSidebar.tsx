import React from 'react';
import {
  MessageSquare, ShoppingBag, Package, Wallet,
  Users, Bell, LogIn,
  Zap, ChevronRight, Crown, ShoppingCart
} from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { getDisplayName } from '../utils/userIdentity';

type DesktopView = 'chat' | 'shop' | 'orders' | 'wallet' | 'social' | 'notifications' | 'profile';

interface Props {
  activeView: DesktopView;
  onViewChange: (v: DesktopView) => void;
  expanded: boolean;
  onToggle: () => void;
}

const NAV_ITEMS: { id: DesktopView; icon: React.ReactNode; labelKey: string }[] = [
  { id: 'chat',          icon: <MessageSquare className="w-5 h-5" />, labelKey: 'nav.chat' },
  { id: 'shop',          icon: <ShoppingBag className="w-5 h-5" />,   labelKey: 'nav.shop' },
  { id: 'orders',        icon: <Package className="w-5 h-5" />,        labelKey: 'nav.orders' },
  { id: 'wallet',        icon: <Wallet className="w-5 h-5" />,         labelKey: 'nav.wallet' },
  { id: 'social',        icon: <Users className="w-5 h-5" />,          labelKey: 'nav.social' },
  { id: 'notifications', icon: <Bell className="w-5 h-5" />,           labelKey: 'nav.notifications' },
];

const NAV_LABELS: Record<string, string> = {
  'nav.chat': 'AI Assistant',
  'nav.shop': 'Discover',
  'nav.orders': 'Orders',
  'nav.wallet': 'Wallet',
  'nav.social': 'Community',
  'nav.notifications': 'Notifications',
  'nav.profile': 'Profile',
};

export const DesktopSidebar: React.FC<Props> = ({ activeView, onViewChange, expanded, onToggle }) => {
    const { t } = usePreferenceContext();
  const { isAuthenticated, user } = useSessionContext();
  const { isPrime, userBalance } = useCommerceContext();
  const { pushDrawer } = useDrawerContext();
  const cartItemCount = 3; // Mock cart count
  const displayName = getDisplayName(user);

  const label = (key: string) => t(key) || NAV_LABELS[key] || key;

  const tierColors: Record<string, string> = {
    Platinum: 'from-violet-500 to-indigo-500',
    Gold:     'from-amber-400 to-orange-500',
    Silver:   'from-zinc-400 to-zinc-600',
    Bronze:   'from-orange-700 to-amber-800',
  };
  const tierColor = tierColors[user?.user_tier ?? 'Bronze'] ?? tierColors.Bronze;

  return (
    <aside
      className={`flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111113] transition-all duration-300 ease-in-out shrink-0 ${expanded ? 'w-[220px]' : 'w-[68px]'}`}
    >
      {/* Logo / Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center gap-3 px-4 h-[64px] border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group shrink-0"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
        >
          <Zap className="w-5 h-5 text-white fill-current" />
        </div>
        {expanded && (
          <div className="flex items-center justify-between flex-1 min-w-0">
            <span className="text-[15px] font-black text-zinc-900 dark:text-white tracking-tight">0Buck</span>
            <ChevronRight className="w-4 h-4 text-zinc-400 rotate-180 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
          </div>
        )}
      </button>

      {/* Nav Items */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-hidden">
        {NAV_ITEMS.map(item => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={!expanded ? label(item.labelKey) : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                active
                  ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                  style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
                />
              )}
              <span className={`shrink-0 ${active ? 'text-[#E8450A]' : ''}`}>{item.icon}</span>
              {expanded && (
                <span className={`text-[13px] font-semibold whitespace-nowrap truncate ${active ? 'text-zinc-900 dark:text-white' : ''}`}>
                  {label(item.labelKey)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Prime Badge */}
      {expanded && isPrime && (
        <div className="mx-2 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 shrink-0"
          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
          <Crown className="w-4 h-4 text-white shrink-0" />
          <div>
            <div className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Prime</div>
            <div className="text-[10px] text-white/70 font-medium">{t('prime.active_member') || 'Active Member'}</div>
          </div>
        </div>
      )}

      {/* Cart Quick Access */}
      <div className="px-2 pb-2 shrink-0">
        <button
          onClick={() => pushDrawer('cart')}
          title={!expanded ? (t('cart.title') || 'Cart') : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all relative"
        >
          <div className="relative shrink-0">
            <ShoppingCart className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </div>
          {expanded && (
            <span className="text-[13px] font-semibold">{t('cart.title') || 'Cart'}</span>
          )}
        </button>
      </div>

      {/* User Profile / Auth */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 shrink-0">
        {isAuthenticated && user ? (
          <button
            onClick={() => onViewChange('profile')}
            title={!expanded ? (user.nickname || user.email) : undefined}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-zinc-50 dark:hover:bg-white/5 ${activeView === 'profile' ? 'bg-zinc-100 dark:bg-white/10' : ''}`}
          >
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tierColor} flex items-center justify-center shrink-0 shadow-sm`}>
              <span className="text-[12px] font-black text-white">
                {(displayName || 'U')[0].toUpperCase()}
              </span>
            </div>
            {expanded && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">
                  {displayName}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  ${userBalance.toFixed(2)}
                </div>
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={() => pushDrawer('auth')}
            title={!expanded ? (t('auth.login_action') || 'Login') : undefined}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            {expanded && <span className="text-[13px] font-semibold">{t('auth.login_action') || 'Login'}</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
