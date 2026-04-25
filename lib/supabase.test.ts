import { afterEach, describe, expect, it, vi } from 'vitest';

const VALID_URL = 'http://127.0.0.1:54321';
const VALID_ANON_KEY = 'anon-key-for-tests';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('lib/supabase', () => {
  it('exports a usable client when both env vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', VALID_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', VALID_ANON_KEY);

    const { supabase } = await import('./supabase');

    expect(supabase).not.toBeNull();
    expect(typeof supabase.from).toBe('function');
  });

  it('returns the same instance when imported more than once', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', VALID_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', VALID_ANON_KEY);

    const first = (await import('./supabase')).supabase;
    const second = (await import('./supabase')).supabase;

    expect(second).toBe(first);
  });

  it('throws naming NEXT_PUBLIC_SUPABASE_URL when the URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', VALID_ANON_KEY);

    await expect(import('./supabase')).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('throws naming NEXT_PUBLIC_SUPABASE_ANON_KEY when the anon key is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', VALID_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    await expect(import('./supabase')).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
