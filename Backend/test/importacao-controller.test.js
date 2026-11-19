import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import ImportacaoController from '../Controllers/ImportacaoController.js';
import Simulado from '../Models/Simulado.js';
import Turma from '../Models/Turma.js';
import TurmaDisciplina from '../Models/TurmaDisciplina.js';
import Usuario from '../Models/Usuario.js';
import MapeamentoColuna from '../Models/MapeamentoColuna.js';
import ImportacaoNotas from '../Models/ImportacaoNotas.js';
import Materia from '../Models/Materia.js';
import { armazenamentoPlanilhas } from '../services/armazenamentoPlanilhas.js';
import { receberPlanilha } from '../middlewares/uploadPlanilha.js';
import { response } from './helpers.js';

const ALUNO = '507f1f77bcf86cd799439011';
const OUTRO_ALUNO = '507f1f77bcf86cd799439012';
const ADMIN = '507f1f77bcf86cd799439013';
const BLOB = 'importacoes-notas/turma/2/conteudo.xlsx';
const TURMA = '507f1f77bcf86cd799439021';
const DISCIPLINA = '507f1f77bcf86cd799439031';
const SIMULADO = '507f1f77bcf86cd799439041';
const UM_DIA = 24 * 60 * 60 * 1000;

const simuladoDoBanco = () => ({
  _id: SIMULADO,
  numero: 1,
  tipo: 'objetivo',
  createdAt: new Date(),
  data_realizacao: new Date(Date.now() - UM_DIA),
  conteudos: [{
    turma_disciplina_id: DISCIPLINA,
    peso: 30,
    quantidade_questoes: 3,
    resultados: [{ aluno_id: OUTRO_ALUNO, acertos: 1 }],
  }],
});

function simularCadastro(t, { turma = { _id: TURMA, serie: 1, ano: 2026, alunos: [ALUNO, OUTRO_ALUNO] }, aluno = { _id: ALUNO, nome: 'Aluna Exemplo' } } = {}) {
  const chamadas = { simulados: [], mapeamentos: [], guardadas: [], apagadas: [], registros: [] };
  t.mock.method(armazenamentoPlanilhas, 'guardar', async (planilhaGuardada) => { chamadas.guardadas.push(planilhaGuardada); return { nome: BLOB, novo: true }; });
  t.mock.method(armazenamentoPlanilhas, 'apagar', async (nome) => { chamadas.apagadas.push(nome); });
  t.mock.method(ImportacaoNotas, 'create', async (registro) => { chamadas.registros.push(registro); });
  t.mock.method(Turma, 'findById', async () => turma);
  t.mock.method(Usuario, 'findById', async () => aluno);
  t.mock.method(Usuario, 'find', async () => [{ _id: ALUNO, nome: 'Aluna Exemplo' }, { _id: OUTRO_ALUNO, nome: 'Outro Aluno' }]);
  t.mock.method(TurmaDisciplina, 'aggregate', async () => [{ _id: DISCIPLINA, materia: 'Inglês', professor: 'Helena Vaz' }]);
  t.mock.method(Simulado, 'find', async () => [simuladoDoBanco()]);
  t.mock.method(MapeamentoColuna, 'find', async () => []);
  t.mock.method(Simulado, 'bulkWrite', async (operacoes) => { chamadas.simulados.push(operacoes); });
  t.mock.method(MapeamentoColuna, 'bulkWrite', async (operacoes) => { chamadas.mapeamentos.push(operacoes); });
  return chamadas;
}

