import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import RecuperarSenha from './RecuperarSenha';
import { forgot } from '../api/auth';

vi.mock('../api/auth', () => ({ forgot: vi.fn() }));
vi.mock('../components/RecuperarSenhaForm', () => ({ default: ({ onSubmit }) => <button onClick={() => onSubmit({ email: 'ana@example.test' })}>Solicitar recuperação</button> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { const location = useLocation(); return <p>Destino: {location.pathname} - {location.state?.type}</p>; }

describe('RecuperarSenha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('solicita recuperação e navega com mensagem genérica de sucesso', async () => {
    forgot.mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/recuperar-senha']}><Routes><Route path="/recuperar-senha" element={<RecuperarSenha />} /><Route path="/login" element={<Destination />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar recuperação' }));
    await waitFor(() => expect(forgot).toHaveBeenCalledWith('ana@example.test'));
    expect(await screen.findByText('Destino: /login - info')).toBeInTheDocument();
  });

  it('mantém a tela quando o pedido falha', async () => {
    forgot.mockRejectedValue({ response: { data: { message: 'Falha temporária' } } });
    render(<MemoryRouter><RecuperarSenha /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar recuperação' }));
    await waitFor(() => expect(forgot).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Recuperação de Senha' })).toBeInTheDocument();
  });
});
