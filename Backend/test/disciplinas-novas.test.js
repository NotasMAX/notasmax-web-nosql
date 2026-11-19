import test from 'node:test';
import assert from 'node:assert/strict';
import Materia from '../Models/Materia.js';
import TurmaDisciplina from '../Models/TurmaDisciplina.js';
import Usuario from '../Models/Usuario.js';
import {
  cadastrarDisciplinasNovas,
  comoDisciplinasDaConferencia,
  desfazerCadastro,
  resolverDisciplinasNovas,
  trocarIdsDasDisciplinas,
} from '../services/disciplinasNovas.js';

const TURMA = '507f1f77bcf86cd799439021';
const PROFESSORA = '507f1f77bcf86cd799439051';
const PROFESSOR = '507f1f77bcf86cd799439052';
const ALUNO = '507f1f77bcf86cd799439011';
const GAMES = '507f1f77bcf86cd799439061';

const professores = [
  { _id: PROFESSORA, nome: 'Rita Lima', tipo_usuario: 'professor' },
  { _id: PROFESSOR, nome: 'Toni Almeida', tipo_usuario: 'professor' },
  { _id: ALUNO, nome: 'Aluna Exemplo', tipo_usuario: 'aluno' },
];

function simularBanco(t, { materias = [{ _id: GAMES, nome: 'Games' }], daTurma = [] } = {}) {
  t.mock.method(Materia, 'find', async () => materias);
  t.mock.method(Usuario, 'find', async () => professores);
  t.mock.method(TurmaDisciplina, 'find', async () => daTurma);
}

const pedido = (id, extras = {}) => ({ id, materia_id: null, materia_nome: 'Artes', professor_id: PROFESSORA, ...extras });

test('nothing to check when the review chose no new disciplina', async (t) => {
  const busca = t.mock.method(Materia, 'find', async () => []);

  assert.deepEqual(await resolverDisciplinasNovas({ pedidas: undefined, turma_id: TURMA }), { existentes: new Map(), aCriar: [], bloqueios: [] });
  assert.equal(busca.mock.callCount(), 0);
});

test('plans a new subject and a subject that already exists, ignoring accents and case in the name', async (t) => {
  simularBanco(t);

  const { aCriar, bloqueios, existentes } = await resolverDisciplinasNovas({
    pedidas: [pedido('nova-1'), pedido('nova-2', { materia_nome: ' gámes ', professor_id: PROFESSOR })],
    turma_id: TURMA,
  });

  assert.deepEqual(bloqueios, []);
  assert.equal(existentes.size, 0);
  assert.deepEqual(aCriar, [
    { id: 'nova-1', materia_id: null, materia_nome: 'Artes', professor_id: PROFESSORA, professor_nome: 'Rita Lima' },
    { id: 'nova-2', materia_id: GAMES, materia_nome: 'Games', professor_id: PROFESSOR, professor_nome: 'Toni Almeida' },
  ]);
});

test('uses the disciplina the class already has, and points a repeated request to the first one', async (t) => {
  const existente = '507f1f77bcf86cd799439071';
  simularBanco(t, { daTurma: [{ _id: existente, materia_id: GAMES, professor_id: PROFESSOR }] });

  const { aCriar, existentes } = await resolverDisciplinasNovas({
    pedidas: [
      pedido('nova-1', { materia_id: GAMES, materia_nome: 'Games', professor_id: PROFESSOR }),
      pedido('nova-2'),
      pedido('nova-3', { materia_nome: 'ARTES' }),
    ],
    turma_id: TURMA,
  });

  assert.deepEqual([...existentes], [['nova-1', existente], ['nova-3', 'nova-2']]);
  assert.deepEqual(aCriar.map(({ id }) => id), ['nova-2']);
});

test('blocks requests that do not fit the current data', async (t) => {
  simularBanco(t);

  const { aCriar, bloqueios } = await resolverDisciplinasNovas({
    pedidas: [
      null,
      pedido('outra-1'),
      pedido('nova-1', { materia_id: '507f1f77bcf86cd799439099', materia_nome: 'Robótica' }),
      pedido('nova-2', { materia_nome: '  ' }),
      pedido('nova-3', { professor_id: ALUNO }),
      pedido('nova-4', { professor_id: 'nao-existe' }),
    ],
    turma_id: TURMA,
  });

  assert.deepEqual(aCriar, []);
  assert.deepEqual(bloqueios.map(({ codigo }) => codigo), Array(6).fill('DISCIPLINA_NOVA_INVALIDA'));
  assert.deepEqual(bloqueios.map(({ mensagem }) => mensagem), [
    'Uma das disciplinas novas veio sem identificação. Importe de novo.',
    'Uma das disciplinas novas veio sem identificação. Importe de novo.',
    'A matéria Robótica não existe mais no sistema. Importe de novo.',
    'Uma das disciplinas novas veio sem matéria.',
    'O professor escolhido para Artes não existe mais no sistema. Importe de novo.',
    'O professor escolhido para Artes não existe mais no sistema. Importe de novo.',
  ]);
});

