import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AlunoCadastrar from './AlunoCadastrar';
import { createAluno, enviarFotoUsuario, getDisponibilidadeFotos } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ createAluno: vi.fn(), enviarFotoUsuario: vi.fn(), getDisponibilidadeFotos: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/AlunoForm', () => ({
  default: ({ onSubmit, fotosDisponiveis }) => (
    <>
      <p>Fotos disponíveis: {String(fotosDisponiveis)}</p>
      <button onClick={() => onSubmit({ nome: 'Ana' })}>Enviar formulário</button>
      <button onClick={() => onSubmit({ nome: 'Ana' }, new File(['foto'], 'foto.png', { type: 'image/png' }))}>Enviar com foto</button>
    </>
  ),
}));
vi.mock('primereact/toast', () => ({ Toast: () => null }));

function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter initialEntries={['/Alunos/Cadastrar']}><Routes><Route path="/Alunos/Cadastrar" element={<AlunoCadastrar />} /><Route path="/Alunos" element={<Destination />} /></Routes></MemoryRouter>); }

describe('AlunoCadastrar', () => {
  const showError = vi.fn();
  const showSuccessOnRedirect = vi.fn();
  const showWarnOnRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect, showWarnOnRedirect });
    getDisponibilidadeFotos.mockResolvedValue({ data: { disponivel: true } });
  });

  it('envia os dados, informa sucesso e navega para a lista', async () => {
    createAluno.mockResolvedValue({});
    mount();

    expect(await screen.findByText('Fotos disponíveis: true')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));

    await waitFor(() => expect(createAluno).toHaveBeenCalledWith({ nome: 'Ana' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Aluno cadastrado com sucesso!');
    expect(enviarFotoUsuario).not.toHaveBeenCalled();
    expect(await screen.findByText('Destino: /Alunos')).toBeInTheDocument();
  });

  it('envia a foto para o aluno criado', async () => {
    createAluno.mockResolvedValue({ data: { _id: 'a9' } });
    enviarFotoUsuario.mockResolvedValue({});
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar com foto' }));

    expect(await screen.findByText('Destino: /Alunos')).toBeInTheDocument();
    expect(enviarFotoUsuario).toHaveBeenCalledWith('a9', expect.any(File));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Aluno cadastrado com sucesso!');
  });

  it('mantém o aluno e avisa quando só a foto falha', async () => {
    createAluno.mockResolvedValue({ data: { _id: 'a9' } });
    enviarFotoUsuario.mockRejectedValue({ response: { data: { message: 'Não foi possível guardar a foto.' } } });
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar com foto' }));

    expect(await screen.findByText('Destino: /Alunos')).toBeInTheDocument();
    expect(showWarnOnRedirect).toHaveBeenCalledWith('Aluno cadastrado, mas a foto não foi salva. Não foi possível guardar a foto. Edite o aluno para enviá-la novamente.');
    expect(showSuccessOnRedirect).not.toHaveBeenCalled();
  });

  it('apresenta a mensagem da API quando o cadastro falha', async () => {
    createAluno.mockRejectedValue({ response: { data: { error: 'E-mail já cadastrado' } } });
    render(<MemoryRouter><AlunoCadastrar /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar com foto' }));

    await waitFor(() => expect(showError).toHaveBeenCalledWith('E-mail já cadastrado'));
    expect(enviarFotoUsuario).not.toHaveBeenCalled();
  });

  it('usa a mensagem padrão quando a API não explica a falha', async () => {
    createAluno.mockRejectedValue(new Error('rede'));
    render(<MemoryRouter><AlunoCadastrar /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));

    await waitFor(() => expect(showError).toHaveBeenCalledWith('Erro ao cadastrar aluno.'));
  });
});
