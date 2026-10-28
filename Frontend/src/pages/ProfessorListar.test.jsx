import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProfessorListar from './ProfessorListar';
import { getProfessores } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ getProfessores: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('../components/Pagination', () => ({ default: ({ currentPage, totalPages, onPageChange }) => <div><span>Página {currentPage} de {totalPages}</span><button onClick={() => onPageChange(currentPage + 1)}>Próxima</button></div> }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('ProfessorListar', () => {
  beforeEach(() => { vi.clearAllMocks(); useToast.mockReturnValue({ toast: { current: null } }); window.scrollTo = vi.fn(); });

  it('ordena os nomes, pagina a lista e navega para visualizar ou editar', async () => {
    getProfessores.mockResolvedValue({ data: [
      { _id: 'p2', nome: 'Zeca', email: 'z@example.test', telefone_contato: '2' },
      { _id: 'p1', nome: 'Ana', email: 'a@example.test', telefone_contato: '1' },
      { _id: 'p3', nome: 'Caio', email: 'c@example.test', telefone_contato: '3' },
      { _id: 'p4', nome: 'Dora', email: 'd@example.test', telefone_contato: '4' },
      { _id: 'p5', nome: 'Eli', email: 'e@example.test', telefone_contato: '5' },
      { _id: 'p6', nome: 'Fê', email: 'f@example.test', telefone_contato: '6' },
    ] });
    render(<MemoryRouter initialEntries={['/Professores']}><Routes><Route path="/Professores" element={<ProfessorListar />} /><Route path="/Professores/Visualizar/:id" element={<Destination />} /><Route path="/Professores/Editar/:id" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('row', { name: /Ana/ })).getByRole('button', { name: 'Visualizar professor' }));
    expect(await screen.findByText('Destino: /Professores/Visualizar/p1')).toBeInTheDocument();
  });

  it('mostra estado vazio ou falha da consulta', async () => {
    getProfessores.mockResolvedValueOnce({ data: [] });
    const { unmount } = render(<MemoryRouter><ProfessorListar /></MemoryRouter>);
    expect(await screen.findByText('Nenhum professor encontrado.')).toBeInTheDocument();
    unmount();
    getProfessores.mockRejectedValueOnce(new Error('offline'));
    render(<MemoryRouter><ProfessorListar /></MemoryRouter>);
    expect(await screen.findByText('Erro ao carregar professores.')).toBeInTheDocument();
  });
});
