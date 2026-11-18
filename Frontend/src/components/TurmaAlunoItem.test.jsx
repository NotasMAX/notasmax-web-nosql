import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { confirmDialog } from 'primereact/confirmdialog';
import { removeAluno } from '../api/turmasapi';
import TurmaAlunoItem from './TurmaAlunoItem.jsx';

vi.mock('primereact/confirmdialog', () => ({ confirmDialog: vi.fn() }));
vi.mock('../api/turmasapi', async (importOriginal) => ({ ...(await importOriginal()), removeAluno: vi.fn() }));

describe('TurmaAlunoItem', () => {
  const aluno = { _id: 'aluno-8', nome: 'Rui Costa', email: 'rui@example.com' };

  it('confirms before removing a student and reports success', async () => {
    removeAluno.mockResolvedValue({ data: { message: 'Aluno removido' } });
    const onClick = vi.fn();
    const toast = { current: { show: vi.fn() } };
    render(<TurmaAlunoItem turma_id="turma-4" aluno={aluno} toast={toast} onClick={onClick} />);
    expect(screen.getByText('Rui Costa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    const config = confirmDialog.mock.calls.at(-1)[0];
    expect(config.message).toBe('Deseja excluir este aluno da turma?');
    expect(removeAluno).not.toHaveBeenCalled();
    await config.accept();
    await waitFor(() => expect(removeAluno).toHaveBeenCalledWith('turma-4', 'aluno-8'));
    expect(onClick).toHaveBeenCalledOnce();
    expect(toast.current.show).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Aluno removido' }));
  });

  it('reports a removal failure and does not refresh the list', async () => {
    removeAluno.mockRejectedValue({ response: { data: { message: 'Falha de API' } } });
    const onClick = vi.fn();
    const toast = { current: { show: vi.fn() } };
    render(<TurmaAlunoItem turma_id="turma-4" aluno={aluno} toast={toast} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    await confirmDialog.mock.calls.at(-1)[0].accept();
    await waitFor(() => expect(toast.current.show).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'Falha de API' })));
    expect(onClick).not.toHaveBeenCalled();
  });
});
