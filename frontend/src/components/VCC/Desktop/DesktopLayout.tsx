import React, { useState } from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { DesktopChatView } from './DesktopChatView';
import { DesktopShopView } from './DesktopShopView';
import { DesktopOrdersView } from './DesktopOrdersView';
import { DesktopWalletView } from './DesktopWalletView';
import { DesktopSocialView } from './DesktopSocialView';
import { DesktopNotificationsView } from './DesktopNotificationsView';
import { DesktopProfileView } from './DesktopProfileView';
import { DesktopRightPanel, PanelType } from './DesktopRightPanel';
import { GlobalDrawer } from '../Drawer/GlobalDrawer';
import { useDrawerContext } from '../contexts/DrawerContext';

export type DesktopView = 'chat' | 'shop' | 'orders' | 'wallet' | 'social' | 'notifications' | 'profile';

interface Props {
  messages: any[];
  isAiTyping: boolean;
  onSendMessage: (text: string) => void;
}

export const DesktopLayout: React.FC<Props> = ({ messages, isAiTyping, onSendMessage }) => {
    const { setSelectedProductId } = useDrawerContext();
  const [activeView, setActiveView] = useState<DesktopView>('chat');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [rightPanel, setRightPanel] = useState<PanelType>('none');

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    setRightPanel('product_detail');
  };

  const handleOrderSelect = (_id: string) => {
    setSelectedProductId(_id);
    setRightPanel('order_center');
  };

  // Sync: when mobile drawer opens for things we handle in right panel, show in panel instead
  // (GlobalDrawer is still mounted for auth, checkout, and other overlays)

  return (
    <div className="flex h-screen w-full bg-[#F5F5F7] dark:bg-[#0A0A0B] overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025] dark:opacity-[0.04] z-0"
        style={{
          backgroundImage: `radial-gradient(circle, #E8450A 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 flex w-full h-full">
        {/* Left Sidebar */}
        <DesktopSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(p => !p)}
        />

        {/* Center Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0A0A0B]">
          {activeView === 'chat'          && <DesktopChatView messages={messages} isAiTyping={isAiTyping} onSendMessage={onSendMessage} />}
          {activeView === 'shop'          && <DesktopShopView onProductSelect={handleProductSelect} />}
          {activeView === 'orders'        && <DesktopOrdersView onOrderSelect={handleOrderSelect} />}
          {activeView === 'wallet'        && <DesktopWalletView />}
          {activeView === 'social'        && <DesktopSocialView />}
          {activeView === 'notifications' && <DesktopNotificationsView />}
          {activeView === 'profile'       && <DesktopProfileView />}
        </main>

        {/* Right Panel */}
        <DesktopRightPanel panel={rightPanel} onClose={() => setRightPanel('none')} />
      </div>

      {/* Global Drawer — still handles auth, checkout, settings, and all other overlays */}
      <GlobalDrawer />
    </div>
  );
};
