import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SimuladosNotas from './SimuladosNotas';
import { atualizarConteudos, getOne as getOneSimulado, getSimuladosByTurma } from '../api/simuladoApi';
import { getUsuario } from '../api/usuariosapi';
import { getOne as getOneTurma } from '../api/turmasapi';

vi.mock('../api/simuladoApi', () => ({ getOne: vi.fn(), getSimuladosByTurma: vi.fn(), atualizarConteudos: vi.fn() }));
vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn() }));
vi.mock('../api/turmasapi', () => ({ getOne: vi.fn() }));
vi.mock('../components/SimuladosNotasForm', () => ({ default: ({ onSubmit, aluno, alunoAtual, proximoAluno }) => <><p>Aluno {aluno?.nome} ({alunoAtual})</p><p>Próximo: {proximoAluno?.nome || 'nenhum'}</p><button onClick={() => onSubmit({ conteudos: [{ acertos: 4 }] })}>Salvar notas</button></> }));
vi.mock('../components/SimuladosNotasPesquisarForm', () => ({ default: () => <p>Filtro de simulado</p> }));
vi.mock('../components/BimestreAtual', () => ({ default: ({ bimestre, ano }) => <p>Período {bimestre}/{ano}</p> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('SimuladosNotas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega contexto e salva resultados avançando ao próximo aluno', async () => {
    getOneTurma.mockResolvedValue({ data: { turma: { _id: 't1', ano: 2026, serie: 2, alunos: [{ _id: 'a1', nome: 'Ana' }, { _id: 'a2', nome: 'Bia' }] } } });
    getSimuladosByTurma.mockResolvedValue({ data: { simulados: [{ _id: 's1' }] } });
    getOneSimulado.mockResolvedValue({ data: { simulado: { _id: 's1', bimestre: 1, conteudos: [] } } });
    getUsuario.mockResolvedValueOnce({ data: { _id: 'a1', nome: 'Ana', email: 'ana@example.test' } }).mockResolvedValueOnce({ data: { _id: 'a2', nome: 'Bia', email: 'bia@example.test' } });
    atualizarConteudos.mockResolvedValue({ data: { message: 'Salvo' } });
    render(<MemoryRouter initialEntries={['/Turmas/t1/Simulados/s1/Notas/a1']}><Routes><Route path="/Turmas/:turma/Simulados/:simulado/Notas/:aluno" element={<SimuladosNotas />} /><Route path="/Turmas/Info/:turma" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Aluno Ana (1)')).toBeInTheDocument();
    expect(await screen.findByText('Próximo: Bia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar notas' }));
    await waitFor(() => expect(atualizarConteudos).toHaveBeenCalledWith('s1', { conteudos: [{ acertos: 4 }] }));
    expect(await screen.findByText('Aluno Bia (2)')).toBeInTheDocument();
  });
});
