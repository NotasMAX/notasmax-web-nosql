import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SimuladosDisciplinaForm from './SimuladosDisciplinaForm';
import { getOne } from '../api/turmasapi';

const confirmDialog = vi.fn();
vi.mock('../api/turmasapi', () => ({ getOne: vi.fn() }));
vi.mock('primereact/confirmdialog', () => ({ confirmDialog: (...args) => confirmDialog(...args) }));
vi.mock('primereact/inputtext', () => ({ InputText: (props) => <input {...props} /> }));

describe('SimuladosDisciplinaForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega, filtra e confirma a seleção de uma disciplina', async () => {
    const onSubmit = vi.fn();
    const overlayRef = { current: { hide: vi.fn() } };
    getOne.mockResolvedValue({ data: { turma: { disciplinas: [
      { _id: 'd1', materia: { nome: 'Biologia' }, professor: { nome: 'Bia' } },
      { _id: 'd2', materia: { nome: 'Física' }, professor: { nome: 'Fabio' } },
    ] } } });
    confirmDialog.mockImplementation(({ accept }) => accept());
    render(<SimuladosDisciplinaForm turma_id="t1" onSubmit={onSubmit} overlayRef={overlayRef} />);
    expect(await screen.findByText('Biologia [Bia]')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Digite o nome da disciplina ou do professor'), { target: { value: 'fab' } });
    expect(screen.getByText('Física [Fabio]')).toBeInTheDocument();
    expect(screen.queryByText('Biologia [Bia]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Física [Fabio]'));
    expect(confirmDialog).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ _id: 'd2' }));
    expect(overlayRef.current.hide).toHaveBeenCalledOnce();
  });

  it('exibe estado vazio quando a turma não tem disciplinas', async () => {
    getOne.mockResolvedValue({ data: { turma: { disciplinas: [] } } });
    render(<SimuladosDisciplinaForm turma_id="t1" onSubmit={vi.fn()} overlayRef={{ current: { hide: vi.fn() } }} />);
    expect(await screen.findByText('Nenhuma disciplina encontrada.')).toBeInTheDocument();
  });
});
