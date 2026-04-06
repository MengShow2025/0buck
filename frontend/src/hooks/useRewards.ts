import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

export interface RewardStatus {
  user_id: number;
  user_type: 'customer' | 'kol';
  user_tier: 'silver' | 'gold' | 'platinum';
  referral_code: string | null;
  dist_rate: number;
  fan_rate: number;
  wallet: {
    available: number;
    pending: number;
    points: number;
    pending_points: number;
    renewal_cards: number;
    currency: string;
  };
  level: {
    level: string;
    rate: string;
    invitees: number;
    total_volume: number;
  };
  plans: Array<{
    id: string;
    order_id: number;
    status: string;
    raw_status: string;
    reward_base: number;
    current_period: number;
    consecutive_days: number;
    total_earned: number;
    last_checkin_at: string | null;
    expires_at: string | null;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    created_at: string;
  }>;
}

export function useRewards(userId: number | null) {
  const [status, setStatus] = useState<RewardStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const url = getApiUrl(`/v1/rewards/status/${userId}`);
      const res = await axios.get(url);
      setStatus(res.data);
      setError(null);
    } catch (err: any) {
      console.error('[useRewards] Failed to fetch status:', err);
      setError(err.message || 'Failed to fetch reward status');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const checkIn = useCallback(async (planId?: string) => {
    if (!userId) return;
    try {
      const url = getApiUrl('/v1/rewards/checkin');
      const res = await axios.post(url, {
        user_id: userId,
        plan_id: planId // Optional: if omitted, backend does batch check-in
      });
      await fetchStatus(); // Refresh status after check-in
      return res.data;
    } catch (err: any) {
      console.error('[useRewards] Check-in failed:', err);
      throw err;
    }
  }, [userId, fetchStatus]);

  const redeemPoints = useCallback(async (orderId: number, phaseId: number) => {
    if (!userId) return;
    try {
      const url = getApiUrl(`/v1/butler/points/redeem/${userId}`);
      const res = await axios.post(url, {
        order_id: orderId,
        phase_id: phaseId
      });
      await fetchStatus();
      return res.data;
    } catch (err: any) {
      console.error('[useRewards] Point redemption failed:', err);
      throw err;
    }
  }, [userId, fetchStatus]);

  useEffect(() => {
    if (userId) {
      fetchStatus();
    }
  }, [userId, fetchStatus]);

  return { status, isLoading, error, fetchStatus, checkIn, redeemPoints };
}
