import React, { useState } from 'react';
import { User, Shield, Bell, Globe, Palette, ChevronRight, Crown, Star, LogOut, Camera, Copy, CheckCircle2, Zap, Heart, MapPin, Ticket, Trophy, Users, ShoppingCart, Package } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useSessionContext } from '../contexts/SessionContext';
import { authApi } from '../../../services/api';
import { clearStoredAuthTokens } from '../../../services/authSession';
import { getDisplayName, getReferralCode } from '../utils/userIdentity';

const TIER_META: Record<string, { color: string; bg: string; gradient: string }> = {
  Platinum: { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', gradient: 'from-violet-500 to-indigo-500' },
  Gold:     { color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20',   gradient: 'from-amber-400 to-orange-500' },
  Silver:   { color: 'text-zinc-500',                         bg: 'bg-zinc-100 dark:bg-zinc-800',       gradient: 'from-zinc-400 to-zinc-600' },
  Bronze:   { color: 'text-orange-700 dark:text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20', gradient: 'from-orange-700 to-amber-800' },
};

const SETTINGS_GROUPS = [
  {
    title: 'My',
    items: [
      { label: 'Orders', sub: 'View all order status', icon: <Package className="w-4 h-4 text-blue-500" />, drawer: 'orders' as const },
      { label: 'Cart',   sub: 'Items to checkout',     icon: <ShoppingCart className="w-4 h-4 text-orange-500" />, drawer: 'cart' as const },
      { label: 'Wishlist', sub: 'Saved and wished items', icon: <Heart className="w-4 h-4 text-rose-500" />,   drawer: 'wishlist_detail' as const },
      { label: 'Addresses', sub: 'Shipping addresses', icon: <MapPin className="w-4 h-4 text-green-500" />,  drawer: 'address' as const },
      { label: 'Coupons',   sub: 'Store and platform coupons', icon: <Ticket className="w-4 h-4 text-purple-500" />, drawer: 'coupons' as const },
    ]
  },
  {
    title: 'Promotion',
    items: [
      { label: 'Fan Center', sub: 'Referral and fan rewards', icon: <Users className="w-4 h-4 text-indigo-500" />, drawer: 'fan_center' as const },
      { label: 'Creator Apply', sub: 'Apply as a promoter',   icon: <Zap className="w-4 h-4 text-yellow-500" />,   drawer: 'influencer_apply' as const },
      { label: 'Leaderboard', sub: 'View creator rankings',    icon: <Trophy className="w-4 h-4 text-amber-500" />, drawer: 'leaderboard' as const },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'Personal Info', sub: 'Edit name and avatar', icon: <User className="w-4 h-4" />, drawer: 'personal_info' as const },
      { label: 'Security', sub: 'Password and 2FA', icon: <Shield className="w-4 h-4" />, drawer: 'security' as const },
    ]
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Notifications', sub: 'Push and email alerts', icon: <Bell className="w-4 h-4" />, drawer: 'settings' as const },
      { label: 'Language & Region', sub: 'Language and currency', icon: <Globe className="w-4 h-4" />, drawer: 'settings' as const },
      { label: 'Theme', sub: 'Dark / light mode', icon: <Palette className="w-4 h-4" />, drawer: 'settings' as const },
    ]
  },
  {
    title: 'Membership',
    items: [
      { label: 'Prime Membership', sub: 'Manage benefits and renewal', icon: <Crown className="w-4 h-4 text-amber-500" />, drawer: 'prime' as const },
      { label: 'AI Model Config', sub: 'Bring your own AI model', icon: <Zap className="w-4 h-4 text-purple-500" />, drawer: 'api_model_add' as const },
    ]
  }
];

export const DesktopProfileView: React.FC = () => {
  const { user, isAuthenticated, setUser } = useSessionContext();
  const { userBalance, userPoints, isPrime, orders } = useCommerceContext();
  const { pushDrawer, setActiveDrawer } = useDrawerContext();
  const [copied, setCopied] = useState(false);

  const tier = user?.user_tier ?? 'Bronze';
  const meta = TIER_META[tier] ?? TIER_META.Bronze;
  const displayName = getDisplayName(user);
  const referralCode = getReferralCode(user);

  const handleCopyReferral = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <User className="w-10 h-10 text-zinc-400" />
        </div>
        <div className="text-center">
          <h3 className="text-[18px] font-black text-zinc-900 dark:text-white mb-1">Not logged in</h3>
          <p className="text-[14px] text-zinc-400">Login to view profile, orders, and balance</p>
        </div>
        <button
          onClick={() => pushDrawer('auth')}
          className="px-8 py-3 rounded-2xl text-white text-[15px] font-semibold shadow-lg"
          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
        >
          Login Now
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Profile Card */}
      <div className="w-[280px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {/* Avatar Area */}
        <div className="relative px-6 pt-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-3xl font-black text-white shadow-lg`}>
                {(displayName || 'U')[0].toUpperCase()}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center shadow-sm hover:border-orange-400 transition-colors">
                <Camera className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
            <h2 className="text-[17px] font-black text-zinc-900 dark:text-white">
              {displayName}
            </h2>
            <p className="text-[12px] text-zinc-400 mt-0.5">{user?.email}</p>
            <div className={`mt-2 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black ${meta.bg} ${meta.color}`}>
              <Star className="w-3 h-3 fill-current" /> {tier}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800">
          {[
            { label: 'Balance', value: `$${userBalance.toFixed(2)}`, accent: true },
            { label: 'Points', value: userPoints.toLocaleString(), accent: false },
            { label: 'Orders', value: orders?.length || 0, accent: false },
            { label: 'Prime', value: isPrime ? 'Active' : 'Inactive', accent: isPrime },
          ].map(s => (
            <div key={s.label} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
              <div className={`text-[18px] font-black ${s.accent ? 'text-orange-500' : 'text-zinc-900 dark:text-white'}`}>{s.value}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Referral Code */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">My Referral Code</div>
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5">
            <span className="flex-1 font-mono text-[14px] font-bold text-zinc-700 dark:text-zinc-300">
              {referralCode ?? '--'}
            </span>
            <button
              onClick={handleCopyReferral}
              disabled={!referralCode}
              className="text-orange-500 hover:text-orange-600 transition-colors disabled:text-zinc-300 disabled:hover:text-zinc-300"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[13px] font-semibold">Log Out</span>
          </button>
        </div>
      </div>

      {/* Right: Settings */}
      <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
        <h2 className="text-[18px] font-black text-zinc-900 dark:text-white mb-5">Account Settings</h2>
        <div className="space-y-6 max-w-xl">
          {SETTINGS_GROUPS.map(group => (
            <div key={group.title}>
              <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2 px-1">{group.title}</div>
              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {group.items.map(item => (
                  <button
                    key={item.label}
                    onClick={() => pushDrawer(item.drawer)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-zinc-900 dark:text-white">{item.label}</div>
                      <div className="text-[12px] text-zinc-400">{item.sub}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
