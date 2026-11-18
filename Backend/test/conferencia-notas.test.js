import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularNotas,
  ligarColuna,
  montarEstadoDaConfirmacao,
  montarOperacoes,
  montarPrevia,
  montarSimulados,
  validarConferencia,
  validarOutrosAlunos,
} from '../services/conferenciaNotas.js';
import {
  calcularNotas as calcularNotasDaTela,
  validarConferencia as validarConferenciaDaTela,
} from '../../Frontend/src/utils/conferenciaNotas.js';

const disciplinas = [
  { _id: 'd1', materia: 'Física', professor: 'Lourdes Prado' },
  { _id: 'd2', materia: 'Física', professor: 'Toni Almeida' },
  { _id: 'd3', materia: 'Inglês', professor: 'Helena Vaz' },
];

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
  data_realizacao: '2026-03-10T03:00:00.000Z',
  foraDoPrazo: false,
  dataFutura: false,
  alunosComResultado: 5,
  conteudos: [conteudo('d1'), conteudo('d3')],
  ...extras,
});

const coluna = (letra, turma_disciplina_id, extras = {}) => ({
  coluna: letra,
  cabecalhoOriginal: `COLUNA ${letra}`,
  turma_disciplina_id,
  fator: null,
  notaDissertativaPlanilha: null,
  ...extras,
});

const celula = (letra, numero, acertos) => ({ coluna: letra, celula: `${letra}${numero + 3}`, status: 'acertos', acertos });

const estadoBase = (mudancas = {}) => ({
  bimestre: 2,
  disciplinas,
  colunas: [coluna('B', 'd1'), coluna('C', 'd3')],
  simulados: [simulado(1), simulado(2)],
  linhas: [
    { numero: 1, celulas: [celula('B', 1, 2), celula('C', 1, 3)] },
    { numero: 2, celulas: [celula('B', 2, 1), celula('C', 2, 0)] },
  ],
  ...mudancas,
});

const codigos = (problemas) => problemas.map(({ codigo }) => codigo);

test('a clean sheet has no blocks or warnings', () => {
  assert.deepEqual(validarConferencia(estadoBase()), { bloqueios: [], avisos: [] });
});

test('adds up objective and essay grades by the type of each simulado', () => {
  const notas = calcularNotas(estadoBase({
    simulados: [simulado(1), simulado(2, { tipo: 'dissertativo' })],
  }), 'd1');

  assert.deepEqual(notas, { objetiva: 0.6, dissertativa: 0.3, final: 0.8999999999999999, totalAcertos: 3, totalQuestoes: 6 });
});

test('a simulado missing from the sheet counts with the grade already saved', () => {
  const estado = estadoBase({ simulados: [simulado(1), simulado(2), simulado(3, { conteudos: [conteudo('d1', { acertosAtuais: 3 })] })] });

  assert.equal(calcularNotas(estado, 'd1').totalAcertos, 6);
  assert.deepEqual(codigos(validarConferencia(estado).avisos), ['SIMULADO_FORA_DA_PLANILHA']);
});

test('a cell typed for a simulado missing from the sheet changes only that disciplina', () => {
  const estado = estadoBase({
    simulados: [simulado(1), simulado(2), simulado(3, { tipo: 'dissertativo', tipoOriginal: 'dissertativo', conteudos: [conteudo('d1', { acertosAtuais: 1 }), conteudo('d3', { acertosAtuais: 2 })] })],
  });
  estado.linhas.push({ numero: 3, celulas: [{ coluna: 'B', celula: 'SIM 3, coluna B', status: 'acertos', acertos: 3 }] });

  assert.equal(calcularNotas(estado, 'd1').totalAcertos, 6);
  assert.equal(calcularNotas(estado, 'd3').totalAcertos, 5);
  assert.equal(calcularNotas(estado, 'd3').dissertativa, 0.6);
  assert.deepEqual(calcularNotasDaTela(estado, 'd3'), calcularNotas(estado, 'd3'));
  assert.deepEqual(codigos(validarConferencia(estado).avisos), ['JA_TEM_RESULTADO']);
});

test('a simulado the student skipped does not count in the totals', () => {
  const estado = estadoBase();
  estado.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'nao_fez' };

  assert.deepEqual(calcularNotas(estado, 'd1'), { objetiva: 0.3, dissertativa: 0, final: 0.3, totalAcertos: 1, totalQuestoes: 3 });
});

