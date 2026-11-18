import test from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazenamento, nomeDoBlob } from '../services/armazenamentoPlanilhas.js';
import { comAmbiente } from './ambiente.js';

const PLANILHA = { buffer: Buffer.from('planilha'), turma_id: 'turma1', bimestre: 2 };

// Guarda o que cada blob recebeu, sem falar com a Azure. Como a Azure, recusa gravar por cima de um blob que existe.
function containerFalso() {
  const chamadas = { enviados: [], apagados: [], aberturas: 0 };
  const existentes = new Set();
  const container = {
    getBlockBlobClient: (nome) => ({
      uploadData: async (buffer, opcoes) => {
        if (opcoes.conditions?.ifNoneMatch === '*' && existentes.has(nome)) {
          throw Object.assign(new Error('The specified blob already exists.'), { statusCode: 409, details: { errorCode: 'BlobAlreadyExists' } });
        }
        existentes.add(nome);
        chamadas.enviados.push({ nome, buffer, opcoes });
      },
      deleteIfExists: async () => {
        existentes.delete(nome);
        chamadas.apagados.push(nome);
      },
    }),
  };
  const obterContainer = () => {
    chamadas.aberturas += 1;
    return container;
  };
  return { chamadas, obterContainer };
}

test('the blob name comes from the content, grouped by class and bimestre', () => {
  const nome = nomeDoBlob(PLANILHA);

  assert.match(nome, /^importacoes-notas\/turma1\/2\/[0-9a-f]{64}\.xlsx$/);
  assert.equal(nomeDoBlob({ ...PLANILHA, buffer: Buffer.from('planilha') }), nome);
  assert.notEqual(nomeDoBlob({ ...PLANILHA, buffer: Buffer.from('planilha editada') }), nome);
});

test('stores a new sheet as xlsx without overwriting', async () => {
  const { chamadas, obterContainer } = containerFalso();
  const armazenamento = criarArmazenamento({ obterContainer, ativo: () => true });

  const guardada = await armazenamento.guardar(PLANILHA);

  assert.deepEqual(guardada, { nome: nomeDoBlob(PLANILHA), novo: true });
  assert.deepEqual(chamadas.enviados, [{
    nome: guardada.nome,
    buffer: PLANILHA.buffer,
    opcoes: {
      blobHTTPHeaders: { blobContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      conditions: { ifNoneMatch: '*' },
    },
  }]);
});

test('the same file sent for two students is stored once', async () => {
  const { chamadas, obterContainer } = containerFalso();
  const armazenamento = criarArmazenamento({ obterContainer, ativo: () => true });

  const daKate = await armazenamento.guardar(PLANILHA);
  const doJoshua = await armazenamento.guardar({ ...PLANILHA, buffer: Buffer.from('planilha') });

  assert.equal(daKate.novo, true);
  assert.deepEqual(doJoshua, { nome: daKate.nome, novo: false });
  assert.equal(chamadas.enviados.length, 1);
});

test('a precondition failure also means the sheet already exists', async () => {
  const armazenamento = criarArmazenamento({
    ativo: () => true,
    obterContainer: () => ({
      getBlockBlobClient: () => ({ uploadData: async () => { throw Object.assign(new Error('condição'), { statusCode: 412, details: { errorCode: 'ConditionNotMet' } }); } }),
    }),
  });

  assert.deepEqual(await armazenamento.guardar(PLANILHA), { nome: nomeDoBlob(PLANILHA), novo: false });
});

test('opens the container only once', async () => {
  const { chamadas, obterContainer } = containerFalso();
  const armazenamento = criarArmazenamento({ obterContainer, ativo: () => true });

  const { nome } = await armazenamento.guardar(PLANILHA);
  await armazenamento.apagar(nome);

  assert.equal(chamadas.aberturas, 1);
  assert.deepEqual(chamadas.apagados, [nome]);
});

test('outside production the sheet is not stored and the container is not opened', async (t) => {
  const { chamadas, obterContainer } = containerFalso();
  const avisos = t.mock.method(console, 'warn', () => {});
  comAmbiente(t, { NODE_ENV: 'development' });

  const nome = await criarArmazenamento({ obterContainer }).guardar(PLANILHA);

  assert.equal(nome, null);
  assert.equal(chamadas.aberturas, 0);
  assert.match(avisos.mock.calls[0].arguments[0], /só é usado em produção/);
});

test('in production the sheet is stored', async (t) => {
  const { chamadas, obterContainer } = containerFalso();
  comAmbiente(t, { NODE_ENV: 'production' });

  const { nome } = await criarArmazenamento({ obterContainer }).guardar(PLANILHA);

  assert.equal(chamadas.enviados[0].nome, nome);
});

test('removing without a blob name does nothing', async () => {
  const { chamadas, obterContainer } = containerFalso();

  await criarArmazenamento({ obterContainer, ativo: () => true }).apagar(null);

  assert.equal(chamadas.aberturas, 0);
});

for (const [descricao, erro] of [
  ['without a storage code', new Error('sem permissão')],
  ['with another storage code', Object.assign(new Error('sem permissão'), { statusCode: 403, details: { errorCode: 'AuthorizationPermissionMismatch' } })],
]) {
  test(`a failed upload ${descricao} reaches the caller`, async () => {
    const armazenamento = criarArmazenamento({
      ativo: () => true,
      obterContainer: () => ({ getBlockBlobClient: () => ({ uploadData: async () => { throw erro; } }) }),
    });

    await assert.rejects(armazenamento.guardar(PLANILHA), /sem permissão/);
  });
}
