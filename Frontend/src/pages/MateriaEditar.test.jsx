import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MateriaEditar from './MateriaEditar';
import { editarMateria, getMateriaById } from '../api/materiaApi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/materiaApi', () => ({ editarMateria: vi.fn(), getMateriaById: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../components/MateriaForm', () => ({ default: ({ initialData, onSubmit }) => <><p>Editar {initialData.nome}</p><button onClick={() => onSubmit({ nome: 'Matemática II' })}>Salvar matéria</button></> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('MateriaEditar', () => {
  const showError = vi.fn(); const showSuccessOnRedirect = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); useToast.mockReturnValue({ toast: { current: null }, showError, showSuccessOnRedirect }); });

  it('carrega dados e envia alterações para o ID consultado', async () => {
    getMateriaById.mockResolvedValue({ data: { nome: 'Matemática' } }); editarMateria.mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/Materias/Editar/m1']}><Routes><Route path="/Materias/Editar/:id" element={<MateriaEditar />} /><Route path="/Materias" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Editar Matemática')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar matéria' }));
    await waitFor(() => expect(editarMateria).toHaveBeenCalledWith('m1', { nome: 'Matemática II' }));
    expect(showSuccessOnRedirect).toHaveBeenCalledWith('Matéria atualizada com sucesso!');
    expect(await screen.findByText('Destino: /Materias')).toBeInTheDocument();
  });

  it('mostra erro ao falhar o carregamento da matéria', async () => {
    getMateriaById.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter initialEntries={['/Materias/Editar/m1']}><Routes><Route path="/Materias/Editar/:id" element={<MateriaEditar />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Erro ao carregar matéria.')).toBeInTheDocument();
    expect(showError).toHaveBeenCalledWith('Erro ao carregar matéria.');
  });

  it('trata ID ausente', async () => {
    render(<MemoryRouter><MateriaEditar /></MemoryRouter>);
    expect(await screen.findByText('ID de matéria inválido.')).toBeInTheDocument();
    expect(getMateriaById).not.toHaveBeenCalled();
  });
});
