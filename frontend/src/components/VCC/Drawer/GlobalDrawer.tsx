import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { useAppContext } from '../AppContext';

import { PrimeDrawer } from './PrimeDrawer';
import { WalletDrawer } from './WalletDrawer';
import { FanCenterDrawer } from './FanCenterDrawer';
import { CheckinHubDrawer } from './CheckinHubDrawer.tsx';
import { SquareDrawer } from './SquareDrawer';
import { LoungeDrawer } from './LoungeDrawer';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { CheckoutDrawer } from './CheckoutDrawer';
import { OrderCenterDrawer } from './OrderCenterDrawer';
import { AddressDrawer } from './AddressDrawer';
import { ServiceDrawer } from './ServiceDrawer';
import { MeDrawer } from './MeDrawer';
import { CartDrawer } from './CartDrawer';
import { SquareListDrawer } from './SquareListDrawer';
import { ChatRoomDrawer } from './ChatRoomDrawer';
import { NotificationDrawer } from './NotificationDrawer';
import { ContactsDrawer } from './ContactsDrawer';
import { MyFeedsDrawer } from './MyFeedsDrawer';
import { UserProfileDrawer } from './UserProfileDrawer';
import { ShareDrawer } from './ShareDrawer';
import { KeyAttributesDrawer } from './KeyAttributesDrawer';
import { ReviewsDrawer } from './ReviewsDrawer';
import { SupplierAnalysisDrawer } from './SupplierAnalysisDrawer';
import { CouponsDrawer } from './CouponsDrawer';
import { AuthDrawer } from './AuthDrawer';
import { WishlistDetailDrawer } from './WishlistDetailDrawer';
import { GroupBuyDetailDrawer } from './GroupBuyDetailDrawer';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { OrderTrackingDrawer } from './OrderTrackingDrawer';
import { InfluencerApplyDrawer } from './InfluencerApplyDrawer';
import { LeaderboardDrawer } from './LeaderboardDrawer';
import { RewardHistoryDrawer } from './RewardHistoryDrawer';
import { PointsHistoryDrawer } from './PointsHistoryDrawer';
import { PointsExchangeDrawer } from './PointsExchangeDrawer';
import { WithdrawDrawer } from './WithdrawDrawer';
import { APIModelAddDrawer } from './APIModelAddDrawer';
import { VouchersDrawer } from './VouchersDrawer';
import { SettingsDrawer } from './SettingsDrawer';
import { PersonalInfoDrawer } from './PersonalInfoDrawer';
import { SecurityDrawer } from './SecurityDrawer';
import { VerificationDrawer } from './VerificationDrawer';
import { ChangePasswordDrawer } from './ChangePasswordDrawer';
import { TierRulesDrawer } from './TierRulesDrawer';
import { Google2FADrawer } from './Google2FADrawer';
import { EmailBindNewDrawer } from './EmailBindNewDrawer';

import { BackupEmailDrawer } from './BackupEmailDrawer';
import { DualVerificationDrawer } from './DualVerificationDrawer';
import { NewFriendsDrawer } from './NewFriendsDrawer';
import { BlacklistDrawer } from './BlacklistDrawer';
import { GroupCreateDrawer } from './GroupCreateDrawer';
import { GroupManageDrawer } from './GroupManageDrawer';

