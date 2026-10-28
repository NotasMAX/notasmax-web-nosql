import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AlunoForm from './AlunoForm.jsx';

const renderForm = (props = {}) => render(
  <MemoryRouter><AlunoForm onSubmit={vi.fn()} {...props} /></MemoryRouter>,
);

describe('AlunoForm', () => {
  it('shows required-field errors and does not submit an empty form', () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getAllByText('Campo obrigatório')).toHaveLength(3);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates email and submits trimmed student details', () => {
    const onSubmit = vi.fn();
    const { container } = renderForm({ onSubmit });
    fireEvent.change(container.querySelector('[name="nome"]'), { target: { value: '  Ana Lima  ' } });
    fireEvent.change(container.querySelector('[name="email"]'), { target: { value: 'ana@example.com' } });
    fireEvent.change(container.querySelector('[name="telefone_contato"]'), { target: { value: '  12345  ' } });
    fireEvent.change(container.querySelector('[name="nome_responsavel"]'), { target: { value: '  Maria  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Ana Lima', email: 'ana@example.com', telefone_contato: '12345',
      nome_responsavel: 'Maria', tipo_usuario: 'aluno',
    }));
  });

  it('renders initial values read-only when editing is disabled', () => {
    const { container } = renderForm({ initialData: { nome: 'Ana', email: 'ana@example.com', telefone_contato: '123' }, isEditMode: false });
    expect(container.querySelector('[name="nome"]')).toHaveValue('Ana');
    expect(container.querySelector('[name="nome"]')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });
});
