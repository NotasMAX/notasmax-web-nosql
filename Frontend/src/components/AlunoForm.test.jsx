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
    }), null);
  });

  it('submits the chosen photo apart from the data, without the photo date', () => {
    URL.createObjectURL = vi.fn(() => 'blob:previa');
    URL.revokeObjectURL = vi.fn();
    const onSubmit = vi.fn();
    const foto = new File(['foto'], 'foto.png', { type: 'image/png' });
    renderForm({
      onSubmit,
      fotosDisponiveis: true,
      fotoAtual: '/Usuarios/a1/Foto?v=1',
      initialData: { nome: 'Ana', email: 'ana@example.com', telefone_contato: '123', foto_atualizada_em: '2026-11-15' },
    });

    fireEvent.change(screen.getByLabelText('Trocar foto'), { target: { files: [foto] } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const [dados, enviada] = onSubmit.mock.calls[0];
    expect(enviada).toBe(foto);
    expect(dados).not.toHaveProperty('foto_atualizada_em');
    expect(dados).toMatchObject({ nome: 'Ana', tipo_usuario: 'aluno' });
  });

  it('keeps the photo upload off until the server says it works', () => {
    renderForm();
    expect(screen.getByLabelText('Escolher foto')).toBeDisabled();
  });

  it('renders initial values read-only when editing is disabled', () => {
    const { container } = renderForm({ initialData: { nome: 'Ana', email: 'ana@example.com', telefone_contato: '123' }, isEditMode: false });
    expect(container.querySelector('[name="nome"]')).toHaveValue('Ana');
    expect(container.querySelector('[name="nome"]')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Escolher foto')).not.toBeInTheDocument();
  });
});
