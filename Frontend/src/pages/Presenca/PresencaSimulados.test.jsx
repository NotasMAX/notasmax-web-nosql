import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PresencaSimulados from './PresencaSimulados';
import { getOne } from '../../api/turmasapi.js';
import { getSimuladosByTurma } from '../../api/simuladoApi.js';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

vi.mock('primereact/skeleton', async () => {
  const React = await import('react');
  return { Skeleton: () => React.createElement('div', { 'data-testid': 'skeleton' }) };
});

vi.mock('../../api/turmasapi.js', () => ({ getOne: vi.fn() }));
vi.mock('../../api/simuladoApi.js', () => ({ getSimuladosByTurma: vi.fn() }));

// Fora de ordem de propósito: a tela deve ordenar por bimestre e depois por número
const simulados = [
  { _id: 's3', numero: 1, bimestre: 2, tipo: 'Dissertativo', data_realizacao: '2026-05-10T12:00:00' },
  { _id: 's2', numero: 2, bimestre: 1, tipo: 'Objetivo', data_realizacao: '2026-03-20T12:00:00' },
  { _id: 's1', numero: 1, bimestre: 1, tipo: 'Objetivo', data_realizacao: '2026-02-10T12:00:00' },
];

function mockApi({ turma = { ano: 2026, serie: 3 }, lista = simulados } = {}) {
  getOne.mockResolvedValue({ data: { turma } });
  getSimuladosByTurma.mockResolvedValue({ data: { simulados: lista } });
}

function renderTela(rota = '/presenca/turma/t1') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/presenca/turma/:turmaId" element={<PresencaSimulados />} />
        <Route path="/" element={<PresencaSimulados />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PresencaSimulados', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('define o título da página', async () => {
    mockApi();
    renderTela();
    await screen.findAllByRole('button', { name: /Simulado Nº/ });
    expect(document.title).toBe('NotasMAX - Simulados da turma');
  });

  it('mostra skeletons enquanto carrega', () => {
    getOne.mockReturnValue(new Promise(() => {}));
    getSimuladosByTurma.mockReturnValue(new Promise(() => {}));
    renderTela();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
  });

  it('busca a turma e os simulados pelo id da rota', async () => {
    mockApi();
    renderTela();
    await screen.findAllByRole('button', { name: /Simulado Nº/ });

    expect(getOne).toHaveBeenCalledWith('t1');
    expect(getSimuladosByTurma).toHaveBeenCalledWith('t1');
  });

  it('não busca nada quando a rota não tem id de turma', () => {
    renderTela('/');
    expect(getOne).not.toHaveBeenCalled();
    expect(getSimuladosByTurma).not.toHaveBeenCalled();
  });

  it('mostra o ano e a série da turma no breadcrumb', async () => {
    mockApi();
    renderTela();
    expect(await screen.findByText('Presença > 2026 > 3º Ano')).toBeInTheDocument();
  });

  it('lista os simulados ordenados por bimestre e número', async () => {
    mockApi();
    renderTela();

    const botoes = await screen.findAllByRole('button', { name: /Simulado Nº/ });

    expect(botoes).toHaveLength(3);
    expect(botoes[0]).toHaveTextContent('Simulado Nº 1');
    expect(botoes[0]).toHaveTextContent('1º Bimestre • 10/02/2026');
    expect(botoes[1]).toHaveTextContent('Simulado Nº 2');
    expect(botoes[1]).toHaveTextContent('1º Bimestre • 20/03/2026');
    expect(botoes[2]).toHaveTextContent('Dissertativo');
    expect(botoes[2]).toHaveTextContent('2º Bimestre • 10/05/2026');
  });

  it('filtra os simulados por bimestre', async () => {
    mockApi();
    renderTela();
    await screen.findAllByRole('button', { name: /Simulado Nº/ });

    const filtro = screen.getByLabelText('Filtrar por bimestre');
    const opcoes = [...filtro.querySelectorAll('option')].map((opcao) => opcao.textContent);
    expect(opcoes).toEqual(['Todos', '1º Bimestre', '2º Bimestre']);

    fireEvent.change(filtro, { target: { value: '2' } });

    const botoes = screen.getAllByRole('button', { name: /Simulado Nº/ });
    expect(botoes).toHaveLength(1);
    expect(botoes[0]).toHaveTextContent('Dissertativo');

    fireEvent.change(filtro, { target: { value: 'all' } });
    expect(screen.getAllByRole('button', { name: /Simulado Nº/ })).toHaveLength(3);
  });

  it('navega para a presença do simulado ao clicar nele', async () => {
    mockApi();
    renderTela();

    const botoes = await screen.findAllByRole('button', { name: /Simulado Nº/ });
    fireEvent.click(botoes[0]);

    expect(navigate).toHaveBeenCalledWith('/presenca/turma/t1/simulado/s1');
  });

  it('avisa quando a turma não tem simulados', async () => {
    mockApi({ lista: [] });
    renderTela();
    expect(await screen.findByText('Nenhum simulado lançado para esta turma')).toBeInTheDocument();
  });

  it('trata resposta sem lista de simulados e sem turma', async () => {
    getOne.mockResolvedValue({ data: {} });
    getSimuladosByTurma.mockResolvedValue({ data: {} });
    renderTela();

    expect(await screen.findByText('Nenhum simulado lançado para esta turma')).toBeInTheDocument();
    expect(screen.getByText('Presença')).toBeInTheDocument();
  });

  it('mostra a mensagem de erro devolvida pela API', async () => {
    getOne.mockRejectedValue({ response: { data: { message: 'Falha sintética' } } });
    getSimuladosByTurma.mockResolvedValue({ data: { simulados } });
    renderTela();

    expect(await screen.findByText('Falha sintética')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Simulado Nº/ })).not.toBeInTheDocument();
  });

  it('usa a mensagem padrão quando o erro não traz resposta da API', async () => {
    getOne.mockRejectedValue(new Error('rede'));
    getSimuladosByTurma.mockResolvedValue({ data: { simulados } });
    renderTela();

    expect(await screen.findByText('Não foi possível carregar os simulados desta turma.')).toBeInTheDocument();
  });

  it('recarrega a página ao clicar em "Tentar novamente"', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    getOne.mockRejectedValue(new Error('rede'));
    getSimuladosByTurma.mockResolvedValue({ data: { simulados } });
    renderTela();

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('volta para a tela anterior', async () => {
    mockApi();
    renderTela();
    await screen.findAllByRole('button', { name: /Simulado Nº/ });

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(navigate).toHaveBeenCalledWith(-1);
  });
});
