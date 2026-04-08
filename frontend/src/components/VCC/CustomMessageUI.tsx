import React, { useEffect } from 'react';
import { ProductGridCard } from './BAPCards/ProductGridCard';
import { CashbackRadarCard } from './BAPCards/CashbackRadarCard';
import { useAppContext } from './AppContext';
// import { MessageSimple } from 'stream-chat-react'; // Uncomment when stream is installed

interface CustomMessageUIProps {
  message: any; // Type with StreamChat MessageResponse
  isMyMessage: () => boolean;
}

export const CustomMessageUI: React.FC<CustomMessageUIProps> = (props) => {
  const { message, isMyMessage } = props;
  
  // To avoid crash if AppContext is not yet wrapped globally
  let themeSetter = () => {};
  let langSetter = () => {};
  try {
    const { setTheme, setLanguage } = useAppContext();
    themeSetter = setTheme;
    langSetter = setLanguage;
  } catch (e) {
    console.warn('AppContext not found, system actions disabled');
  }
  
  // 1. Check for AI System Actions
  const systemAction = message.attachments?.find((a: any) => a.type === '0B_SYSTEM_ACTION');

  useEffect(() => {
    if (systemAction && !isMyMessage()) {
      if (systemAction.action === 'SET_THEME') {
        themeSetter(systemAction.value);
      } else if (systemAction.action === 'SET_LANGUAGE') {
        langSetter(systemAction.value);
      }
    }
  }, [systemAction, themeSetter, langSetter, isMyMessage]);

  // 2. Intercept BAP Protocol Attachments
  // We check if the message has a specific 0Buck Attachment signature
  const bapAttachment = message.attachments?.find((a: any) => a.type === '0B_CARD_V3');

  if (bapAttachment) {
    if (bapAttachment.component === '0B_PRODUCT_GRID') {
      return (
        <div className={`flex w-full my-2 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
          <ProductGridCard data={bapAttachment.data} />
        </div>
      );
    }
    if (bapAttachment.component === '0B_CASHBACK_RADAR') {
      return (
        <div className={`flex w-full my-2 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
          <CashbackRadarCard {...bapAttachment.data} />
        </div>
      );
    }
  }

  // 3. Fallback to Standard WhatsApp-style Text Bubbles
  const timeString = new Date(message.created_at || Date.now()).toLocaleTimeString([], {
    hour: '2-digit', 
    minute:'2-digit'
  });

  return (
    <div className={`flex w-full my-1 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] px-3 py-2 rounded-xl text-[15px] relative break-words shadow-[0_1px_1px_rgba(0,0,0,0.1)] leading-relaxed ${
          isMyMessage() 
            ? 'bg-[var(--wa-bubble-out)] rounded-tr-none text-black border border-[#FFD9CD]' 
            : 'bg-[var(--wa-bubble-in)] rounded-tl-none text-black border border-gray-100'
        }`}
      >
        <span className="whitespace-pre-wrap">{message.text}</span>
        
        {/* Timestamp */}
        <span className={`text-[10px] ml-3 float-right mt-3 font-medium select-none ${
          isMyMessage() ? 'text-orange-800/60' : 'text-gray-400'
        }`}>
          {timeString}
        </span>
      </div>
    </div>
  );
};
