import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(() => ({ instance: true })) }));
vi.mock('axios', () => ({ default: { create: mocks.create } }));

describe('shared API client', () => {
  it('uses the local development API URL when no build URL is configured', async () => {
    const { default: api } = await import('./api.js');
    expect(api).toEqual({ instance: true });
    expect(mocks.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:5000/NotasMax',
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('uses VITE_API_URL and keeps cookie credentials enabled', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/NotasMax');
    vi.resetModules();

    await import('./api.js');

    expect(mocks.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.test/NotasMax',
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });

    vi.unstubAllEnvs();
  });
});
