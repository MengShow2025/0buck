export type CheckinBatchState = 'ready' | 'partial' | 'disabled' | 'done';

export type CheckinOrderRow = {
  id: string;
  signable: boolean;
  estAmount: string;
  phase?: string;
  reasonKey?: 'already_signed' | 'not_eligible' | 'conflict_group_free';
};

export type CheckinBatchResultRow = CheckinOrderRow & {
  status: 'success' | 'failed';
};

export type CheckinBatchResult = {
  successCount: number;
  failedCount: number;
  realizedAmount: string;
  rows: CheckinBatchResultRow[];
};

export const resolveCheckinBatchState = ({
  hasCheckedInToday,
  signableCount,
  totalCount,
}: {
  hasCheckedInToday: boolean;
  signableCount: number;
  totalCount: number;
}): CheckinBatchState => {
  if (hasCheckedInToday) return 'done';
  if (signableCount <= 0) return 'disabled';
  if (signableCount < totalCount) return 'partial';
  return 'ready';
};

export const runMockBatchCheckin = (orders: CheckinOrderRow[]): CheckinBatchResult => {
  let successCount = 0;
  let failedCount = 0;
  let realized = 0;

  const rows: CheckinBatchResultRow[] = orders.map((order) => {
    if (order.signable) {
      successCount += 1;
      realized += Number(order.estAmount);
      return { ...order, status: 'success' };
    }
    failedCount += 1;
    return { ...order, status: 'failed' };
  });

  return {
    successCount,
    failedCount,
    realizedAmount: realized.toFixed(2),
    rows,
  };
};
