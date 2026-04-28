import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignInForm } from './SignInForm';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

describe('SignInForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it('renders email and password inputs and a Sign in button', () => {
    const signIn = vi.fn();
    render(<SignInForm signIn={signIn} />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(email).toBeInTheDocument();
    expect(email.type).toBe('email');
    expect(email).toBeRequired();

    const password = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(password).toBeInTheDocument();
    expect(password.type).toBe('password');
    expect(password).toBeRequired();

    const button = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;
    expect(button).toBeInTheDocument();
    expect(button.type).toBe('submit');
  });

  it('calls signIn once with the entered email and password and redirects to / on success', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    render(<SignInForm signIn={signIn} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'correcthorse' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledTimes(1);
    });

    expect(signIn).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password: 'correcthorse',
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('does not call signIn and shows an inline error when the email is not a valid format', async () => {
    const signIn = vi.fn();
    render(<SignInForm signIn={signIn} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'correcthorse' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/invalid/i);
    expect(signIn).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('does not call signIn and shows an inline error when the password is empty', async () => {
    const signIn = vi.fn();
    render(<SignInForm signIn={signIn} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders the supabase error inline and stays on the page when signIn rejects', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Invalid login credentials'));
    render(<SignInForm signIn={signIn} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/invalid login credentials/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
