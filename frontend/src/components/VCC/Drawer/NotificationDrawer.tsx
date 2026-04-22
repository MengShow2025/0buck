import React, { useState } from 'react';
import { Bell, ChevronRight, ShoppingBag, CreditCard, Gift, UserPlus, Trash2, MoreHorizontal, CheckCircle2, Truck, Zap, Heart, MessageSquare, Send, Star, Package, Award, Bot, TrendingUp, ShieldCheck } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useDrawerContext } from '../contexts/DrawerContext';

const NotificationCard: React.FC<{ notif: any }> = ({ notif }) => {
    const { pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [hasReplied, setHasReplied] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'pending' | 'accepted' | 'ignored'>('pending');

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim()) return;
    setHasReplied(true);
    setIsReplying(false);
  };

  const handleInvite = (e: React.MouseEvent, status: 'accepted' | 'ignored') => {
    e.stopPropagation();
    setInviteStatus(status);
  };

  return (
    <div className="w-full bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl rounded-[24px] shadow-sm border border-white/40 dark:border-white/10 overflow-hidden active:scale-[0.99] transition-all duration-200">
      {/* Card Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100/50 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-[12px] ${notif.color || 'bg-gray-100 dark:bg-white/5'} flex items-center justify-center shadow-sm`}>
            {notif.icon}
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
            {notif.title}
          </h3>
        </div>
        <button className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-100 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Card Content */}
      <div 
        className={`px-4 py-3 ${(!isReplying && (notif.type === 'interaction' || notif.type === 'reply')) ? 'cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors' : ''}`}
        onClick={() => {
          if (!isReplying && (notif.type === 'interaction' || notif.type === 'reply')) {
            setIsReplying(true);
          }
        }}
      >
        {notif.type === 'invite' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-gray-400 dark:text-gray-500 font-bold shrink-0">{t('notification.inviter')}</span>
                <span className="text-[13px] text-gray-900 dark:text-gray-200 font-black truncate">{notif.sender}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[13px] text-gray-400 dark:text-gray-500 font-bold shrink-0">{t('notification.content')}</span>
                <span className="text-[13px] text-gray-900 dark:text-gray-200 font-medium leading-snug line-clamp-2">{notif.content}</span>
              </div>
            </div>

            {inviteStatus === 'pending' ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => handleInvite(e, 'accepted')}
              className="flex-1 py-2 text-white text-[12px] font-semibold rounded-xl active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
                >
                  {t('notification.accept')}
                </button>
                <button 
                  onClick={(e) => handleInvite(e, 'ignored')}
                  className="flex-1 py-2 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[12px] font-semibold rounded-xl active:scale-95 transition-transform"
                >
                  {t('notification.ignore')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400 italic animate-in fade-in duration-500">
                <CheckCircle2 className={`w-3.5 h-3.5 ${inviteStatus === 'accepted' ? 'text-green-500' : 'text-gray-400'}`} />
                {inviteStatus === 'accepted' ? t('notification.accepted') : t('notification.ignored')}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {notif.details && notif.details.length > 0 && notif.details.map((detail: any, idx: number) => (
              <div key={idx} className="flex items-baseline gap-2">
                <span className="text-[12px] text-gray-400 dark:text-gray-500 font-black shrink-0">{detail.label}: </span>
                <span className="text-[13px] text-gray-900 dark:text-gray-200 leading-snug font-bold">
                  {detail.value}
                </span>
              </div>
            ))}
            {notif.footer && (
              <div className="mt-2 pt-2 border-t border-gray-100/50 dark:border-white/5 text-[12px] text-gray-500 dark:text-gray-400 font-bold italic">
                {notif.footer}
              </div>
            )}
          </div>
        )}

        {/* Inline Reply UI for Interaction/Reply types */}
        {(notif.type === 'interaction' || notif.type === 'reply') && !hasReplied && (
          <div className="mt-3">
            {!isReplying ? (
              <button
                onClick={(e) => { e.stopPropagation(); setIsReplying(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8450A]/10 text-[#E8450A] rounded-full text-[12px] font-black hover:bg-[#E8450A]/20 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> {t('notification.quick_reply')}
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                <input 
                  autoFocus
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('notification.reply_placeholder')}
                  className="flex-1 bg-gray-100/50 dark:bg-white/5 rounded-full px-3 py-1.5 text-[12px] outline-none border border-white/20 focus:border-[#E8450A]"
                />
                <button
                  onClick={handleReply}
                  className="w-8 h-8 text-white rounded-full flex items-center justify-center shadow-md active:scale-90"
                  style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
        {hasReplied && (
          <div className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-gray-400 italic animate-in fade-in duration-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {t('notification.replied')}
          </div>
        )}
      </div>

      {/* Card Footer (View Details) */}
      {notif.hasDetail && (
        <button 
          onClick={() => {
            if (notif.type === 'invite') {
              pushDrawer('contacts');
            } else if (notif.targetDrawer) {
              pushDrawer(notif.targetDrawer as any);
            } else {
              pushDrawer('service');
            }
          }}
          className="w-full px-4 py-3 flex items-center justify-between border-t border-gray-100/50 dark:border-white/5 text-[14px] font-semibold text-gray-900 dark:text-white active:bg-gray-50 dark:active:bg-white/5 transition-colors"
        >
          <span className="tracking-tight">{t('common.details')}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      )}
    </div>
  );
};

export const NotificationDrawer: React.FC = () => {
    const { pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { isAuthenticated } = useSessionContext();

  const TODAY = t('common.today') || 'Today';
  const YESTERDAY = t('common.yesterday') || 'Yesterday';
  const THIS_WEEK = 'This Week';

  const NOTIFICATIONS: any[] = [
    // Today
    {
      id: 'order_shipped',
      type: 'activity',
      title: t('notification.order_shipped') || 'Order shipped 🚚',
      time: TODAY,
      details: [
        { label: t('ordercenter.order_id') || 'Order', value: 'ORD-2841' },
        { label: t('common.product') || 'Product', value: t('ordercenter.minimalist_titanium_watch') || 'Minimalist Titanium Watch' },
        { label: t('notification.courier') || 'Courier', value: 'SF Express · SF1234567890' },
        { label: t('notification.eta') || 'ETA', value: t('notification.eta_days') || 'Arrives within 2-3 business days' },
      ],
      icon: <Truck className="w-5 h-5 text-blue-500" />,
      color: 'bg-blue-500/10',
      hasDetail: true,
      targetDrawer: 'order_center',
    },
    {
      id: 'cashback_earned',
      type: 'activity',
      title: t('notification.cashback_title') || 'Cash reward received 💰',
      time: TODAY,
      details: [
        { label: t('notification.type') || 'Type', value: t('reward.milestone_rebate').replace('{phase}', '7') || 'Stage cashback · Phase 7' },
        { label: t('notification.amount') || 'Amount', value: '+$15.00' },
        { label: t('ordercenter.order_id') || 'Order', value: 'ORD-001' },
      ],
      footer: t('notification.cashback_footer') || 'Balance updated. You can withdraw from wallet anytime.',
      icon: <CreditCard className="w-5 h-5 text-emerald-500" />,
      color: 'bg-emerald-500/10',
      hasDetail: true,
      targetDrawer: 'reward_history',
    },
    {
      id: 'post_liked',
      type: 'interaction',
      title: t('notification.liked_title') || 'Someone liked your post ❤️',
      time: TODAY,
      details: [
        { label: t('notification.from_user') || 'User', value: 'Alex_Design · SVIP' },
        { label: t('notification.post_excerpt') || 'Content', value: '"Just got these wireless earbuds. Incredible sound quality. Highly recommended!"' },
      ],
      icon: <Heart className="w-5 h-5 text-red-500" />,
      color: 'bg-red-500/10',
      hasDetail: false,
    },
    {
      id: 'ai_reward',
      type: 'activity',
      title: t('notification.ai_reward_title') || 'AI assistant reward',
      time: TODAY,
      details: [
        { label: t('notification.type') || 'Type', value: 'AI chat reward' },
        { label: t('notification.amount') || 'Reward', value: '+$2.50' },
        { label: t('notification.reason') || 'Reason', value: 'Completed today’s AI interaction task' },
      ],
      icon: <Bot className="w-5 h-5 text-cyan-500" />,
      color: 'bg-cyan-500/10',
      hasDetail: true,
      targetDrawer: 'reward_history',
    },

    // Yesterday
    {
      id: 'order_delivered',
      type: 'activity',
      title: t('notification.delivered_title') || 'Package delivered ✅',
      time: YESTERDAY,
      details: [
        { label: t('ordercenter.order_id') || 'Order', value: 'ORD-2799' },
        { label: t('common.product') || 'Product', value: t('ordercenter.artisan_wireless_earbuds') || 'Artisan Wireless Earbuds Pro' },
        { label: t('notification.signed_at') || 'Signed', value: 'Yesterday 14:32' },
      ],
      footer: t('notification.rate_prompt') || 'If you like it, leave a review 🌟',
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      color: 'bg-green-500/10',
      hasDetail: true,
      targetDrawer: 'order_center',
    },
    {
      id: 'invite_group',
      type: 'invite',
      title: t('notification.friend_invite') || 'Friend invite',
      time: YESTERDAY,
      sender: 'Lorna_K',
      content: 'Invites you to join "Gadget Lovers · Curated Picks" to discover more great products together!',
      icon: <UserPlus className="w-5 h-5 text-indigo-500" />,
      color: 'bg-indigo-500/10',
      hasDetail: true,
    },
    {
      id: 'comment_reply',
      type: 'reply',
      title: t('notification.reply_title') || 'Someone replied to your comment 💬',
      time: YESTERDAY,
      details: [
        { label: t('notification.from_user') || 'User', value: 'Marcus_T · VIP5' },
        { label: t('notification.replied_with') || 'Reply', value: '"This one is great. I bought one too! The color looks even better in person."' },
      ],
      icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
      color: 'bg-blue-500/10',
      hasDetail: false,
    },
    {
      id: 'new_follower',
      type: 'activity',
      title: t('notification.new_follower') || 'You have a new follower',
      time: YESTERDAY,
      details: [
        { label: t('notification.from_user') || 'User', value: 'Sophie_Chen · VIP3' },
        { label: t('notification.follower_bio') || 'Bio', value: 'Buyer who loves discovering great products; following 12 creators' },
      ],
      icon: <UserPlus className="w-5 h-5 text-pink-500" />,
      color: 'bg-pink-500/10',
      hasDetail: true,
      targetDrawer: 'contacts',
    },

    // This week
    {
      id: 'flash_sale',
      type: 'activity',
      title: t('notification.flash_sale') || '⚡ Flash sale reminder',
      time: THIS_WEEK,
      details: [
        { label: t('notification.activity') || 'Activity', value: '11.11 Warm-Up Flash Sale' },
        { label: t('notification.starts_at') || 'Time', value: 'Starts tonight at 20:00' },
        { label: t('notification.discount') || 'Discount', value: 'Up to 70% OFF, Prime only' },
      ],
      footer: t('notification.flash_footer') || 'Items in cart receive priority price lock',
      icon: <Zap className="w-5 h-5 text-orange-500" />,
      color: 'bg-orange-500/10',
      hasDetail: true,
      targetDrawer: 'order_center',
    },
    {
      id: 'withdrawal_approved',
      type: 'activity',
      title: t('notification.withdrawal_title') || 'Withdrawal approved',
      time: THIS_WEEK,
      details: [
        { label: t('notification.amount') || 'Amount', value: '-$500.00' },
        { label: t('notification.fee') || 'Fee', value: '$2.00' },
        { label: t('notification.arrival') || 'Arrival', value: 'Arrives in 1-3 business days' },
        { label: t('notification.account') || 'Account', value: 'PayPal · ****@gmail.com' },
      ],
      icon: <CreditCard className="w-5 h-5 text-violet-500" />,
      color: 'bg-violet-500/10',
      hasDetail: true,
      targetDrawer: 'wallet',
    },
    {
      id: 'c2w_success',
      type: 'activity',
      title: t('notification.c2w_success') || '🎉 Crowdfunding success!',
      time: THIS_WEEK,
      details: [
        { label: t('notification.project') || 'Project', value: 'C2W-X · Minimal Mechanical Keyboard Workstation' },
        { label: t('notification.status') || 'Status', value: 'Goal reached! 23% over target' },
        { label: t('notification.ship_eta') || 'Ship ETA', value: '2024 Q1' },
      ],
      footer: t('notification.c2w_footer') || 'Thanks for your support! Merchant will schedule production and shipping soon.',
      icon: <Gift className="w-5 h-5 text-rose-500" />,
      color: 'bg-rose-500/10',
      hasDetail: true,
      targetDrawer: 'order_center',
    },
    {
      id: 'referral_reward',
      type: 'activity',
      title: t('notification.referral_title') || 'Referral reward received',
      time: THIS_WEEK,
      details: [
        { label: t('notification.type') || 'Type', value: t('reward.cat_referral') || 'Referral cashback' },
        { label: t('notification.amount') || 'Amount', value: '+$45.00' },
        { label: t('notification.product') || 'Product', value: t('ordercenter.minimalist_titanium_watch') || 'Minimalist Titanium Watch' },
      ],
      icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
      color: 'bg-blue-500/10',
      hasDetail: true,
      targetDrawer: 'reward_history',
    },
    {
      id: 'prime_renewal',
      type: 'activity',
      title: t('notification.prime_title') || 'Prime renewal reminder',
      time: THIS_WEEK,
      details: [
        { label: t('notification.expires') || 'Expires', value: 'Expires in 7 days' },
        { label: t('notification.plan') || 'Plan', value: 'Prime Annual · $9.99/year' },
        { label: t('notification.benefit') || 'Benefits', value: 'Unlimited cashback · Exclusive discounts · Priority support' },
      ],
      footer: t('notification.prime_footer') || 'Renew now with 15% off',
      icon: <Award className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-500/10',
      hasDetail: true,
      targetDrawer: 'prime',
    },
    {
      id: 'security_alert',
      type: 'activity',
      title: t('notification.security_title') || 'Security alert',
      time: THIS_WEEK,
      details: [
        { label: t('notification.event') || 'Event', value: 'New device login' },
        { label: t('notification.device') || 'Device', value: 'iPhone 16 Pro · Shenzhen, Guangdong' },
        { label: t('notification.time') || 'Time', value: 'Monday 09:12' },
      ],
      footer: t('notification.security_footer') || 'If this was not you, change your password immediately',
      icon: <ShieldCheck className="w-5 h-5 text-gray-500" />,
      color: 'bg-gray-200 dark:bg-white/10',
      hasDetail: false,
    },
    {
      id: 'welcome',
      type: 'activity',
      title: t('notification.platform_event') || 'Welcome to 0Buck 🎊',
      time: THIS_WEEK,
      details: [
        { label: 'Tip', value: 'All notifications appear here, including orders, rewards, and social interactions.' },
      ],
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      color: 'bg-purple-500/10',
      hasDetail: false,
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F2F2F7] dark:bg-[#000000] p-6 text-center">
        <Bell className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Please Login</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Login to view your notifications.</p>
      </div>
    );
  }

  // Group notifications by time
  const groupedNotifications = NOTIFICATIONS.reduce((acc, notif) => {
    const time = notif.time;
    if (!acc[time]) acc[time] = [];
    acc[time].push(notif);
    return acc;
  }, {} as Record<string, typeof NOTIFICATIONS>);

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] p-3 space-y-6 pb-24 overflow-y-auto">
      {Object.entries(groupedNotifications).map(([time, items]) => (
        <div key={time} className="flex flex-col items-center w-full space-y-3">
          {/* Group Time Header */}
          <div className="text-[11px] text-gray-400 dark:text-gray-500 font-bold tracking-wider uppercase bg-gray-200/50 dark:bg-white/5 px-3 py-1 rounded-full backdrop-blur-md">
            {time}
          </div>
          
          {items.map((notif) => (
            <NotificationCard key={notif.id} notif={notif} />
          ))}
        </div>
      ))}
    </div>
  );
};
