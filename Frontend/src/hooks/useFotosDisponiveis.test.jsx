import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDisponibilidadeFotos } from '../api/usuariosapi';
import { useFotosDisponiveis } from './useFotosDisponiveis';

vi.mock('../api/usuariosapi', () => ({ getDisponibilidadeFotos: vi.fn() }));

describe('useFotosDisponiveis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts unknown and follows the server answer', async () => {
    getDisponibilidadeFotos.mockResolvedValue({ data: { disponivel: true } });
    const { result } = renderHook(() => useFotosDisponiveis());

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('treats anything other than true as unavailable', async () => {
    getDisponibilidadeFotos.mockResolvedValue({ data: { disponivel: 'sim' } });
    const { result } = renderHook(() => useFotosDisponiveis());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('turns photos off when the question fails', async () => {
    getDisponibilidadeFotos.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useFotosDisponiveis());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('ignores an answer that arrives after the screen closed', async () => {
    let responder;
    let falhar;
    getDisponibilidadeFotos
      .mockReturnValueOnce(new Promise((resolve) => { responder = resolve; }))
      .mockReturnValueOnce(new Promise((resolve, reject) => { falhar = reject; }));

    const primeiro = renderHook(() => useFotosDisponiveis());
    primeiro.unmount();
    responder({ data: { disponivel: true } });

    const segundo = renderHook(() => useFotosDisponiveis());
    segundo.unmount();
    falhar(new Error('offline'));

    await Promise.resolve();
    expect(primeiro.result.current).toBeNull();
    expect(segundo.result.current).toBeNull();
  });
});
