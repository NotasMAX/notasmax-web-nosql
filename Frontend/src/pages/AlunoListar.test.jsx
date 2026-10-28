import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AlunoListar from './AlunoListar';
import { getAlunos } from '../api/usuariosapi';
import { useToast } from '../hooks/useToast';

vi.mock('../api/usuariosapi', () => ({ getAlunos: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('../components/Pagination', () => ({ default: ({ currentPage, totalPages, onPageChange }) => <div><span>Página {currentPage} de {totalPages}</span><button onClick={() => onPageChange(currentPage + 1)}>Próxima</button></div> }));

function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
const alunos = Array.from({ length: 6 }, (_, index) => ({ _id: `a${index + 1}`, nome: `Aluno ${index + 1}`, email: `a${index + 1}@example.test`, telefone_contato: '111' }));

describe('AlunoListar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ toast: { current: null } });
    window.scrollTo = vi.fn();
  });

  it('mostra o estado vazio e mantém a ação de cadastro disponível', async () => {
    getAlunos.mockResolvedValue({ data: [] });
    render(<MemoryRouter><AlunoListar /></MemoryRouter>);
    expect(await screen.findByText('Nenhum aluno encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cadastrar Novo Aluno/ })).toHaveAttribute('href', '/Alunos/Cadastrar');
  });

  it('exibe a primeira página e navega para visualizar ou editar o aluno', async () => {
    getAlunos.mockResolvedValue({ data: alunos });
    render(<MemoryRouter initialEntries={['/Alunos']}><Routes><Route path="/Alunos" element={<AlunoListar />} /><Route path="/Alunos/Visualizar/:id" element={<Destination />} /><Route path="/Alunos/Editar/:id" element={<Destination />} /></Routes></MemoryRouter>);

    expect(await screen.findByText('Aluno 1')).toBeInTheDocument();
    expect(screen.queryByText('Aluno 6')).not.toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    const firstRow = screen.getByRole('row', { name: /Aluno 1/ });
    fireEvent.click(within(firstRow).getByRole('button', { name: 'Visualizar aluno' }));
    expect(await screen.findByText('Destino: /Alunos/Visualizar/a1')).toBeInTheDocument();
  });

  it('mostra erro quando a consulta de alunos falha', async () => {
    getAlunos.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><AlunoListar /></MemoryRouter>);
    expect(await screen.findByText('Erro ao carregar alunos.')).toBeInTheDocument();
  });
});
