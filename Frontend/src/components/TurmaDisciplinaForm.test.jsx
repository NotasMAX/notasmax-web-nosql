import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { confirmDialog } from 'primereact/confirmdialog';
import { getProfessores, buscarProfessoresPorNomeOuEmail } from '../api/usuariosapi';
import { listarMaterias, buscarMateriasPorNome } from '../api/materiaApi';
import { addDisciplina } from '../api/turmasapi';
import TurmaDisciplinaForm from './TurmaDisciplinaForm.jsx';

vi.mock('primereact/confirmdialog', () => ({ confirmDialog: vi.fn() }));
vi.mock('../api/usuariosapi', async (importOriginal) => ({ ...(await importOriginal()), getProfessores: vi.fn(), buscarProfessoresPorNomeOuEmail: vi.fn() }));
vi.mock('../api/materiaApi', async (importOriginal) => ({ ...(await importOriginal()), listarMaterias: vi.fn(), buscarMateriasPorNome: vi.fn() }));
vi.mock('../api/turmasapi', async (importOriginal) => ({ ...(await importOriginal()), addDisciplina: vi.fn() }));

describe('TurmaDisciplinaForm', () => {
  const professor = { _id: 'p-1', nome: 'Ivo Professor', email: 'ivo@example.com' };
  const materia = { _id: 'm-1', nome: 'Física' };
  const turma = { _id: 't-2', nome: 'Turma Verde', serie: 2, ano: 2026 };
  const setup = () => {
    const onSubmit = vi.fn();
    const toast = { current: { show: vi.fn() } };
    const overlayRef = { current: { hide: vi.fn() } };
    render(<TurmaDisciplinaForm turma={turma} onSubmit={onSubmit} toast={toast} overlayRef={overlayRef} />);
    return { onSubmit, toast, overlayRef };
  };

  it('selects a professor then a subject and confirms adding their class discipline', async () => {
    getProfessores.mockResolvedValue({ data: [professor] });
    listarMaterias.mockResolvedValue({ data: { materias: [materia] } });
    buscarProfessoresPorNomeOuEmail.mockResolvedValue({ data: { professores: [professor] } });
    buscarMateriasPorNome.mockResolvedValue({ data: { materias: [materia] } });
    addDisciplina.mockResolvedValue({ data: { message: 'Disciplina vinculada' } });
    const { onSubmit, toast, overlayRef } = setup();

    const professorRow = await screen.findByText('Ivo Professor [ivo@example.com]');
    fireEvent.change(screen.getByPlaceholderText('Digite o nome ou email do professor'), { target: { value: 'Ivo' } });
    await waitFor(() => expect(buscarProfessoresPorNomeOuEmail).toHaveBeenCalledWith('Ivo'));
    fireEvent.click(professorRow);
    expect(screen.getByText('Escolha uma matéria para a nova disciplina Turma Verde')).toBeInTheDocument();
    const subjectRow = await screen.findByText('Física');
    fireEvent.change(screen.getByPlaceholderText('Digite o nome da matéria'), { target: { value: 'Fís' } });
    await waitFor(() => expect(buscarMateriasPorNome).toHaveBeenCalledWith('Fís'));
    fireEvent.click(subjectRow);

    const config = confirmDialog.mock.calls.at(-1)[0];
    expect(config.message).toContain('Física - Ivo Professor');
    await config.accept();
    await waitFor(() => expect(addDisciplina).toHaveBeenCalledWith({ turma_id: 't-2', professor_id: 'p-1', materia_id: 'm-1' }));
    expect(overlayRef.current.hide).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(toast.current.show).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Disciplina vinculada' }));
  });

  it('shows the no-professors empty state', async () => {
    getProfessores.mockResolvedValue({ data: [] });
    listarMaterias.mockResolvedValue({ data: { materias: [] } });
    setup();
    expect(await screen.findByText('Nenhum professor encontrado.')).toBeInTheDocument();
  });
});
