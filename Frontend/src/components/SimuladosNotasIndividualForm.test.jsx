import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimuladosNotasIndividualForm from './SimuladosNotasIndividualForm';

vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('primereact/confirmdialog', () => ({ ConfirmDialog: () => null, confirmDialog: vi.fn() }));
vi.mock('./SimuladosNotaItem', () => ({ default: ({ conteudo, onUpdate }) => <button type="button" onClick={() => onUpdate({ ...conteudo, resultados: [{ aluno_id: 'a1', acertos: 6 }] })}>Atualizar {conteudo.turma_disciplina_id}</button> }));

describe('SimuladosNotasIndividualForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('atualiza e envia notas da matéria do aluno', async () => {
    const onSubmit = vi.fn();
    const conteudos = [{ turma_disciplina_id: 'd1', quantidade_questoes: 8, turma_disciplina: { materia_id: 'm1' }, resultados: [{ aluno_id: 'a1', acertos: 2 }] }];
    render(<MemoryRouter><SimuladosNotasIndividualForm onSubmit={onSubmit} initialData={{ conteudos }} conteudosRecebidos={conteudos} aluno={{ _id: 'a1', nome: 'Ana' }} simulado_id="s1" bimestre={2} /></MemoryRouter>);
    expect(await screen.findByText('02')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar d1' }));
    expect(await screen.findByText('06')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ conteudos: [expect.objectContaining({ turma_disciplina_id: 'd1', resultados: [{ aluno_id: 'a1', acertos: 6 }] })] })));
  });

  it('informa quando não há matéria a lançar', async () => {
    render(<MemoryRouter><SimuladosNotasIndividualForm onSubmit={vi.fn()} conteudosRecebidos={[]} aluno={{ _id: 'a1' }} simulado_id="s1" bimestre={1} /></MemoryRouter>);
    expect(await screen.findByText('Nenhum simulado encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });
});
