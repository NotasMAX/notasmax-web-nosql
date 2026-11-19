import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PresencaTurmas from './PresencaTurmas';
import { getAllTurmas, getTurmasPorAno } from '../../api/turmasapi.js';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

vi.mock('primereact/skeleton', async () => {
  const React = await import('react');
  return { Skeleton: () => React.createElement('div', { 'data-testid': 'skeleton' }) };
});

vi.mock('../../api/turmasapi.js', () => ({
  getAllTurmas: vi.fn(),
  getTurmasPorAno: vi.fn(),
}));

const anoAtual = new Date().getFullYear();
const turmasDoAno = [
  { _id: 't1', ano: anoAtual, serie: 3, alunos: ['a1', 'a2'] },
  { _id: 't2', ano: anoAtual, serie: 2 },
];

function mockApi({ anos = [anoAtual, anoAtual - 1], turmas = turmasDoAno } = {}) {
  getAllTurmas.mockResolvedValue({ data: { turmas: anos.map((ano) => ({ ano })) } });
  getTurmasPorAno.mockResolvedValue({ data: { turmas } });
}

function renderTela() {
  return render(
    <MemoryRouter>
      <PresencaTurmas />
    </MemoryRouter>
  );
}

describe('PresencaTurmas', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('define o título da página', async () => {
    mockApi();
    renderTela();
    await screen.findByText('3º Ano');
    expect(document.title).toBe('NotasMAX - Lançamento de presença');
  });

  it('mostra skeletons enquanto carrega', () => {
    getAllTurmas.mockReturnValue(new Promise(() => {}));
    renderTela();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
  });

  it('lista as turmas do ano com série e quantidade de alunos', async () => {
    mockApi();
    renderTela();

    expect(await screen.findByText('3º Ano')).toBeInTheDocument();
    expect(screen.getByText('2º Ano')).toBeInTheDocument();
    expect(screen.getByText('2 alunos')).toBeInTheDocument();
    expect(screen.getByText('0 alunos')).toBeInTheDocument();
    expect(getTurmasPorAno).toHaveBeenCalledWith(anoAtual);
  });

  it('oferece os anos que têm turma cadastrada', async () => {
    mockApi();
    renderTela();
    await screen.findByText('3º Ano');

    const opcoes = screen.getByLabelText('Ano').querySelectorAll('option');
    expect([...opcoes].map((opcao) => opcao.textContent)).toEqual([String(anoAtual), String(anoAtual - 1)]);
  });

  it('navega para os simulados da turma ao clicar no card', async () => {
    mockApi();
    renderTela();

    fireEvent.click(await screen.findByRole('button', { name: /3º Ano/ }));

    expect(navigate).toHaveBeenCalledWith('/presenca/turma/t1');
  });

  it('carrega as turmas do ano escolhido no filtro', async () => {
    mockApi();
    renderTela();
    await screen.findByText('3º Ano');

    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: String(anoAtual - 1) } });

    await waitFor(() => expect(getTurmasPorAno).toHaveBeenLastCalledWith(anoAtual - 1));
  });

  it('usa o ano atual quando não há turmas cadastradas', async () => {
    mockApi({ anos: [], turmas: [] });
    renderTela();

    expect(await screen.findByText(`Nenhuma turma cadastrada em ${anoAtual}`)).toBeInTheDocument();
    expect(getTurmasPorAno).toHaveBeenCalledWith(anoAtual);
  });

  it('usa o ano atual quando a lista de anos falha', async () => {
    getAllTurmas.mockRejectedValue(new Error('falha sintética'));
    getTurmasPorAno.mockResolvedValue({ data: { turmas: turmasDoAno } });
    renderTela();

    expect(await screen.findByText('3º Ano')).toBeInTheDocument();
    expect(getTurmasPorAno).toHaveBeenCalledWith(anoAtual);
  });

  it('mostra a mensagem de erro devolvida pela API', async () => {
    getAllTurmas.mockResolvedValue({ data: { turmas: [{ ano: anoAtual }] } });
    getTurmasPorAno.mockRejectedValue({ response: { data: { message: 'Falha sintética' } } });
    renderTela();

    expect(await screen.findByText('Falha sintética')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('usa a mensagem padrão quando o erro não traz resposta da API', async () => {
    getAllTurmas.mockResolvedValue({ data: { turmas: [{ ano: anoAtual }] } });
    getTurmasPorAno.mockRejectedValue(new Error('rede'));
    renderTela();

    expect(await screen.findByText('Não foi possível carregar as turmas.')).toBeInTheDocument();
  });

  it('tenta carregar de novo ao clicar em "Tentar novamente"', async () => {
    getAllTurmas.mockResolvedValue({ data: { turmas: [{ ano: anoAtual }] } });
    getTurmasPorAno
      .mockRejectedValueOnce({ response: { data: { message: 'Falha sintética' } } })
      .mockRejectedValueOnce(new Error('ainda falhando'));
    renderTela();

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(getTurmasPorAno).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Não foi possível carregar as turmas.')).toBeInTheDocument();
  });

  it('volta para a tela anterior', async () => {
    mockApi();
    renderTela();
    await screen.findByText('3º Ano');

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(navigate).toHaveBeenCalledWith(-1);
  });
});
