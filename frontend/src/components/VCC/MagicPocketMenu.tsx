import React from 'react';
import { Image, Store, MapPin, HeadphonesIcon, Users } from 'lucide-react';
import { useAppContext } from './AppContext';

interface MagicPocketMenuProps {
  isOpen: boolean;
}

export const MagicPocketMenu: React.FC<MagicPocketMenuProps> = ({ isOpen }) => {
  const { setActiveDrawer } = useAppContext();

  if (!isOpen) return null;
  
  return (
    <div className="w-full bg-[#f0f2f5] border-t border-gray-200 p-4 grid grid-cols-4 gap-4 animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setActiveDrawer('prime')}>
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm group-active:bg-gray-100">
          <Store className="w-6 h-6 text-[var(--wa-teal)]" />
        </div>
        <span className="text-xs text-gray-600 font-medium">0Buck 小店</span>
      </div>
      
      {/* 朋友圈 / 社群入口 */}
      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setActiveDrawer('square')}>
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm group-active:bg-gray-100 relative">
          <Users className="w-6 h-6 text-indigo-500" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
        </div>
        <span className="text-xs text-gray-600 font-medium">社群广场</span>
      </div>

      <div className="flex flex-col items-center gap-2 cursor-pointer group">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm group-active:bg-gray-100">
          <Image className="w-6 h-6 text-green-600" />
        </div>
        <span className="text-xs text-gray-600 font-medium">发图找同款</span>
      </div>
      
      <div className="flex flex-col items-center gap-2 cursor-pointer group">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm group-active:bg-gray-100">
          <MapPin className="w-6 h-6 text-blue-500" />
        </div>
        <span className="text-xs text-gray-600 font-medium">地址管理</span>
      </div>
      
      <div className="flex flex-col items-center gap-2 cursor-pointer group">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm group-active:bg-gray-100">
          <HeadphonesIcon className="w-6 h-6 text-gray-500" />
        </div>
        <span className="text-xs text-gray-600 font-medium">人工客服</span>
      </div>
    </div>
  );
};
