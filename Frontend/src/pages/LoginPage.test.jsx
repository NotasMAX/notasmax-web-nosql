import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const toastShow = vi.fn();
vi.mock('primereact/toast', async () => {
  const React = await import('react');
  return { Toast: React.forwardRef((_, ref) => { React.useImperativeHandle(ref, () => ({ show: toastShow })); return null; }) };
});
vi.mock('../components/LoginForm', () => ({ default: () => <form aria-label="Login" /> }));

describe('LoginPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exibe mensagem recebida no estado da navegação e limpa o estado do histórico', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    render(<MemoryRouter initialEntries={[{ pathname: '/login', state: { message: 'Senha alterada', type: 'success' } }]}><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('form', { name: 'Login' })).toBeInTheDocument();
    expect(toastShow).toHaveBeenCalledWith({ severity: 'success', summary: 'Informação', detail: 'Senha alterada', life: 8000 });
    expect(replaceState).toHaveBeenCalledWith({}, '');
  });

  it('não dispara toast sem mensagem válida no estado', () => {
    render(<MemoryRouter initialEntries={['/login']}><LoginPage /></MemoryRouter>);
    expect(toastShow).not.toHaveBeenCalled();
  });
});
