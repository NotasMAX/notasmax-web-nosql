import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BimestreAtual from './BimestreAtual.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('BimestreAtual', () => {
  it('shows a supplied year and bimestre without requesting the current date', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    render(<BimestreAtual ano={2025} bimestre={2} />);

    expect(screen.getByText('2º Bimestre - 2025')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the date service to calculate the current bimestre', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ datetime: '2026-04-10T12:00:00.000Z' }),
    });
    render(<BimestreAtual />);

    expect(await screen.findByText('2º Bimestre - 2026')).toBeInTheDocument();
  });

  it('falls back to the system date when the time service fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false });
    await act(async () => {
      render(<BimestreAtual />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/^\dº Bimestre - \d{4}$/)).toBeInTheDocument();
  });
});