async function planilha(bimestre = '2ºbimestre') {
  const workbook = new ExcelJS.Workbook();
  const aba = workbook.addWorksheet('Aluna Exemplo');
  aba.getCell('A2').value = bimestre;
  aba.getCell('A3').value = 'NOME ALUNO';
  aba.getCell('B3').value = 'INGLÊS';
  aba.getCell('C3').value = 'TOTAL';
  aba.getCell('A4').value = 'SIM 1';
  aba.getCell('B4').value = 2;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const corpoDaPrevia = () => ({ aluno_id: ALUNO, turma_id: TURMA, bimestre: '2' });

const corpoDaConfirmacao = (mudancas = {}) => ({
  aluno_id: ALUNO,
  turma_id: TURMA,
  bimestre: '2',
  aba: 'Aluna Exemplo',
  colunas: [{ coluna: 'B', cabecalho: 'ingles', cabecalhoOriginal: 'INGLÊS', fator: null, notaDissertativaPlanilha: null, turma_disciplina_id: DISCIPLINA, trocada: false }],
  linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 2 }] }],
  tipos: [],
  pesos: [],
  ...mudancas,
});

const arquivoEnviado = () => ({ buffer: Buffer.from('planilha'), originalname: 'Notas Física.xlsx', size: 8 });

// Como chega do multer: a planilha em req.file e a conferência em JSON no campo "dados".
const pedido = (mudancas = {}) => ({
  file: arquivoEnviado(),
  body: { dados: JSON.stringify(corpoDaConfirmacao(mudancas)) },
  user: { id: ADMIN },
});

test('the preview requires a file', async () => {
  const res = response();
  await ImportacaoController.previa({ body: corpoDaPrevia() }, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.message, 'Envie a planilha.');
});

for (const [descricao, mudanca, mensagem] of [
  ['the student id', { aluno_id: 'x' }, 'Id de aluno inválido'],
  ['the class id', { turma_id: 'x' }, 'Id de turma inválido'],
  ['the bimestre', { bimestre: '5' }, 'Informe um bimestre válido'],
]) {
  test(`the preview and the confirmation validate ${descricao}`, async () => {
    const previa = response();
    await ImportacaoController.previa({ file: { buffer: Buffer.alloc(0) }, body: { ...corpoDaPrevia(), ...mudanca } }, previa);
    assert.equal(previa.statusCode, 422);
    assert.equal(previa.body.message, mensagem);

    const confirmacao = response();
    await ImportacaoController.confirmar(pedido(mudanca), confirmacao);
    assert.equal(confirmacao.statusCode, 422);
    assert.equal(confirmacao.body.message, mensagem);
  });
}

for (const [descricao, cadastro, mensagem] of [
  ['the class does not exist', { turma: null }, 'Turma não encontrada'],
  ['the student is not in the class', { turma: { _id: TURMA, alunos: [OUTRO_ALUNO] } }, 'O aluno não faz parte desta turma'],
  ['the student does not exist', { aluno: null }, 'Aluno não encontrado'],
]) {
  test(`refuses the import when ${descricao}`, async (t) => {
    simularCadastro(t, cadastro);

    const previa = response();
    await ImportacaoController.previa({ file: { buffer: await planilha() }, body: corpoDaPrevia() }, previa);
    assert.equal(previa.statusCode, 422);
    assert.equal(previa.body.message, mensagem);

    const confirmacao = response();
    await ImportacaoController.confirmar(pedido(), confirmacao);
    assert.equal(confirmacao.statusCode, 422);
    assert.equal(confirmacao.body.message, mensagem);
  });
}

test('the confirmation requires the file', async () => {
  const res = response();
  await ImportacaoController.confirmar({ ...pedido(), file: undefined }, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.message, 'Envie a planilha.');
});

for (const [descricao, dados] of [['missing', undefined], ['not JSON', 'não é json'], ['not an object', '[1, 2]'], ['null', 'null']]) {
  test(`the confirmation refuses data that is ${descricao}`, async () => {
    const res = response();
    await ImportacaoController.confirmar({ ...pedido(), body: { dados } }, res);

    assert.equal(res.statusCode, 422);
    assert.equal(res.body.message, 'Os dados da conferência não vieram no formato esperado.');
  });
}

