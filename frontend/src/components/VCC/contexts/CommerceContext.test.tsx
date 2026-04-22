import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetStatus = vi.fn();
const mockGetMyOrders = vi.fn();
let mockSessionState: { user: any } = { user: null };

vi.mock('../../../services/api', () => ({
  rewardApi: {
    getStatus: (...args: any[]) => mockGetStatus(...args),
  },
  orderApi: {
    getMyOrders: (...args: any[]) => mockGetMyOrders(...args),
  },
}));

vi.mock('./SessionContext', () => ({
  useSessionContext: () => mockSessionState,
}));

import { CommerceProvider, useCommerceContext } from './CommerceContext';

const CommerceProbe = () => {
  const { userBalance, userPoints, userLevel, influencerRatios, isInfluencer, orders } = useCommerceContext();
  return (
    <div>
      <span data-testid="balance">{String(userBalance)}</span>
      <span data-testid="points">{String(userPoints)}</span>
      <span data-testid="level">{userLevel}</span>
      <span data-testid="referral-rate">{String(influencerRatios?.referral ?? 0)}</span>
      <span data-testid="fan-rate">{String(influencerRatios?.fan ?? 0)}</span>
      <span data-testid="influencer">{String(isInfluencer)}</span>
      <span data-testid="orders">{String(orders.length)}</span>
    </div>
  );
};

describe('CommerceContext', () => {
  beforeEach(() => {
    mockSessionState = { user: null };
    mockGetStatus.mockReset();
    mockGetMyOrders.mockReset();
  });

  it('uses empty commercial state when there is no authenticated user', async () => {
    render(
      <CommerceProvider>
        <CommerceProbe />
      </CommerceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('balance')).toHaveTextContent('0');
      expect(screen.getByTestId('points')).toHaveTextContent('0');
      expect(screen.getByTestId('level')).toHaveTextContent('Bronze');
      expect(screen.getByTestId('referral-rate')).toHaveTextContent('0');
      expect(screen.getByTestId('fan-rate')).toHaveTextContent('0');
      expect(screen.getByTestId('orders')).toHaveTextContent('0');
    });
  });

  it('hydrates reward and order data from live APIs', async () => {
    mockSessionState = {
      user: {
        customer_id: 1004908,
        user_tier: 'Gold',
        user_type: 'customer',
      },
    };
    mockGetStatus.mockResolvedValue({
      data: {
        user_tier: 'gold',
        user_type: 'kol',
        dist_rate: 0.12,
        fan_rate: 0.03,
        wallet: {
          balance: 18.6,
          points: 520,
        },
      },
    });
    mockGetMyOrders.mockResolvedValue({
      data: {
        status: 'success',
        items: [{ order_id: 'ORD-1' }, { order_id: 'ORD-2' }],
      },
    });

    render(
      <CommerceProvider>
        <CommerceProbe />
      </CommerceProvider>
    );

    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalledWith(1004908);
      expect(mockGetMyOrders).toHaveBeenCalled();
      expect(screen.getByTestId('balance')).toHaveTextContent('18.6');
      expect(screen.getByTestId('points')).toHaveTextContent('520');
      expect(screen.getByTestId('level')).toHaveTextContent('Gold');
      expect(screen.getByTestId('referral-rate')).toHaveTextContent('0.12');
      expect(screen.getByTestId('fan-rate')).toHaveTextContent('0.03');
      expect(screen.getByTestId('influencer')).toHaveTextContent('true');
      expect(screen.getByTestId('orders')).toHaveTextContent('2');
    });
  });
});