export const GlobalDrawer: React.FC = () => {
  const { activeDrawer, setActiveDrawer, activeChat, drawerHistory, popDrawer, pushDrawer, t, verificationType } = useAppContext();

  const handleClose = () => setActiveDrawer('none');

  const renderContent = () => {
    switch (activeDrawer) {
      case 'prime':
        return <PrimeDrawer />;
      case 'wallet':
        return <WalletDrawer />;
      case 'lounge':
        return <LoungeDrawer />;
      case 'square':
        return <SquareDrawer />;
      case 'product_detail':
        return <ProductDetailDrawer />;
      case 'checkout':
        return <CheckoutDrawer />;
      case 'orders':
        return <OrderCenterDrawer />;
      case 'address':
        return <AddressDrawer />;
      case 'service':
        return <ServiceDrawer />;
      case 'me':
        return <MeDrawer />;
      case 'cart':
        return <CartDrawer />;
      case 'all_group_buy':
      case 'all_fan_feeds':
      case 'all_topics':
        return <SquareListDrawer />;
      case 'chat_room':
        return <ChatRoomDrawer />;
      case 'notification':
        return <NotificationDrawer />;
      case 'contacts':
        return <ContactsDrawer />;
      case 'my_feeds':
        return <MyFeedsDrawer />;
      case 'user_profile':
        return <UserProfileDrawer />;
      case 'share_menu':
        return <ShareDrawer />;
      case 'key_attributes':
        return <KeyAttributesDrawer />;
      case 'product_reviews':
        return <ReviewsDrawer />;
      case 'supplier_analysis':
        return <SupplierAnalysisDrawer />;
      case 'auth':
        return <AuthDrawer />;
      case 'new_friends':
        return <NewFriendsDrawer />;
      case 'blacklist':
        return <BlacklistDrawer />;
      case 'group_create':
        return <GroupCreateDrawer />;
      case 'group_manage':
        return <GroupManageDrawer />;
      case 'wishlist_detail':
        return <WishlistDetailDrawer />;
      case 'group_buy_detail':
        return <GroupBuyDetailDrawer />;
      case 'order_detail':
        return <OrderDetailDrawer />;
      case 'order_tracking':
        return <OrderTrackingDrawer />;
      case 'influencer_apply':
        return <InfluencerApplyDrawer />;
      case 'leaderboard':
        return <LeaderboardDrawer />;
      case 'reward_history':
        return <RewardHistoryDrawer />;
      case 'fan_center':
      case 'fans':
        return <FanCenterDrawer />;
      case 'checkin_hub':
        return <CheckinHubDrawer />;
      case 'points_history':
        return <PointsHistoryDrawer />;
      case 'points_exchange':
        return <PointsExchangeDrawer />;
      case 'withdraw':
        return <WithdrawDrawer />;
      case 'api_model_add':
        return <APIModelAddDrawer />;
      case 'vouchers':
        return <VouchersDrawer />;
      case 'coupons':
        return <CouponsDrawer />;
      case 'settings':
        return <SettingsDrawer />;
      case 'personal_info':
        return <PersonalInfoDrawer />;
      case 'security':
        return <SecurityDrawer />;
      case 'verification':
        return <VerificationDrawer type={verificationType || 'login_password'} onSuccess={() => pushDrawer('change_password')} />;
      case 'change_password':
        return <ChangePasswordDrawer type={verificationType === 'pay_password' ? 'pay_password' : 'login_password'} />;
      case 'tier_rules':
        return <TierRulesDrawer />;
      case 'google_2fa':
        return <Google2FADrawer />;
      case 'email_bind_new':
        return <EmailBindNewDrawer />;
      case 'BackupEmail':
        return <BackupEmailDrawer />;
      case 'dual_verification':
        return <DualVerificationDrawer />;
      default:
        return null;
    }
  };

  const titles: Record<string, string> = {
    prime: t('title.prime'),
    wallet: t('title.wallet'),
    fans: t('title.fans'),
    lounge: t('title.lounge'),
    square: t('title.square'),
    product_detail: t('title.product_detail'),
    checkout: t('title.checkout'),
    orders: t('title.orders'),
    address: t('title.address'),
    service: t('title.service'),
    me: t('title.me'),
    cart: t('title.cart'),
    all_group_buy: t('title.group_buy'),
    all_fan_feeds: t('title.community'),
    all_topics: t('title.topics'),
    chat_room: activeChat?.name || 'Chat',
    group_create: 'Create Group',
    group_manage: 'Group Manage',
    notification: t('title.notification'),
    contacts: t('title.contacts'),
    my_feeds: t('title.my_feeds'),
    user_profile: t('title.user_profile'),
    share_menu: t('title.share'),
    key_attributes: 'Key attributes',
    product_reviews: 'Reviews',
    supplier_analysis: 'Supplier Analysis',
    auth: 'Sign In / Sign Up',
    wishlist_detail: 'Market Discovery',
    group_buy_detail: 'Share-to-Free Details',
    order_detail: 'Order Details',
    order_tracking: 'Tracking Status',
    influencer_apply: t('title.influencer'),
    leaderboard: t('title.leaderboard'),
    reward_history: t('title.reward_history'),
    fan_center: t('title.fans'),
    checkin_hub: t('title.checkin_hub'),
    points_history: t('title.points_history'),
    points_exchange: t('title.points_exchange'),
    withdraw: t('title.withdraw'),
    api_model_add: t('title.api_model'),
    vouchers: t('title.coupons'),
    coupons: t('title.coupons'),
    settings: t('title.settings'),
    personal_info: t('title.personal_info'),
    security: t('title.security'),
    tier_rules: t('fan.view_rules'),
    google_2fa: t('security.google_2fa_title'),
    email_bind_new: t('security.email_bind_new_title'),
  };

  return (
    <AnimatePresence>
      {activeDrawer !== 'none' && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-x-0 bottom-0 top-16 bg-[#F2F2F7] dark:bg-[#000000] z-50 rounded-t-3xl overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Handle Bar & Header */}
            {activeDrawer !== 'chat_room' && activeDrawer !== 'auth' && activeDrawer !== 'withdraw' && activeDrawer !== 'checkout' && (
              <div className="bg-white/80 dark:bg-[#1C1C1E]/90 backdrop-blur-xl px-5 pt-3 pb-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 relative z-10">
                <div className="w-10">
                  {drawerHistory.length > 0 && (
                    <button
                      onClick={popDrawer}
                      className="w-9 h-9 flex items-center justify-center bg-black/5 dark:bg-white/8 rounded-full text-gray-600 dark:text-gray-300 active:scale-90 transition-all duration-150"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-1 bg-black/15 dark:bg-white/20 rounded-full mb-2.5" />
                  <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">
                    {activeDrawer === 'user_profile' ? (document.title || t('title.user_profile')) : (titles[activeDrawer] || 'Drawer')}
                  </h2>
                </div>
                <div className="w-10 flex justify-end">
                  <button
                    onClick={handleClose}
                    className="w-9 h-9 flex items-center justify-center bg-black/5 dark:bg-white/8 rounded-full text-gray-600 dark:text-gray-300 active:scale-90 transition-all duration-150"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto relative">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
