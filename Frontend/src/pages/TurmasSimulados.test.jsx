import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import TurmasSimulados from './TurmasSimulados';
import { getByTurma } from '../api/simuladoApi';
import { getOne } from '../api/turmasapi';

vi.mock('../api/simuladoApi.js', () => ({ getByTurma: vi.fn(), getAll: vi.fn() }));
vi.mock('../api/turmasapi.js', () => ({ getOne: vi.fn() }));
vi.mock('../components/BimestreSections.jsx', () => ({ default: ({ simulados }) => <div>{simulados.map((s) => <p key={s._id}>Simulado {s.numero} - bimestre {s.bimestre}</p>)}</div> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('TurmasSimulados', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega a turma, exibe simulados e filtra por bimestre', async () => {
    getOne.mockResolvedValue({ data: { turma: { _id: 't1', ano: 2026, serie: 2 } } });
    getByTurma.mockResolvedValue({ data: { simulados: [{ _id: 's1', numero: 1, bimestre: 1 }, { _id: 's2', numero: 2, bimestre: 2 }] } });
    render(<MemoryRouter initialEntries={['/Turmas/t1/Simulados']}><Routes><Route path="/Turmas/:id/Simulados" element={<TurmasSimulados />} /><Route path="/Turmas/:id/Simulados/Notas/" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Turma 2º EM - Ano 2026')).toBeInTheDocument();
    expect(screen.getByText('Simulado 1 - bimestre 1')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(screen.queryByText('Simulado 1 - bimestre 1')).not.toBeInTheDocument();
    expect(screen.getByText('Simulado 2 - bimestre 2')).toBeInTheDocument();
  });

  it('mostra erro de carga ao falhar a chamada de simulados', async () => {
    getOne.mockResolvedValue({ data: { turma: { _id: 't1', ano: 2026, serie: 2 } } });
    getByTurma.mockRejectedValue(new Error('falha')); 
    render(<MemoryRouter initialEntries={['/Turmas/t1/Simulados']}><Routes><Route path="/Turmas/:id/Simulados" element={<TurmasSimulados />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('falha')).toBeInTheDocument();
  });
});
