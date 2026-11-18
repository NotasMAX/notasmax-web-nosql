import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import BimestreAtual from './BimestreAtual.jsx';
import TurmasPesquisaForm from './TurmasPesquisarForm.jsx';
import RecuperarSenhaForm from './RecuperarSenhaForm.jsx';

describe('BimestreAtual', () => {
  it('renders the supplied period without making a time-service request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<BimestreAtual bimestre={3} ano={2026} />);
    expect(screen.getByText('3º Bimestre - 2026')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('TurmasPesquisaForm', () => {
  it('sends the selected year as a number', () => {
    const onSubmit = vi.fn();
    render(<MemoryRouter><TurmasPesquisaForm initialData={{ ano: 2025 }} onSubmit={onSubmit} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2026' } });
    expect(onSubmit).toHaveBeenCalledWith({ ano: 2026 });
  });
});

describe('RecuperarSenhaForm', () => {
  it('submits the email entered for password recovery', () => {
    const onSubmit = vi.fn();
    render(<RecuperarSenhaForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('exemplo@email.com'), { target: { value: 'aluno@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Link' }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'aluno@example.com' });
  });
});
