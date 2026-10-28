import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarResultadoParaAluno, gerarResultados, populate } from '../DB/populatePastSimulados.js';

test('past-simulado population adds missing synthetic students and saves only changed records', async () => {
  const missing = 'synthetic-missing-student';
  const existing = 'synthetic-existing-student';
  let saved = 0;
  const simulation = {
    _id: 'synthetic-simulation',
    turma_id: 'synthetic-class',
    conteudos: [
      { quantidade_questoes: 5, resultados: [{ aluno_id: existing }] },
      { quantidade_questoes: 4 },
    ],
    async save() { saved += 1; },
  };
  const query = {};
  const logs = [];
  let exitCode;
  await populate({
    SimuladoModel: { async find(filter) { Object.assign(query, filter); return [simulation]; } },
    TurmaModel: { async findById() { return { alunos: [existing, missing] }; } },
    logger: { log: (message) => logs.push(message), error: assert.fail },
    exit: (code) => { exitCode = code; },
  });

  assert.ok(query.data_realizacao.$lt instanceof Date);
  assert.equal(saved, 1);
  assert.equal(exitCode, 0);
  assert.equal(simulation.conteudos[0].resultados.length, 2);
  assert.equal(simulation.conteudos[1].resultados.length, 2);
  assert.ok(logs.some((message) => String(message).includes('Simulados atualizados: 1')));
});

test('past-simulado population handles no matching simulations and reports its current empty baseline', async () => {
  let exitCode;
  const logs = [];
  await populate({
    SimuladoModel: { async find() { return []; } },
    TurmaModel: { async findById() { assert.fail('no simulation should query a class'); } },
    logger: { log: (message) => logs.push(message), error: assert.fail },
    exit: (code) => { exitCode = code; },
  });
  assert.equal(exitCode, 0);
  assert.ok(logs.some((message) => String(message).includes('atualizados: 0')));
});

test('past-simulado population reports persistence failures through injected boundaries', async () => {
  let exitCode;
  let errorLogged = false;
  await populate({
    SimuladoModel: { async find() { throw new Error('synthetic persistence failure'); } },
    TurmaModel: { async findById() { return null; } },
    logger: { log() {}, error(message, error) { errorLogged = message.includes('Erro populando simulados') && error.message === 'synthetic persistence failure'; } },
    exit: (code) => { exitCode = code; },
  });
  assert.equal(exitCode, 1);
  assert.equal(errorLogged, true);
});

test('population helper preserves its current generated fixture shape (non-normative)', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const result = gerarResultadoParaAluno('synthetic-student', 10);
    assert.equal(result.aluno_id, 'synthetic-student');
    assert.equal(result.acertos, 3);
    assert.equal(result.nota, 3);
    assert.equal(result.notificacao_pendente, 'enviada');
    assert.equal(gerarResultados(['a', 'b'], 10).length, 2);
  } finally {
    Math.random = originalRandom;
  }
});
