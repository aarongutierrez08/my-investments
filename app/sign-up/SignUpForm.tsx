'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SignUpFn = (params: { email: string; password: string }) => Promise<void>;

const defaultSignUp: SignUpFn = async ({ email, password }) => {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw new Error(error.message);
  }
};

interface SignUpFormProps {
  signUp?: SignUpFn;
}

export function SignUpForm({ signUp = defaultSignUp }: SignUpFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    startTransition(async () => {
      try {
        await signUp(parsed.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not sign up, try again');
        return;
      }

      router.push('/');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-xl">
      {error && (
        <div role="alert" className="bg-red-100 text-red-800 p-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-4 py-2 rounded"
      >
        {isPending ? 'Signing up…' : 'Sign up'}
      </button>
    </form>
  );
}
