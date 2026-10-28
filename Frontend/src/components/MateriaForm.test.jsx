import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MateriasForm from './MateriaForm.jsx';

describe('MateriasForm', () => {
  it('shows an inline error for a blank name and clears it as the user types', () => {
    const { container } = render(<MemoryRouter><MateriasForm onSubmit={vi.fn()} /></MemoryRouter>);
    fireEvent.submit(container.querySelector('form'));
    expect(container.querySelector('#nomeError')).toHaveTextContent('Campo Obrigatório');
    fireEvent.change(container.querySelector('[name="nome"]'), { target: { value: 'Matemática' } });
    expect(container.querySelector('#nomeError').textContent).toBe(' ');
  });

  it('trims the subject name before calling submit', () => {
    const onSubmit = vi.fn();
    const { container } = render(<MemoryRouter><MateriasForm onSubmit={onSubmit} /></MemoryRouter>);
    fireEvent.change(container.querySelector('[name="nome"]'), { target: { value: '  Matemática  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith({ nome: 'Matemática' });
  });
});
