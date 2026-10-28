import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MateriasCadastrar from './MateriaCadastrar';
import { cadastrarMateria } from '../api/materiaApi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/materiaApi', () => ({ cadastrarMateria: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/MateriaForm', () => ({ default: ({ onSubmit }) => <button onClick={() => onSubmit({ nome: 'Matemática' })}>Enviar matéria</button> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('MateriasCadastrar', () => {
  const showError = vi.fn(); const showSuccessOnRedirect = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect }); });

  it('cadastra e navega para a lista', async () => {
    cadastrarMateria.mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/Materias/Cadastrar']}><Routes><Route path="/Materias/Cadastrar" element={<MateriasCadastrar />} /><Route path="/Materias" element={<Destination />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar matéria' }));
    await waitFor(() => expect(cadastrarMateria).toHaveBeenCalledWith({ nome: 'Matemática' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Matéria cadastrada com sucesso!');
    expect(await screen.findByText('Destino: /Materias')).toBeInTheDocument();
  });

  it('apresenta mensagem de duplicidade da API', async () => {
    cadastrarMateria.mockRejectedValue({ response: { status: 409, data: { error: 'Matéria já cadastrada' } } });
    render(<MemoryRouter><MateriasCadastrar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar matéria' }));
    await waitFor(() => expect(showError).toHaveBeenCalledWith('Matéria já cadastrada'));
  });

  it('usa mensagem genérica para outros erros', async () => {
    cadastrarMateria.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><MateriasCadastrar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar matéria' }));
    await waitFor(() => expect(showError).toHaveBeenCalledWith('Erro ao criar a matéria.'));
  });
});
