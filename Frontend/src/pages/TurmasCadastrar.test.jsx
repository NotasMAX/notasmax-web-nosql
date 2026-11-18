import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import TurmasCadastrar from './TurmasCadastrar';
import { cadastrarTurma } from '../api/turmasapi';

vi.mock('../api/turmasapi', () => ({ cadastrarTurma: vi.fn() }));
vi.mock('../components/TurmasForm', () => ({ default: ({ onSubmit, response }) => <><button onClick={() => onSubmit({ serie: 2 })}>Salvar turma</button>{response?.message && <p>{response.message}</p>}</> }));
function Destination() { const location = useLocation(); return <p>Destino: {location.pathname} - {location.state?.type}</p>; }

describe('TurmasCadastrar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria turma e redireciona para a turma retornada', async () => {
    cadastrarTurma.mockResolvedValue({ data: { novaTurma: { _id: 't5' }, message: 'Criada' } });
    render(<MemoryRouter initialEntries={['/Turmas/Cadastrar']}><Routes><Route path="/Turmas/Cadastrar" element={<TurmasCadastrar />} /><Route path="/Turmas/Editar/:id" element={<Destination />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar turma' }));
    await waitFor(() => expect(cadastrarTurma).toHaveBeenCalledWith({ serie: 2 }));
    expect(await screen.findByText('Destino: /Turmas/Editar/t5 - success')).toBeInTheDocument();
  });

  it('mostra o objeto de erro devolvido pela API', async () => {
    cadastrarTurma.mockRejectedValue({ response: { data: { message: 'Turma inválida' } } });
    render(<MemoryRouter><TurmasCadastrar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar turma' }));
    expect(await screen.findByText('Turma inválida')).toBeInTheDocument();
  });
});
