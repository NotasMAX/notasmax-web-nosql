import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { confirmDialog } from 'primereact/confirmdialog';
import SimuladosDisciplinaItem from './SimuladosDisciplinaItem.jsx';

vi.mock('primereact/confirmdialog', () => ({ confirmDialog: vi.fn() }));

describe('SimuladosDisciplinaItem', () => {
  const disciplina = { turma_disciplina_id: 'td-1', materia: { nome: 'Química' }, professor: { nome: 'Mila' }, quantidade_questoes: 15, peso: 30 };

  it('shows the discipline inputs and reports changed values', () => {
    const onUpdate = vi.fn();
    render(<SimuladosDisciplinaItem disciplina={disciplina} onUpdate={onUpdate} />);
    expect(screen.getByText('Química')).toBeInTheDocument();
    expect(screen.getByText('Mila')).toBeInTheDocument();
    const [questions, weight] = screen.getAllByRole('spinbutton');
    expect(questions).toHaveValue(15);
    expect(weight).toHaveValue(30);
    fireEvent.change(weight, { target: { value: '40' } });
    expect(onUpdate).toHaveBeenCalledWith('td-1', expect.objectContaining({ peso: '40', quantidade_questoes: 15 }));
  });

  it('opens a confirmation before requesting deletion', () => {
    const removeDisciplina = vi.fn();
    render(<SimuladosDisciplinaItem disciplina={disciplina} removeDisciplina={removeDisciplina} />);
    fireEvent.click(screen.getByRole('button'));
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Deseja excluir esta disciplina do simulado?',
      acceptLabel: 'Sim', rejectLabel: 'Não',
    }));
    expect(removeDisciplina).not.toHaveBeenCalled();
  });
});
