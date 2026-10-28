import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { confirmDialog } from 'primereact/confirmdialog';
import { removeDisciplina } from '../api/turmasapi';
import TurmaDisciplinaItem from './TurmaDisciplinaItem.jsx';

vi.mock('primereact/confirmdialog', () => ({ confirmDialog: vi.fn() }));
vi.mock('../api/turmasapi', async (importOriginal) => ({ ...(await importOriginal()), removeDisciplina: vi.fn() }));

describe('TurmaDisciplinaItem', () => {
  const disciplina = { _id: 'disc-3', materia: { nome: 'Química' }, professor: { nome: 'Nina' } };

  it('asks for confirmation and removes the discipline on acceptance', async () => {
    removeDisciplina.mockResolvedValue({});
    const onClick = vi.fn();
    const toast = { current: { show: vi.fn() } };
    render(<TurmaDisciplinaItem disciplina={disciplina} toast={toast} onClick={onClick} />);
    expect(screen.getByText('Química')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    const config = confirmDialog.mock.calls.at(-1)[0];
    expect(config.message).toBe('Deseja excluir esta disciplina da turma?');
    await config.accept();
    await waitFor(() => expect(removeDisciplina).toHaveBeenCalledWith('disc-3'));
    expect(onClick).toHaveBeenCalledOnce();
    expect(toast.current.show).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('reports API errors without refreshing the row', async () => {
    removeDisciplina.mockRejectedValue({ response: { data: { message: 'Não removida' } } });
    const onClick = vi.fn();
    const toast = { current: { show: vi.fn() } };
    render(<TurmaDisciplinaItem disciplina={disciplina} toast={toast} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    await confirmDialog.mock.calls.at(-1)[0].accept();
    await waitFor(() => expect(toast.current.show).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'Não removida' })));
    expect(onClick).not.toHaveBeenCalled();
  });
});
