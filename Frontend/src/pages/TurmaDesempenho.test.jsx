import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import TurmaDesempenho from './TurmaDesempenho';
import { getDesempenhoTurma } from '../api/turmasapi';

vi.mock('../api/turmasapi', () => ({ getDesempenhoTurma: vi.fn() }));
vi.mock('react-apexcharts', () => ({ default: ({ options, series }) => <div aria-label="gráfico">{series[0].data.join(',')} | {options.xaxis.categories.join(',')}</div> }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('TurmaDesempenho', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preenche os quatro bimestres e muda o período destacado', async () => {
    getDesempenhoTurma.mockResolvedValue({ data: { turma: { serie: 2 }, desempenho: [{ bimestre: 2, media: 7.5 }] } });
    render(<MemoryRouter initialEntries={['/Turma/t1/desempenho']}><Routes><Route path="/Turma/:id/desempenho" element={<TurmaDesempenho />} /><Route path="/back" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByLabelText('gráfico')).toHaveTextContent('0,7.5,0,0');
    expect(screen.getByText((_, node) => node?.textContent === 'Turma: 2º EM')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(getDesempenhoTurma).toHaveBeenCalledWith('t1');
  });

  it('mantém a visualização disponível quando a consulta falha', async () => {
    getDesempenhoTurma.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter initialEntries={['/Turma/t1/desempenho']}><Routes><Route path="/Turma/:id/desempenho" element={<TurmaDesempenho />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('0,0,0,0 | 1º Bi,2º Bi,3º Bi,4º Bi')).toBeInTheDocument();
  });
});
