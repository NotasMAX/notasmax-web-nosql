import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Turmas from './Turmas';
import { getTurmasPorAno } from '../api/turmasapi';

vi.mock('../api/turmasapi', () => ({ getTurmasPorAno: vi.fn() }));
vi.mock('../components/TurmasPesquisarForm', () => ({ default: ({ onSubmit, initialData }) => <><span>Ano inicial: {initialData.ano}</span><button onClick={() => onSubmit({ ano: 2025 })}>Pesquisar ano</button></> }));
vi.mock('../components/TurmaItem', () => ({ default: ({ turma }) => <p>Turma {turma.serie}º ({turma.ano})</p> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('primereact/skeleton', () => ({ Skeleton: () => <div>Carregando cartão</div> }));
function Destination() { return <p>Rota: {useLocation().pathname}</p>; }

describe('Turmas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta o ano da rota e exibe turmas retornadas', async () => {
    getTurmasPorAno.mockResolvedValue({ data: { turmas: [{ _id: 't1', ano: 2026, serie: 3 }] } });
    render(<MemoryRouter initialEntries={['/Turmas/2026']}><Routes><Route path="/Turmas/:ano" element={<Turmas />} /><Route path="/Turmas/2025" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Turma 3º (2026)')).toBeInTheDocument();
    expect(getTurmasPorAno).toHaveBeenCalledWith(2026);
  });

  it('repete a busca para o ano escolhido pelo formulário', async () => {
    getTurmasPorAno.mockResolvedValue({ data: { turmas: [] } });
    render(<MemoryRouter initialEntries={['/Turmas/2026']}><Routes><Route path="/Turmas/:ano" element={<Turmas />} /><Route path="/Turmas/2025" element={<Destination />} /></Routes></MemoryRouter>);
    await screen.findByText('Nenhuma turma encontrada para o ano fornecido.');
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar ano' }));
    expect(await screen.findByText('Rota: /Turmas/2025')).toBeInTheDocument();
    expect(getTurmasPorAno).toHaveBeenCalledWith(2025);
  });

  it('mostra mensagem se a API falhar', async () => {
    getTurmasPorAno.mockRejectedValue(new Error('falha de consulta'));
    render(<MemoryRouter initialEntries={['/Turmas/2026']}><Routes><Route path="/Turmas/:ano" element={<Turmas />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Nenhuma turma encontrada para o ano fornecido.')).toBeInTheDocument();
  });
});
