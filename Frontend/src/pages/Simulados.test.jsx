import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Simulados from './Simulados';
import { findSimuladoByBimestreAnoSerie } from '../api/simuladoApi';

vi.mock('../api/simuladoApi', () => ({ findSimuladoByBimestreAnoSerie: vi.fn() }));
vi.mock('../components/SimuladosPesquisarForm', () => ({ default: ({ initialData }) => <p>Filtro: {initialData.bimestre}/{initialData.ano}/{initialData.serie}</p> }));
vi.mock('../components/SimuladosItem', () => ({ default: ({ simulado }) => <p>Simulado: {simulado.numero}</p> }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));

describe('Simulados', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta o período da rota, preenche o filtro e lista os resultados', async () => {
    findSimuladoByBimestreAnoSerie.mockResolvedValue({ data: { simulados: [{ _id: 's1', numero: 4 }] } });
    render(<MemoryRouter initialEntries={['/Simulados/2/2026/3']}><Routes><Route path="/Simulados/:bimestre/:ano/:serie" element={<Simulados />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Simulado: 4')).toBeInTheDocument();
    expect(findSimuladoByBimestreAnoSerie).toHaveBeenCalledWith('2', '2026', '3');
    expect(screen.getByText('Filtro: 2/2026/3')).toBeInTheDocument();
  });

  it('mostra estado vazio quando a consulta não retorna simulados', async () => {
    findSimuladoByBimestreAnoSerie.mockResolvedValue({ data: { simulados: [] } });
    render(<MemoryRouter initialEntries={['/Simulados/2/2026']}><Routes><Route path="/Simulados/:bimestre/:ano" element={<Simulados />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Nenhum simulado encontrado.')).toBeInTheDocument();
  });
});
