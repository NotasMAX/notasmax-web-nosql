import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProfessorCadastrar from './ProfessorCadastrar';
import { createProfessor } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ createProfessor: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/ProfessorForm', () => ({ default: ({ onSubmit }) => <button onClick={() => onSubmit({ nome: 'Prof. Ana' })}>Enviar formulário</button> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('ProfessorCadastrar', () => {
  const showError = vi.fn();
  const showSuccessOnRedirect = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect }); });

  it('cria professor e navega para a lista após sucesso', async () => {
    createProfessor.mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/Professores/Cadastrar']}><Routes><Route path="/Professores/Cadastrar" element={<ProfessorCadastrar />} /><Route path="/Professores" element={<Destination />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));
    await waitFor(() => expect(createProfessor).toHaveBeenCalledWith({ nome: 'Prof. Ana' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Professor cadastrado com sucesso!');
    expect(await screen.findByText('Destino: /Professores')).toBeInTheDocument();
  });

  it('exibe erro retornado pela API', async () => {
    createProfessor.mockRejectedValue({ response: { data: { error: 'E-mail inválido' } } });
    render(<MemoryRouter><ProfessorCadastrar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar formulário' }));
    await waitFor(() => expect(showError).toHaveBeenCalledWith('E-mail inválido'));
  });
});
