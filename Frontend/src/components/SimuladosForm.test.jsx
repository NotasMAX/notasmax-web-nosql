import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimuladosForm from './SimuladosForm';
import { getAllTurmas, getOne } from '../api/turmasapi';

vi.mock('../api/turmasapi', () => ({ getAllTurmas: vi.fn(), getOne: vi.fn() }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('primereact/confirmdialog', () => ({ ConfirmDialog: () => null, confirmDialog: vi.fn() }));
vi.mock('primereact/overlaypanel', () => ({ OverlayPanel: ({ children }) => <div>{children}</div> }));
vi.mock('./SimuladosDisciplinaItem', () => ({ default: () => null }));
vi.mock('./SimuladosDisciplinaForm', () => ({ default: () => null }));

describe('SimuladosForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca turmas disponíveis e bloqueia submissão sem turma', async () => {
    const onSubmit = vi.fn();
    getAllTurmas.mockResolvedValue({ data: { turmas: [{ _id: 't1', ano: 2026, serie: 2 }] } });
    render(<MemoryRouter><SimuladosForm onSubmit={onSubmit} /></MemoryRouter>);
    expect(await screen.findByRole('option', { name: '2026 - 2º EM' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Simulado' }));
    expect(document.getElementById('input_turma_id').validationMessage).toBe('A turma é obrigatória.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a complete simulation and converts its date to an ISO timestamp', () => {
    const onSubmit = vi.fn();
    getAllTurmas.mockResolvedValue({ data: { turmas: [] } });
    const initialData = {
      numero: 3,
      tipo: 'objetivo',
      bimestre: 2,
      data_realizacao: '2030-01-02',
      turma_id: 'turma-1',
      conteudos: [{
        turma_disciplina_id: 'disciplina-1',
        materia: { nome: 'Matemática' },
        professor: { nome: 'Prof. A' },
        quantidade_questoes: 10,
        peso: 30,
      }],
    };
    render(<MemoryRouter><SimuladosForm initialData={initialData} onSubmit={onSubmit} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Simulado' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      turma_id: 'turma-1',
      bimestre: 2,
      numero: 3,
      tipo: 'objetivo',
      data_realizacao: new Date(2030, 0, 2).toISOString(),
      conteudos: initialData.conteudos,
    }));
  });

  it.each([
    ['bimestre', '', 'O bimestre é obrigatório.'],
    ['tipo', '', 'O tipo é obrigatório.'],
    ['numero', '', 'O número é obrigatório.'],
    ['data_realizacao', '', 'A data de realização é obrigatória.'],
  ])('blocks submission when %s is missing', (field, value, expectedMessage) => {
    const onSubmit = vi.fn();
    getAllTurmas.mockResolvedValue({ data: { turmas: [] } });
    const initialData = {
      numero: 2,
      tipo: 'objetivo',
      bimestre: 2,
      data_realizacao: '2030-01-02',
      turma_id: 'turma-1',
      conteudos: [{ turma_disciplina_id: 'disciplina-1', materia: { nome: 'Biologia' }, peso: 20, quantidade_questoes: 10 }],
      [field]: value,
    };
    render(<MemoryRouter><SimuladosForm initialData={initialData} onSubmit={onSubmit} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Simulado' }));

    expect(document.getElementById(`input_${field}`).validationMessage).toBe(expectedMessage);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('loads every discipline and preserves configured values for matching subjects', async () => {
    const onSubmit = vi.fn();
    const discipline = (id, name) => ({ _id: id, materia: { nome: name }, professor: { nome: `Prof. ${name}` } });
    getAllTurmas.mockResolvedValue({ data: { turmas: [{ _id: 'turma-1', ano: 2026, serie: 2 }] } });
    getOne.mockResolvedValue({ data: { turma: { disciplinas: [discipline('d1', 'Física'), discipline('d2', 'Química')] } } });
    const initialData = {
      numero: 2,
      tipo: 'objetivo',
      bimestre: 1,
      data_realizacao: '2030-01-02',
      turma_id: 'turma-1',
      conteudos: [{
        turma_disciplina_id: 'd1',
        materia: { nome: 'Física' },
        professor: { nome: 'Prof. Física' },
        quantidade_questoes: 8,
        peso: 40,
      }],
    };
    render(<MemoryRouter><SimuladosForm initialData={initialData} onSubmit={onSubmit} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar todas as disciplinas' }));
    await waitFor(() => expect(getOne).toHaveBeenCalledWith('turma-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Simulado' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      conteudos: expect.arrayContaining([
        expect.objectContaining({ turma_disciplina_id: 'd1', quantidade_questoes: 8, peso: 40 }),
        expect.objectContaining({ turma_disciplina_id: 'd2', quantidade_questoes: 0, peso: 0 }),
      ]),
    }));
  });
});
