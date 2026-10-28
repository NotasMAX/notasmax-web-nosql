import test from 'node:test';
import assert from 'node:assert/strict';
import { response } from './helpers.js';

test('class enrollment and performance controllers use synthetic model doubles', async (t) => {
  const [{ default: Turma }, { default: TurmaDisciplina }, { default: Simulado }, { default: Usuario }, { default: TurmasController }] = await Promise.all([
    import('../Models/Turma.js'),
    import('../Models/TurmaDisciplina.js'),
    import('../Models/Simulado.js'),
    import('../Models/Usuario.js'),
    import('../Controllers/TurmasController.js'),
  ]);
  const id = '507f1f77bcf86cd799439011';
  const turma = {
    _id: id, ano: 2026, serie: 3, alunos: [],
    async save() {},
  };
  t.mock.method(Turma, 'findById', async () => turma);
  t.mock.method(Turma, 'findOne', async () => null);
  t.mock.method(Usuario, 'findById', async () => ({ _id: id, nome: 'Synthetic Student', tipo_usuario: 'aluno' }));
  const add = response();
  await TurmasController.addAluno({ body: { turmaId: id, alunoId: id } }, add);
  assert.equal(add.statusCode, 200);
  assert.deepEqual(turma.alunos, [id]);

  turma.alunos.pull = (value) => { turma.alunos = turma.alunos.filter((item) => item !== value); };
  t.mock.method(Simulado, 'find', async () => []);
  const remove = response();
  await TurmasController.removeAluno({ query: { aluno_id: id, turma_id: id } }, remove);
  assert.equal(remove.statusCode, 200);
  assert.deepEqual(turma.alunos, []);

  t.mock.method(Simulado, 'aggregate', async () => []);
  const performance = response();
  await TurmasController.getDesempenhoByTurma({ params: { id } }, performance);
  assert.equal(performance.statusCode, 200);
  assert.equal(performance.body.desempenho.length, 4);

  t.mock.method(TurmaDisciplina, 'find', async () => []);
  const subjects = response();
  await TurmasController.getDesempenhoMaterias({ params: { id }, query: {} }, subjects);
  assert.equal(subjects.statusCode, 200);
  assert.deepEqual(subjects.body.materias, []);

  t.mock.method(Turma, 'find', () => ({ where() { return this; }, sort: async () => [] }));
  const missingYear = response();
  await TurmasController.getByAno({ params: { ano: '2026' } }, missingYear);
  assert.equal(missingYear.statusCode, 404);
});
