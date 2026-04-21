import React from 'react';

export const LinkTextCard: React.FC<{ data: any }> = ({ data }) => {
  const links: string[] = Array.isArray(data?.links) ? data.links.filter(Boolean) : [];
  if (!links.length) return null;

  return (
    <div className="w-full max-w-full my-1 space-y-2">
      {links.slice(0, 9).map((link, idx) => (
        <div key={`${link}-${idx}`} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1F1F22] p-2.5">
          <div className="text-[11px] text-gray-500 dark:text-white/70 mb-1">外部链接</div>
          <div className="text-[12px] text-gray-800 dark:text-white break-all">{link}</div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
              className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/80 bg-gray-50 dark:bg-white/5"
            >
              打开
            </button>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/80 bg-gray-50 dark:bg-white/5"
            >
              复制
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
