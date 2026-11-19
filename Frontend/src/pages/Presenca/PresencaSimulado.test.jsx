import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PresencaSimulado from './PresencaSimulado';
import usePresencaSimulado from '../../hooks/usePresencaSimulado.js';
import { imprimirFolhaQr } from '../../utils/Imprimirfolhaqr.js';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

// A tela depende do hook para dados e ações: aqui ele é substituído por um estado controlado
vi.mock('../../hooks/usePresencaSimulado.js', () => ({ default: vi.fn() }));
vi.mock('../../utils/Imprimirfolhaqr.js', () => ({ imprimirFolhaQr: vi.fn() }));
vi.mock('qrcode.react', async () => {
  const React = await import('react');
  return {
    QRCodeSVG: ({ value }) => React.createElement('svg', { 'data-testid': 'qr-code', 'data-value': value }),
  };
});

const simuladoPadrao = {
  numero: 3,
  tipo: 'Objetivo',
  bimestre: 2,
  data_realizacao: '2026-05-10T12:00:00',
  turma: { serie: 3, ano: 2026 },
};

const qrAtivo = {
  token: 'token-sintetico',
  valido_de: '2026-05-10T08:00:00',
  expira_em: '2026-05-11T08:00:00',
  simulado: { numero: 3, tipo: 'Objetivo' },
};

const alunos = [
  { aluno_id: 'a1', nome: 'Ana', presente: true, registrada_em: '2026-05-10T09:30:00' },
  { aluno_id: 'a2', nome: 'Bia', presente: false, registrada_em: null },
];

function criarEstado(extra = {}) {
  return {
    qr: null,
    presencas: [],
    presencasFiltradas: [],
    loading: false,
    loadingAction: false,
    error: '',
    filtro: 'todos',
    setFiltro: vi.fn(),
    busca: '',
    setBusca: vi.fn(),
    totalPresentes: 0,
    totalAlunos: 0,
    simulado: simuladoPadrao,
    refresh: vi.fn(),
    gerarNovoQr: vi.fn().mockResolvedValue(undefined),
    revogar: vi.fn().mockResolvedValue(true),
    ...extra,
  };
}

function renderTela(extra = {}) {
  const estado = criarEstado(extra);
  usePresencaSimulado.mockReturnValue(estado);
  render(
    <MemoryRouter initialEntries={['/presenca/turma/t1/simulado/s1']}>
      <Routes>
        <Route path="/presenca/turma/:turmaId/simulado/:simuladoId" element={<PresencaSimulado />} />
      </Routes>
    </MemoryRouter>
  );
  return estado;
}

