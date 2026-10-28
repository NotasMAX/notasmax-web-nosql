import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { response } from './helpers.js';

const id = '507f1f77bcf86cd799439011';

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

test('remaining API controllers execute against empty synthetic persistence doubles (non-normative baseline)', async (t) => {
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
    () => SimuladosController.getAll(req, response()),
    () => SimuladosController.getOneSimple(req, response()),
    () => SimuladosController.getOne(req, response()),
    () => SimuladosController.getByTurma(req, response()),
    () => SimuladosController.getByAlunoAndBimestre(req, response()),
    () => SimuladosController.findSimuladoByAlunoId(id, id),
    () => SimuladosController.findSimuladoByDisciplinaId(id),
    () => SimuladosController.findSimuladoByBimestreAnoSerie(req, response()),
    () => SimuladosController.update(req, response()),
    () => SimuladosController.getSimuladosByTurma(req, response()),
    () => SimuladosController.atualizarConteudos(req, response()),
    () => SimuladosController.getByAluno(req, response()),
    () => SimuladosController.getDesempenhoByDisciplina(req, response()),
    () => SimuladosController.getDesempenhoByAnoAndAluno(req, response()),
    () => SimuladosController.getDesempenhoAlunoBySimulado(req, response()),
    () => SimuladosController.getSimuladosByAnoAndAluno(req, response()),
    () => SimuladosController.getCalendarioByAluno(req, response()),
    () => SimuladosController.getProfessorDataCurrentYear(req, response()),
    () => SimuladosController.getByProfessor(req, response()),
    () => SimuladosController.getSimuladoDisciplinaAlunos(req, response()),
    () => SimuladosController.salvarNotas(req, response()),
    () => TurmasController.getAll(req, response()),
    () => TurmasController.getOne(req, response()),
    () => TurmasController.getByAnoAndProfessor(req, response()),
    () => TurmasController.getByAno(req, response()),
    () => TurmasController.addAluno(req, response()),
    () => TurmasController.removeAluno(req, response()),
    () => TurmasController.getDesempenhoByTurma(req, response()),
    () => TurmasController.getDesempenhoMaterias(req, response()),
    () => TurmasController.BuscarTurma({ _id: id }),
    () => TurmaDisciplinasController.getAll(req, response()),
    () => TurmaDisciplinasController.remove(req, response()),
    () => TurmaDisciplinasController.getOne(req, response()),
    () => UsuariosController.listarProfessores(req, response()),
    () => UsuariosController.listarAlunos(req, response()),
    () => UsuariosController.atualizarUsuario(req, response()),
    () => UsuariosController.getOne(req, response()),
    () => UsuariosController.getAlunoByNameOrEmail(req, response()),
    () => UsuariosController.getProfessorByNameOrEmail(req, response()),
    () => UsuariosController.findUsuarioById(id),
    () => UsuariosController.getDesempenhoByAluno(req, response()),
  ];

  for (const action of actions) {
    await assert.doesNotReject(action);
  }
  assert.equal(mongoose.connection.readyState, 0);
});
