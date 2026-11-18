import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AlunoEditar from './AlunoEditar';
import { enviarFotoUsuario, getDisponibilidadeFotos, getUsuario, updateUsuario } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn(), updateUsuario: vi.fn(), enviarFotoUsuario: vi.fn(), getDisponibilidadeFotos: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/AlunoForm', () => ({
  default: ({ initialData, onSubmit, fotoAtual, fotosDisponiveis }) => (
    <>
      <p>Formulário de {initialData.nome}</p>
      <p>Foto atual: {fotoAtual ?? 'nenhuma'}</p>
      <p>Fotos disponíveis: {String(fotosDisponiveis)}</p>
      <button onClick={() => onSubmit({ nome: 'Ana atualizada' })}>Salvar aluno</button>
      <button onClick={() => onSubmit({ nome: 'Ana atualizada' }, new File(['foto'], 'foto.png', { type: 'image/png' }))}>Salvar com foto</button>
    </>
  ),
}));
vi.mock('primereact/toast', () => ({ Toast: () => null }));

function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter initialEntries={['/Alunos/Editar/a1']}><Routes><Route path="/Alunos/Editar/:id" element={<AlunoEditar />} /><Route path="/Alunos" element={<Destination />} /></Routes></MemoryRouter>); }

describe('AlunoEditar', () => {
  const showError = vi.fn();
  const showSuccessOnRedirect = vi.fn();
  const showWarnOnRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect, showWarnOnRedirect });
    getDisponibilidadeFotos.mockResolvedValue({ data: { disponivel: true } });
  });

  it('carrega dados existentes e atualiza o registro associado ao ID da rota', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    updateUsuario.mockResolvedValue({});
    mount();

    expect(await screen.findByText('Formulário de Ana')).toBeInTheDocument();
    expect(screen.getByText('Foto atual: nenhuma')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar aluno' }));

    await waitFor(() => expect(updateUsuario).toHaveBeenCalledWith('a1', { nome: 'Ana atualizada' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Aluno atualizado com sucesso!');
    expect(enviarFotoUsuario).not.toHaveBeenCalled();
    expect(await screen.findByText('Destino: /Alunos')).toBeInTheDocument();
  });

  it('mostra a foto atual e envia a nova depois dos dados', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Ana', foto_atualizada_em: '2026-11-15T12:00:00.000Z' } });
    updateUsuario.mockResolvedValue({});
    enviarFotoUsuario.mockResolvedValue({});
    mount();

    expect(await screen.findByText('Foto atual: http://localhost:5000/NotasMax/Usuarios/a1/Foto?v=2026-11-15T12:00:00.000Z')).toBeInTheDocument();
    expect(await screen.findByText('Fotos disponíveis: true')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar com foto' }));

    expect(await screen.findByText('Destino: /Alunos')).toBeInTheDocument();
    expect(enviarFotoUsuario).toHaveBeenCalledWith('a1', expect.any(File));
    expect(updateUsuario.mock.invocationCallOrder[0]).toBeLessThan(enviarFotoUsuario.mock.invocationCallOrder[0]);
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Aluno atualizado com sucesso!');
  });

  it('mantém os dados e avisa quando só a foto falha', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    updateUsuario.mockResolvedValue({});
    enviarFotoUsuario.mockRejectedValue({ response: { data: { message: 'A foto deve ter no máximo 5 MB.' } } });
    mount();

    fireEvent.click(await screen.findByRole('button', { name: 'Salvar com foto' }));

    expect(await screen.findByText('Destino: /Alunos')).toBeInTheDocument();
    expect(showWarnOnRedirect).toHaveBeenCalledWith('Aluno atualizado, mas a foto não foi salva. A foto deve ter no máximo 5 MB. Tente enviá-la novamente.');
  });

  it('não envia a foto quando a atualização dos dados falha', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    updateUsuario.mockRejectedValue({ response: { data: { error: 'E-mail já cadastrado.' } } });
    mount();

    fireEvent.click(await screen.findByRole('button', { name: 'Salvar com foto' }));

    await waitFor(() => expect(showError).toHaveBeenCalledWith('E-mail já cadastrado.'));
    expect(enviarFotoUsuario).not.toHaveBeenCalled();
    expect(screen.getByText('Formulário de Ana')).toBeInTheDocument();
  });

  it('usa a mensagem padrão quando a atualização falha sem explicação', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    updateUsuario.mockRejectedValue(new Error('rede'));
    mount();

    fireEvent.click(await screen.findByRole('button', { name: 'Salvar aluno' }));

    await waitFor(() => expect(showError).toHaveBeenCalledWith('Erro ao atualizar aluno.'));
  });

  it('mostra estado de erro quando a consulta falha', async () => {
    getUsuario.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByText('Erro ao carregar aluno.')).toBeInTheDocument();
    expect(showError).toHaveBeenCalledWith('Erro ao carregar aluno.');
  });
});