test('the preview reads the sheet, links the columns and writes nothing', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.previa({ file: { buffer: await planilha() }, body: corpoDaPrevia() }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.podeConferir, true);
  assert.equal(res.body.aluno.nome, 'Aluna Exemplo');
  assert.equal(res.body.turma.serie, 1);
  assert.equal(res.body.colunas[0].turma_disciplina_id, DISCIPLINA);
  assert.deepEqual(res.body.bloqueios, []);
  assert.deepEqual([chamadas.simulados, chamadas.mapeamentos], [[], []]);
});

test('the preview answers with the block when the sheet is from another bimestre', async (t) => {
  simularCadastro(t);
  const res = response();

  await ImportacaoController.previa({ file: { buffer: await planilha('3º bimestre') }, body: corpoDaPrevia() }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.podeConferir, false);
  assert.equal(res.body.bloqueios[0].codigo, 'BIMESTRE_DIFERENTE');
});

test('the preview reports an unexpected failure', async (t) => {
  simularCadastro(t);
  t.mock.method(MapeamentoColuna, 'find', async () => { throw new Error('banco fora do ar'); });
  const res = response();

  await ImportacaoController.previa({ file: { buffer: await planilha() }, body: corpoDaPrevia() }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'banco fora do ar');
});

test('the confirmation creates the result and answers with the counts', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    message: 'Notas importadas com sucesso', criados: 1, atualizados: 0, removidos: 0, ignorados: 0, simuladosCriados: 0, disciplinasAdicionadas: 0,
    disciplinasCadastradas: 0, materiasCadastradas: 0, simulado_id: SIMULADO,
  });

  const [operacao] = chamadas.simulados[0];
  const novo = operacao.updateOne.update.$push['conteudos.$[c].resultados'];
  assert.equal(String(novo.aluno_id), ALUNO);
  assert.equal(novo.acertos, 2);
  assert.equal(novo.nota, 6.67);
  assert.equal(String(operacao.updateOne.filter._id), SIMULADO);
  assert.equal(String(operacao.updateOne.arrayFilters[0]['c.turma_disciplina_id']), DISCIPLINA);
  assert.deepEqual(chamadas.mapeamentos, []);
});

test('the confirmation stores the sheet and records the import', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(chamadas.guardadas, [{ buffer: Buffer.from('planilha'), turma_id: TURMA, bimestre: 2 }]);
  assert.deepEqual(chamadas.registros, [{
    turma_id: TURMA,
    aluno_id: ALUNO,
    bimestre: 2,
    importado_por: ADMIN,
    planilha: { blob: BLOB, nome_original: 'Notas Física.xlsx', tamanho: 8, aba: 'Aluna Exemplo' },
    contagem: { criados: 1, atualizados: 0, removidos: 0, ignorados: 0, simuladosCriados: 0, disciplinasAdicionadas: 0, disciplinasCadastradas: 0, materiasCadastradas: 0 },
  }]);
  assert.deepEqual(chamadas.apagadas, []);
});

test('the record has no blob when the environment does not store sheets', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(armazenamentoPlanilhas, 'guardar', async () => null);
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(chamadas.registros[0].planilha.blob, null);
});

test('the record ignores a tab name that is not text', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar(pedido({ aba: 42 }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(chamadas.registros[0].planilha.aba, null);
});

test('the confirmation writes no grade when the sheet cannot be stored', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(armazenamentoPlanilhas, 'guardar', async () => { throw new Error('sem permissão no container'); });
  const erros = t.mock.method(console, 'error', () => {});
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 502);
  assert.equal(res.body.message, 'Não foi possível guardar a planilha. Nenhuma nota foi gravada.');
  assert.deepEqual([chamadas.simulados, chamadas.mapeamentos, chamadas.registros], [[], [], []]);
  assert.match(erros.mock.calls[0].arguments.join(' '), /sem permissão no container/);
});

test('the confirmation removes the stored sheet when the grades cannot be written', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(Simulado, 'bulkWrite', async () => { throw new Error('escrita falhou'); });
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'escrita falhou');
  assert.deepEqual(chamadas.apagadas, [BLOB]);
  assert.deepEqual(chamadas.registros, []);
});