test('blocks a column without a disciplina and names it', () => {
  const { bloqueios } = validarConferencia(estadoBase({ colunas: [coluna('B', null, { cabecalhoOriginal: 'ARTES' }), coluna('C', 'd3')] }));

  assert.deepEqual(codigos(bloqueios), ['COLUNA_SEM_DISCIPLINA']);
  assert.equal(bloqueios[0].mensagem, 'Coluna B ("ARTES"): escolha a disciplina da turma.');
  assert.equal(bloqueios[0].coluna, 'B');
});

test('blocks two columns linked to the same disciplina, on both of them', () => {
  const { bloqueios } = validarConferencia(estadoBase({ colunas: [coluna('B', 'd1'), coluna('C', 'd1')] }));

  assert.deepEqual(bloqueios.map(({ codigo, coluna: letra }) => `${codigo}:${letra}`), ['COLUNAS_MESMA_DISCIPLINA:B', 'COLUNAS_MESMA_DISCIPLINA:C']);
  assert.match(bloqueios[0].mensagem, /B \("COLUNA B"\) e C \("COLUNA C"\).*Física - Lourdes Prado/);
});

test('blocks a SIM line without a simulado', () => {
  const estado = estadoBase();
  estado.linhas.push({ numero: 7, celulas: [celula('B', 7, 1)] });

  assert.equal(validarConferencia(estado).bloqueios[0].mensagem, 'A linha SIM 7 não tem simulado cadastrado para esta turma no 2º bimestre.');
});

test('blocks a number shared by two simulados', () => {
  const estado = estadoBase({ simulados: [simulado(1), simulado(1, { _id: 'outro' }), simulado(2)] });

  assert.deepEqual(codigos(validarConferencia(estado).bloqueios), ['SIMULADO_DUPLICADO']);
});

test('blocks invalid acertos, even on a column still without disciplina', () => {
  const estado = estadoBase({ colunas: [coluna('B', null), coluna('C', 'd3')] });
  estado.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'invalida', bruto: 'ausente' };
  const { bloqueios } = validarConferencia(estado);

  assert.ok(codigos(bloqueios).includes('ACERTOS_INVALIDO'));
  assert.ok(bloqueios.some(({ mensagem }) => mensagem === 'Célula B4: "ausente" não é válido. Use um número inteiro de acertos, "não fez" ou "faltou".'));
});

test('blocks more acertos than questions', () => {
  const estado = estadoBase();
  estado.linhas[0].celulas[0] = celula('B', 1, 9);
  const { bloqueios } = validarConferencia(estado);

  assert.deepEqual(codigos(bloqueios), ['ACERTOS_ACIMA_DO_LIMITE']);
  assert.equal(bloqueios[0].mensagem, 'Célula B4: 9 acertos é mais do que as 3 questões de Física - Lourdes Prado no simulado 1.');
});

test('blocks acertos of a disciplina that is not in the simulado, but not an absent cell', () => {
  const semFisica = [conteudo('d3')];
  const estado = estadoBase({ simulados: [simulado(1, { conteudos: semFisica }), simulado(2)] });
  assert.deepEqual(codigos(validarConferencia(estado).bloqueios), ['DISCIPLINA_FORA_DO_SIMULADO']);

  estado.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'nao_fez' };
  assert.deepEqual(validarConferencia(estado).bloqueios, []);
});

for (const peso of [0, -1, 101, 12.5, '', Number.NaN]) {
  test(`blocks a changed weight of ${peso}`, () => {
    const estado = estadoBase({ simulados: [simulado(1, { conteudos: [conteudo('d1', { peso }), conteudo('d3')] }), simulado(2)] });
    assert.ok(codigos(validarConferencia(estado).bloqueios).includes('PESO_INVALIDO'));
  });
}

test('does not block a decimal weight that was already registered and did not change', () => {
  const estado = estadoBase({ simulados: [simulado(1, { conteudos: [conteudo('d1', { peso: 7.5, pesoOriginal: 7.5 }), conteudo('d3')] }), simulado(2)] });
  assert.ok(!codigos(validarConferencia(estado).bloqueios).includes('PESO_INVALIDO'));
});

