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
import { receberPlanilha } from '../middlewares/uploadPlanilha.js';
import { response } from './helpers.js';

const ALUNO = '507f1f77bcf86cd799439011';
const OUTRO_ALUNO = '507f1f77bcf86cd799439012';
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
  const chamadas = { simulados: [], mapeamentos: [] };
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
  colunas: [{ coluna: 'B', cabecalho: 'ingles', cabecalhoOriginal: 'INGLÊS', fator: null, notaDissertativaPlanilha: null, turma_disciplina_id: DISCIPLINA, trocada: false }],
  linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 2 }] }],
  tipos: [],
  pesos: [],
  ...mudancas,
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
    await ImportacaoController.confirmar({ body: { ...corpoDaConfirmacao(), ...mudanca } }, confirmacao);
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
    await ImportacaoController.confirmar({ body: corpoDaConfirmacao() }, confirmacao);
    assert.equal(confirmacao.statusCode, 422);
    assert.equal(confirmacao.body.message, mensagem);
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

  await ImportacaoController.confirmar({ body: corpoDaConfirmacao() }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { message: 'Notas importadas com sucesso', criados: 1, atualizados: 0, removidos: 0, ignorados: 0 });

  const [operacao] = chamadas.simulados[0];
  const novo = operacao.updateOne.update.$push['conteudos.$[c].resultados'];
  assert.equal(String(novo.aluno_id), ALUNO);
  assert.equal(novo.acertos, 2);
  assert.equal(novo.nota, 6.67);
  assert.equal(String(operacao.updateOne.filter._id), SIMULADO);
  assert.equal(String(operacao.updateOne.arrayFilters[0]['c.turma_disciplina_id']), DISCIPLINA);
  assert.deepEqual(chamadas.mapeamentos, []);
});

test('the confirmation saves the column the admin linked by hand', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar({
    body: corpoDaConfirmacao({
      colunas: [{ coluna: 'B', cabecalho: 'artes', cabecalhoOriginal: 'ARTES', turma_disciplina_id: DISCIPLINA, trocada: true }],
    }),
  }, res);

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

  await ImportacaoController.confirmar({ body: corpoDaConfirmacao({ linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: null }] }] }) }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ignorados, 1);
  assert.deepEqual(chamadas.simulados, []);
});

test('the confirmation repeats the checks and writes nothing when a rule fails', async (t) => {
  const chamadas = simularCadastro(t);
  const res = response();

  await ImportacaoController.confirmar({ body: corpoDaConfirmacao({ linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', acertos: 9 }] }] }) }, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.bloqueios[0].codigo, 'ACERTOS_ACIMA_DO_LIMITE');
  assert.deepEqual(chamadas.simulados, []);
});

test('the confirmation refuses a weight that would push another student above 10', async (t) => {
  const chamadas = simularCadastro(t);
  t.mock.method(Simulado, 'find', async () => [{
    ...simuladoDoBanco(),
    conteudos: [{ turma_disciplina_id: DISCIPLINA, peso: 30, quantidade_questoes: 20, resultados: [{ aluno_id: OUTRO_ALUNO, acertos: 15 }] }],
  }]);
  const res = response();

  await ImportacaoController.confirmar({ body: corpoDaConfirmacao({ pesos: [{ simulado_id: SIMULADO, turma_disciplina_id: DISCIPLINA, peso: 100 }] }) }, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.bloqueios[0].codigo, 'NOTA_DE_OUTRO_ALUNO_ACIMA_DE_10');
  assert.match(res.body.bloqueios[0].mensagem, /Outro Aluno em Inglês - Helena Vaz daria 15,00/);
  assert.deepEqual(chamadas.simulados, []);
});

test('the confirmation reports an unexpected failure', async (t) => {
  simularCadastro(t);
  t.mock.method(Simulado, 'bulkWrite', async () => { throw new Error('escrita falhou'); });
  const res = response();

  await ImportacaoController.confirmar({ body: corpoDaConfirmacao() }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'escrita falhou');
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
