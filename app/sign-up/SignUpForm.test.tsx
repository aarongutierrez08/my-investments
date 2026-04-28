import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignUpForm } from './SignUpForm';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

describe('SignUpForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it('renders email and password inputs and a Sign up button', () => {
    const signUp = vi.fn();
    render(<SignUpForm signUp={signUp} />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(email).toBeInTheDocument();
    expect(email.type).toBe('email');
    expect(email).toBeRequired();

    const password = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(password).toBeInTheDocument();
    expect(password.type).toBe('password');
    expect(password).toBeRequired();

    const button = screen.getByRole('button', { name: /sign up/i }) as HTMLButtonElement;
    expect(button).toBeInTheDocument();
    expect(button.type).toBe('submit');
  });

  it('renders a link to /sign-in for users who already have an account', () => {
    render(<SignUpForm signUp={vi.fn()} />);

    const link = screen.getByRole('link', { name: /sign in/i }) as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/sign-in');
  });

  it('calls signUp once with the entered email and password and redirects to / on success', async () => {
    const signUp = vi.fn().mockResolvedValue(undefined);
    render(<SignUpForm signUp={signUp} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'correcthorse' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledTimes(1);
    });

    expect(signUp).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password: 'correcthorse',
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('does not call signUp and shows an inline error when the password is shorter than 8 characters', async () => {
    const signUp = vi.fn();
    render(<SignUpForm signUp={signUp} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: '12345' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/at least 8 characters/i);
    expect(signUp).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('does not call signUp and shows an inline error when the email is not a valid format', async () => {
    const signUp = vi.fn();
    render(<SignUpForm signUp={signUp} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'correcthorse' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/invalid/i);
    expect(signUp).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders the supabase error inline and stays on the page when signUp rejects', async () => {
    const signUp = vi.fn().mockRejectedValue(new Error('User already registered'));
    render(<SignUpForm signUp={signUp} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'correcthorse' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/user already registered/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
