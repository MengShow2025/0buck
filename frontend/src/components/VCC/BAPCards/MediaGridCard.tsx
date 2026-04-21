import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  thumb?: string;
  name?: string;
}

export const MediaGridCard: React.FC<{ data: any }> = ({ data }) => {
  const items: MediaItem[] = useMemo(() => (data?.items || []).filter(Boolean), [data]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (!items.length) return null;

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -180 : 180, behavior: 'smooth' });
  };

  const openViewer = (index: number) => setViewerIndex(index);
  const closeViewer = () => setViewerIndex(null);
  const prev = () => setViewerIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length));
  const next = () => setViewerIndex((i) => (i === null ? null : (i + 1) % items.length));

  return (
    <div className="w-full max-w-full my-1 relative overflow-hidden group/strip">
      {items.length > 2 && (
        <>
          <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 dark:bg-[#1C1C1E]/90 rounded-full shadow opacity-0 group-hover/strip:opacity-100 transition-opacity -ml-1">
            <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </button>
          <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 dark:bg-[#1C1C1E]/90 rounded-full shadow opacity-0 group-hover/strip:opacity-100 transition-opacity -mr-1">
            <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </button>
        </>
      )}

      <div ref={scrollRef} className="w-full flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-1 pb-1 touch-pan-x">
        {items.map((item, i) => (
          <button
            key={item.id || `${i}`}
            type="button"
            onClick={() => openViewer(i)}
            className="relative shrink-0 snap-start rounded-[18px] overflow-hidden w-[140px] h-[180px] active:scale-[0.97] transition-transform"
          >
            <img src={item.thumb || item.url} alt={item.name || 'media'} className="absolute inset-0 w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {viewerIndex !== null && (
        <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center">
          <button type="button" onClick={closeViewer} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <button type="button" onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <img src={items[viewerIndex].url} alt={items[viewerIndex].name || 'media'} className="max-w-[92vw] max-h-[82vh] object-contain rounded-xl" />
          <button type="button" onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
};
