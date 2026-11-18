import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimuladosNotasPesquisarIndividualForm from './SimuladosNotasPesquisarIndividualForm';

const confirmDialog = vi.fn();
vi.mock('primereact/confirmdialog', () => ({ ConfirmDialog: () => null, confirmDialog: (...args) => confirmDialog(...args) }));

describe('SimuladosNotasPesquisarIndividualForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submete a combinação escolhida de bimestre e simulado', () => {
    const onSubmit = vi.fn();
    render(<MemoryRouter><SimuladosNotasPesquisarIndividualForm onSubmit={onSubmit} turma_id="t1" aluno_id="a1" simulados={[{ _id: 's1', numero: 1, bimestre: 1 }, { _id: 's2', numero: 2, bimestre: 2 }]} simulado={{ _id: 's1', bimestre: 1, numero: 1 }} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Bimestre'), { target: { value: '2' } });
    fireEvent.submit(screen.getByLabelText('Simulado').closest('form'));
    expect(onSubmit).toHaveBeenCalledWith({ bimestre: '2', simulado_id: '' });
  });

  it('confirma a troca do simulado na visualização individual', () => {
    render(<MemoryRouter><SimuladosNotasPesquisarIndividualForm onSubmit={vi.fn()} turma_id="t1" aluno_id="a1" simulados={[{ _id: 's1', numero: 1, bimestre: 1 }, { _id: 's2', numero: 2, bimestre: 1 }]} simulado={{ _id: 's1', bimestre: 1, numero: 1 }} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Simulado'), { target: { value: 's2' } });
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('não salvará') }));
  });
});