test('blocks a final grade above 10 and frees it when the weight goes back', () => {
  const pesado = estadoBase({
    simulados: [simulado(1, { conteudos: [conteudo('d1', { peso: 100 }), conteudo('d3')] }), simulado(2, { conteudos: [conteudo('d1', { peso: 100 }), conteudo('d3')] })],
  });
  pesado.linhas = [
    { numero: 1, celulas: [celula('B', 1, 3)] },
    { numero: 2, celulas: [celula('B', 2, 3)] },
  ];
  pesado.simulados[0].conteudos[0].quantidade_questoes = 10;
  pesado.simulados[1].conteudos[0].quantidade_questoes = 10;
  pesado.linhas[0].celulas[0].acertos = 8;
  pesado.linhas[1].celulas[0].acertos = 8;

  const { bloqueios } = validarConferencia(pesado);
  assert.deepEqual(codigos(bloqueios), ['NOTA_ACIMA_DE_10']);
  assert.equal(bloqueios[0].mensagem, 'Física - Lourdes Prado: a nota final daria 16,00, e o máximo é 10. Corrija o peso ou os acertos.');

  pesado.simulados[0].conteudos[0].peso = 30;
  pesado.simulados[1].conteudos[0].peso = 30;
  assert.deepEqual(validarConferencia(pesado).bloqueios, []);
});

test('warns when a type or weight changes, adding the deadline warning only past 16 days', () => {
  const dentro = validarConferencia(estadoBase({ simulados: [simulado(1, { tipo: 'dissertativo' }), simulado(2)] }));
  assert.deepEqual(codigos(dentro.avisos), ['TIPO_ALTERADO']);
  assert.match(dentro.avisos[0].mensagem, /Alunos com resultado lançado: 5\./);

  const fora = validarConferencia(estadoBase({
    simulados: [simulado(1, { foraDoPrazo: true, conteudos: [conteudo('d1', { peso: 40 }), conteudo('d3')] }), simulado(2)],
  }));
  assert.deepEqual(codigos(fora.avisos), ['PESO_ALTERADO', 'FORA_DO_PRAZO']);
  assert.equal(fora.avisos[0].coluna, 'B');

  const semMudanca = validarConferencia(estadoBase({ simulados: [simulado(1, { foraDoPrazo: true }), simulado(2)] }));
  assert.deepEqual(semMudanca.avisos, []);
});

test('warns about the old and the new value when the student already has a grade', () => {
  const estado = estadoBase({ simulados: [simulado(1, { conteudos: [conteudo('d1', { acertosAtuais: 1 }), conteudo('d3', { acertosAtuais: 3 })] }), simulado(2)] });
  const { avisos } = validarConferencia(estado);

  assert.deepEqual(codigos(avisos), ['JA_TEM_RESULTADO']);
  assert.equal(avisos[0].mensagem, 'Célula B4: o aluno já tem 1 acerto(s) em Física - Lourdes Prado no simulado 1; vai passar para 2.');

  estado.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'nao_fez' };
  assert.match(validarConferencia(estado).avisos[0].mensagem, /vai passar para nulo, e a nota lançada será removida\./);
});

test('warns about empty cells on each row', () => {
  const estado = estadoBase();
  estado.linhas[0].celulas[1] = { coluna: 'C', celula: 'C4', status: 'vazia' };

  assert.equal(validarConferencia(estado).avisos[0].mensagem, 'SIM 1: sem valor em C4; vale como nulo.');
});

test('warns about a future date only for a simulado in the sheet', () => {
  const data = { dataFutura: true };
  const naPlanilha = validarConferencia(estadoBase({ simulados: [simulado(1, data), simulado(2)] }));
  assert.deepEqual(codigos(naPlanilha.avisos), ['DATA_FUTURA']);

  const foraDaPlanilha = validarConferencia(estadoBase({ simulados: [simulado(1), simulado(2), simulado(3, data)] }));
  assert.deepEqual(foraDaPlanilha.avisos, []);
});

test('warns when the factor of the formula does not match the registered weight', () => {
  const { avisos } = validarConferencia(estadoBase({ colunas: [coluna('B', 'd1', { fator: 0.5 }), coluna('C', 'd3', { fator: 0.3 })] }));

  assert.deepEqual(codigos(avisos), ['FATOR_DIFERENTE']);
  assert.equal(avisos[0].mensagem, 'Física - Lourdes Prado: a fórmula da Nota Objetivo usa o fator 0,5, mas o peso cadastrado é 30.');
});

