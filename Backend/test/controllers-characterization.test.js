import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { response as createResponse } from './helpers.js';

const id = '507f1f77bcf86cd799439011';
const capturedResponses = [];

function response() {
  const value = createResponse();
  capturedResponses.push(value);
  return value;
}

function query(value) {
  return {
    select() { return this; },
    sort() { return this; },
    where() { return this; },
    lean() { return this; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

function mockModels(t, models) {
  for (const model of models) {
    for (const method of ['find', 'findOne', 'findById', 'findByIdAndUpdate', 'findByIdAndDelete', 'aggregate', 'create', 'updateOne']) {
      if (typeof model[method] !== 'function') continue;
      const value = ['find', 'aggregate'].includes(method) ? [] : method === 'findOne' || method === 'findById' ? null : {};
      t.mock.method(model, method, () => query(value));
    }
    if (typeof model.prototype?.save === 'function') {
      t.mock.method(model.prototype, 'save', async function () { return this; });
    }
  }
}

test('remaining API controllers return expected outcomes with empty synthetic doubles (non-normative baseline)', async (t) => {
  const [
    { default: SimuladosController },
    { default: TurmasController },
    { default: TurmaDisciplinasController },
    { default: UsuariosController },
    { default: Simulado },
    { default: Turma },
    { default: TurmaDisciplina },
    { default: Usuario },
    { default: Materia },
  ] = await Promise.all([
    import('../Controllers/SimuladosController.js'),
    import('../Controllers/TurmasController.js'),
    import('../Controllers/TurmaDisciplinasController.js'),
    import('../Controllers/UsuariosController.js'),
    import('../Models/Simulado.js'),
    import('../Models/Turma.js'),
    import('../Models/TurmaDisciplina.js'),
    import('../Models/Usuario.js'),
    import('../Models/Materia.js'),
  ]);
  mockModels(t, [Simulado, Turma, TurmaDisciplina, Usuario, Materia]);

  const req = {
    params: {
      id, aluno: id, simulado: id, turma_id: id, simulado_id: id, disciplina_id: id,
      professor: id, aluno_id: id, simuladoId: id, disciplinaId: id, turma_disciplina_id: id,
      ano: '2026', serie: '1', bimestre: '1',
    },
    query: { id, text: 'synthetic', ano: '2026', turmaId: id, bimestre: '1', periodo: '1' },
    body: {
      id, nome: 'Synthetic', email: 'synthetic@example.test', senha: 'synthetic-password',
      telefone_contato: '0000000000', serie: 1, ano: 2026, numero: 1, tipo: 'objetivo',
      bimestre: 1, data_realizacao: '2026-01-01', turma_id: id, professor_id: id,
      materia_id: id, aluno_id: id, conteudos: [{ quantidade_questoes: 1, resultados: [] }],
      alunos: [id], notas: [], resultados: [],
    },
    cookies: {},
    user: { id, tipo_usuario: 'administrador' },
  };

  const actions = [
    { name: 'SimuladosController.getAll', status: 200, run: () => SimuladosController.getAll(req, response()) },
    { name: 'SimuladosController.getOneSimple', status: 404, run: () => SimuladosController.getOneSimple(req, response()) },
    { name: 'SimuladosController.getOne', status: 404, run: () => SimuladosController.getOne(req, response()) },
    { name: 'SimuladosController.getByTurma', status: 200, run: () => SimuladosController.getByTurma(req, response()) },
    { name: 'SimuladosController.getByAlunoAndBimestre', status: 200, run: () => SimuladosController.getByAlunoAndBimestre(req, response()) },
    { name: 'SimuladosController.findSimuladoByAlunoId', result: [], run: () => SimuladosController.findSimuladoByAlunoId(id, id) },
    { name: 'SimuladosController.findSimuladoByDisciplinaId', result: [], run: () => SimuladosController.findSimuladoByDisciplinaId(id) },
    { name: 'SimuladosController.findSimuladoByBimestreAnoSerie', status: 200, run: () => SimuladosController.findSimuladoByBimestreAnoSerie(req, response()) },
    { name: 'SimuladosController.update', status: 422, run: () => SimuladosController.update(req, response()) },
    { name: 'SimuladosController.getSimuladosByTurma', status: 422, run: () => SimuladosController.getSimuladosByTurma(req, response()) },
    { name: 'SimuladosController.atualizarConteudos', status: 404, run: () => SimuladosController.atualizarConteudos(req, response()) },
    { name: 'SimuladosController.getByAluno', status: 200, run: () => SimuladosController.getByAluno(req, response()) },
    { name: 'SimuladosController.getDesempenhoByDisciplina', status: 422, run: () => SimuladosController.getDesempenhoByDisciplina(req, response()) },
    { name: 'SimuladosController.getDesempenhoByAnoAndAluno', status: 200, run: () => SimuladosController.getDesempenhoByAnoAndAluno(req, response()) },
    { name: 'SimuladosController.getDesempenhoAlunoBySimulado', status: 404, run: () => SimuladosController.getDesempenhoAlunoBySimulado(req, response()) },
    { name: 'SimuladosController.getSimuladosByAnoAndAluno', status: 200, run: () => SimuladosController.getSimuladosByAnoAndAluno(req, response()) },
    { name: 'SimuladosController.getCalendarioByAluno', status: 200, run: () => SimuladosController.getCalendarioByAluno(req, response()) },
    { name: 'SimuladosController.getProfessorDataCurrentYear', status: 200, run: () => SimuladosController.getProfessorDataCurrentYear(req, response()) },
    { name: 'SimuladosController.getByProfessor', status: 200, run: () => SimuladosController.getByProfessor(req, response()) },
    { name: 'SimuladosController.getSimuladoDisciplinaAlunos', status: 404, run: () => SimuladosController.getSimuladoDisciplinaAlunos(req, response()) },
    { name: 'SimuladosController.salvarNotas', status: 404, run: () => SimuladosController.salvarNotas(req, response()) },
    { name: 'TurmasController.getAll', status: 200, run: () => TurmasController.getAll(req, response()) },
    { name: 'TurmasController.getOne', status: 404, run: () => TurmasController.getOne(req, response()) },
    { name: 'TurmasController.getByAnoAndProfessor', status: 404, run: () => TurmasController.getByAnoAndProfessor(req, response()) },
    { name: 'TurmasController.getByAno', status: 404, run: () => TurmasController.getByAno(req, response()) },
    { name: 'TurmasController.addAluno', status: 422, run: () => TurmasController.addAluno(req, response()) },
    { name: 'TurmasController.removeAluno', status: 422, run: () => TurmasController.removeAluno(req, response()) },
    { name: 'TurmasController.getDesempenhoByTurma', status: 404, run: () => TurmasController.getDesempenhoByTurma(req, response()) },
    { name: 'TurmasController.getDesempenhoMaterias', status: 404, run: () => TurmasController.getDesempenhoMaterias(req, response()) },
    { name: 'TurmasController.BuscarTurma', result: null, run: () => TurmasController.BuscarTurma({ _id: id }) },
    { name: 'TurmaDisciplinasController.getAll', status: 200, run: () => TurmaDisciplinasController.getAll(req, response()) },
    { name: 'TurmaDisciplinasController.remove', status: 404, run: () => TurmaDisciplinasController.remove(req, response()) },
    { name: 'TurmaDisciplinasController.getOne', status: 404, run: () => TurmaDisciplinasController.getOne(req, response()) },
    { name: 'UsuariosController.listarProfessores', status: 200, run: () => UsuariosController.listarProfessores(req, response()) },
    { name: 'UsuariosController.listarAlunos', status: 200, run: () => UsuariosController.listarAlunos(req, response()) },
    { name: 'UsuariosController.atualizarUsuario', status: 404, run: () => UsuariosController.atualizarUsuario(req, response()) },
    { name: 'UsuariosController.getOne', status: 404, run: () => UsuariosController.getOne(req, response()) },
    { name: 'UsuariosController.getAlunoByNameOrEmail', status: 200, run: () => UsuariosController.getAlunoByNameOrEmail(req, response()) },
    { name: 'UsuariosController.getProfessorByNameOrEmail', status: 200, run: () => UsuariosController.getProfessorByNameOrEmail(req, response()) },
    { name: 'UsuariosController.findUsuarioById', result: null, run: () => UsuariosController.findUsuarioById(id) },
    { name: 'UsuariosController.getDesempenhoByAluno', status: 404, run: () => UsuariosController.getDesempenhoByAluno(req, response()) },
  ];

  for (const action of actions) {
    const responseCount = capturedResponses.length;
    const result = await action.run();
    if (Object.hasOwn(action, 'status')) {
      const sentResponse = capturedResponses[responseCount];
      assert.ok(sentResponse, `${action.name} should create an HTTP response`);
      assert.equal(sentResponse.statusCode, action.status, `${action.name} should return HTTP ${action.status}`);
      assert.notEqual(sentResponse.body, undefined, `${action.name} should send a response body`);
    } else {
      assert.deepEqual(result, action.result, `${action.name} should return its expected baseline result`);
    }
  }
  assert.equal(mongoose.connection.readyState, 0);
});