test('a failed import keeps a sheet that another import already stored', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(armazenamentoPlanilhas, 'guardar', async () => ({ nome: BLOB, novo: false }));
  t.mock.method(Simulado, 'bulkWrite', async () => { throw new Error('escrita falhou'); });
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(chamadas.apagadas, []);
});

test('a failure removing the sheet is logged and keeps the original error', async (t) => {
  simularCadastro(t);
  t.mock.method(Simulado, 'bulkWrite', async () => { throw new Error('escrita falhou'); });
  t.mock.method(armazenamentoPlanilhas, 'apagar', async () => { throw new Error('apagar não permitido'); });
  const erros = t.mock.method(console, 'error', () => {});
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'escrita falhou');
  assert.match(erros.mock.calls[0].arguments.join(' '), /apagar não permitido/);
});

test('a failure recording the import keeps the grades and answers 200', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(ImportacaoNotas, 'create', async () => { throw new Error('registro falhou'); });
  const erros = t.mock.method(console, 'error', () => {});
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(chamadas.simulados.length, 1);
  assert.deepEqual(chamadas.apagadas, []);
  assert.match(erros.mock.calls[0].arguments.join(' '), /registro falhou/);
});

test('the confirmation saves the column the admin linked by hand', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar(pedido({
    colunas: [{ coluna: 'B', cabecalho: 'artes', cabecalhoOriginal: 'ARTES', turma_disciplina_id: DISCIPLINA, trocada: true }],
  }), res);

  assert.equal(res.statusCode, 200);
  const { filter, update, upsert } = chamadas.mapeamentos[0][0].updateOne;
  assert.equal(String(filter.turma_id), TURMA);
  assert.equal(filter.cabecalho, 'artes');
  assert.equal(String(update.$set.turma_disciplina_id), DISCIPLINA);
  assert.equal(upsert, true);
});

test('the confirmation does not touch the database when nothing changed', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar(pedido({ linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: null }] }] }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ignorados, 1);
  assert.deepEqual(chamadas.simulados, []);
});

test('the confirmation repeats the checks and writes nothing when a rule fails', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar(pedido({ linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 9 }] }] }), res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.bloqueios[0].codigo, 'ACERTOS_ACIMA_DO_LIMITE');
  assert.deepEqual([chamadas.simulados, chamadas.guardadas, chamadas.registros], [[], [], []]);
});

test('the confirmation refuses a weight that would push another student above 10', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(Simulado, 'find', async () => [{
    ...simuladoDoBanco(),
    conteudos: [{ turma_disciplina_id: DISCIPLINA, peso: 30, quantidade_questoes: 20, resultados: [{ aluno_id: OUTRO_ALUNO, acertos: 15 }] }],
  }]);
  const res = response();

  await ImportacaoController.confirmar(pedido({ pesos: [{ simulado_id: SIMULADO, turma_disciplina_id: DISCIPLINA, peso: 100 }] }), res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.bloqueios[0].codigo, 'NOTA_DE_OUTRO_ALUNO_ACIMA_DE_10');
  assert.match(res.body.bloqueios[0].mensagem, /Outro Aluno em Inglês - Helena Vaz daria 15,00/);
  assert.deepEqual(chamadas.simulados, []);
});

const OUTRA_DISCIPLINA = '507f1f77bcf86cd799439032';