test('warns when the essay grade of the sheet differs from the calculated one', () => {
  const { avisos } = validarConferencia(estadoBase({ colunas: [coluna('B', 'd1', { notaDissertativaPlanilha: 0.75 }), coluna('C', 'd3', { notaDissertativaPlanilha: 0 })] }));

  assert.deepEqual(codigos(avisos), ['NOTA_DISSERTATIVA_DIFERENTE']);
  assert.equal(avisos[0].mensagem, 'Física - Lourdes Prado: a nota dissertativa calculada é 0,00, e a da planilha é 0,75.');
});

const cabecalho = (texto, materia, professor = null) => ({ cabecalho: texto, materia, professor });

test('links a subject that appears once, whatever the teacher in the header', () => {
  assert.equal(ligarColuna(cabecalho('ingles', 'ingles'), disciplinas).turma_disciplina_id, 'd3');
  assert.equal(ligarColuna(cabecalho('ingles - ze', 'ingles', 'ze'), disciplinas).turma_disciplina_id, 'd3');
});

test('breaks the tie of a repeated subject by the start of a word of the teacher name', () => {
  assert.equal(ligarColuna(cabecalho('fisica - lo', 'fisica', 'lo'), disciplinas).turma_disciplina_id, 'd1');
  assert.equal(ligarColuna(cabecalho('fisica - almeida', 'fisica', 'almeida'), disciplinas).turma_disciplina_id, 'd2');
  assert.equal(ligarColuna(cabecalho('fisica - toni almeida', 'fisica', 'toni almeida'), disciplinas).turma_disciplina_id, 'd2');
});

test('does not match a teacher by letters in the middle of a word', () => {
  assert.equal(ligarColuna(cabecalho('fisica - rd', 'fisica', 'rd'), disciplinas).turma_disciplina_id, null);
});

test('leaves a column without owner when the name does not settle it', () => {
  const semLigacao = { turma_disciplina_id: null, origemLigacao: null };
  assert.deepEqual(ligarColuna(cabecalho('fisica', 'fisica'), disciplinas), semLigacao);
  assert.deepEqual(ligarColuna(cabecalho('fisica - ze', 'fisica', 'ze'), disciplinas), semLigacao);
  assert.deepEqual(ligarColuna(cabecalho('artes', 'artes'), disciplinas), semLigacao);
  const homonimos = [...disciplinas, { _id: 'd4', materia: 'Física', professor: 'Lourenço Dias' }];
  assert.deepEqual(ligarColuna(cabecalho('fisica - lo', 'fisica', 'lo'), homonimos), semLigacao);
});

test('prefers the choice saved for the class, unless the disciplina no longer exists', () => {
  const mapeamentos = [{ cabecalho: 'artes', turma_disciplina_id: 'd3' }, { cabecalho: 'fisica', turma_disciplina_id: 'apagada' }];
  assert.deepEqual(ligarColuna(cabecalho('artes', 'artes'), disciplinas, mapeamentos), { turma_disciplina_id: 'd3', origemLigacao: 'guardada' });
  assert.equal(ligarColuna(cabecalho('fisica', 'fisica'), disciplinas, mapeamentos).turma_disciplina_id, null);
});

const AGORA = new Date('2026-11-02T12:00:00.000Z');
const UM_DIA = 24 * 60 * 60 * 1000;
const noPassado = (dias) => new Date(AGORA.getTime() - dias * UM_DIA);

const simuladoDoBanco = (numero, extras = {}) => ({
  _id: `s${numero}`,
  numero,
  tipo: 'objetivo',
  createdAt: noPassado(3),
  data_realizacao: noPassado(1),
  conteudos: [
    {
      turma_disciplina_id: 'd1',
      peso: 30,
      quantidade_questoes: 3,
      resultados: [{ aluno_id: 'a1', acertos: 2 }, { aluno_id: 'a2', acertos: 1 }],
    },
    {
      turma_disciplina_id: 'd3',
      peso: 60,
      quantidade_questoes: 2,
      resultados: [{ aluno_id: 'a3', acertos: 1 }],
    },
  ],
  ...extras,
});

test('translates the simulados from the point of view of the student', () => {
  const [simples] = montarSimulados([simuladoDoBanco(1)], 'a1', AGORA);

  assert.equal(simples.alunosComResultado, 3);
  assert.equal(simples.foraDoPrazo, false);
  assert.equal(simples.dataFutura, false);
  assert.equal(simples.conteudos[0].acertosAtuais, 2);
  assert.equal(simples.conteudos[0].alunosComResultado, 2);
  assert.equal(simples.conteudos[1].acertosAtuais, null);
});

