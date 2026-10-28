import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToast } from './useToast.js';

let toast;

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  toast = { show: vi.fn() };
});

afterEach(() => vi.useRealTimers());

describe('useToast', () => {
  it('shows pending session toast and removes its stored values', () => {
    sessionStorage.setItem('toastMessage', 'Salvo');
    sessionStorage.setItem('toastSeverity', 'success');
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toast.current = toast; });

    expect(sessionStorage.getItem('toastMessage')).toBeNull();
    expect(sessionStorage.getItem('toastSeverity')).toBeNull();
    act(() => vi.advanceTimersByTime(100));
    expect(toast.show).toHaveBeenCalledWith({ severity: 'success', summary: 'Sucesso', detail: 'Salvo', life: 3000 });
  });

  it('does not schedule an incomplete pending toast', () => {
    sessionStorage.setItem('toastMessage', 'Sem gravidade');
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toast.current = toast; });
    act(() => vi.advanceTimersByTime(100));
    expect(toast.show).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('toastMessage')).toBe('Sem gravidade');
  });

  it('shows success, error, info and warning messages with their defaults', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toast.current = toast; });
    act(() => {
      result.current.showSuccess();
      result.current.showError();
      result.current.showInfo('Detalhe');
      result.current.showWarn('Atenção');
    });
    expect(toast.show.mock.calls.map(([message]) => [message.severity, message.summary, message.detail])).toEqual([
      ['success', 'Sucesso', 'Operação realizada com sucesso!'],
      ['error', 'Erro', 'Erro ao realizar operação.'],
      ['info', 'Informação', 'Detalhe'],
      ['warn', 'Atenção', 'Atenção'],
    ]);
  });

  it('stores redirect messages with their severity', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showSuccessOnRedirect('Tudo certo');
      expect(sessionStorage.getItem('toastMessage')).toBe('Tudo certo');
      expect(sessionStorage.getItem('toastSeverity')).toBe('success');
      result.current.showErrorOnRedirect('Falhou');
    });
    expect(sessionStorage.getItem('toastMessage')).toBe('Falhou');
    expect(sessionStorage.getItem('toastSeverity')).toBe('error');
  });
});