test('the confirmation creates a simulado that was not registered, before any other write', async (t) => {
  const chamadas = simularCadastro(t);
  const data = new Date(2026, 10, 18).toISOString();
  const res = response();

  await ImportacaoController.confirmar(pedido({
    linhas: [
      { numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 2 }] },
      { numero: 2, celulas: [{ coluna: 'B', celula: 'B5', acertos: 4 }] },
    ],
    novos: [{ numero: 2, tipo: 'dissertativo', data_realizacao: data, conteudos: [{ turma_disciplina_id: DISCIPLINA, quantidade_questoes: 5, peso: 20 }] }],
  }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.simuladosCriados, 1);
  assert.equal(res.body.criados, 2);
  assert.equal(res.body.simulado_id, SIMULADO);

  const [insercao, resultado] = chamadas.simulados[0];
  const { document } = insercao.insertOne;
  assert.ok(resultado.updateOne);
  assert.equal(String(document.turma_id), TURMA);
  assert.deepEqual([document.numero, document.tipo, document.bimestre, document.data_realizacao], [2, 'dissertativo', 2, data]);
  assert.equal(String(document.conteudos[0].turma_disciplina_id), DISCIPLINA);
  assert.deepEqual([document.conteudos[0].quantidade_questoes, document.conteudos[0].peso], [5, 20]);
  assert.equal(String(document.conteudos[0].resultados[0].aluno_id), ALUNO);
  assert.deepEqual([document.conteudos[0].resultados[0].acertos, document.conteudos[0].resultados[0].nota], [4, 8]);
  assert.equal(chamadas.registros[0].contagem.simuladosCriados, 1);
});

test('the confirmation points to a created simulado when it is the first of the bimester', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(Simulado, 'find', async () => [{ ...simuladoDoBanco(), numero: 3 }]);
  const res = response();

  await ImportacaoController.confirmar(pedido({
    linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 2 }] }],
    novos: [{ numero: 1, tipo: 'objetivo', data_realizacao: new Date().toISOString(), conteudos: [{ turma_disciplina_id: DISCIPLINA, quantidade_questoes: 3, peso: 30 }] }],
  }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.simulado_id, String(chamadas.simulados[0][0].insertOne.document._id));
});

test('the confirmation blocks a new simulado without questions and one whose number already exists', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar(pedido({
    linhas: [
      { numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 2 }] },
      { numero: 2, celulas: [{ coluna: 'B', celula: 'B5', acertos: 1 }] },
    ],
    novos: [{ numero: 1, tipo: 'objetivo', data_realizacao: new Date().toISOString(), conteudos: [] }],
  }), res);

  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.body.bloqueios.map(({ codigo }) => codigo), ['SIMULADO_INVALIDO', 'QUESTOES_INVALIDAS', 'PESO_INVALIDO']);
  assert.match(res.body.bloqueios[0].mensagem, /SIM 1 foi cadastrado enquanto a tela estava aberta/);
  assert.deepEqual(chamadas.simulados, []);
});

test('the confirmation adds a disciplina that the simulado did not have, with the result inside', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(TurmaDisciplina, 'aggregate', async () => [
    { _id: DISCIPLINA, materia: 'Inglês', professor: 'Helena Vaz' },
    { _id: OUTRA_DISCIPLINA, materia: 'Artes', professor: 'Toni Almeida' },
  ]);
  const res = response();

  await ImportacaoController.confirmar(pedido({
    colunas: [
      { coluna: 'B', cabecalho: 'ingles', cabecalhoOriginal: 'INGLÊS', turma_disciplina_id: DISCIPLINA },
      { coluna: 'C', cabecalho: 'artes', cabecalhoOriginal: 'ARTES', turma_disciplina_id: OUTRA_DISCIPLINA },
    ],
    linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 2 }, { coluna: 'C', celula: 'C4', acertos: 1 }] }],
    conteudosNovos: [{ simulado_id: SIMULADO, turma_disciplina_id: OUTRA_DISCIPLINA, quantidade_questoes: 4, peso: 10 }],
  }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.disciplinasAdicionadas, 1);
  const adicao = chamadas.simulados[0].find(({ updateOne }) => updateOne?.update.$push?.conteudos);
  const { conteudos } = adicao.updateOne.update.$push;
  assert.equal(String(adicao.updateOne.filter._id), SIMULADO);
  assert.equal(String(conteudos.turma_disciplina_id), OUTRA_DISCIPLINA);
  assert.deepEqual([conteudos.quantidade_questoes, conteudos.peso, conteudos.resultados[0].acertos, conteudos.resultados[0].nota], [4, 10, 1, 2.5]);
  assert.equal(String(conteudos.resultados[0].aluno_id), ALUNO);
});

