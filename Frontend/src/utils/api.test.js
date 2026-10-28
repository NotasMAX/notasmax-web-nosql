import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(() => ({ instance: true })) }));
vi.mock('axios', () => ({ default: { create: mocks.create } }));

describe('shared API client', () => {
  it('creates the API client with the configured base URL and cookie credentials', async () => {
    const { default: api } = await import('./api.js');
    expect(api).toEqual({ instance: true });
    expect(mocks.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:5000/NotasMax',
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
  });
});
