import React, { useMemo, useState } from 'react';
import { CalendarCheck2, CheckCircle2, Circle, Loader2, Menu, Sparkles } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { resolveCheckinBatchState, runMockBatchCheckin } from '../utils/checkinBatch';
import { getCheckinCtaVariant } from '../utils/checkinCtaVariant';

type CheckinOrder = {
  id: string;
  name: string;
  phase: string;
  signable: boolean;
  estAmount: string;
  reasonKey?: 'already_signed' | 'not_eligible' | 'conflict_group_free';
};

const WEEK_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

export const CheckinHubDrawer: React.FC = () => {
    const { t, language, theme } = usePreferenceContext();
  const { hasCheckedInToday, setHasCheckedInToday } = useCommerceContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<null | ReturnType<typeof runMockBatchCheckin>>(null);

  const orders: CheckinOrder[] = useMemo(
    () => [
      { id: 'ORD-001', name: 'Wireless Earbuds', phase: '7/20', signable: true, estAmount: '15.00' },
      { id: 'ORD-002', name: 'Titanium Watch', phase: '3/20', signable: true, estAmount: '22.50' },
      { id: 'ORD-003', name: 'Leather Bag', phase: '1/20', signable: false, estAmount: '8.30', reasonKey: 'not_eligible' },
    ],
    []
  );

  const signableCount = orders.filter((o) => o.signable).length;
  const totalCount = orders.length;
  const estTotal = orders.reduce((sum, o) => sum + Number(o.estAmount || 0), 0).toFixed(2);
  const batchState = resolveCheckinBatchState({ hasCheckedInToday, signableCount, totalCount });
  const disabled = isSubmitting || batchState === 'done' || batchState === 'disabled';
  const variantTheme = theme === 'dark' ? 'dark' : 'light';
  const variantStyle = getCheckinCtaVariant('executive', variantTheme);

  const streakDays = 42;
  const streakPercent = Math.min(100, Math.round((7 / 20) * 100));
  const todayIndex = 3;
  const dayNumbers = [9, 10, 11, 12, 13, 14, 15];

  const ctaMeta =
    language === 'zh'
      ? `可签 ${signableCount}/${totalCount} · ${t('fan.estimated_rebate')} $${estTotal}`
      : `${signableCount}/${totalCount} eligible · ${t('fan.estimated_rebate')} $${estTotal}`;
  const ctaStatusText =
    language === 'zh'
      ? (isSubmitting ? '处理中' : batchState === 'done' ? '已完成' : batchState === 'disabled' ? '不可签' : '可执行')
      : (isSubmitting ? 'processing' : batchState === 'done' ? 'done' : batchState === 'disabled' ? 'locked' : 'ready');

  const onBatchCheckin = () => {
    if (disabled) return;
    setIsSubmitting(true);
    const next = runMockBatchCheckin(
      orders.map((o) => ({ id: o.id, signable: o.signable, estAmount: o.estAmount, phase: o.phase, reasonKey: o.reasonKey }))
    );
    setResult(next);
    setHasCheckedInToday(true);
    setShowResult(true);
    setIsSubmitting(false);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-[#FAF7F2] dark:bg-[#0F0F10] text-[#151515] dark:text-white px-6 py-6 pb-32">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[12px] tracking-wide uppercase text-gray-500 dark:text-white/60">{t('checkin.overview')}</div>
          <div className="text-[22px] font-black leading-tight">{t('checkin.building_momentum')}</div>
        </div>
        <button className="p-2 rounded-full border border-black/10 dark:border-white/15">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="border-y border-black/10 dark:border-white/10 py-6 mb-6">
        <div className="flex items-end gap-2">
          <span className="text-[78px] font-black leading-[0.9] tracking-tight">{streakDays}</span>
          <span className="text-[38px] font-semibold mb-1">{t('checkin.day_streak')}</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-[14px] font-semibold">
          <span className="text-black/70 dark:text-white/70">{t('checkin.building_momentum')}</span>
          <span>{streakPercent}%</span>
        </div>
        <div className="mt-2 h-[2px] rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-black/70 dark:bg-white/70" style={{ width: `${streakPercent}%` }} />
        </div>
      </div>

      <div className="mb-8">
        <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase text-gray-400 mb-2">
          {WEEK_KEYS.map((k) => (
            <div key={k}>{t(`checkin.week.${k}`)}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {dayNumbers.map((day, idx) => (
            <div key={day} className="space-y-1">
              <div className={`w-8 h-8 mx-auto rounded-full border flex items-center justify-center ${idx === todayIndex ? 'border-black dark:border-white' : 'border-black/20 dark:border-white/20'}`}>
                {idx <= todayIndex ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-45" />}
              </div>
              <div className={`text-[13px] font-bold ${idx === todayIndex ? 'text-black dark:text-white' : 'text-black/45 dark:text-white/45'}`}>{day}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <h4 className="text-[13px] uppercase tracking-wide text-gray-500 dark:text-white/60">{t('checkin.orders')}</h4>
        {orders.map((order) => (
          <div key={order.id} className="border-b border-black/10 dark:border-white/10 py-3">
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-medium">{order.name}</div>
              <div className="text-[13px] text-gray-500 dark:text-white/60">{t('fan.phase')} {order.phase}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <button onClick={onBatchCheckin} disabled={disabled} className={variantStyle.buttonClass}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarCheck2 className="w-5 h-5" />}
              <div className="text-left leading-tight">
                <div className="text-[15px] font-semibold">
                  {isSubmitting
                    ? t('fan.check_in_processing')
                    : batchState === 'done'
                      ? t('fan.check_in_done')
                      : batchState === 'disabled'
                        ? t('fan.check_in_no_eligible')
                        : t('fan.check_in_all')}
                </div>
                {!isSubmitting && batchState !== 'done' && <div className={`text-[11px] ${variantStyle.hintClass}`}>{ctaMeta}</div>}
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${variantStyle.badgeClass}`}>
              {ctaStatusText}
            </span>
          </div>
        </button>
      </div>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3 flex items-center gap-2 text-[12px] text-black/70 dark:text-white/70">
        <Sparkles className="w-4 h-4" />
        <span>{t('checkin.ai_hint')}</span>
      </div>

      {showResult && result && (
        <div className="fixed inset-0 z-[130] bg-black/45 flex items-end justify-center" onClick={() => setShowResult(false)}>
          <div className="w-full max-w-[420px] bg-white dark:bg-[#1C1C1E] rounded-t-[28px] p-5 pb-7" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/20 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[16px] font-black">{t('fan.check_in_result_title')}</h4>
              <button className="text-[12px] text-gray-500" onClick={() => setShowResult(false)}>{t('fan.close')}</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/15 p-3">
                <div className="text-[10px] font-bold uppercase text-emerald-600">{t('fan.result_success')}</div>
                <div className="text-[16px] font-black">{result.successCount}</div>
              </div>
              <div className="rounded-xl bg-orange-50 dark:bg-orange-500/15 p-3">
                <div className="text-[10px] font-bold uppercase text-orange-600">{t('fan.result_failed')}</div>
                <div className="text-[16px] font-black">{result.failedCount}</div>
              </div>
              <div className="rounded-xl bg-[var(--wa-teal)]/10 p-3">
                <div className="text-[10px] font-bold uppercase text-[var(--wa-teal)]">{t('fan.result_realized')}</div>
                <div className="text-[16px] font-black">${result.realizedAmount}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
