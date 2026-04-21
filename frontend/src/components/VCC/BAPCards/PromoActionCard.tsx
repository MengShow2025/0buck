import React from 'react';
import { useAppContext } from '../AppContext';

interface PromoActionItem {
  id: string;
  title: string;
  subtitle?: string;
  cta_text?: string;
  link: string;
}

export const PromoActionCard: React.FC<{ data: any }> = ({ data }) => {
  const { isAuthenticated, requireAuth } = useAppContext();
  const actions: PromoActionItem[] = Array.isArray(data?.actions) ? data.actions : [];
  if (!actions.length) return null;

  return (
    <div className="w-full max-w-full my-1 flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1 snap-x snap-mandatory">
      {actions.map((a) => (
        <div key={a.id} className="shrink-0 snap-start w-[220px] rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1F1F22] p-3 shadow-sm">
          <div className="text-[13px] font-semibold text-gray-900 dark:text-white line-clamp-2">{a.title}</div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-white/70 line-clamp-2">{a.subtitle || '0Buck 官方推广入口'}</div>
          <button
            type="button"
            onClick={() => {
              const open = () => window.open(a.link, '_blank', 'noopener,noreferrer');
              if (isAuthenticated) open();
              else requireAuth(open);
            }}
            className="mt-3 text-[11px] px-3 py-1.5 rounded-full bg-[var(--wa-teal)] text-white"
          >
            {a.cta_text || '立即参与'}
          </button>
        </div>
      ))}
    </div>
  );
};