test('the deadline starts exactly at 16 days, the same limit of the edit screen', () => {
  const dentro = montarSimulados([simuladoDoBanco(1, { createdAt: new Date(AGORA.getTime() - 16 * UM_DIA + 1) })], 'a1', AGORA);
  const fora = montarSimulados([simuladoDoBanco(1, { createdAt: noPassado(16) })], 'a1', AGORA);

  assert.equal(dentro[0].foraDoPrazo, false);
  assert.equal(fora[0].foraDoPrazo, true);
});

test('flags a simulado that has not happened yet', () => {
  const [futuro] = montarSimulados([simuladoDoBanco(1, { data_realizacao: new Date(AGORA.getTime() + UM_DIA) })], 'a1', AGORA);
  assert.equal(futuro.dataFutura, true);
});

const leitura = (mudancas = {}) => ({
  aba: 'Aluna',
  abas: ['Aluna'],
  bimestre: 2,
  colunas: [{ coluna: 'B', cabecalho: 'fisica - lo', cabecalhoOriginal: 'FÍSICA - LÔ', materia: 'fisica', professor: 'lo', fator: 0.3, notaDissertativa: 0 }],
  linhas: [{ numero: 1, linhaPlanilha: 4, total: 2, celulas: [{ coluna: 'B', celula: 'B4', status: 'acertos', acertos: 1 }] }],
  bloqueios: [],
  avisos: [],
  ...mudancas,
});

const previa = (mudancas = {}) => montarPrevia({
  leitura: leitura(mudancas),
  bimestreTela: 2,
  aluno: { _id: 'a9', nome: 'Aluna' },
  turma: { _id: 't1', serie: 1, ano: 2026 },
  disciplinas,
  simulados: [simuladoDoBanco(1)],
  mapeamentos: [],
  agora: AGORA,
});

test('builds the preview, linking the columns and allowing the review', () => {
  const resultado = previa();

  assert.equal(resultado.podeConferir, true);
  assert.equal(resultado.colunas[0].turma_disciplina_id, 'd1');
  assert.equal(resultado.colunas[0].notaDissertativaPlanilha, 0);
  assert.deepEqual(resultado.bloqueios, []);
  assert.deepEqual(resultado.avisos, []);
});

test('stops the review when the sheet is from another bimestre', () => {
  const resultado = previa({ bimestre: 3 });

  assert.equal(resultado.podeConferir, false);
  assert.equal(resultado.bloqueios[0].mensagem, 'A planilha é do 3º bimestre, mas a tela está no 2º bimestre.');
});

test('stops the review when the sheet could not be read', () => {
  const resultado = previa({ bimestre: null, colunas: [], linhas: [], bloqueios: [{ codigo: 'ARQUIVO_INVALIDO', mensagem: 'x', celulas: [] }] });

  assert.equal(resultado.podeConferir, false);
  assert.deepEqual(codigos(resultado.bloqueios), ['ARQUIVO_INVALIDO']);
});

test('keeps the fixed problems of the sheet apart from those the admin can fix on the screen', () => {
  const resultado = previa({
    bloqueios: [{ codigo: 'ACERTOS_INVALIDO', mensagem: 'x', celulas: ['B4'] }, { codigo: 'SIM_REPETIDO', mensagem: 'y', celulas: ['A5'] }],
    avisos: [{ codigo: 'CELULAS_VAZIAS', mensagem: 'z', celulas: ['C4'] }, { codigo: 'TOTAL_DIFERENTE', mensagem: 'w', celulas: ['O4'] }],
  });

  assert.deepEqual(codigos(resultado.problemasDaPlanilha.bloqueios), ['SIM_REPETIDO']);
  assert.deepEqual(codigos(resultado.problemasDaPlanilha.avisos), ['TOTAL_DIFERENTE']);
});

const payload = (mudancas = {}) => ({
  colunas: [{ coluna: 'B', cabecalho: 'fisica - lo', cabecalhoOriginal: 'FÍSICA - LÔ', fator: 0.3, notaDissertativaPlanilha: 0, turma_disciplina_id: 'd1' }],
  linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 1 }] }],
  tipos: [],
  pesos: [],
  ...mudancas,
});

