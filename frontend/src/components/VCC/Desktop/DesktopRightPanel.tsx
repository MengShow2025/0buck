import React from 'react';
import { X } from 'lucide-react';
import { ProductDetailDrawer } from '../Drawer/ProductDetailDrawer';
import { SupplierAnalysisDrawer } from '../Drawer/SupplierAnalysisDrawer';
import { RewardHistoryDrawer } from '../Drawer/RewardHistoryDrawer';
import { OrderCenterDrawer } from '../Drawer/OrderCenterDrawer';
import { usePreferenceContext } from '../contexts/PreferenceContext';

export type PanelType = 'none' | 'product_detail' | 'supplier_analysis' | 'reward_history' | 'order_center';

interface Props {
  panel: PanelType;
  onClose: () => void;
}

const PANEL_TITLES: Record<PanelType, string> = {
  none:              '',
  product_detail:    'Product Detail',
  supplier_analysis: 'Supplier Analysis',
  reward_history:    'Reward History',
  order_center:      'My Orders',
};

export const DesktopRightPanel: React.FC<Props> = ({ panel, onClose }) => {
    const { t } = usePreferenceContext();
  if (panel === 'none') return null;

  return (
    <aside
      className="w-[420px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111113] flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-250"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 h-[56px] border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">{t(`panel.${panel}`) || PANEL_TITLES[panel]}</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Content — renders the existing mobile Drawer components */}
      <div className="flex-1 overflow-hidden">
        {panel === 'product_detail'    && <ProductDetailDrawer />}
        {panel === 'supplier_analysis' && <SupplierAnalysisDrawer />}
        {panel === 'reward_history'    && <RewardHistoryDrawer />}
        {panel === 'order_center'      && <OrderCenterDrawer />}
      </div>
    </aside>
  );
};
