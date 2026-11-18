import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AlunoDesempenho from './AlunoDesempenho';
import { getDesempenhoAluno } from '../api/usuariosapi';

vi.mock('../api/usuariosapi', () => ({ getDesempenhoAluno: vi.fn() }));
vi.mock('react-apexcharts', () => ({ default: ({ series }) => <div aria-label="gráfico">{series[0].data.join(',')}</div> }));

describe('AlunoDesempenho', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega dados do aluno e atualiza a consulta ao mudar o ano', async () => {
    getDesempenhoAluno.mockResolvedValue({ data: { alunoNome: 'Ana', turmaNome: '2º EM', turmasDoAluno: [{ id: 't1', serie: 2, ano: 2025 }, { id: 't2', serie: 3, ano: 2026 }], desempenho: [{ bimestre: 1, media: 8 }, { bimestre: 2, media: 7 }] } });
    render(<MemoryRouter initialEntries={['/Usuarios/Aluno/a1/desempenho']}><Routes><Route path="/Usuarios/Aluno/:id/desempenho" element={<AlunoDesempenho />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('8,7')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    await waitFor(() => expect(getDesempenhoAluno).toHaveBeenLastCalledWith('a1', 2026, undefined));
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '2025' } });
    await waitFor(() => expect(getDesempenhoAluno).toHaveBeenLastCalledWith('a1', 2025, undefined));
  });
});