test('the confirmation changes the questions and recalculates the grade of every student', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar(pedido({ questoes: [{ simulado_id: SIMULADO, turma_disciplina_id: DISCIPLINA, quantidade_questoes: 4 }] }), res);

  assert.equal(res.statusCode, 200);
  const [questoes, notaDoOutro, notaDoAluno] = chamadas.simulados[0];
  assert.equal(questoes.updateOne.update.$set['conteudos.$[c].quantidade_questoes'], 4);
  assert.equal(notaDoOutro.updateOne.update.$set['conteudos.$[c].resultados.$[r].nota'], 2.5);
  assert.equal(String(notaDoOutro.updateOne.arrayFilters[1]['r.aluno_id']), OUTRO_ALUNO);
  assert.equal(notaDoAluno.updateOne.update.$push['conteudos.$[c].resultados'].nota, 5);
});

test('the confirmation refuses fewer questions than the acertos of another student', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(Simulado, 'find', async () => [{
    ...simuladoDoBanco(),
    conteudos: [{ turma_disciplina_id: DISCIPLINA, peso: 30, quantidade_questoes: 3, resultados: [{ aluno_id: OUTRO_ALUNO, acertos: 3 }] }],
  }]);
  const res = response();

  await ImportacaoController.confirmar(pedido({ questoes: [{ simulado_id: SIMULADO, turma_disciplina_id: DISCIPLINA, quantidade_questoes: 2 }], linhas: [] }), res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.bloqueios[0].codigo, 'QUESTOES_ABAIXO_DOS_ACERTOS');
  assert.equal(res.body.bloqueios[0].mensagem, 'Simulado 1, Inglês - Helena Vaz: Outro Aluno tem 3 acertos, mais do que as 2 questões.');
  assert.deepEqual(chamadas.simulados, []);
});

test('the confirmation answers 422 when another import created the same simulado meanwhile', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(Simulado, 'bulkWrite', async () => { throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 }); });
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.bloqueios[0].codigo, 'SIMULADO_INVALIDO');
  assert.deepEqual(chamadas.apagadas, [BLOB]);
});

const PROFESSORA = '507f1f77bcf86cd799439051';
const MATERIA_NOVA = '507f1f77bcf86cd799439061';
const DISCIPLINA_NOVA = '507f1f77bcf86cd799439071';

// A coluna C ("ARTES") não tinha dono: na revisão, o admin escolheu Rita Lima, e a matéria Artes ainda não existe.
const comDisciplinaNova = (mudancas = {}) => ({
  colunas: [
    { coluna: 'B', cabecalho: 'ingles', cabecalhoOriginal: 'INGLÊS', turma_disciplina_id: DISCIPLINA },
    { coluna: 'C', cabecalho: 'artes', cabecalhoOriginal: 'ARTES', turma_disciplina_id: 'nova-1', trocada: true },
  ],
  linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 2 }, { coluna: 'C', celula: 'C4', acertos: 3 }] }],
  conteudosNovos: [{ simulado_id: SIMULADO, turma_disciplina_id: 'nova-1', quantidade_questoes: 4, peso: 10 }],
  disciplinasNovas: [{ id: 'nova-1', materia_id: null, materia_nome: 'Artes', professor_id: PROFESSORA }],
  ...mudancas,
});