const confirmar = (mudancas, simulados = [simuladoDoBanco(1)]) => montarEstadoDaConfirmacao({
  payload: payload(mudancas),
  disciplinas,
  simulados,
  aluno_id: 'a1',
  bimestre: 2,
  agora: AGORA,
});

test('never trusts the status sent by the screen', () => {
  const { estado } = confirmar({
    linhas: [{ numero: 1, celulas: [
      { coluna: 'B', celula: 'B4', acertos: 2, status: 'invalida' },
      { coluna: 'C', celula: 'C4', acertos: null, status: 'acertos' },
      { coluna: 'D', celula: 'D4', acertos: 'abc' },
      { coluna: 'E', celula: 'E4', acertos: 1.5 },
    ] }],
  });

  assert.deepEqual(estado.linhas[0].celulas.map(({ status }) => status), ['acertos', 'nao_fez', 'invalida', 'invalida']);
  assert.equal(estado.linhas[0].celulas[2].bruto, 'abc');
});

test('ignores a column linked to a disciplina of another class', () => {
  const { estado } = confirmar({ colunas: [{ coluna: 'B', cabecalho: 'x', cabecalhoOriginal: 'X', turma_disciplina_id: 'de-outra-turma' }] });

  assert.equal(estado.colunas[0].turma_disciplina_id, null);
  assert.equal(estado.colunas[0].fator, null);
});

test('applies type and weight changes over the current data', () => {
  const { estado, bloqueios } = confirmar({
    tipos: [{ simulado_id: 's1', tipo: 'dissertativo' }],
    pesos: [{ simulado_id: 's1', turma_disciplina_id: 'd1', peso: 40 }],
  });

  assert.deepEqual(bloqueios, []);
  assert.equal(estado.simulados[0].tipo, 'dissertativo');
  assert.equal(estado.simulados[0].conteudos[0].peso, 40);
  assert.equal(estado.simulados[0].conteudos[0].pesoOriginal, 30);
});

test('refuses changes to simulados and disciplinas that are not in the class', () => {
  const { bloqueios } = confirmar({
    tipos: [{ simulado_id: 'nao-existe', tipo: 'objetivo' }, { simulado_id: 's1', tipo: 'oral' }],
    pesos: [{ simulado_id: 's1', turma_disciplina_id: 'nao-existe', peso: 40 }],
  });

  assert.deepEqual(codigos(bloqueios), ['SIMULADO_INVALIDO', 'TIPO_INVALIDO', 'SIMULADO_INVALIDO']);
});

test('a missing payload builds an empty state', () => {
  const { estado } = montarEstadoDaConfirmacao({ payload: {}, disciplinas, simulados: [], aluno_id: 'a1', bimestre: 2, agora: AGORA });
  assert.deepEqual([estado.colunas, estado.linhas, estado.simulados], [[], [], []]);
});

test('blocks a weight that would push another student above 10', () => {
  const simulados = [
    simuladoDoBanco(1, { conteudos: [{ turma_disciplina_id: 'd1', peso: 30, quantidade_questoes: 10, resultados: [{ aluno_id: 'a1', acertos: 1 }, { aluno_id: 'a2', acertos: 9 }] }] }),
    simuladoDoBanco(2, { conteudos: [{ turma_disciplina_id: 'd1', peso: 30, quantidade_questoes: 10, resultados: [{ aluno_id: 'a2', acertos: 9 }] }] }),
  ];
  const { estado } = confirmar({
    pesos: [{ simulado_id: 's1', turma_disciplina_id: 'd1', peso: 100 }, { simulado_id: 's2', turma_disciplina_id: 'd1', peso: 100 }],
    linhas: [],
  }, simulados);

  const bloqueios = validarOutrosAlunos({ estado, simulados, aluno_id: 'a1', nomesDosAlunos: new Map([['a2', 'Rafael']]) });

  assert.deepEqual(codigos(bloqueios), ['NOTA_DE_OUTRO_ALUNO_ACIMA_DE_10']);
  assert.equal(bloqueios[0].mensagem, 'Com esse peso, a nota de Rafael em Física - Lourdes Prado daria 18,00, e o máximo é 10.');
});

test('does not check the other students when no weight changed', () => {
  const { estado } = confirmar({});
  assert.deepEqual(validarOutrosAlunos({ estado, simulados: [simuladoDoBanco(1)], aluno_id: 'a1', nomesDosAlunos: new Map() }), []);
});

