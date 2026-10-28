import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TurmaAcertosPorMateria from './TurmasAcertosPorMateria';
import { getDesempenhoMaterias } from '../api/turmasapi';

vi.mock('../api/turmasapi', () => ({ getDesempenhoMaterias: vi.fn() }));
vi.mock('react-apexcharts', () => ({ default: ({ series }) => <div aria-label="gráfico">{series[0].data.join(',')}</div> }));

describe('TurmaAcertosPorMateria', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta novamente ao selecionar outro bimestre e mostra as médias retornadas', async () => {
    getDesempenhoMaterias.mockResolvedValue({ data: { turma: { serie: 3 }, materias: [{ nome: 'Física', media: 8.2 }] } });
    render(<MemoryRouter initialEntries={['/Turma/t1/desempenho-materias']}><Routes><Route path="/Turma/:id/desempenho-materias" element={<TurmaAcertosPorMateria />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('8.2')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
    await waitFor(() => expect(getDesempenhoMaterias).toHaveBeenLastCalledWith('t1', 4));
  });
});
