import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimuladosNotasForm from './SimuladosNotasForm';

vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('primereact/confirmdialog', () => ({ ConfirmDialog: () => null, confirmDialog: vi.fn() }));
vi.mock('./SimuladosNotaItem', () => ({ default: ({ conteudo, onUpdate }) => <button type="button" onClick={() => onUpdate({ ...conteudo, resultados: [{ aluno_id: 'a1', acertos: 7 }] })}>Atualizar {conteudo.turma_disciplina_id}</button> }));

describe('SimuladosNotasForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recalcula total de acertos após atualizar matéria e envia os dados atuais', async () => {
    const onSubmit = vi.fn();
    const conteudos = [{ turma_disciplina_id: 'd1', quantidade_questoes: 10, turma_disciplina: { materia_id: 'm1' }, resultados: [{ aluno_id: 'a1', acertos: 5 }] }];
    render(<MemoryRouter><SimuladosNotasForm onSubmit={onSubmit} initialData={{ conteudos }} conteudosRecebidos={conteudos} aluno={{ _id: 'a1', nome: 'Ana' }} alunoAtual={1} quantidadeAlunos={2} proximoAluno={{ _id: 'a2' }} anteriorAluno={null} turma_id="t1" simulado_id="s1" bimestre={2} /></MemoryRouter>);
    expect(await screen.findByText('05')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar d1' }));
    expect(await screen.findByText('07')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e próximo' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ conteudos: [expect.objectContaining({ turma_disciplina_id: 'd1', resultados: [{ aluno_id: 'a1', acertos: 7 }] })] })));
  });

  it('mostra mensagem apropriada quando não há próximo aluno ou conteúdo', async () => {
    const conteudos = [];
    render(<MemoryRouter><SimuladosNotasForm onSubmit={vi.fn()} conteudosRecebidos={conteudos} aluno={{ _id: 'a1' }} alunoAtual={1} quantidadeAlunos={1} turma_id="t1" simulado_id="s1" bimestre={2} /></MemoryRouter>);
    expect(await screen.findByText('Nenhum simulado encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar e finalizar' })).toBeInTheDocument();
  });
});
