import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrawerProvider } from './DrawerContext';
import { SessionProvider, useSessionContext } from './SessionContext';

const mockUserGetMe = vi.fn();
const mockAuthGetMe = vi.fn();

vi.mock('../../../services/api', () => ({
  userApi: {
    getMe: () => mockUserGetMe(),
  },
  authApi: {
    me: () => mockAuthGetMe(),
  },
}));

const SessionProbe = () => {
  const { user, isAuthenticated } = useSessionContext();
  return (
    <div>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? 'guest'}</span>
    </div>
  );
};

const renderSession = () =>
  render(
    <DrawerProvider>
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>
    </DrawerProvider>
  );

describe('SessionContext', () => {
  beforeEach(() => {
    mockUserGetMe.mockReset();
    mockAuthGetMe.mockReset();
  });

  it('authenticates from plain /users/me payloads', async () => {
    mockUserGetMe.mockResolvedValue({
      data: {
        customer_id: 202,
        email: 'plain@example.com',
        user_type: 'customer',
      },
    });

    renderSession();

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
      expect(screen.getByTestId('email')).toHaveTextContent('plain@example.com');
    });
  });

  it('falls back to /auth/me when /users/me fails', async () => {
    mockUserGetMe.mockRejectedValue(new Error('401'));
    mockAuthGetMe.mockResolvedValue({
      data: {
        status: 'success',
        user: {
          customer_id: 303,
          email: 'wrapped@example.com',
          user_type: 'customer',
        },
      },
    });

    renderSession();

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
      expect(screen.getByTestId('email')).toHaveTextContent('wrapped@example.com');
    });
  });
});
