import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TurmasForm from './TurmasForm.jsx';

describe('TurmasForm', () => {
  it('blocks submission until series and year are selected', () => {
    const onSubmit = vi.fn();
    const { container } = render(<MemoryRouter><TurmasForm onSubmit={onSubmit} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Turma' }));
    expect(container.querySelector('#input_serie')).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits selected values and displays a server response message', () => {
    const onSubmit = vi.fn();
    const { container } = render(<MemoryRouter><TurmasForm onSubmit={onSubmit} response={{ message: 'Turma já cadastrada' }} /></MemoryRouter>);
    fireEvent.change(container.querySelector('#input_serie'), { target: { value: '2' } });
    fireEvent.change(container.querySelector('#input_ano'), { target: { value: '2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Turma' }));
    expect(screen.getByText('Turma já cadastrada')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({ serie: '2', ano: '2026' });
  });
});
