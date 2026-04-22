import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockLogout = vi.fn();
const mockGetTransactions = vi.fn();

vi.mock('../contexts/CommerceContext', () => ({
  useCommerceContext: () => ({
    userLevel: 'Silver',
    userBalance: 18.6,
    userPoints: 520,
    isPrime: false,
    orders: [],
    influencerRatios: { referral: 0.12, fan: 0.03 },
  }),
}));

vi.mock('../contexts/PreferenceContext', () => ({
  usePreferenceContext: () => ({
    t: (key: string) =>
      ({
        'me.wallet_points': '钱包与积分',
        'me.fans_cashback': '粉丝与签到',
        'me.my_orders': '我的订单',
        'me.to_pay': '待付款',
        'me.to_ship': '待发货',
        'me.to_receive': '待收货',
        'me.refund_after_sales': '退款/售后',
        'me.shipping_address': '收货地址',
        'me.coupons_benefits': '卡券与权益',
        settings: 'Settings',
      }[key] ?? key),
  }),
}));

vi.mock('../contexts/SessionContext', () => ({
  useSessionContext: () => ({
    isAuthenticated: true,
    user: {
      customer_id: 1004908,
      email: 'szyungtay@gmail.com',
      first_name: 'Teme',
      user_type: 'customer',
      user_tier: 'Silver',
    },
    setUser: vi.fn(),
  }),
}));

vi.mock('../contexts/DrawerContext', () => ({
  useDrawerContext: () => ({
    setActiveDrawer: vi.fn(),
    pushDrawer: vi.fn(),
  }),
}));

vi.mock('../../../services/api', () => ({
  authApi: {
    logout: () => mockLogout(),
  },
  rewardApi: {
    getTransactions: (...args: any[]) => mockGetTransactions(...args),
  },
}));

vi.mock('../../../services/authSession', () => ({
  clearStoredAuthTokens: vi.fn(),
}));

import { MeDrawer } from './MeDrawer';

describe('MeDrawer', () => {
  it('renders live member id and avoids legacy placeholder earnings', async () => {
    mockGetTransactions.mockResolvedValue({
      data: [
        { id: '1', amount: 15, type: 'cashback', description: 'Cashback' },
        { id: '2', amount: 9.5, type: 'referral', description: 'Referral reward' },
      ],
    });

    render(<MeDrawer />);

    expect(screen.getByText('ID: 0BUCK_1004908')).toBeInTheDocument();
    expect(screen.getByText('$18.6')).toBeInTheDocument();
    expect(screen.queryByText('ID: 0BUCK_9527')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalledWith(1004908);
      expect(screen.getByText('$24.50')).toBeInTheDocument();
      expect(screen.queryByText('$342')).not.toBeInTheDocument();
    });
  });
});
