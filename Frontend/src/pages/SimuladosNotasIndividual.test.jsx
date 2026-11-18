import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SimuladosNotasIndividual from './SimuladosNotasIndividual';
import { atualizarConteudos, getOne as getOneSimulado, getSimuladosByTurma } from '../api/simuladoApi';
import { getUsuario } from '../api/usuariosapi';
import { getOne as getOneTurma } from '../api/turmasapi';

vi.mock('../api/simuladoApi', () => ({ getOne: vi.fn(), getSimuladosByTurma: vi.fn(), atualizarConteudos: vi.fn() }));
vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn() }));
vi.mock('../api/turmasapi', () => ({ getOne: vi.fn() }));
vi.mock('../components/SimuladosNotasIndividualForm', () => ({ default: ({ onSubmit, aluno, bimestre }) => <><p>Aluno {aluno?.nome}; bimestre {bimestre}</p><button onClick={() => onSubmit({ conteudos: [{ acertos: 9 }] })}>Salvar individual</button></> }));
vi.mock('../components/SimuladosNotasPesquisarIndividualForm', () => ({ default: () => <p>Filtro individual</p> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('SimuladosNotasIndividual', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega os dados associados à rota e salva notas individuais', async () => {
    getOneTurma.mockResolvedValue({ data: { turma: { _id: 't1', ano: 2026, serie: 2, alunos: [] } } });
    getSimuladosByTurma.mockResolvedValue({ data: { simulados: [] } });
    getOneSimulado.mockResolvedValue({ data: { simulado: { _id: 's1', bimestre: 3, conteudos: [] } } });
    getUsuario.mockResolvedValue({ data: { _id: 'a1', nome: 'Ana', email: 'ana@example.test' } });
    atualizarConteudos.mockResolvedValue({ data: { message: 'Notas salvas' } });
    render(<MemoryRouter initialEntries={['/Turmas/t1/Simulados/s1/Notas/a1/individual']}><Routes><Route path="/Turmas/:turma/Simulados/:simulado/Notas/:aluno/individual" element={<SimuladosNotasIndividual />} /><Route path="/Simulados/Notas/:simulado/:bimestre/:aluno" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Aluno Ana; bimestre 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar individual' }));
    await waitFor(() => expect(atualizarConteudos).toHaveBeenCalledWith('s1', { conteudos: [{ acertos: 9 }] }));
    expect(await screen.findByText('Destino: /Simulados/Notas/s1/3/a1')).toBeInTheDocument();
  });
});
