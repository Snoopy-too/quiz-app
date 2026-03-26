import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
    }),
  },
}));

describe('useTeacherSession', () => {
  it('module exports a function', async () => {
    const mod = await import('../hooks/useTeacherSession');
    expect(typeof mod.default).toBe('function');
  });
});
