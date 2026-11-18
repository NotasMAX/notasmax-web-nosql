import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SimuladosCadastrar from './SimuladosCadastrar';
import { cadastrarSimulado } from '../api/simuladoApi';
import { getOne } from '../api/turmasapi';

vi.mock('../api/simuladoApi', () => ({ cadastrarSimulado: vi.fn() }));
vi.mock('../api/turmasapi', () => ({ getOne: vi.fn() }));
vi.mock('../components/SimuladosForm', () => ({ default: ({ onSubmit, response }) => <><button onClick={() => onSubmit({ turma_id: 't1', bimestre: 2 })}>Criar simulado</button>{response?.message && <p>{response.message}</p>}</> }));
function Destination() { const location = useLocation(); return <p>Destino: {location.pathname} - {location.state?.type}</p>; }

describe('SimuladosCadastrar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('salva o simulado e usa a turma para construir a rota do período', async () => {
    cadastrarSimulado.mockResolvedValue({ data: { message: 'Criado' } });
    getOne.mockResolvedValue({ data: { turma: { ano: 2026, serie: 2 } } });
    render(<MemoryRouter initialEntries={['/Simulados/Cadastrar']}><Routes><Route path="/Simulados/Cadastrar" element={<SimuladosCadastrar />} /><Route path="/Simulados/:bimestre/:ano/:serie" element={<Destination />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Criar simulado' }));
    await waitFor(() => expect(cadastrarSimulado).toHaveBeenCalledWith({ turma_id: 't1', bimestre: 2 }));
    expect(getOne).toHaveBeenCalledWith('t1');
    expect(await screen.findByText('Destino: /Simulados/2/2026/2 - success')).toBeInTheDocument();
  });

  it('exibe mensagem de erro devolvida pela API', async () => {
    cadastrarSimulado.mockRejectedValue({ response: { data: { message: 'Dados inválidos' } } });
    render(<MemoryRouter><SimuladosCadastrar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Criar simulado' }));
    expect(await screen.findByText('Dados inválidos')).toBeInTheDocument();
  });
});
