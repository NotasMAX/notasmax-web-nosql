import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MateriaListar from './MateriaListar';
import { listarMaterias } from '../api/materiaApi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/materiaApi', () => ({ listarMaterias: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('../components/Pagination', () => ({ default: ({ currentPage, totalPages, onPageChange }) => <div><span>Página {currentPage} de {totalPages}</span><button onClick={() => onPageChange(currentPage + 1)}>Próxima</button></div> }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('MateriaListar', () => {
  beforeEach(() => { vi.clearAllMocks(); useToast.mockReturnValue({ toast: { current: null } }); window.scrollTo = vi.fn(); });

  it('mostra as matérias e navega para edição', async () => {
    listarMaterias.mockResolvedValue({ data: { materias: [{ _id: 'm1', nome: 'Biologia' }] } });
    render(<MemoryRouter initialEntries={['/Materias']}><Routes><Route path="/Materias" element={<MateriaListar />} /><Route path="/Materias/Editar/:id" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Biologia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar matéria' }));
    expect(await screen.findByText('Destino: /Materias/Editar/m1')).toBeInTheDocument();
  });

  it('mostra estado vazio e estado de erro da consulta', async () => {
    listarMaterias.mockResolvedValueOnce({ data: { materias: [] } });
    const { unmount } = render(<MemoryRouter><MateriaListar /></MemoryRouter>);
    expect(await screen.findByText('Nenhuma matéria encontrada.')).toBeInTheDocument();
    unmount();
    listarMaterias.mockRejectedValueOnce(new Error('offline'));
    render(<MemoryRouter><MateriaListar /></MemoryRouter>);
    expect(await screen.findByText('Erro ao carregar matérias.')).toBeInTheDocument();
  });
});
