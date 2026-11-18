import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ResetSenha from './ResetSenha';
import { reset } from '../api/auth';

vi.mock('../api/auth', () => ({ reset: vi.fn() }));
function Destination() { const location = useLocation(); return <p>Destino: {location.pathname} - {location.state?.type}</p>; }
function mount(path = '/reset-senha?token=t1') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/reset-senha" element={<ResetSenha />} /><Route path="/Login" element={<Destination />} /></Routes></MemoryRouter>); }

describe('ResetSenha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valida confirmação e tamanho da senha antes de chamar a API', async () => {
    mount();
    fireEvent.change(screen.getByPlaceholderText('Digite sua nova senha'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it('não envia senha diferente da confirmação', async () => {
    mount();
    fireEvent.change(screen.getByPlaceholderText('Digite sua nova senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: 'senha456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it('envia a nova senha usando o token e segue para o login', async () => {
    reset.mockResolvedValue({});
    mount();
    fireEvent.change(screen.getByPlaceholderText('Digite sua nova senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(reset).toHaveBeenCalledWith('t1', 'senha123'));
    expect(await screen.findByText('Destino: /Login - success')).toBeInTheDocument();
  });

  it('redireciona quando o token está ausente', async () => {
    mount('/reset-senha');
    expect(await screen.findByText('Destino: /Login - warn')).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });
});