const operar = (mudancas, simulados) => {
  const { estado } = confirmar(mudancas, simulados);
  return montarOperacoes({ estado, aluno_id: 'a1', agora: AGORA });
};

test('updates the grade of a result that already exists', () => {
  const { operacoes, contagem } = operar({});

  assert.deepEqual(contagem, { criados: 0, atualizados: 1, removidos: 0, ignorados: 0 });
  assert.deepEqual(operacoes[0].updateOne.update, { $set: { 'conteudos.$[c].resultados.$[r].acertos': 1, 'conteudos.$[c].resultados.$[r].nota': 3.33, 'conteudos.$[c].resultados.$[r].updatedAt': AGORA } });
  assert.deepEqual(operacoes[0].updateOne.arrayFilters, [{ 'c.turma_disciplina_id': 'd1' }, { 'r.aluno_id': 'a1' }]);
});

test('saves only the cell typed for a simulado missing from the sheet', () => {
  const simulados = [simuladoDoBanco(1), simuladoDoBanco(2)];
  const { operacoes, contagem } = operar({
    linhas: [
      { numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 2 }] },
      { numero: 2, celulas: [{ coluna: 'B', celula: 'SIM 2, coluna B', acertos: 3 }] },
    ],
  }, simulados);

  assert.deepEqual(contagem, { criados: 0, atualizados: 1, removidos: 0, ignorados: 1 });
  assert.equal(operacoes[0].updateOne.filter._id, 's2');
  assert.equal(operacoes[0].updateOne.update.$set['conteudos.$[c].resultados.$[r].acertos'], 3);
});

test('creates the result of a student who had none', () => {
  const semResultado = simuladoDoBanco(1, { conteudos: [{ turma_disciplina_id: 'd1', peso: 30, quantidade_questoes: 3, resultados: [] }] });
  const { operacoes, contagem } = operar({}, [semResultado]);

  assert.deepEqual(contagem, { criados: 1, atualizados: 0, removidos: 0, ignorados: 0 });
  assert.deepEqual(operacoes[0].updateOne.update, { $push: { 'conteudos.$[c].resultados': { aluno_id: 'a1', acertos: 1, nota: 3.33, createdAt: AGORA, updatedAt: AGORA } } });
});

test('removes the result when the sheet says the student did not take it', () => {
  const { operacoes, contagem } = operar({ linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: null }] }] });

  assert.deepEqual(contagem, { criados: 0, atualizados: 0, removidos: 1, ignorados: 0 });
  assert.deepEqual(operacoes[0].updateOne.update, { $pull: { 'conteudos.$[c].resultados': { aluno_id: 'a1' } } });
});

test('ignores an unchanged grade, an absence without a result and a cell without disciplina', () => {
  const { operacoes, contagem } = operar({
    colunas: [
      { coluna: 'B', cabecalho: 'a', cabecalhoOriginal: 'A', turma_disciplina_id: 'd1' },
      { coluna: 'C', cabecalho: 'b', cabecalhoOriginal: 'B', turma_disciplina_id: 'd3' },
      { coluna: 'D', cabecalho: 'c', cabecalhoOriginal: 'C', turma_disciplina_id: 'd2' },
    ],
    linhas: [{ numero: 1, celulas: [
      { coluna: 'B', celula: 'B4', acertos: 2 },
      { coluna: 'C', celula: 'C4', acertos: null },
      { coluna: 'D', celula: 'D4', acertos: 1 },
    ] }],
  });

  assert.deepEqual(operacoes, []);
  assert.deepEqual(contagem, { criados: 0, atualizados: 0, removidos: 0, ignorados: 2 });
});

test('writes only the type and the weight that changed', () => {
  const { operacoes } = operar({
    tipos: [{ simulado_id: 's1', tipo: 'dissertativo' }],
    pesos: [{ simulado_id: 's1', turma_disciplina_id: 'd1', peso: 40 }],
    linhas: [],
  });

  assert.equal(operacoes.length, 2);
  assert.deepEqual(operacoes[0].updateOne.update, { $set: { tipo: 'dissertativo' } });
  assert.deepEqual(operacoes[1].updateOne.update, { $set: { 'conteudos.$[c].peso': 40, 'conteudos.$[c].updatedAt': AGORA } });
  assert.deepEqual(operacoes[1].updateOne.arrayFilters, [{ 'c.turma_disciplina_id': 'd1' }]);
});

