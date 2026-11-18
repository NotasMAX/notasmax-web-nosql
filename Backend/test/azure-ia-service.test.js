import test from 'node:test';
import assert from 'node:assert/strict';

const variaveisOriginais = {
  endpoint: process.env.AZURE_AI_ENDPOINT,
  apiKey: process.env.AZURE_AI_API_KEY,
  model: process.env.AZURE_AI_MODEL
};

process.env.AZURE_AI_ENDPOINT = 'https://azure-ai.example.test/chat/completions';
process.env.AZURE_AI_API_KEY = 'synthetic-test-api-key';
delete process.env.AZURE_AI_MODEL;
const { gerarSugestoesAluno } = await import('../services/azureIAService.js?configured-test');

if (variaveisOriginais.endpoint === undefined) delete process.env.AZURE_AI_ENDPOINT;
else process.env.AZURE_AI_ENDPOINT = variaveisOriginais.endpoint;
if (variaveisOriginais.apiKey === undefined) delete process.env.AZURE_AI_API_KEY;
else process.env.AZURE_AI_API_KEY = variaveisOriginais.apiKey;
if (variaveisOriginais.model === undefined) delete process.env.AZURE_AI_MODEL;
else process.env.AZURE_AI_MODEL = variaveisOriginais.model;

const alunoSintetico = {
  nome: 'Aluna Sintética',
  turma: 'Turma de teste',
  nivel: 'atenção',
  mediaAtual: 5.5,
  mediaAnterior: 6,
  mediaTurma: 7,
  variacao: -0.5,
  percentualAcertos: 55,
  disciplinasCriticas: ['Matemática'],
  motivos: ['Queda de rendimento']
};

function respostaJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

test('requires endpoint and API key before making a request', async (t) => {
  const anteriores = {
    endpoint: process.env.AZURE_AI_ENDPOINT,
    apiKey: process.env.AZURE_AI_API_KEY
  };
  delete process.env.AZURE_AI_ENDPOINT;
  delete process.env.AZURE_AI_API_KEY;
  const { gerarSugestoesAluno: semConfiguracao } = await import('../services/azureIAService.js?without-config');
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('fetch should not be called without configuration');
  });

  try {
    await assert.rejects(semConfiguracao(alunoSintetico), (error) => error.statusCode === 503);
    assert.equal(fetch.mock.callCount(), 0);
  } finally {
    if (anteriores.endpoint === undefined) delete process.env.AZURE_AI_ENDPOINT;
    else process.env.AZURE_AI_ENDPOINT = anteriores.endpoint;
    if (anteriores.apiKey === undefined) delete process.env.AZURE_AI_API_KEY;
    else process.env.AZURE_AI_API_KEY = anteriores.apiKey;
  }
});

test('sends synthetic indicators and parses JSON content blocks', async (t) => {
  let chamada;
  t.mock.method(globalThis, 'fetch', async (...args) => {
    chamada = args;
    return respostaJson({
      choices: [{ message: { content: [
        { text: '{"resumo":"Acompanhamento necessário.","sugestoes":["Converse com a aluna.", 7, "Revise os exercícios.", "Acompanhe semanalmente.", "Item excedente."]}' }
      ] } }]
    });
  });

  const resultado = await gerarSugestoesAluno(alunoSintetico);
  assert.deepEqual(resultado, {
    resumo: 'Acompanhamento necessário.',
    sugestoes: ['Converse com a aluna.', 'Revise os exercícios.', 'Acompanhe semanalmente.']
  });
  assert.equal(chamada[0], 'https://azure-ai.example.test/chat/completions');
  assert.equal(chamada[1].method, 'POST');
  assert.equal(chamada[1].headers['api-key'], 'synthetic-test-api-key');
  const corpo = JSON.parse(chamada[1].body);
  assert.equal(corpo.model, 'Phi-4-mini-instruct');
  assert.equal(corpo.temperature, 0.2);
  assert.equal(corpo.max_tokens, 400);
  assert.equal(JSON.parse(corpo.messages[1].content).indicadores.nome, alunoSintetico.nome);
});

test('parses JSON wrapped in a Markdown code fence', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => respostaJson({
    choices: [{ message: { content: '```json\n{"resumo":"Plano de apoio.","sugestoes":["Retome os conteúdos essenciais."]}\n```' } }]
  }));

  assert.deepEqual(await gerarSugestoesAluno(alunoSintetico), {
    resumo: 'Plano de apoio.',
    sugestoes: ['Retome os conteúdos essenciais.']
  });
});

test('extracts an embedded JSON object from surrounding text', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => respostaJson({
    choices: [{ message: { content: 'Segue a análise solicitada: {"resumo":"Apoio planejado.","sugestoes":["Faça uma revisão orientada."]} fim.' } }]
  }));

  assert.deepEqual(await gerarSugestoesAluno(alunoSintetico), {
    resumo: 'Apoio planejado.',
    sugestoes: ['Faça uma revisão orientada.']
  });
});

test('turns a plain-text answer into a summary and up to three suggestions', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => respostaJson({
    choices: [{ message: { content: [
      { text: 'A aluna precisa de acompanhamento.\nSugestões:\n- Retome os conteúdos da última avaliação.\n- Proponha exercícios curtos e graduais.\n- Acompanhe os resultados semanalmente.\n- Organize uma atividade adicional.' }
    ] } }]
  }));

  assert.deepEqual(await gerarSugestoesAluno(alunoSintetico), {
    resumo: 'A aluna precisa de acompanhamento.',
    sugestoes: [
      'Retome os conteúdos da última avaliação.',
      'Proponha exercícios curtos e graduais.',
      'Acompanhe os resultados semanalmente.'
    ]
  });
});

test('converts provider failures to a bounded 502 error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('x'.repeat(700), { status: 429 }));

  await assert.rejects(gerarSugestoesAluno(alunoSintetico), (error) => {
    assert.equal(error.statusCode, 502);
    assert.equal(error.providerDetails.length, 500);
    assert.match(error.message, /429/);
    return true;
  });
});

test('rejects empty and unexpected provider responses', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => respostaJson({ choices: [{ message: { content: [] } }] }));
  await assert.rejects(gerarSugestoesAluno(alunoSintetico), (error) => error.statusCode === 502 && /vazia/.test(error.message));

  t.mock.method(globalThis, 'fetch', async () => respostaJson({ choices: [{ message: { content: '{"resumo":4,"sugestoes":[]}' } }] }));
  await assert.rejects(gerarSugestoesAluno(alunoSintetico), (error) => error.statusCode === 502 && /formato esperado/.test(error.message));
});
