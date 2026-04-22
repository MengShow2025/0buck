import React from 'react';
import { HelpCircle, FileText, PhoneCall, ChevronRight, ShieldCheck, Mail, MessageCircle } from 'lucide-react';
import { useDrawerContext } from '../contexts/DrawerContext';

export const ServiceDrawer: React.FC = () => {
    const { setActiveDrawer } = useDrawerContext();

  const handleSupportChat = () => {
    setActiveDrawer('none');
    // In real app: navigate to a specific Dumbo support thread or trigger system prompt
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">

        {/* Support Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] p-6 shadow-sm border border-gray-100 dark:border-white/5 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-[20px] flex items-center justify-center text-[var(--wa-teal)] mb-4">
            <PhoneCall className="w-8 h-8" />
          </div>
          <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">Need Help?</h2>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Our Artisan Support Team is here for you 24/7. Just drop a message.</p>

          <div className="w-full space-y-3">
            <button
              onClick={handleSupportChat}
              className="w-full py-3.5 text-white rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}
            >
              <MessageCircle className="w-5 h-5" /> Chat with Support
            </button>
            <button className="w-full py-3.5 bg-gray-100 dark:bg-white/8 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Mail className="w-5 h-5" /> Email Us
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Frequently Asked Questions</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
            {[
              { icon: <HelpCircle className="w-5 h-5 text-blue-500" />, title: 'How 100% Rebate Works' },
              { icon: <FileText className="w-5 h-5 text-green-500" />, title: 'Check-in Rules & Resurgence Cards' },
              { icon: <ShieldCheck className="w-5 h-5 text-orange-500" />, title: '0Buck Artisan Verification' },
              { icon: <FileText className="w-5 h-5 text-indigo-500" />, title: 'Return & Refund Policy' }
            ].map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors ${
                  index !== 3 ? 'border-b border-gray-100 dark:border-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[12px] bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">{item.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};