// As regras existem aqui e na tela. Estes estados cobrem cada código de problema nas duas versões.
const estadosDeParidade = () => {
  const invalida = estadoBase();
  invalida.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'invalida', bruto: 'ausente' };
  const vazia = estadoBase();
  vazia.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'vazia' };
  const acima = estadoBase();
  acima.linhas[0].celulas[0] = celula('B', 1, 9);
  const semSimulado = estadoBase();
  semSimulado.linhas.push({ numero: 7, celulas: [celula('B', 7, 1)] });
  const naoFezComNota = estadoBase({ simulados: [simulado(1, { conteudos: [conteudo('d1', { acertosAtuais: 1 }), conteudo('d3')] }), simulado(2)] });
  naoFezComNota.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'nao_fez' };

  return {
    limpo: estadoBase(),
    invalida,
    vazia,
    acima,
    semSimulado,
    naoFezComNota,
    semDono: estadoBase({ colunas: [coluna('B', null), coluna('C', 'd3')] }),
    colunasIguais: estadoBase({ colunas: [coluna('B', 'd1'), coluna('C', 'd1')] }),
    duplicado: estadoBase({ simulados: [simulado(1), simulado(1, { _id: 'x' }), simulado(2)] }),
    foraDoSimulado: estadoBase({ simulados: [simulado(1, { conteudos: [conteudo('d3')] }), simulado(2)] }),
    pesoInvalido: estadoBase({ simulados: [simulado(1, { conteudos: [conteudo('d1', { peso: 500 }), conteudo('d3')] }), simulado(2)] }),
    pesoAlteradoForaDoPrazo: estadoBase({ simulados: [simulado(1, { foraDoPrazo: true, conteudos: [conteudo('d1', { peso: 40 }), conteudo('d3')] }), simulado(2)] }),
    tipoAlterado: estadoBase({ simulados: [simulado(1, { tipo: 'dissertativo' }), simulado(2)] }),
    dataFutura: estadoBase({ simulados: [simulado(1, { dataFutura: true }), simulado(2)] }),
    foraDaPlanilha: estadoBase({ simulados: [simulado(1), simulado(2), simulado(3, { conteudos: [conteudo('d1', { acertosAtuais: 3 })] })] }),
    fator: estadoBase({ colunas: [coluna('B', 'd1', { fator: 0.5 }), coluna('C', 'd3')] }),
    dissertativa: estadoBase({ colunas: [coluna('B', 'd1', { notaDissertativaPlanilha: 0.75 }), coluna('C', 'd3')] }),
    notaAlta: estadoBase({
      simulados: [simulado(1, { conteudos: [conteudo('d1', { peso: 100, quantidade_questoes: 20 }), conteudo('d3')] }), simulado(2)],
      linhas: [{ numero: 1, celulas: [celula('B', 1, 15)] }, { numero: 2, celulas: [] }],
    }),
  };
};

for (const [nome, estado] of Object.entries(estadosDeParidade())) {
  test(`the screen and the server give the same result: ${nome}`, () => {
    assert.deepEqual(validarConferenciaDaTela(estado), validarConferencia(estado));
    assert.deepEqual(calcularNotasDaTela(estado, 'd1'), calcularNotas(estado, 'd1'));
  });
}

test('the parity states cover every problem code', () => {
  const vistos = new Set(Object.values(estadosDeParidade()).flatMap((estado) => {
    const { bloqueios, avisos } = validarConferencia(estado);
    return [...codigos(bloqueios), ...codigos(avisos)];
  }));

  assert.deepEqual([...vistos].sort(), [
    'ACERTOS_ACIMA_DO_LIMITE', 'ACERTOS_INVALIDO', 'CELULAS_VAZIAS', 'COLUNAS_MESMA_DISCIPLINA', 'COLUNA_SEM_DISCIPLINA',
    'DATA_FUTURA', 'DISCIPLINA_FORA_DO_SIMULADO', 'FATOR_DIFERENTE', 'FORA_DO_PRAZO', 'JA_TEM_RESULTADO', 'NOTA_ACIMA_DE_10',
    'NOTA_DISSERTATIVA_DIFERENTE', 'PESO_ALTERADO', 'PESO_INVALIDO', 'SIMULADO_DUPLICADO', 'SIMULADO_FORA_DA_PLANILHA',
    'SIM_SEM_SIMULADO', 'TIPO_ALTERADO',
  ]);
});
