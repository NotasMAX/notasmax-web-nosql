import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TurmasEditar from './TurmasEditar';
import { getTurmaById } from '../api/turmasapi';

vi.mock('../api/turmasapi', () => ({ getTurmaById: vi.fn() }));
vi.mock('../components/TurmaAlunoForm', () => ({ default: () => <p>Formulário de aluno</p> }));
vi.mock('../components/TurmaAlunoItem', () => ({ default: ({ aluno }) => <p>Aluno: {aluno.nome}</p> }));
vi.mock('../components/TurmaDisciplinaForm', () => ({ default: () => <p>Formulário de disciplina</p> }));
vi.mock('../components/TurmaDisciplinaItem', () => ({ default: ({ disciplina }) => <p>Disciplina: {disciplina.materia.nome}</p> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('primereact/confirmdialog', () => ({ ConfirmDialog: () => null }));
vi.mock('primereact/overlaypanel', () => ({ OverlayPanel: ({ children }) => <div>{children}</div> }));

describe('TurmasEditar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega turma e seus alunos e disciplinas', async () => {
    getTurmaById.mockResolvedValue({ data: { turma: { _id: 't1', serie: 2, ano: 2026, alunos: [{ _id: 'a1', nome: 'Ana' }], disciplinas: [{ _id: 'd1', materia: { nome: 'Química' } }] } } });
    render(<MemoryRouter initialEntries={['/Turmas/Editar/t1']}><Routes><Route path="/Turmas/Editar/:id" element={<TurmasEditar />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Editar Turma - 2º EM' })).toBeInTheDocument();
    expect(screen.getByText('Aluno: Ana')).toBeInTheDocument();
    expect(screen.getByText('Disciplina: Química')).toBeInTheDocument();
    expect(getTurmaById).toHaveBeenCalledWith('t1');
  });

  it('redireciona para a rota de erro se a turma não carregar', async () => {
    getTurmaById.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter initialEntries={['/Turmas/Editar/t1']}><Routes><Route path="/Turmas/Editar/:id" element={<TurmasEditar />} /><Route path="/404" element={<p>Não encontrado</p>} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Não encontrado')).toBeInTheDocument();
  });
});
