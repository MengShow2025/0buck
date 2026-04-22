import { useEffect, useState } from 'react';
import { Settings, ChevronRight, CreditCard, MapPin, Ticket, Camera, Star, Package, Heart, Edit3 } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { DrawerType } from '../contexts/types';
import { authApi, rewardApi } from '../../../services/api';
import { clearStoredAuthTokens } from '../../../services/authSession';
import { buildAvatarFallback, formatMemberId, getDisplayName } from '../utils/userIdentity';
import { summarizeRewardTransactions } from '../utils/rewardCommerce';

export const MeDrawer = () => {
  const { setActiveDrawer, pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { userLevel, userBalance, isPrime } = useCommerceContext();
  const { isAuthenticated, user, setUser } = useSessionContext();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(getDisplayName(user));
  const [rewardIncome, setRewardIncome] = useState(0);

  const displayName = editName.trim() || getDisplayName(user);
  const avatarUrl = user?.avatar_url || buildAvatarFallback(user);
  const membershipLabel = isAuthenticated ? `${user?.user_tier ?? userLevel} Member` : 'Not Logged In';
  const memberId = formatMemberId(user?.customer_id);

  useEffect(() => {
    const hydrateRewardIncome = async () => {
      if (!isAuthenticated || !user?.customer_id) {
        setRewardIncome(0);
        return;
      }

      try {
        const response = await rewardApi.getTransactions(user.customer_id);
        const transactions = Array.isArray(response.data) ? response.data : [];
        const summary = summarizeRewardTransactions(transactions);
        setRewardIncome(summary.lifetimeEarnings);
      } catch {
        setRewardIncome(0);
      }
    };

    hydrateRewardIncome();
  }, [isAuthenticated, user?.customer_id]);

  const handleSaveProfile = () => {
    if (!isAuthenticated) return;
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort logout: clear local auth state even if server logout fails.
    } finally {
      clearStoredAuthTokens(window.localStorage);
      setUser(null);
      setActiveDrawer('none');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black overflow-y-auto no-scrollbar pb-8">

      {/* ── Profile Hero Header ── */}
      <div className="bg-white dark:bg-[#1C1C1E] px-5 pt-6 pb-5 relative overflow-hidden">
        {/* Subtle brand glow behind avatar */}
        <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full blur-3xl opacity-[0.06] bg-[var(--wa-teal)] pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          {/* Avatar */}
          <div
            className="relative cursor-pointer group shrink-0"
            onClick={() => isAuthenticated && setIsEditing(true)}
          >
            <div className="w-[68px] h-[68px] rounded-[22px] overflow-hidden border-2 border-white dark:border-white/10 shadow-md">
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            {isAuthenticated && (
              <div className="absolute inset-0 rounded-[22px] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
            {/* Online dot */}
            {isAuthenticated && (
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#1C1C1E]" />
            )}
          </div>

          {/* Name + Level */}
          <div
            className="flex-1 cursor-pointer"
            onClick={() => isAuthenticated && setIsEditing(true)}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-[20px] font-bold text-gray-900 dark:text-white leading-none">{displayName}</h2>
              {isAuthenticated && <Edit3 className="w-3.5 h-3.5 text-gray-400" />}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {isAuthenticated && isPrime ? (
                <span className="bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border border-purple-500/20 flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-current" /> KOL
                </span>
              ) : (
                <span className="bg-[var(--wa-teal)]/10 text-[var(--wa-teal)] px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border border-[var(--wa-teal)]/20">
                  {membershipLabel}
                </span>
              )}
              {memberId && (
                <span className="text-[11px] text-gray-400 font-mono">ID: {memberId}</span>
              )}
            </div>
          </div>

          {/* Login / Chevron */}
          {!isAuthenticated ? (
            <button
              onClick={() => pushDrawer('auth')}
              className="px-4 py-2 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
            >
              Login
            </button>
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-300" />
          )}
        </div>

        {/* Inline Edit Overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-sm z-20 flex items-center px-5 gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-[16px] flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10">
              <img src={avatarUrl} className="w-full h-full object-cover opacity-50" />
              <Camera className="w-4 h-4 text-gray-600 dark:text-white absolute" />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nickname</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                autoFocus
                className="w-full text-[17px] font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-[var(--wa-teal)] focus:outline-none pb-0.5"
                placeholder="Enter nickname..."
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveProfile} className="px-3 py-1.5 text-white font-semibold text-[13px] rounded-lg active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Big Stats Tiles: Wallet + Fans ── */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-3">
        {/* Wallet tile */}
        <button
          onClick={() => pushDrawer('wallet')}
          className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-4 text-left active:scale-[0.97] transition-transform border border-gray-100 dark:border-white/5 shadow-sm"
        >
          <div className="w-9 h-9 rounded-[12px] bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
            <span className="text-[18px]">💰</span>
          </div>
          <div className="font-mono font-black text-[22px] text-gray-900 dark:text-white leading-none mb-1">
            ${userBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
            {t('me.wallet_points')}
            <ChevronRight className="w-3 h-3" />
          </div>
        </button>

        {/* Fans tile */}
        <button
          onClick={() => pushDrawer('fans')}
          className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-4 text-left active:scale-[0.97] transition-transform border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-[12px] bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-3">
            <span className="text-[18px]">👥</span>
          </div>
          <div className="font-mono font-black text-[22px] text-gray-900 dark:text-white leading-none mb-1">
            ${rewardIncome.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
            {t('me.fans_cashback')}
            <ChevronRight className="w-3 h-3" />
          </div>
          {/* New badge */}
          <span className="absolute top-3 right-3 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">New</span>
        </button>
      </div>

      {/* ── Order Status Section ── */}
      <div className="bg-white dark:bg-[#1C1C1E] mx-4 mt-3 rounded-[20px] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        {/* Orders header row */}
        <button
          onClick={() => pushDrawer('orders')}
          className="w-full flex items-center px-4 py-3.5 border-b border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-[10px] bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-3">
            <Package className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div className="flex-1 text-left text-[15px] font-medium text-gray-800 dark:text-gray-200">{t('me.my_orders')}</div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        {/* 4-icon order status row */}
        <div className="grid grid-cols-4 px-2 py-4">
          {[
            { icon: CreditCard, label: t('me.to_pay'), color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/15' },
            { icon: Package, label: t('me.to_ship'), color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/15' },
            { icon: MapPin, label: t('me.to_receive'), color: 'text-[var(--wa-teal)]', bg: 'bg-orange-50 dark:bg-orange-900/15', badge: '1' },
            { icon: Heart, label: t('me.refund_after_sales'), color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/15' },
          ].map(({ icon: Icon, label, color, bg, badge }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 cursor-pointer group relative">
              <div className={`w-11 h-11 rounded-[14px] ${bg} flex items-center justify-center group-active:scale-90 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">{label}</span>
              {badge && (
                <span className="absolute top-0 right-3 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 3-col Tool Tiles ── */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-3">
        {([
          { icon: MapPin, label: t('me.shipping_address'), color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', drawer: 'address' },
          { icon: Ticket, label: t('me.coupons_benefits'), color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', drawer: 'coupons' },
          { icon: Settings, label: t('settings'), color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-white/8', drawer: 'settings' },
        ] as Array<{ icon: any; label: string; color: string; bg: string; drawer: DrawerType }>).map(({ icon: Icon, label, color, bg, drawer }) => (
          <button
            key={drawer}
            onClick={() => pushDrawer(drawer)}
            className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-4 flex flex-col items-center gap-2.5 active:scale-[0.95] transition-transform border border-gray-100 dark:border-white/5 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-[14px] ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Logout ── */}
      {isAuthenticated && (
        <div className="mx-4 mt-4">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/15 text-red-500 rounded-[16px] font-semibold text-[15px] transition-colors"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
};