test('turns planned disciplinas into the shape the review checks, before and after they are created', () => {
  const aCriar = [{ id: 'nova-1', materia_id: null, materia_nome: 'Artes', professor_id: PROFESSORA, professor_nome: 'Rita Lima' }];

  assert.deepEqual(comoDisciplinasDaConferencia(aCriar), [
    { _id: 'nova-1', materia: 'Artes', professor: 'Rita Lima', materia_id: null, professor_id: PROFESSORA, nova: true },
  ]);
  assert.equal(comoDisciplinasDaConferencia(aCriar, new Map([['nova-1', 'real-1']]))[0]._id, 'real-1');
  assert.equal(comoDisciplinasDaConferencia(aCriar, new Map([['nova-1', 'real-1']]))[0].nova, false);
});

test('swaps provisional ids in the columns, the new contents and the new simulados', () => {
  const corpo = {
    aba: 'Aluna',
    colunas: [{ coluna: 'B', turma_disciplina_id: 'nova-1' }, { coluna: 'C', turma_disciplina_id: 'd1' }],
    conteudosNovos: [{ simulado_id: 's1', turma_disciplina_id: 'nova-1' }],
    novos: [{ numero: 7, conteudos: [{ turma_disciplina_id: 'nova-1' }, { turma_disciplina_id: 'd1' }] }],
  };
  const trocado = trocarIdsDasDisciplinas(corpo, new Map([['nova-1', 'real-1']]));

  assert.deepEqual(trocado.colunas.map(({ turma_disciplina_id }) => turma_disciplina_id), ['real-1', 'd1']);
  assert.equal(trocado.conteudosNovos[0].turma_disciplina_id, 'real-1');
  assert.deepEqual(trocado.novos[0].conteudos.map(({ turma_disciplina_id }) => turma_disciplina_id), ['real-1', 'd1']);
  assert.equal(trocado.aba, 'Aluna');
  assert.equal(trocarIdsDasDisciplinas(corpo, new Map()), corpo);
  assert.deepEqual(trocarIdsDasDisciplinas({ colunas: 'x' }, new Map([['a', 'b']])), { colunas: [], conteudosNovos: [], novos: [] });
});

test('creates a new subject once, even when two disciplinas use it, and then each disciplina', async (t) => {
  const materias = t.mock.method(Materia, 'create', async ({ nome }) => ({ _id: 'm-nova', nome }));
  let contador = 0;
  const disciplinas = t.mock.method(TurmaDisciplina, 'create', async (dados) => ({ _id: `td-${++contador}`, ...dados }));

  const { mapa, criados } = await cadastrarDisciplinasNovas({
    aCriar: [
      { id: 'nova-1', materia_id: null, materia_nome: 'Artes', professor_id: PROFESSORA },
      { id: 'nova-2', materia_id: null, materia_nome: 'ARTES', professor_id: PROFESSOR },
      { id: 'nova-3', materia_id: GAMES, materia_nome: 'Games', professor_id: PROFESSOR },
    ],
    turma_id: TURMA,
  });

  assert.deepEqual(materias.mock.calls.map(({ arguments: [dados] }) => dados), [{ nome: 'Artes' }]);
  assert.deepEqual(disciplinas.mock.calls.map(({ arguments: [dados] }) => dados), [
    { turma_id: TURMA, materia_id: 'm-nova', professor_id: PROFESSORA },
    { turma_id: TURMA, materia_id: 'm-nova', professor_id: PROFESSOR },
    { turma_id: TURMA, materia_id: GAMES, professor_id: PROFESSOR },
  ]);
  assert.deepEqual([...mapa], [['nova-1', 'td-1'], ['nova-2', 'td-2'], ['nova-3', 'td-3']]);
  assert.deepEqual([criados.materias.length, criados.disciplinas.length], [1, 3]);
});

test('undoes what was created when a creation fails', async (t) => {
  t.mock.method(Materia, 'create', async ({ nome }) => ({ _id: 'm-nova', nome }));
  t.mock.method(TurmaDisciplina, 'create', async () => { throw new Error('banco fora do ar'); });
  const disciplinasApagadas = t.mock.method(TurmaDisciplina, 'deleteMany', async () => ({}));
  const materiasApagadas = t.mock.method(Materia, 'deleteMany', async () => ({}));

  await assert.rejects(
    cadastrarDisciplinasNovas({ aCriar: [{ id: 'nova-1', materia_id: null, materia_nome: 'Artes', professor_id: PROFESSORA }], turma_id: TURMA }),
    /banco fora do ar/,
  );

  assert.equal(disciplinasApagadas.mock.callCount(), 0);
  assert.deepEqual(materiasApagadas.mock.calls[0].arguments[0], { _id: { $in: ['m-nova'] } });
});

test('undoing logs a failure and still tries the next collection', async (t) => {
  t.mock.method(TurmaDisciplina, 'deleteMany', async () => { throw new Error('sem permissão'); });
  const materiasApagadas = t.mock.method(Materia, 'deleteMany', async () => ({}));
  const erros = t.mock.method(console, 'error', () => {});

  await desfazerCadastro({ materias: [{ _id: 'm-1' }], disciplinas: [{ _id: 'td-1' }] });

  assert.match(erros.mock.calls[0].arguments.join(' '), /TurmaDisciplinas.*sem permissão/);
  assert.equal(materiasApagadas.mock.callCount(), 1);
});