function simularDisciplinaNova(t, { materias = [], daTurma = [], comProfessora = true } = {}) {
  const ordem = [];
  t.mock.method(armazenamentoPlanilhas, 'guardar', async () => { ordem.push('planilha'); return { nome: BLOB, novo: true }; });
  t.mock.method(Materia, 'find', async () => materias);
  t.mock.method(TurmaDisciplina, 'find', async () => daTurma);
  t.mock.method(Usuario, 'find', async () => [
    { _id: ALUNO, nome: 'Aluna Exemplo' },
    { _id: OUTRO_ALUNO, nome: 'Outro Aluno' },
    ...(comProfessora ? [{ _id: PROFESSORA, nome: 'Rita Lima', tipo_usuario: 'professor' }] : []),
  ]);
  const materiaCriada = t.mock.method(Materia, 'create', async ({ nome }) => { ordem.push('materia'); return { _id: MATERIA_NOVA, nome }; });
  const disciplinaCriada = t.mock.method(TurmaDisciplina, 'create', async (dados) => { ordem.push('disciplina'); return { _id: DISCIPLINA_NOVA, ...dados }; });
  return { ordem, materiaCriada, disciplinaCriada };
}

test('the confirmation creates the subject and the disciplina chosen in the review only after the checks, with the real id', async (t) => {
  const chamadas = simularCadastro(t);
  const { ordem, materiaCriada, disciplinaCriada } = simularDisciplinaNova(t);
  const res = response();

  await ImportacaoController.confirmar(pedido(comDisciplinaNova()), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(ordem, ['planilha', 'materia', 'disciplina']);
  assert.deepEqual(materiaCriada.mock.calls[0].arguments[0], { nome: 'Artes' });
  assert.deepEqual(disciplinaCriada.mock.calls[0].arguments[0], { turma_id: TURMA, materia_id: MATERIA_NOVA, professor_id: PROFESSORA });
  assert.deepEqual([res.body.disciplinasCadastradas, res.body.materiasCadastradas], [1, 1]);

  const adicao = chamadas.simulados[0].find(({ updateOne }) => updateOne?.update.$push?.conteudos);
  assert.equal(String(adicao.updateOne.update.$push.conteudos.turma_disciplina_id), DISCIPLINA_NOVA);
  assert.equal(adicao.updateOne.update.$push.conteudos.resultados[0].acertos, 3);
  const [mapeamento] = chamadas.mapeamentos[0];
  assert.equal(String(mapeamento.updateOne.update.$set.turma_disciplina_id), DISCIPLINA_NOVA);
  assert.deepEqual(chamadas.registros[0].contagem, {
    criados: 2, atualizados: 0, removidos: 0, ignorados: 0, simuladosCriados: 0, disciplinasAdicionadas: 1,
    disciplinasCadastradas: 1, materiasCadastradas: 1,
  });
});

test('the confirmation creates nothing when the import has a block', async (t) => {
  const chamadas = simularCadastro(t);
  const { materiaCriada, disciplinaCriada } = simularDisciplinaNova(t);
  const res = response();

  await ImportacaoController.confirmar(pedido(comDisciplinaNova({ conteudosNovos: [] })), res);

  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.body.bloqueios.map(({ codigo }) => codigo), ['QUESTOES_INVALIDAS', 'PESO_INVALIDO']);
  assert.ok(res.body.avisos.some(({ codigo }) => codigo === 'DISCIPLINA_NOVA'));
  assert.deepEqual([materiaCriada.mock.callCount(), disciplinaCriada.mock.callCount()], [0, 0]);
  assert.deepEqual([chamadas.simulados, chamadas.mapeamentos], [[], []]);
});

