import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProfessorCadastrar from './ProfessorCadastrar';
import { createProfessor, enviarFotoUsuario, getDisponibilidadeFotos } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ createProfessor: vi.fn(), enviarFotoUsuario: vi.fn(), getDisponibilidadeFotos: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/ProfessorForm', () => ({
  default: ({ onSubmit, fotosDisponiveis }) => (
    <>
      <p>Fotos disponíveis: {String(fotosDisponiveis)}</p>
      <button onClick={() => onSubmit({ nome: 'Prof. Ana' })}>Enviar formulário</button>
      <button onClick={() => onSubmit({ nome: 'Prof. Ana' }, new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }))}>Enviar com foto</button>
    </>
  ),
}));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter initialEntries={['/Professores/Cadastrar']}><Routes><Route path="/Professores/Cadastrar" element={<ProfessorCadastrar />} /><Route path="/Professores" element={<Destination />} /></Routes></MemoryRouter>); }

describe('ProfessorCadastrar', () => {
  const showError = vi.fn();
  const showSuccessOnRedirect = vi.fn();
  const showWarnOnRedirect = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect, showWarnOnRedirect });
    getDisponibilidadeFotos.mockResolvedValue({ data: { disponivel: false } });
  });

  it('cria professor e navega para a lista após sucesso', async () => {
    createProfessor.mockResolvedValue({});
    mount();
    expect(await screen.findByText('Fotos disponíveis: false')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));
    await waitFor(() => expect(createProfessor).toHaveBeenCalledWith({ nome: 'Prof. Ana' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Professor cadastrado com sucesso!');
    expect(await screen.findByText('Destino: /Professores')).toBeInTheDocument();
  });

  it('envia a foto para o professor criado', async () => {
    createProfessor.mockResolvedValue({ data: { _id: 'p9' } });
    enviarFotoUsuario.mockResolvedValue({});
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar com foto' }));
    expect(await screen.findByText('Destino: /Professores')).toBeInTheDocument();
    expect(enviarFotoUsuario).toHaveBeenCalledWith('p9', expect.any(File));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Professor cadastrado com sucesso!');
  });

  it('mantém o professor e avisa quando só a foto falha', async () => {
    createProfessor.mockResolvedValue({ data: { _id: 'p9' } });
    enviarFotoUsuario.mockRejectedValue(new Error('rede'));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar com foto' }));
    expect(await screen.findByText('Destino: /Professores')).toBeInTheDocument();
    expect(showWarnOnRedirect).toHaveBeenCalledWith('Professor cadastrado, mas a foto não foi salva. Não foi possível enviar a foto. Edite o professor para enviá-la novamente.');
  });

  it('exibe erro retornado pela API', async () => {
    createProfessor.mockRejectedValue({ response: { data: { error: 'E-mail inválido' } } });
    render(<MemoryRouter><ProfessorCadastrar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));
    await waitFor(() => expect(showError).toHaveBeenCalledWith('E-mail inválido'));
  });

  it('usa a mensagem padrão quando a API não explica a falha', async () => {
    createProfessor.mockRejectedValue(new Error('rede'));
    render(<MemoryRouter><ProfessorCadastrar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));
    await waitFor(() => expect(showError).toHaveBeenCalledWith('Erro ao cadastrar professor.'));
  });
});
