import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { confirmDialog } from 'primereact/confirmdialog';
import { getAlunos, buscarAlunosPorNomeOuEmail } from '../api/usuariosapi';
import { addAluno } from '../api/turmasapi';
import TurmaAlunoForm from './TurmaAlunoForm.jsx';

vi.mock('primereact/confirmdialog', () => ({ confirmDialog: vi.fn() }));
vi.mock('../api/usuariosapi', async (importOriginal) => ({ ...(await importOriginal()), getAlunos: vi.fn(), buscarAlunosPorNomeOuEmail: vi.fn() }));
vi.mock('../api/turmasapi', async (importOriginal) => ({ ...(await importOriginal()), addAluno: vi.fn() }));

describe('TurmaAlunoForm', () => {
  const aluno = { _id: 'a-1', nome: 'Beto Alves', email: 'beto@example.com' };
  const turma = { _id: 't-1', nome: 'Turma Azul', serie: 1, ano: 2026 };
  const setup = () => {
    const onSubmit = vi.fn();
    const toast = { current: { show: vi.fn() } };
    const overlayRef = { current: { hide: vi.fn() } };
    render(<TurmaAlunoForm turma={turma} onSubmit={onSubmit} toast={toast} overlayRef={overlayRef} />);
    return { onSubmit, toast, overlayRef };
  };

  it('searches students and confirms adding the selected student', async () => {
    getAlunos.mockResolvedValue({ data: [aluno] });
    buscarAlunosPorNomeOuEmail.mockResolvedValue({ data: { alunos: [aluno] } });
    addAluno.mockResolvedValue({ data: { message: 'Matrícula criada' } });
    const { onSubmit, toast, overlayRef } = setup();
    const result = await screen.findByText('Beto Alves [beto@example.com]');
    fireEvent.change(screen.getByPlaceholderText('Digite o nome ou email do aluno'), { target: { value: 'Beto' } });
    await waitFor(() => expect(buscarAlunosPorNomeOuEmail).toHaveBeenCalledWith('Beto'));
    fireEvent.click(result);
    const config = confirmDialog.mock.calls.at(-1)[0];
    expect(config.message).toContain('Beto Alves');
    await config.accept();
    await waitFor(() => expect(addAluno).toHaveBeenCalledWith({ turmaId: 't-1', alunoId: 'a-1' }));
    expect(overlayRef.current.hide).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(toast.current.show).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Matrícula criada' }));
  });

  it('shows the empty state when the initial student list is empty', async () => {
    getAlunos.mockResolvedValue({ data: [] });
    setup();
    expect(await screen.findByText('Nenhum aluno encontrado.')).toBeInTheDocument();
  });
});
