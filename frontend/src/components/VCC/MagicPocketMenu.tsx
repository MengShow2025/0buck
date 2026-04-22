import React from 'react';
import {
  Image,
  Camera,
  Mic,
  Contact,
  Star,
  Ticket,
  HeadphonesIcon,
  User,
  Gift
} from 'lucide-react';
import { usePreferenceContext } from './contexts/PreferenceContext';
import { useSessionContext } from './contexts/SessionContext';
import { useDrawerContext } from './contexts/DrawerContext';

interface MagicPocketMenuProps {
  isOpen: boolean;
  onAction?: (action: string) => void;
}

export const MagicPocketMenu: React.FC<MagicPocketMenuProps> = ({ isOpen, onAction }) => {
    const { pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { isAuthenticated } = useSessionContext();

  if (!isOpen) return null;

  const handleItemClick = (actionName: string, action: string, drawerId?: any) => {
    onAction?.(action);
    if (drawerId) {
      pushDrawer(drawerId);
    } else {
      console.log(`${actionName} clicked`);
    }
  };

  // Same 9 items, reorganized into 3 semantic groups
  const groups = [
    {
      label: 'MEDIA',
      items: [
        { icon: <Image className="w-6 h-6 text-blue-500" />, label: t('pocket.photos'), action: 'photos', description: t('pocket.photos_desc') },
        { icon: <Camera className="w-6 h-6 text-gray-600 dark:text-gray-300" />, label: t('pocket.camera'), action: 'camera', description: t('pocket.camera_desc') },
        { icon: <Mic className="w-6 h-6 text-green-500" />, label: t('pocket.voice'), action: 'voice', description: t('pocket.voice_desc') },
      ]
    },
    {
      label: 'SHOP',
      items: [
        { icon: <Star className="w-6 h-6 text-yellow-500" />, label: t('pocket.favorites'), action: 'favorites', description: t('pocket.favorites_desc') },
        { icon: <Gift className="w-6 h-6 text-red-500" />, label: t('pocket.gift'), action: 'gift', description: t('pocket.gift_desc') },
        { icon: <Ticket className="w-6 h-6 text-orange-500" />, label: t('pocket.tickets'), action: 'tickets', drawer: 'service', description: t('coupon.platform_tab') },
      ]
    },
    {
      label: 'ME',
      items: [
        { icon: <Contact className="w-6 h-6 text-indigo-500" />, label: t('pocket.card'), action: 'card', description: t('pocket.card_desc') },
        { icon: <User className="w-6 h-6 text-purple-500" />, label: t('pocket.homepage'), action: 'homepage', drawer: 'me', description: '0Buck ID: 8827' },
        { icon: <HeadphonesIcon className="w-6 h-6 text-[var(--wa-teal)]" />, label: t('pocket.support'), action: 'support', drawer: 'service', description: '24/7 AI + Human' },
      ]
    }
  ];

  const authRequired = ['homepage', 'favorites', 'gift', 'tickets'];

  return (
    <div className="w-full bg-white/95 dark:bg-[#1C1C1E]/98 border-t border-black/5 dark:border-white/5 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex divide-x divide-gray-100 dark:divide-white/5 px-1 py-4">
        {groups.map((group) => (
          <div key={group.label} className="flex-1 flex flex-col gap-0.5 px-1">
            {/* Group label */}
            <p className="text-[8px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-[0.12em] text-center mb-2.5 px-1">
              {group.label}
            </p>

            {/* Group items */}
            <div className="flex justify-around gap-1">
              {group.items.map((item) => (
                <div
                  key={item.action}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group flex-1"
                  onClick={() => {
                    if (!isAuthenticated && authRequired.includes(item.action)) {
                      pushDrawer('auth');
                    } else {
                      handleItemClick(item.label, item.action, (item as any).drawer);
                    }
                  }}
                  title={item.description || item.label}
                >
                  <div className="w-12 h-12 bg-gray-100/80 dark:bg-white/6 rounded-[16px] flex items-center justify-center group-active:scale-90 transition-transform duration-150">
                    {item.icon}
                  </div>
                  <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium text-center leading-tight">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
