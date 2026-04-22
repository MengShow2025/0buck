type LooseUser = { customer_id?: number | string | null } | null | undefined;

export const resolveRewardUserId = (user: LooseUser): number | null => {
  const normalized = Number(user?.customer_id);
  return Number.isFinite(normalized) ? normalized : null;
};

export const extractRewardPlans = (payload: Record<string, unknown> | null | undefined): any[] => {
  if (Array.isArray(payload?.plans)) {
    return payload.plans;
  }
  if (Array.isArray(payload?.plan_items)) {
    return payload.plan_items;
  }
  return [];
};
