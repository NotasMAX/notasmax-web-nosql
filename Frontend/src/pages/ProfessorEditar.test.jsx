import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProfessorEditar from './ProfessorEditar';
import { enviarFotoUsuario, getDisponibilidadeFotos, getUsuario, updateUsuario } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn(), updateUsuario: vi.fn(), enviarFotoUsuario: vi.fn(), getDisponibilidadeFotos: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/ProfessorForm', () => ({
  default: ({ initialData, onSubmit, fotoAtual }) => (
    <>
      <p>Formulário de {initialData.nome}</p>
      <p>Foto atual: {fotoAtual ?? 'nenhuma'}</p>
      <button onClick={() => onSubmit({ nome: 'Prof. Ana 2' })}>Salvar professor</button>
      <button onClick={() => onSubmit({ nome: 'Prof. Ana 2' }, new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }))}>Salvar com foto</button>
    </>
  ),
}));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter initialEntries={['/Professores/Editar/p1']}><Routes><Route path="/Professores/Editar/:id" element={<ProfessorEditar />} /><Route path="/Professores" element={<Destination />} /></Routes></MemoryRouter>); }

describe('ProfessorEditar', () => {
  const showError = vi.fn();
  const showSuccessOnRedirect = vi.fn();
  const showWarnOnRedirect = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect, showWarnOnRedirect });
    getDisponibilidadeFotos.mockResolvedValue({ data: { disponivel: true } });
  });

  it('carrega o professor e envia atualizações com o ID atual', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Prof. Ana' } });
    updateUsuario.mockResolvedValue({});
    mount();
    expect(await screen.findByText('Formulário de Prof. Ana')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar professor' }));
    await waitFor(() => expect(updateUsuario).toHaveBeenCalledWith('p1', { nome: 'Prof. Ana 2' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Professor atualizado com sucesso!');
    expect(await screen.findByText('Destino: /Professores')).toBeInTheDocument();
  });

  it('mostra a foto atual e envia a nova depois dos dados', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Prof. Ana', foto_atualizada_em: '2026-11-15T12:00:00.000Z' } });
    updateUsuario.mockResolvedValue({});
    enviarFotoUsuario.mockResolvedValue({});
    mount();
    expect(await screen.findByText('Foto atual: http://localhost:5000/NotasMax/Usuarios/p1/Foto?v=2026-11-15T12:00:00.000Z')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar com foto' }));
    expect(await screen.findByText('Destino: /Professores')).toBeInTheDocument();
    expect(enviarFotoUsuario).toHaveBeenCalledWith('p1', expect.any(File));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Professor atualizado com sucesso!');
  });

  it('mantém os dados e avisa quando só a foto falha', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Prof. Ana' } });
    updateUsuario.mockResolvedValue({});
    enviarFotoUsuario.mockRejectedValue({ response: { data: { message: 'Não foi possível guardar a foto.' } } });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar com foto' }));
    expect(await screen.findByText('Destino: /Professores')).toBeInTheDocument();
    expect(showWarnOnRedirect).toHaveBeenCalledWith('Professor atualizado, mas a foto não foi salva. Não foi possível guardar a foto. Tente enviá-la novamente.');
  });

  it('não envia a foto quando a atualização dos dados falha', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Prof. Ana' } });
    updateUsuario.mockRejectedValue(new Error('rede'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar com foto' }));
    await waitFor(() => expect(showError).toHaveBeenCalledWith('Erro ao atualizar professor.'));
    expect(enviarFotoUsuario).not.toHaveBeenCalled();
  });

  it('mostra erro caso não consiga carregar o professor', async () => {
    getUsuario.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByText('Erro ao carregar professor.')).toBeInTheDocument();
    expect(showError).toHaveBeenCalledWith('Erro ao carregar professor.');
  });
});
