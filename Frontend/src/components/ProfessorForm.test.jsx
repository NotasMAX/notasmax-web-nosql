import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProfessorForm from './ProfessorForm.jsx';

describe('ProfessorForm', () => {
  it('reports missing fields and rejects an invalid email', () => {
    const onSubmit = vi.fn();
    const { container } = render(<MemoryRouter><ProfessorForm onSubmit={onSubmit} /></MemoryRouter>);
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getAllByText('Campo obrigatório')).toHaveLength(3);

    fireEvent.change(container.querySelector('[name="nome"]'), { target: { value: 'João' } });
    fireEvent.change(container.querySelector('[name="email"]'), { target: { value: 'email-invalido' } });
    fireEvent.change(container.querySelector('[name="telefone_contato"]'), { target: { value: '999' } });
    fireEvent.submit(container.querySelector('form'));

    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalized professor data', () => {
    const onSubmit = vi.fn();
    const { container } = render(<MemoryRouter><ProfessorForm onSubmit={onSubmit} /></MemoryRouter>);
    fireEvent.change(container.querySelector('[name="nome"]'), { target: { value: '  João Silva  ' } });
    fireEvent.change(container.querySelector('[name="email"]'), { target: { value: ' joao@example.com ' } });
    fireEvent.change(container.querySelector('[name="telefone_contato"]'), { target: { value: ' 555 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ nome: 'João Silva', email: 'joao@example.com', telefone_contato: '555', tipo_usuario: 'professor' }));
  });
});
