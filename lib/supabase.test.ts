import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const MODULE_PATH = './supabase';

describe('Supabase client singleton', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exports a non-null client with a .from method when env vars are valid', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

    const mod = await import(MODULE_PATH);

    expect(mod.supabase).not.toBeNull();
    expect(mod.supabase).toBeDefined();
    expect(typeof mod.supabase.from).toBe('function');
  });

  it('returns the same instance when the module is imported more than once', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

    const mod1 = await import(MODULE_PATH);
    const mod2 = await import(MODULE_PATH);

    expect(mod1.supabase).toBe(mod2.supabase);
  });

  it('throws an error naming NEXT_PUBLIC_SUPABASE_URL when it is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

    await expect(import(MODULE_PATH)).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('throws an error naming NEXT_PUBLIC_SUPABASE_ANON_KEY when it is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    await expect(import(MODULE_PATH)).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
