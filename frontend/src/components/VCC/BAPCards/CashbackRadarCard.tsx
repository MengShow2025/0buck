import React from 'react';
import { Gift, ChevronRight, Clock } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

interface CashbackRadarProps {
  current_phase: number;
  total_phases: number;
  amount_returned: number;
  amount_total: number;
  status?: 'active' | 'pending' | 'completed';
  orderId?: string;
}

// SVG Arc Ring — segmented, brand orange
const ArcRing: React.FC<{
  current: number;
  total: number;
  size?: number;
}> = ({ current, total, size = 120 }) => {
  const segments = total;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 10;
  const strokeW = 7;
  const gapDeg = 4; // degrees gap between segments
  const arcDeg = (360 / segments) - gapDeg;
  const startOffset = -90; // start from top

  const polarToXY = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const describeArc = (startDeg: number, endDeg: number) => {
    const start = polarToXY(startDeg, r);
    const end = polarToXY(endDeg, r);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: segments }).map((_, i) => {
        const startAngle = startOffset + i * (360 / segments);
        const endAngle = startAngle + arcDeg;
        const filled = i < current;
        const isLast = i === current - 1;

        return (
          <path
            key={i}
            d={describeArc(startAngle, endAngle)}
            fill="none"
            strokeWidth={strokeW}
            strokeLinecap="round"
            stroke={filled ? 'url(#brandGrad)' : 'currentColor'}
            className={filled ? '' : 'text-gray-200 dark:text-white/10'}
            style={{
              filter: isLast && filled ? 'drop-shadow(0 0 4px rgba(232,69,10,0.6))' : 'none',
              transition: 'stroke 0.4s ease',
            }}
          />
        );
      })}
      <defs>
        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7A3D" />
          <stop offset="100%" stopColor="#E8450A" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const CashbackRadarCard: React.FC<CashbackRadarProps> = ({
  current_phase,
  total_phases,
  amount_returned,
  amount_total,
  status = 'active',
  orderId
}) => {
    const { pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const isCompleted = current_phase >= total_phases || status === 'completed';
  const isPending = status === 'pending';

  return (
    <div
      className="w-[300px] bg-white dark:bg-[#1C1C1E] rounded-[28px] p-5 border border-gray-100 dark:border-white/5 my-2 self-start rounded-tl-none overflow-hidden"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {isPending ? t('cashback.pending_title') : t('cashback.daily_title')}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {isPending ? t('cashback.pending_subtitle') : '100% Cashback Program'}
          </p>
        </div>
        {isPending ? (
          <Clock className="w-5 h-5 text-orange-400" />
        ) : (
          <div className="text-right">
            <div className="font-mono font-bold text-[11px] text-gray-400">
              {t('cashback.total_prefix')}{total_phases}{t('cashback.total_suffix')}
            </div>
          </div>
        )}
      </div>

      {/* Pending State */}
      {isPending && (
        <div className="space-y-3">
          <div className="bg-orange-50 dark:bg-orange-500/10 rounded-2xl p-3.5 border border-orange-100 dark:border-orange-500/15">
            <div className="text-[12px] font-bold text-orange-600 dark:text-orange-400 mb-1">
              {t('cashback.pending_notice_title')}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('cashback.pending_notice_desc')}
            </div>
          </div>
          <div className="text-[11px] text-gray-400 font-medium text-center font-mono">
            Order ID: {orderId}
          </div>
          <button
            onClick={() => pushDrawer('orders')}
            className="w-full text-white py-2.5 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}
          >
            <span>{t('cashback.view_order')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active / Completed — Arc Ring */}
      {!isPending && (
        <div className="flex items-center gap-4">
          {/* Ring */}
          <div className="relative shrink-0">
            <ArcRing current={current_phase} total={total_phases} size={110} />
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono font-black text-[22px] text-[var(--wa-teal)] leading-none">
                {current_phase}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                / {total_phases}
              </span>
            </div>
          </div>

          {/* Right info column */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Amount returned */}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                {t('cashback.phase_prefix')}{current_phase}{t('cashback.phase_suffix')}
              </p>
              <div className="flex items-baseline gap-0.5 font-mono">
                <span className="text-[11px] font-bold text-[var(--wa-teal)]">$</span>
                <span className="text-[24px] font-black text-[var(--wa-teal)] leading-none">
                  {amount_returned.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                / ${amount_total.toFixed(2)}
              </p>
            </div>

            {/* CTA */}
            {isCompleted ? (
              <div className="text-[11px] text-[var(--wa-teal)] font-bold flex items-center gap-1.5 bg-[var(--wa-teal)]/8 px-3 py-2 rounded-xl border border-[var(--wa-teal)]/15">
                <Gift className="w-3.5 h-3.5" />
                {t('cashback.fully_paid')}
              </div>
            ) : (
              <button
                onClick={() => pushDrawer('fans')}
                className="w-full text-white py-2 rounded-xl font-semibold text-[12px] flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 3px 10px rgba(232,69,10,0.30)' }}
              >
                <span>{t('cashback.go_center')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