test('the confirmation undoes the subject and the disciplina when the grades cannot be written', async (t) => {
  const chamadas = simularCadastro(t);
  simularDisciplinaNova(t);
  t.mock.method(Simulado, 'bulkWrite', async () => { throw new Error('escrita falhou'); });
  const disciplinasApagadas = t.mock.method(TurmaDisciplina, 'deleteMany', async () => ({}));
  const materiasApagadas = t.mock.method(Materia, 'deleteMany', async () => ({}));
  const res = response();

  await ImportacaoController.confirmar(pedido(comDisciplinaNova()), res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(disciplinasApagadas.mock.calls[0].arguments[0], { _id: { $in: [DISCIPLINA_NOVA] } });
  assert.deepEqual(materiasApagadas.mock.calls[0].arguments[0], { _id: { $in: [MATERIA_NOVA] } });
  assert.deepEqual(chamadas.apagadas, [BLOB]);
  assert.deepEqual(chamadas.registros, []);
});

test('a disciplina chosen in the review that the class already has keeps the real one and creates nothing', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(TurmaDisciplina, 'aggregate', async () => [
    { _id: DISCIPLINA, materia: 'Inglês', professor: 'Helena Vaz' },
    { _id: DISCIPLINA_NOVA, materia: 'Artes', professor: 'Rita Lima' },
  ]);
  const { materiaCriada, disciplinaCriada } = simularDisciplinaNova(t, {
    materias: [{ _id: MATERIA_NOVA, nome: 'Artes' }],
    daTurma: [{ _id: DISCIPLINA_NOVA, materia_id: MATERIA_NOVA, professor_id: PROFESSORA }],
  });
  const res = response();

  await ImportacaoController.confirmar(pedido(comDisciplinaNova()), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual([materiaCriada.mock.callCount(), disciplinaCriada.mock.callCount()], [0, 0]);
  assert.deepEqual([res.body.disciplinasCadastradas, res.body.materiasCadastradas], [0, 0]);
  const adicao = chamadas.simulados[0].find(({ updateOne }) => updateOne?.update.$push?.conteudos);
  assert.equal(String(adicao.updateOne.update.$push.conteudos.turma_disciplina_id), DISCIPLINA_NOVA);
});

test('the confirmation blocks a disciplina whose professor no longer exists', async (t) => {
  simularCadastro(t);
  const { disciplinaCriada } = simularDisciplinaNova(t, { comProfessora: false });
  const res = response();

  await ImportacaoController.confirmar(pedido(comDisciplinaNova()), res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.bloqueios[0].codigo, 'DISCIPLINA_NOVA_INVALIDA');
  assert.equal(res.body.bloqueios[0].mensagem, 'O professor escolhido para Artes não existe mais no sistema. Importe de novo.');
  assert.equal(disciplinaCriada.mock.callCount(), 0);
});

test('the confirmation reports an unexpected failure before writing', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(Usuario, 'find', async () => { throw new Error('banco fora do ar'); });
  const res = response();

  await ImportacaoController.confirmar(pedido(), res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'banco fora do ar');
  assert.deepEqual(chamadas.guardadas, []);
});

async function enviar(t, nome, conteudo) {
  const app = express();
  app.post('/upload', receberPlanilha, (req, res) => res.json({ recebido: req.file.originalname, tamanho: req.file.size }));
  const servidor = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => servidor.close());

  const dados = new FormData();
  dados.append('arquivo', new Blob([conteudo]), nome);
  const resposta = await fetch(`http://127.0.0.1:${servidor.address().port}/upload`, { method: 'POST', body: dados });
  return { status: resposta.status, corpo: await resposta.json() };
}

test('the upload accepts an xlsx and keeps it in memory', async (t) => {
  const { status, corpo } = await enviar(t, 'NOTAS.XLSX', Buffer.from('x'));
  assert.equal(status, 200);
  assert.deepEqual(corpo, { recebido: 'NOTAS.XLSX', tamanho: 1 });
});

test('the upload keeps accents in the file name', async (t) => {
  const { status, corpo } = await enviar(t, 'Notas Física 2º.xlsx', Buffer.from('x'));
  assert.equal(status, 200);
  assert.equal(corpo.recebido, 'Notas Física 2º.xlsx');
});

test('the upload refuses other file types', async (t) => {
  const { status, corpo } = await enviar(t, 'notas.csv', Buffer.from('x'));
  assert.equal(status, 422);
  assert.equal(corpo.message, 'Envie uma planilha .xlsx.');
});

test('the upload refuses a file above 2 MB', async (t) => {
  const { status, corpo } = await enviar(t, 'notas.xlsx', Buffer.alloc(2 * 1024 * 1024 + 1));
  assert.equal(status, 422);
  assert.equal(corpo.message, 'O arquivo passa do limite de 2 MB.');
});
