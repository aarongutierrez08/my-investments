'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export type SignOutFn = () => Promise<void>;
export type GetSessionFn = () => Promise<Session | null>;

const defaultSignOut: SignOutFn = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

const defaultGetSession: GetSessionFn = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

interface SignOutButtonProps {
  signOut?: SignOutFn;
  getSession?: GetSessionFn;
}

export function SignOutButton({
  signOut = defaultSignOut,
  getSession = defaultGetSession,
}: SignOutButtonProps = {}) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void getSession().then((current) => {
      if (active) {
        setSession(current);
      }
    });
    return () => {
      active = false;
    };
  }, [getSession]);

  if (!session) {
    return null;
  }

  function handleClick() {
    startTransition(async () => {
      await signOut();
      router.push('/sign-in');
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-4 py-2 rounded"
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
