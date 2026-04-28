import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { SignOutButton } from './SignOutButton';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const fakeSession = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'user-1', email: 'alice@example.com' },
} as unknown as Session;

describe('SignOutButton', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders nothing when there is no active session', async () => {
    const getSession = vi.fn().mockResolvedValue(null);
    const signOut = vi.fn();

    const { container } = render(
      <SignOutButton getSession={getSession} signOut={signOut} />,
    );

    await waitFor(() => {
      expect(getSession).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('calls signOut exactly once when the Sign out button is clicked', async () => {
    const getSession = vi.fn().mockResolvedValue(fakeSession);
    const signOut = vi.fn().mockResolvedValue(undefined);

    render(<SignOutButton getSession={getSession} signOut={signOut} />);

    const button = await screen.findByRole('button', { name: /sign out/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
  });

  it('redirects to /sign-in after a successful sign-out', async () => {
    const getSession = vi.fn().mockResolvedValue(fakeSession);
    const signOut = vi.fn().mockResolvedValue(undefined);

    render(<SignOutButton getSession={getSession} signOut={signOut} />);

    const button = await screen.findByRole('button', { name: /sign out/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/sign-in');
    });
  });
});
