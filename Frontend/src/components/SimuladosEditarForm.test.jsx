import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimuladosEditarForm from './SimuladosEditarForm';
import { getOne } from '../api/turmasapi';

vi.mock('../api/turmasapi', () => ({ getAllTurmas: vi.fn(), getOne: vi.fn() }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('primereact/confirmdialog', () => ({ ConfirmDialog: () => null, confirmDialog: vi.fn() }));
vi.mock('primereact/overlaypanel', () => ({ OverlayPanel: ({ children }) => <div>{children}</div> }));
vi.mock('primereact/tooltip', () => ({ Tooltip: () => null }));
vi.mock('./SimuladosDisciplinaItem', () => ({ default: ({ disciplina }) => <div><input name="quantidade_questoes" aria-label="questões" value={disciplina.quantidade_questoes} readOnly /><input name="peso" aria-label="peso" value={disciplina.peso} readOnly /></div> }));
vi.mock('./SimuladosDisciplinaForm', () => ({ default: () => null }));

describe('SimuladosEditarForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recupera os conteúdos da turma e envia edição válida', async () => {
    const onSubmit = vi.fn();
    const turma = { _id: 't1', ano: 2026, serie: 2, disciplinas: [{ _id: 'd1', materia: { nome: 'Matemática' }, professor: { nome: 'Prof. A' } }] };
    const simulado = { _id: 's1', turma_id: 't1', numero: 2, tipo: 'objetivo', bimestre: 1, data_realizacao: '2030-01-02T00:00:00.000Z', conteudos: [{ turma_disciplina_id: 'd1', quantidade_questoes: 10, peso: 50, resultados: [] }] };
    getOne.mockResolvedValue({ data: { turma } });
    render(<MemoryRouter><SimuladosEditarForm simulado={simulado} onSubmit={onSubmit} /></MemoryRouter>);
    expect(await screen.findByDisplayValue('50')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar Simulado' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ turma_id: 't1', bimestre: 1, numero: 2, tipo: 'objetivo', conteudos: [expect.objectContaining({ turma_disciplina_id: 'd1', peso: 50, quantidade_questoes: 10 })] })));
  });
});