describe('PresencaSimulado', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('define o título da página e passa o id do simulado para o hook', () => {
    renderTela();
    expect(document.title).toBe('NotasMAX - Presença por simulado');
    expect(usePresencaSimulado).toHaveBeenCalledWith('s1');
  });

  it('mostra o estado de carregamento', () => {
    renderTela({ loading: true, simulado: null });

    expect(screen.getByRole('heading', { name: 'Carregando simulado...' })).toBeInTheDocument();
    expect(screen.getAllByText('Carregando presença...')).toHaveLength(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra os dados do simulado no cabeçalho', () => {
    renderTela({ qr: qrAtivo });

    expect(screen.getByRole('heading', { name: 'Simulado 3' })).toBeInTheDocument();
    expect(screen.getByText('Objetivo • 2º Bimestre • 10/05/2026 • Turma 3º • 2026')).toBeInTheDocument();
  });

  it('mostra o erro do hook', () => {
    renderTela({ qr: qrAtivo, error: 'Falha sintética' });
    expect(screen.getByText('Falha sintética')).toBeInTheDocument();
  });

  it('avisa quando os dados do simulado não puderam ser carregados', () => {
    renderTela({ simulado: null });

    expect(screen.getByText('Não foi possível carregar os dados do simulado.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Simulado' })).toBeInTheDocument();
  });

  describe('sem QR Code', () => {
    it('abre sozinho o modal para gerar o QR quando não há QR nem presenças', () => {
      renderTela();

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Este simulado ainda não tem QR Code de presença.' })).toBeInTheDocument();
    });

    it('gera o QR a partir de agora e fecha o modal', async () => {
      const estado = renderTela();

      fireEvent.click(screen.getByRole('button', { name: 'Sim, gerar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(estado.gerarNovoQr).toHaveBeenCalledWith({ validoDe: expect.any(String) });
    });

    it('gera o QR com o início escolhido no modal', async () => {
      const estado = renderTela();

      fireEvent.change(screen.getByLabelText('Começar a valer em'), { target: { value: '2026-06-01T08:00' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sim, gerar' }));

      await waitFor(() => expect(estado.gerarNovoQr).toHaveBeenCalledWith({ validoDe: '2026-06-01T08:00' }));
    });

    it('mantém o modal aberto quando a geração falha', async () => {
      const estado = renderTela({ gerarNovoQr: vi.fn().mockRejectedValue(new Error('falha sintética')) });

      fireEvent.click(screen.getByRole('button', { name: 'Sim, gerar' }));

      await waitFor(() => expect(estado.gerarNovoQr).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('fecha o modal em "Agora não" e deixa o botão "Gerar QR Code" na tela', () => {
      renderTela();

      fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Gerar QR Code' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('desabilita os botões do modal enquanto gera', () => {
      renderTela({ loadingAction: true });
      // loadingAction impede a abertura automática, então abre pelo botão
      fireEvent.click(screen.getByRole('button', { name: 'Gerar QR Code' }));

      expect(screen.getByRole('button', { name: 'Gerando...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Agora não' })).toBeDisabled();
    });

    it('oferece gerar um novo QR quando o anterior expirou mas já há presenças', () => {
      renderTela({ totalPresentes: 2, presencas: alunos, presencasFiltradas: alunos });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText(/O QR Code anterior não está mais ativo/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Gerar novo QR Code' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('com QR Code ativo', () => {
    it('mostra o QR com o token e a validade', () => {
      renderTela({ qr: qrAtivo });

      expect(screen.getByText('QR ativo')).toBeInTheDocument();
      expect(screen.getByTestId('qr-code')).toHaveAttribute('data-value', 'token-sintetico');
      expect(screen.getByText('Válido de:')).toBeInTheDocument();
      expect(screen.getByText('Até:')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('imprime a folha com o QR, o título e a validade', () => {
      renderTela({ qr: qrAtivo });

      fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));

      expect(imprimirFolhaQr).toHaveBeenCalledWith(expect.objectContaining({
        svgMarkup: expect.stringContaining('<svg'),
        titulo: 'Presença do Simulado 3',
        subtitulo: 'Objetivo • 2º Bimestre • 10/05/2026 • Turma 3º • 2026',
        validade: expect.stringContaining('Válido de'),
      }));
    });

    it('renova o QR somente depois da confirmação', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const estado = renderTela({ qr: qrAtivo });

      fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));

      expect(confirmar).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(estado.gerarNovoQr).toHaveBeenCalledWith({
        validoDe: expect.any(String),
        renovar: true,
      }));
    });

    it('não renova quando a confirmação é recusada', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const estado = renderTela({ qr: qrAtivo });

      fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));

      expect(estado.gerarNovoQr).not.toHaveBeenCalled();
    });

    it('revoga o QR somente depois da confirmação', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const estado = renderTela({ qr: qrAtivo });

      fireEvent.click(screen.getByRole('button', { name: 'Revogar' }));

      await waitFor(() => expect(estado.revogar).toHaveBeenCalledTimes(1));
    });

    it('não revoga quando a confirmação é recusada', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const estado = renderTela({ qr: qrAtivo });

      fireEvent.click(screen.getByRole('button', { name: 'Revogar' }));

      expect(estado.revogar).not.toHaveBeenCalled();
    });

    it('desabilita as ações enquanto há uma operação em andamento', () => {
      renderTela({ qr: qrAtivo, loadingAction: true });

      expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Renovar' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Revogar' })).toBeDisabled();
    });
  });

  describe('lista de presença', () => {
    const listaCompleta = { qr: qrAtivo, presencas: alunos, presencasFiltradas: alunos, totalPresentes: 1, totalAlunos: 2 };

    it('mostra o total de presentes e cada aluno com seu status', () => {
      renderTela(listaCompleta);

      expect(screen.getByText('1 de 2 presentes')).toBeInTheDocument();

      const ana = screen.getByRole('row', { name: /Ana/ });
      expect(ana).toHaveTextContent('Presente');
      expect(ana).toHaveTextContent('10/05/2026');

      const bia = screen.getByRole('row', { name: /Bia/ });
      expect(bia).toHaveTextContent('Ausente');
      expect(bia).toHaveTextContent('—');
    });

    it('usa a quantidade de presenças quando o total de alunos não veio', () => {
      renderTela({ ...listaCompleta, totalAlunos: 0 });
      expect(screen.getByText('1 de 2 presentes')).toBeInTheDocument();
    });

    it('troca o filtro de status', () => {
      const estado = renderTela(listaCompleta);

      fireEvent.click(screen.getByRole('button', { name: 'Presentes' }));
      fireEvent.click(screen.getByRole('button', { name: 'Ausentes' }));
      fireEvent.click(screen.getByRole('button', { name: 'Todos' }));

      expect(estado.setFiltro.mock.calls.map(([valor]) => valor)).toEqual(['presentes', 'ausentes', 'todos']);
    });

    it('repassa a busca por nome ao hook', () => {
      const estado = renderTela(listaCompleta);

      fireEvent.change(screen.getByLabelText('Buscar aluno por nome'), { target: { value: 'Ana' } });

      expect(estado.setBusca).toHaveBeenCalledWith('Ana');
    });

    it('atualiza a lista', () => {
      const estado = renderTela(listaCompleta);

      fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));

      expect(estado.refresh).toHaveBeenCalledTimes(1);
    });

    it('avisa quando nenhum aluno atende aos filtros', () => {
      renderTela({ qr: qrAtivo, presencas: alunos, presencasFiltradas: [], totalPresentes: 1, totalAlunos: 2 });
      expect(screen.getByText('Nenhum aluno encontrado para os filtros selecionados.')).toBeInTheDocument();
    });
  });

  it('volta para a tela anterior', () => {
    renderTela({ qr: qrAtivo });

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(navigate).toHaveBeenCalledWith(-1);
  });
});
