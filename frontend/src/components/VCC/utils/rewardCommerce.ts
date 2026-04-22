type RewardTransactionInput = {
  id?: string | number | null;
  amount?: number | string | null;
  type?: string | null;
  status?: string | null;
  order_id?: string | number | null;
  description?: string | null;
  created_at?: string | null;
};

type RewardPlanInput = {
  id?: string | number | null;
  order_id?: string | number | null;
  raw_status?: string | null;
  reward_base?: number | string | null;
  total_earned?: number | string | null;
  current_period?: number | null;
};

type RewardStatusInput = {
  referral_code?: string | null;
  level?: {
    invitees?: number | string | null;
  } | null;
  plans?: RewardPlanInput[] | null;
};

type RewardBreakdownKey =
  | 'cashback'
  | 'fan'
  | 'referral'
  | 'payment'
  | 'withdraw'
  | 'refund'
  | 'other';

const toNumber = (value: unknown): number => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const includes = (value: unknown, keyword: string): boolean =>
  String(value || '').toLowerCase().includes(keyword);

export const classifyRewardTransaction = (tx: RewardTransactionInput): RewardBreakdownKey => {
  if (includes(tx.type, 'withdraw')) return 'withdraw';
  if (includes(tx.type, 'refund')) return 'refund';
  if (includes(tx.type, 'payment')) return 'payment';
  if (includes(tx.type, 'cashback') || includes(tx.description, 'cashback')) return 'cashback';
  if (includes(tx.type, 'fan') || includes(tx.description, 'fan bond')) return 'fan';
  if (includes(tx.type, 'referral')) return 'referral';
  return 'other';
};

const EMPTY_BREAKDOWN = {
  cashback: { amount: 0, count: 0 },
  fan: { amount: 0, count: 0 },
  referral: { amount: 0, count: 0 },
  payment: { amount: 0, count: 0 },
  withdraw: { amount: 0, count: 0 },
  refund: { amount: 0, count: 0 },
  other: { amount: 0, count: 0 },
};

export const summarizeRewardTransactions = (transactions: RewardTransactionInput[] | null | undefined) => {
  const breakdown = {
    cashback: { ...EMPTY_BREAKDOWN.cashback },
    fan: { ...EMPTY_BREAKDOWN.fan },
    referral: { ...EMPTY_BREAKDOWN.referral },
    payment: { ...EMPTY_BREAKDOWN.payment },
    withdraw: { ...EMPTY_BREAKDOWN.withdraw },
    refund: { ...EMPTY_BREAKDOWN.refund },
    other: { ...EMPTY_BREAKDOWN.other },
  };

  let lifetimeEarnings = 0;

  for (const tx of transactions || []) {
    const key = classifyRewardTransaction(tx);
    const amount = toNumber(tx.amount);
    const positiveAmount = amount > 0 ? amount : 0;

    breakdown[key].count += 1;
    breakdown[key].amount += positiveAmount;
    lifetimeEarnings += positiveAmount;
  }

  return {
    lifetimeEarnings,
    breakdown,
  };
};

export const summarizeRewardStatus = (status: RewardStatusInput | null | undefined) => {
  const pendingPlans = (status?.plans || []).filter((plan) => {
    const rawStatus = String(plan?.raw_status || '').toLowerCase();
    return rawStatus === 'active' || rawStatus === 'failed';
  });

  const orderRows = pendingPlans.map((plan) => {
    const rewardBase = toNumber(plan.reward_base);
    const totalEarned = toNumber(plan.total_earned);

    return {
      id: String(plan.id || plan.order_id || ''),
      orderId: String(plan.order_id || ''),
      currentPeriod: Number(plan.current_period) || 0,
      estimatedAmount: Math.max(rewardBase - totalEarned, 0),
      rawStatus: String(plan.raw_status || ''),
    };
  });

  return {
    referralCode: status?.referral_code || null,
    totalFans: toNumber(status?.level?.invitees),
    activePlanCount: orderRows.length,
    pendingCashbackAmount: orderRows.reduce((sum, row) => sum + row.estimatedAmount, 0),
    orderRows,
  };
};
