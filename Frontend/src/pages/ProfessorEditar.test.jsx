import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProfessorEditar from './ProfessorEditar';
import { getUsuario, updateUsuario } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn(), updateUsuario: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/ProfessorForm', () => ({ default: ({ initialData, onSubmit }) => <><p>Formulário de {initialData.nome}</p><button onClick={() => onSubmit({ nome: 'Prof. Ana 2' })}>Salvar professor</button></> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('ProfessorEditar', () => {
  const showError = vi.fn();
  const showSuccessOnRedirect = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect }); });

  it('carrega o professor e envia atualizações com o ID atual', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Prof. Ana' } });
    updateUsuario.mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/Professores/Editar/p1']}><Routes><Route path="/Professores/Editar/:id" element={<ProfessorEditar />} /><Route path="/Professores" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Formulário de Prof. Ana')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar professor' }));
    await waitFor(() => expect(updateUsuario).toHaveBeenCalledWith('p1', { nome: 'Prof. Ana 2' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Professor atualizado com sucesso!');
    expect(await screen.findByText('Destino: /Professores')).toBeInTheDocument();
  });

  it('mostra erro caso não consiga carregar o professor', async () => {
    getUsuario.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter initialEntries={['/Professores/Editar/p1']}><Routes><Route path="/Professores/Editar/:id" element={<ProfessorEditar />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Erro ao carregar professor.')).toBeInTheDocument();
    expect(showError).toHaveBeenCalledWith('Erro ao carregar professor.');
  });
});
