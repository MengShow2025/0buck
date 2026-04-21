import React, { useEffect, useRef } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { CustomMessageUI } from '../CustomMessageUI';
import { VCCInput } from '../VCCInput';
import { useAppContext } from '../AppContext';
import BongoCat from '../BongoCat';

interface Message {
  id: string;
  text: string;
  created_at: string;
  attachments: any[];
  user: { id: string };
}

interface Props {
  messages: Message[];
  isAiTyping: boolean;
  onSendMessage: (text: string) => void;
}

export const DesktopChatView: React.FC<Props> = ({ messages, isAiTyping, onSendMessage }) => {
  const { t } = useAppContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 h-[64px] border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
          >
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-zinc-900 dark:text-white">{t('ai.name') || 'Dumbo AI'}</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
              <span className="text-[11px] text-zinc-400 font-medium">{t('ai.online') || 'Online'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-white/5 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">{t('ai.powered') || 'Powered by AI'}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-2 scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
      >
        <div className="max-w-4xl mx-auto w-full">
          {messages.map((msg) => (
            <CustomMessageUI
              key={msg.id}
              message={msg}
              isMyMessage={() => msg.user.id === 'user'}
            />
          ))}

          {isAiTyping && (
            <div className="flex items-end gap-3 mt-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm flex items-center justify-center">
                <div className="w-8 h-8 opacity-80">
                  <BongoCat isTyping={true} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 px-6 pb-6 pt-2 border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <VCCInput onSendMessage={onSendMessage} />
        </div>
      </div>
    </div>
  );
};
