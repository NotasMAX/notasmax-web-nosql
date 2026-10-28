import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AlunoEditar from './AlunoEditar';
import { getUsuario, updateUsuario } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn(), updateUsuario: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/AlunoForm', () => ({ default: ({ initialData, onSubmit }) => <><p>Formulário de {initialData.nome}</p><button onClick={() => onSubmit({ nome: 'Ana atualizada' })}>Salvar aluno</button></> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));

function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter initialEntries={['/Alunos/Editar/a1']}><Routes><Route path="/Alunos/Editar/:id" element={<AlunoEditar />} /><Route path="/Alunos" element={<Destination />} /></Routes></MemoryRouter>); }

describe('AlunoEditar', () => {
  const showError = vi.fn();
  const showSuccessOnRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect });
  });

  it('carrega dados existentes e atualiza o registro associado ao ID da rota', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    updateUsuario.mockResolvedValue({});
    mount();

    expect(await screen.findByText('Formulário de Ana')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar aluno' }));

    await waitFor(() => expect(updateUsuario).toHaveBeenCalledWith('a1', { nome: 'Ana atualizada' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Aluno atualizado com sucesso!');
    expect(await screen.findByText('Destino: /Alunos')).toBeInTheDocument();
  });

  it('mostra estado de erro quando a consulta falha', async () => {
    getUsuario.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByText('Erro ao carregar aluno.')).toBeInTheDocument();
    expect(showError).toHaveBeenCalledWith('Erro ao carregar aluno.');
  });
});
