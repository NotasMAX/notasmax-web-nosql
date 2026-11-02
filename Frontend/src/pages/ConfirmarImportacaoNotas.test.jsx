import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ConfirmarImportacaoNotas from './ConfirmarImportacaoNotas';
import { confirmarImportacaoNotas } from '../api/simuladoApi';

vi.mock('../api/simuladoApi', () => ({ confirmarImportacaoNotas: vi.fn() }));
vi.mock('../components/BimestreAtual', () => ({ default: ({ bimestre, ano }) => <p>Período {bimestre}/{ano}</p> }));

function Destino() {
  return <p>Destino: {useLocation().pathname}</p>;
}

const conteudo = (turma_disciplina_id, extras = {}) => ({
  turma_disciplina_id,
  peso: 30,
  pesoOriginal: 30,
  quantidade_questoes: 3,
  alunosComResultado: 4,
  acertosAtuais: null,
  ...extras,
});

const simulado = (numero, extras = {}) => ({
  _id: `s${numero}`,
  numero,
  tipo: 'objetivo',
  tipoOriginal: 'objetivo',
  data_realizacao: '2026-03-10T15:00:00.000Z',
  foraDoPrazo: true,
  dataFutura: false,
  alunosComResultado: 5,
  conteudos: [conteudo('d1'), conteudo('d2')],
  ...extras,
});

const previaBase = (mudancas = {}) => ({
  aba: 'Maria Silva',
  bimestre: 2,
  aluno: { _id: 'a1', nome: 'Maria Silva' },
  turma: { _id: 't1', serie: 1, ano: 2026 },
  disciplinas: [
    { _id: 'd1', materia: 'Física', professor: 'Lourdes Prado' },
    { _id: 'd2', materia: 'Inglês', professor: 'Helena Vaz' },
  ],
  colunas: [
    { coluna: 'B', cabecalho: 'fisica - lo', cabecalhoOriginal: 'FÍSICA - LÔ', fator: 0.3, notaDissertativaPlanilha: 0, turma_disciplina_id: 'd1' },
    { coluna: 'C', cabecalho: 'ingles', cabecalhoOriginal: 'INGLÊS', fator: null, notaDissertativaPlanilha: null, turma_disciplina_id: 'd2' },
  ],
  simulados: [simulado(1), simulado(2)],
  linhas: [
    { numero: 1, celulas: [{ coluna: 'B', celula: 'B4', status: 'acertos', acertos: 2 }, { coluna: 'C', celula: 'C4', status: 'acertos', acertos: 1 }] },
    { numero: 2, celulas: [{ coluna: 'B', celula: 'B5', status: 'nao_fez' }, { coluna: 'C', celula: 'C5', status: 'acertos', acertos: 3 }] },
  ],
  problemasDaPlanilha: { bloqueios: [], avisos: [] },
  ...mudancas,
});

