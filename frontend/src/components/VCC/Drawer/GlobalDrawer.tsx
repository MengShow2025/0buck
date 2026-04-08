import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAppContext } from '../AppContext';

import { PrimeDrawer } from './PrimeDrawer';
import { WalletDrawer } from './WalletDrawer';
import { FanCenterDrawer } from './FanCenterDrawer';
// import LoungeDrawer from './LoungeDrawer';
// import SquareDrawer from './SquareDrawer';

export const GlobalDrawer: React.FC = () => {
  const { activeDrawer, setActiveDrawer } = useAppContext();

  const handleClose = () => setActiveDrawer('none');

  const renderContent = () => {
    switch (activeDrawer) {
      case 'prime':
        return <PrimeDrawer />;
      case 'wallet':
        return <WalletDrawer />;
      case 'fans':
        return <FanCenterDrawer />;
      case 'lounge':
        return <div className="p-6 text-center text-gray-500">Lounge Drawer Content (WIP)</div>;
      case 'square':
        return <div className="p-6 text-center text-gray-500">Square Drawer Content (WIP)</div>;
      default:
        return null;
    }
  };

  const titles: Record<string, string> = {
    prime: '0Buck 严选小店',
    wallet: '我的钱包',
    fans: '粉丝与返现中心',
    lounge: '私域沙龙',
    square: '社群广场',
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
            className="absolute inset-x-0 bottom-0 top-16 bg-gray-50 dark:bg-[#111111] z-50 rounded-t-3xl overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Handle Bar & Header */}
            <div className="bg-white dark:bg-[#1c1c1e] px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <div className="w-8" /> {/* Spacer for centering */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mb-2" />
                <h2 className="text-[17px] font-semibold text-gray-800 dark:text-gray-100">
                  {titles[activeDrawer] || 'Drawer'}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
