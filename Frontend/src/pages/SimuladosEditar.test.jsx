import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SimuladosEditar from './SimuladosEditar';
import { getOneSimple, updateSimulado } from '../api/simuladoApi';
import { getOne } from '../api/turmasapi';

vi.mock('../api/simuladoApi', () => ({ getOneSimple: vi.fn(), updateSimulado: vi.fn() }));
vi.mock('../api/turmasapi', () => ({ getOne: vi.fn() }));
vi.mock('../components/SimuladosEditarForm', () => ({ default: ({ simulado, onSubmit }) => <><p>Editar simulado {simulado.numero}</p><button onClick={() => onSubmit({ bimestre: 3 })}>Salvar simulado</button></> }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
const editable = { _id: 's1', numero: 7, createdAt: new Date().toISOString(), turma_id: 't1' };

describe('SimuladosEditar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega e salva simulado ainda editável', async () => {
    getOneSimple.mockResolvedValue({ data: { simulado: editable } });
    updateSimulado.mockResolvedValue({ data: { message: 'Atualizado' } });
    getOne.mockResolvedValue({ data: { turma: { ano: 2026, serie: 2 } } });
    render(<MemoryRouter initialEntries={['/Simulados/Editar/s1']}><Routes><Route path="/Simulados/Editar/:id" element={<SimuladosEditar />} /><Route path="/Simulados/:bi/:ano/:serie" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Editar simulado 7')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar simulado' }));
    await waitFor(() => expect(updateSimulado).toHaveBeenCalledWith('s1', { bimestre: 3 }));
    expect(await screen.findByText('Destino: /Simulados/3/2026/2')).toBeInTheDocument();
  });

  it('redireciona para a lista quando o registro passou do prazo editável', async () => {
    getOneSimple.mockResolvedValue({ data: { simulado: { ...editable, createdAt: '2020-01-01T00:00:00.000Z' } } });
    render(<MemoryRouter initialEntries={['/Simulados/Editar/s1']}><Routes><Route path="/Simulados/Editar/:id" element={<SimuladosEditar />} /><Route path="/Simulados/" element={<p>Lista de simulados</p>} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Lista de simulados')).toBeInTheDocument();
  });
});