function abrir(previa = previaBase()) {
  render(
    <MemoryRouter initialEntries={['/inicio', { pathname: '/Simulados/Importar/t1/2/a1/Confirmar', state: previa ? { previa } : undefined }]} initialIndex={1}>
      <Routes>
        <Route path="/inicio" element={<p>Tela anterior</p>} />
        <Route path="/Simulados/Importar/:turma/:bimestre/:aluno" element={<p>Tela de upload</p>} />
        <Route path="/Simulados/Importar/:turma/:bimestre/:aluno/Confirmar" element={<ConfirmarImportacaoNotas />} />
        <Route path="/Simulados/Notas/:simulado/:bimestre/:aluno" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
}

const confirmar = () => screen.getByRole('button', { name: 'Confirmar' });
const editar = (numero, coluna) => fireEvent.click(screen.getByRole('button', { name: `Editar simulado ${numero} de ${coluna}` }));

describe('ConfirmarImportacaoNotas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('volta para o upload quando a página é aberta sem prévia', () => {
    abrir(null);
    expect(screen.getByText('Tela de upload')).toBeInTheDocument();
  });

  it('mostra as colunas, abre a primeira e calcula as notas', () => {
    abrir();

    expect(screen.getByRole('heading', { name: 'Confirmação das notas Importadas' })).toBeInTheDocument();
    expect(screen.getByText('Verifique se as notas importadas do excel estão corretas')).toBeInTheDocument();
    expect(screen.getByText('Período 2/2026')).toBeInTheDocument();
    expect(screen.getByText('Física - Lourdes Prado', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('nulo')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getAllByText('0,60')).toHaveLength(2);
    expect(screen.getAllByText('Ok')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it('abre e fecha uma coluna', () => {
    abrir();
    const coluna = screen.getByRole('button', { name: 'INGLÊS' });

    fireEvent.click(coluna);
    expect(screen.getByText('Inglês - Helena Vaz', { selector: 'p' })).toBeInTheDocument();
    fireEvent.click(coluna);
    expect(screen.queryByText('Inglês - Helena Vaz', { selector: 'p' })).not.toBeInTheDocument();
  });

  it('confirma, mostra as contagens e leva para as notas do aluno', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'Notas importadas com sucesso', criados: 3, atualizados: 1, removidos: 0, ignorados: 2 } });
    abrir();

    fireEvent.click(confirmar());

    expect(await screen.findByRole('status')).toHaveTextContent('3 criada(s), 1 atualizada(s), 0 removida(s) e 2 sem alteração.');
    const enviado = confirmarImportacaoNotas.mock.calls[0][0];
    expect(enviado).toMatchObject({ aluno_id: 'a1', turma_id: 't1', bimestre: '2', tipos: [], pesos: [] });
    expect(enviado.linhas[1].celulas[0]).toEqual({ coluna: 'B', celula: 'B5', acertos: null });

    fireEvent.click(screen.getByRole('button', { name: 'Ver notas do aluno' }));
    expect(await screen.findByText('Destino: /Simulados/Notas/s1/2/a1')).toBeInTheDocument();
  });

  it('bloqueia acertos inválidos e libera ao corrigir na tela', () => {
    const previa = previaBase();
    previa.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'invalida', bruto: 'ausente' };
    abrir(previa);

    expect(screen.getByRole('alert')).toHaveTextContent('Célula B4: "ausente" não é válido. Use um número inteiro de acertos, "não fez" ou "faltou".');
    expect(screen.getByText('Bloqueio: acertos inválidos')).toBeInTheDocument();
    expect(screen.getByText('ausente')).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();

    editar(1, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' }), { target: { value: '2' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();

    editar(1, 'FÍSICA - LÔ');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('faltou digitado na revisão fica nulo e não bloqueia', () => {
    abrir();
    editar(1, 'FÍSICA - LÔ');

    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' }), { target: { value: 'Faltou' } });

    expect(screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' })).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it('vazio nos acertos fica nulo', () => {
    abrir();
    editar(1, 'FÍSICA - LÔ');

    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' }), { target: { value: '' } });

    expect(screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' })).toHaveAttribute('placeholder', 'nulo');
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('liga à mão uma coluna sem dono e guarda a escolha', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 0, atualizados: 0, removidos: 0, ignorados: 0 } });
    const previa = previaBase();
    previa.colunas[1] = { ...previa.colunas[1], cabecalhoOriginal: 'ARTES', cabecalho: 'artes', turma_disciplina_id: null };
    abrir(previa);

    expect(screen.getByRole('alert')).toHaveTextContent('Coluna C ("ARTES"): escolha a disciplina da turma.');
    expect(screen.getByText('Bloqueio: sem dono')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ARTES' }));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(confirmar()).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox', { name: 'Disciplina da coluna ARTES' }), { target: { value: 'd2' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(confirmar());
    await screen.findByRole('status');
    expect(confirmarImportacaoNotas.mock.calls[0][0].colunas[1]).toMatchObject({ turma_disciplina_id: 'd2', trocada: true });
  });

  it('bloqueia duas colunas na mesma disciplina', () => {
    abrir();

    fireEvent.change(screen.getByRole('combobox', { name: 'Disciplina da coluna INGLÊS' }), { target: { value: 'd1' } });

    expect(screen.getAllByText('Bloqueio: disciplina repetida')).toHaveLength(2);
    expect(screen.getByRole('alert').querySelectorAll('li')).toHaveLength(1);
    expect(confirmar()).toBeDisabled();
  });

  it('peso e tipo fora do prazo avisam e pedem confirmação, porque valem para a turma', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 0, atualizados: 0, removidos: 0, ignorados: 0 } });
    abrir();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso do simulado 1 em FÍSICA - LÔ' }), { target: { value: '40' } });
    editar(1, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo do simulado 1' }), { target: { value: 'dissertativo' } });

    expect(screen.getByText(/Simulado 1, Física - Lourdes Prado: a troca de peso vale para todos os alunos/)).toBeInTheDocument();
    expect(screen.getByText(/Simulado 1: a troca de tipo vale para todas as disciplinas/)).toBeInTheDocument();
    expect(screen.getByText(/Simulado 1: já passou do prazo de 16 dias/)).toBeInTheDocument();
    expect(screen.getByText('Aviso: peso alterado')).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();

    fireEvent.click(confirmar());
    expect(await screen.findByText('As alterações de tipo e peso valem para a turma inteira. Deseja continuar?')).toBeInTheDocument();
    expect(confirmarImportacaoNotas).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));

    await screen.findByRole('status');
    const enviado = confirmarImportacaoNotas.mock.calls[0][0];
    expect(enviado.pesos).toEqual([{ simulado_id: 's1', turma_disciplina_id: 'd1', peso: 40 }]);
    expect(enviado.tipos).toEqual([{ simulado_id: 's1', tipo: 'dissertativo' }]);
  });

  it('bloqueia a nota acima de 10 e libera quando o peso volta', () => {
    const previa = previaBase({ linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', status: 'acertos', acertos: 12 }] }] });
    previa.simulados[0].conteudos[0].quantidade_questoes = 20;
    abrir(previa);
    const peso = screen.getByRole('spinbutton', { name: 'Peso do simulado 1 em FÍSICA - LÔ' });

    fireEvent.change(peso, { target: { value: '100' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Física - Lourdes Prado: a nota final daria 12,00, e o máximo é 10. Corrija o peso ou os acertos.');
    expect(confirmar()).toBeDisabled();

    fireEvent.change(peso, { target: { value: '30' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it('bloqueia peso inválido', () => {
    abrir();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso do simulado 1 em FÍSICA - LÔ' }), { target: { value: '' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Simulado 1, Física - Lourdes Prado: o peso deve ser um número inteiro maior que 0 e no máximo 100.');
    expect(confirmar()).toBeDisabled();
  });

  it('mantém os problemas fixos da planilha junto dos calculados', () => {
    abrir(previaBase({
      problemasDaPlanilha: {
        bloqueios: [{ codigo: 'SIM_REPETIDO', mensagem: 'A linha SIM 1 aparece mais de uma vez.' }],
        avisos: [{ codigo: 'TOTAL_DIFERENTE', mensagem: 'SIM 1: a soma da linha dá 3, mas a coluna TOTAL mostra 99.' }],
      },
    }));

    expect(screen.getByRole('alert')).toHaveTextContent('A linha SIM 1 aparece mais de uma vez.');
    expect(screen.getByText('SIM 1: a soma da linha dá 3, mas a coluna TOTAL mostra 99.')).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();
  });

  it('simulado fora da planilha aparece com a nota lançada e pode ser alterado à mão', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 0, atualizados: 1, removidos: 0, ignorados: 4 } });
    abrir(previaBase({
      simulados: [
        simulado(1),
        simulado(2),
        simulado(3, {
          tipo: 'dissertativo',
          tipoOriginal: 'dissertativo',
          conteudos: [conteudo('d1', { peso: 50, pesoOriginal: 50, acertosAtuais: 1 }), conteudo('d2', { acertosAtuais: 2 })],
        }),
      ],
    }));

    expect(screen.getByText('fora da planilha')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('0,50')).toBeInTheDocument();
    expect(screen.getByText(/Simulado 3: não está na planilha/)).toBeInTheDocument();

    editar(3, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 3 em FÍSICA - LÔ' }), { target: { value: '2' } });

    expect(screen.getByText('1,00')).toBeInTheDocument();
    expect(screen.queryByText('fora da planilha')).not.toBeInTheDocument();
    expect(screen.getByText(/Célula SIM 3, coluna B: o aluno já tem 1 acerto/)).toBeInTheDocument();

    fireEvent.click(confirmar());
    await screen.findByRole('status');
    expect(confirmarImportacaoNotas.mock.calls[0][0].linhas[2]).toEqual({
      numero: 3,
      celulas: [{ coluna: 'B', celula: 'SIM 3, coluna B', acertos: 2 }],
    });
  });

  it('outra coluna do simulado fora da planilha continua com a nota lançada', () => {
    abrir(previaBase({
      simulados: [simulado(1), simulado(2), simulado(3, { conteudos: [conteudo('d1', { acertosAtuais: 1 }), conteudo('d2', { acertosAtuais: 2 })] })],
    }));

    fireEvent.click(screen.getByRole('button', { name: 'INGLÊS' }));
    editar(3, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 3 em FÍSICA - LÔ' }), { target: { value: '3' } });

    expect(screen.getAllByText('2 / 3')).toHaveLength(2);
    expect(screen.getByText('fora da planilha')).toBeInTheDocument();

    editar(3, 'INGLÊS');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 3 em INGLÊS' }), { target: { value: '' } });

    expect(screen.queryByText('fora da planilha')).not.toBeInTheDocument();
    expect(screen.getByText(/vai passar para nulo/)).toBeInTheDocument();
  });

  it('não lista simulado fora da planilha que não tem a disciplina da coluna', () => {
    abrir(previaBase({ simulados: [simulado(1), simulado(2), simulado(3, { conteudos: [conteudo('d2')] })] }));

    expect(screen.queryByText('fora da planilha')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar simulado 3 de FÍSICA - LÔ' })).not.toBeInTheDocument();
  });

  it('linha sem simulado aparece sem tipo nem peso', () => {
    const previa = previaBase();
    previa.linhas.push({ numero: 7, celulas: [{ coluna: 'B', celula: 'B6', status: 'acertos', acertos: 1 }] });
    abrir(previa);

    expect(screen.getByRole('alert')).toHaveTextContent('A linha SIM 7 não tem simulado cadastrado para esta turma no 2º bimestre.');
    expect(screen.getByText('1 / —')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Peso do simulado 7 em FÍSICA - LÔ' })).toBeDisabled();
  });

  it('volta para a conferência com os bloqueios do servidor e os limpa ao editar', async () => {
    confirmarImportacaoNotas.mockRejectedValue({
      response: { data: { bloqueios: [{ codigo: 'NOTA_DE_OUTRO_ALUNO_ACIMA_DE_10', mensagem: 'Com esse peso, a nota de Rafael daria 11,00.' }] } },
    });
    abrir();

    fireEvent.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent('Com esse peso, a nota de Rafael daria 11,00.');
    await waitFor(() => expect(confirmar()).toBeDisabled());

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso do simulado 2 em FÍSICA - LÔ' }), { target: { value: '31' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra erro genérico quando o servidor não responde', async () => {
    confirmarImportacaoNotas.mockRejectedValue(new Error('rede'));
    abrir();

    fireEvent.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível importar as notas.');
  });

  it('o cancelar pede confirmação antes de voltar', async () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('Deseja realmente cancelar a importação? Nada será salvo.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText('Tela anterior')).toBeInTheDocument();
    expect(confirmarImportacaoNotas).not.toHaveBeenCalled();
  });
});
