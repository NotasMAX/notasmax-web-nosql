import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimuladosNotasPesquisarForm from './SimuladosNotasPesquisarForm';

const confirmDialog = vi.fn();
vi.mock('primereact/confirmdialog', () => ({ ConfirmDialog: () => null, confirmDialog: (...args) => confirmDialog(...args) }));

describe('SimuladosNotasPesquisarForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submete o simulado e bimestre selecionados', () => {
    const onSubmit = vi.fn();
    render(<MemoryRouter><SimuladosNotasPesquisarForm onSubmit={onSubmit} turma_id="t1" simulados={[{ _id: 's1', numero: 1, bimestre: 1 }, { _id: 's2', numero: 2, bimestre: 2 }]} simulado={{ _id: 's1', bimestre: 1, numero: 1 }} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Bimestre'), { target: { value: '2' } });
    fireEvent.submit(screen.getByLabelText('Simulado').closest('form'));
    expect(onSubmit).toHaveBeenCalledWith({ bimestre: '2', simulado_id: '' });
  });

  it('confirma navegação quando o simulado muda', () => {
    render(<MemoryRouter><SimuladosNotasPesquisarForm onSubmit={vi.fn()} turma_id="t1" simulados={[{ _id: 's1', numero: 1, bimestre: 1 }, { _id: 's2', numero: 2, bimestre: 1 }]} simulado={{ _id: 's1', bimestre: 1, numero: 1 }} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Simulado'), { target: { value: 's2' } });
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('reiniciará') }));
  });
});
