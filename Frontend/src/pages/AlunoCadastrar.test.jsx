import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AlunoCadastrar from './AlunoCadastrar';
import { createAluno } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ createAluno: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/AlunoForm', () => ({ default: ({ onSubmit }) => <button onClick={() => onSubmit({ nome: 'Ana' })}>Enviar formulário</button> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));

function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('AlunoCadastrar', () => {
  const showError = vi.fn();
  const showSuccessOnRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect });
  });

  it('envia os dados, informa sucesso e navega para a lista', async () => {
    createAluno.mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/Alunos/Cadastrar']}><Routes><Route path="/Alunos/Cadastrar" element={<AlunoCadastrar />} /><Route path="/Alunos" element={<Destination />} /></Routes></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));

    await waitFor(() => expect(createAluno).toHaveBeenCalledWith({ nome: 'Ana' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Aluno cadastrado com sucesso!');
    expect(await screen.findByText('Destino: /Alunos')).toBeInTheDocument();
  });

  it('apresenta a mensagem da API quando o cadastro falha', async () => {
    createAluno.mockRejectedValue({ response: { data: { error: 'E-mail já cadastrado' } } });
    render(<MemoryRouter><AlunoCadastrar /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));

    await waitFor(() => expect(showError).toHaveBeenCalledWith('E-mail já cadastrado'));
  });
});
