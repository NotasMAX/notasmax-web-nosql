import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { response } from './helpers.js';

test('controllers and models can be imported without opening MongoDB', async () => {
  const originalConnect = mongoose.connect;
  let connectionAttempts = 0;
  mongoose.connect = async (...args) => {
    connectionAttempts += 1;
    return originalConnect.apply(mongoose, args);
  };

  try {
    await import('../Controllers/SimuladosController.js');
    await import('../Controllers/MateriasController.js');
    assert.equal(connectionAttempts, 0);
  } finally {
    mongoose.connect = originalConnect;
  }
});

test('database bootstrap still requests the configured local Mongo URI', async (t) => {
  const originalConnect = mongoose.connect;
  const originalLog = console.log;
  const connections = [];
  mongoose.connect = async (uri) => { connections.push(uri); return mongoose; };
  console.log = () => {};
  t.after(() => {
    mongoose.connect = originalConnect;
    console.log = originalLog;
  });

  await import('../DB/conn.js');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(connections, ['mongodb://127.0.0.1:27017/NotasMax']);
});

test('Mongoose models validate required fields with synthetic values', async () => {
  const [Usuario, Materia, Turma, TurmaDisciplina, Simulado] = await Promise.all([
    import('../Models/Usuario.js'),
    import('../Models/Materia.js'),
    import('../Models/Turma.js'),
    import('../Models/TurmaDisciplina.js'),
    import('../Models/Simulado.js'),
  ]).then((modules) => modules.map((module) => module.default));

  assert.ok(new Usuario().validateSync().errors.nome);
  assert.ok(new Materia().validateSync().errors.nome);
  assert.ok(new Turma().validateSync().errors.serie);
  assert.ok(new TurmaDisciplina().validateSync().errors.turma_id);
  assert.ok(new Simulado().validateSync().errors.numero);
});

test('materia creation rejects blank names before persistence', async () => {
  const { default: MateriasController } = await import('../Controllers/MateriasController.js');
  const res = response();
  await MateriasController.criarMateria({ body: { nome: '   ' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'O nome da matéria é obrigatório.');
});

test('materia creation rejects duplicates and creates a trimmed name', async (t) => {
  const { default: Materia } = await import('../Models/Materia.js');
  const { default: MateriasController } = await import('../Controllers/MateriasController.js');
  const findOne = t.mock.method(Materia, 'findOne');
  const create = t.mock.method(Materia, 'create');

  findOne.mock.mockImplementation(async () => ({ _id: 'existing' }));
  const duplicate = response();
  await MateriasController.criarMateria({ body: { nome: 'Matemática' } }, duplicate);
  assert.equal(duplicate.statusCode, 409);
  assert.equal(create.mock.callCount(), 0);

  findOne.mock.mockImplementation(async () => null);
  create.mock.mockImplementation(async (record) => record);
  const created = response();
  await MateriasController.criarMateria({ body: { nome: '  Física  ' } }, created);
  assert.equal(created.statusCode, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], { nome: 'Física' });
});

test('materia search rejects invalid input and returns sorted results', async (t) => {
  const { default: Materia } = await import('../Models/Materia.js');
  const { default: MateriasController } = await import('../Controllers/MateriasController.js');
  const find = t.mock.method(Materia, 'find');
  find.mock.mockImplementation(() => ({ sort: async () => [{ nome: 'Física' }] }));

  const invalid = response();
  await MateriasController.getMateriaByName({ query: { text: ' ' } }, invalid);
  assert.equal(invalid.statusCode, 422);

  const found = response();
  await MateriasController.getMateriaByName({ query: { text: 'fis' } }, found);
  assert.equal(found.statusCode, 200);
  assert.equal(found.body.materias[0].nome, 'Física');
  assert.deepEqual(find.mock.calls[0].arguments[0], { nome: { $regex: 'fis', $options: 'i' } });
});

test('materia lookup returns invalid, missing, and found responses', async (t) => {
  const { default: Materia } = await import('../Models/Materia.js');
  const { default: MateriasController } = await import('../Controllers/MateriasController.js');
  const findById = t.mock.method(Materia, 'findById');

  const invalid = response();
  await MateriasController.buscarMateriaPorId({ params: { id: 'bad' } }, invalid);
  assert.equal(invalid.statusCode, 400);

  findById.mock.mockImplementation(async () => null);
  const missing = response();
  await MateriasController.buscarMateriaPorId({ params: { id: '507f1f77bcf86cd799439011' } }, missing);
  assert.equal(missing.statusCode, 404);

  const record = { _id: '507f1f77bcf86cd799439011', nome: 'Biologia' };
  findById.mock.mockImplementation(async () => record);
  const found = response();
  await MateriasController.buscarMateriaPorId({ params: { id: record._id } }, found);
  assert.equal(found.statusCode, 200);
  assert.equal(found.body.nome, 'Biologia');
});

test('materia listing and editing cover success and not-found persistence paths', async (t) => {
  const { default: Materia } = await import('../Models/Materia.js');
  const { default: MateriasController } = await import('../Controllers/MateriasController.js');
  const rows = [{ nome: 'Artes' }];
  t.mock.method(Materia, 'find', () => ({ sort: async () => rows }));
  const list = response();
  await MateriasController.listarMaterias({}, list);
  assert.deepEqual(list.body.materias, rows);

  const findOne = t.mock.method(Materia, 'findOne', async () => null);
  const findByIdAndUpdate = t.mock.method(Materia, 'findByIdAndUpdate', async () => ({ nome: 'Física' }));
  const updated = response();
  await MateriasController.editarMateria(
    { params: { id: '507f1f77bcf86cd799439011' }, body: { nome: ' Física ' } },
    updated,
  );
  assert.equal(updated.statusCode, 200);
  assert.equal(findOne.mock.callCount(), 1);
  assert.deepEqual(findByIdAndUpdate.mock.calls[0].arguments[1], { nome: 'Física' });

  findByIdAndUpdate.mock.mockImplementation(async () => null);
  const missing = response();
  await MateriasController.editarMateria(
    { params: { id: '507f1f77bcf86cd799439011' }, body: { nome: 'Física' } },
    missing,
  );
  assert.equal(missing.statusCode, 404);
});

test('authorization middleware rejects missing roles and permits an authorized role', async () => {
  const { authorizeAdmin, authorizeProfessor, authorizeRoles, authenticateToken } = await import('../middlewares/authMiddleware.js');
  let nextCalls = 0;
  const res = response();
  authorizeAdmin({ user: { tipo_usuario: 'aluno' } }, res, () => nextCalls++);
  assert.equal(res.statusCode, 403);
  authorizeRoles('professor')({ user: { tipo_usuario: 'professor' } }, response(), () => nextCalls++);
  assert.equal(nextCalls, 1);
  assert.equal(typeof authorizeProfessor, 'function');

  const noToken = response();
  authenticateToken({ cookies: {} }, noToken, () => nextCalls++);
  assert.equal(noToken.statusCode, 401);
  assert.equal(nextCalls, 1);
});

test('invalid JWT is rejected and clears the session cookie (current behavior baseline)', async (t) => {
  const { authenticateToken } = await import('../middlewares/authMiddleware.js');
  const originalError = console.error;
  t.after(() => { console.error = originalError; });
  console.error = () => {};
  const res = response();
  authenticateToken({ cookies: { jwt: 'synthetic-invalid-token' } }, res, () => assert.fail('next should not run'));
  assert.equal(res.statusCode, 403);
  assert.equal(res.clearedCookie, 'jwt');
});

test('login, logout, and reset input errors keep their current API responses', async () => {
  const { login, logout, resetPassword } = await import('../Controllers/AuthController.js');
  const missingLogin = response();
  await login({ body: {} }, missingLogin);
  assert.equal(missingLogin.statusCode, 400);

  const loggedOut = response();
  await logout({}, loggedOut);
  assert.equal(loggedOut.statusCode, 200);
  assert.equal(loggedOut.clearedCookie, 'jwt');

  const invalidReset = response();
  await resetPassword({ body: { token: 'x', novaSenha: '123' } }, invalidReset);
  assert.equal(invalidReset.statusCode, 400);
});

test('turma creation rejects invalid required fields before persistence', async () => {
  const { default: TurmasController } = await import('../Controllers/TurmasController.js');
  for (const [body, expected] of [
    [{ serie: null, ano: 2026 }, 'Preencha a série da turma.'],
    [{ serie: 'abc', ano: 2026 }, 'A série deve ser um número.'],
    [{ serie: 10, ano: 2026 }, 'A série deve ter apenas 1 dígito.'],
    [{ serie: 3, ano: null }, 'Preencha o ano da turma.'],
  ]) {
    const res = response();
    await TurmasController.create({ body }, res);
    assert.equal(res.statusCode, 422);
    assert.equal(res.body.message, expected);
  }
});

test('simulado creation rejects missing fields before persistence', async () => {
  const { default: SimuladosController } = await import('../Controllers/SimuladosController.js');
  for (const [body, expected] of [
    [{}, 'Informe o número do simulado'],
    [{ numero: 1 }, 'Informe o tipo do simulado'],
    [{ numero: 1, tipo: 'objetivo' }, 'Informe o bimestre'],
    [{ numero: 1, tipo: 'objetivo', bimestre: 1 }, 'Informe a data de realização'],
    [{ numero: 1, tipo: 'objetivo', bimestre: 1, data_realizacao: '2026-01-01' }, 'Informe a turma'],
  ]) {
    const res = response();
    await SimuladosController.create({ body }, res);
    assert.equal(res.statusCode, 422);
    assert.equal(res.body.message, expected);
  }
});

test('simulado create, update, and lookup exercise fake persistence success paths', async (t) => {
  const [{ default: Simulado }, { default: Turma }, { default: SimuladosController }] = await Promise.all([
    import('../Models/Simulado.js'),
    import('../Models/Turma.js'),
    import('../Controllers/SimuladosController.js'),
  ]);
  const validId = '507f1f77bcf86cd799439011';
  const record = { _id: validId, numero: 1 };
  const findOne = t.mock.method(Simulado, 'findOne', async () => null);
  t.mock.method(Turma, 'findOne', async () => ({ _id: validId }));
  t.mock.method(Simulado.prototype, 'save', async function () { return this; });

  const create = response();
  const validBody = {
    numero: 1, tipo: 'objetivo', bimestre: 1, data_realizacao: '2026-01-01',
    turma_id: validId, conteudos: [{ turma_disciplina_id: validId, quantidade_questoes: 1 }],
  };
  await SimuladosController.create({ body: validBody }, create);
  assert.equal(create.statusCode, 200);

  let updateLookup = 0;
  findOne.mock.mockImplementation(async () => (++updateLookup === 1 ? record : null));

  const findById = t.mock.method(Simulado, 'findById', async () => record);
  const simple = response();
  await SimuladosController.getOneSimple({ params: { id: validId } }, simple);
  assert.equal(simple.statusCode, 200);
  assert.equal(simple.body.simulado, record);

  findById.mock.mockImplementation(async () => record);
  t.mock.method(Simulado, 'findByIdAndUpdate', async () => record);
  const update = response();
  await SimuladosController.update({ params: { id: validId }, body: validBody }, update);
  assert.equal(update.statusCode, 200);

  t.mock.method(Simulado, 'find', () => ({ where: async () => [record] }));
  const byClass = response();
  await SimuladosController.getByTurma({ params: { turma_id: validId } }, byClass);
  assert.equal(byClass.statusCode, 200);
});

test('class and enrollment endpoints reject malformed identifiers before persistence', async () => {
  const { default: TurmasController } = await import('../Controllers/TurmasController.js');
  const { default: TurmaDisciplinasController } = await import('../Controllers/TurmaDisciplinasController.js');

  const invalidClass = response();
  await TurmasController.getOne({ params: { id: 'bad' } }, invalidClass);
  assert.equal(invalidClass.statusCode, 422);

  const missingDisciplineId = response();
  await TurmaDisciplinasController.remove({ query: {} }, missingDisciplineId);
  assert.equal(missingDisciplineId.statusCode, 422);

  const invalidDisciplineId = response();
  await TurmaDisciplinasController.getOne({ params: { turma_disciplina_id: 'bad' } }, invalidDisciplineId);
  assert.equal(invalidDisciplineId.statusCode, 422);
});

test('discipline assignment and removal use fake user, persistence, and simulation boundaries', async (t) => {
  const [
    { default: Usuario },
    { default: Simulado },
    { default: TurmaDisciplina },
    { default: TurmaDisciplinasController },
  ] = await Promise.all([
    import('../Models/Usuario.js'),
    import('../Models/Simulado.js'),
    import('../Models/TurmaDisciplina.js'),
    import('../Controllers/TurmaDisciplinasController.js'),
  ]);
  const validId = '507f1f77bcf86cd799439011';
  t.mock.method(Usuario, 'findById', async () => ({ _id: validId, tipo_usuario: 'professor' }));
  t.mock.method(TurmaDisciplina, 'findOne', async () => null);
  t.mock.method(TurmaDisciplina.prototype, 'save', async function () { return this; });
  const created = response();
  await TurmaDisciplinasController.create({ params: {}, user: { id: validId }, body: { turma_id: validId, professor_id: validId, materia_id: validId } }, created);
  assert.equal(created.statusCode, 200);

  t.mock.method(TurmaDisciplina, 'findById', async () => ({ _id: validId }));
  t.mock.method(TurmaDisciplina, 'findByIdAndDelete', async () => ({ _id: validId }));
  t.mock.method(Simulado, 'find', async () => []);
  const removed = response();
  await TurmaDisciplinasController.remove({ query: { id: validId } }, removed);
  assert.equal(removed.statusCode, 200);
});

test('class creation saves through a fake model instance', async (t) => {
  const { default: Turma } = await import('../Models/Turma.js');
  const { default: TurmasController } = await import('../Controllers/TurmasController.js');
  t.mock.method(Turma, 'findOne', async () => null);
  t.mock.method(Turma.prototype, 'save', async function () { return this; });
  const res = response();
  await TurmasController.create({ body: { serie: 3, ano: 2026 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.novaTurma.serie, 3);
});

test('user detail and search endpoints reject invalid input', async () => {
  const { default: UsuariosController } = await import('../Controllers/UsuariosController.js');
  const invalidId = response();
  await UsuariosController.getUsuario({ params: { id: 'bad' } }, invalidId);
  assert.equal(invalidId.statusCode, 400);

  const emptySearch = response();
  await UsuariosController.getAlunoByNameOrEmail({ query: { text: ' ' } }, emptySearch);
  assert.equal(emptySearch.statusCode, 422);
});

test('user registration, listings, details, updates, and performance use fake persistence', async (t) => {
  const [
    { default: Usuario },
    { default: Turma },
    { default: Simulado },
    { default: UsuariosController },
  ] = await Promise.all([
    import('../Models/Usuario.js'),
    import('../Models/Turma.js'),
    import('../Models/Simulado.js'),
    import('../Controllers/UsuariosController.js'),
  ]);
  const validId = '507f1f77bcf86cd799439011';
  const user = {
    _id: validId, nome: 'Synthetic Student', email: 'student@example.test',
    telefone_contato: '0000000000', tipo_usuario: 'aluno',
    nome_responsavel: 'Synthetic Guardian', telefone_responsavel: '0000000001',
    toObject() { return { ...this, toObject: undefined }; },
  };

  t.mock.method(Usuario, 'findOne', async () => null);
  t.mock.method(Usuario, 'create', async (record) => ({ ...record, _id: validId }));
  const professor = response();
  await UsuariosController.cadastrarProfessor({ body: { nome: 'Synthetic Teacher', email: 'teacher@example.test', telefone_contato: '0000000002' } }, professor);
  assert.equal(professor.statusCode, 201);
  const student = response();
  await UsuariosController.cadastrarAluno({ body: { nome: user.nome, email: user.email, telefone_contato: user.telefone_contato, nome_responsavel: user.nome_responsavel, telefone_responsavel: user.telefone_responsavel } }, student);
  assert.equal(student.statusCode, 201);

  t.mock.method(Usuario, 'find', () => ({ sort: async () => [user], where() { return this; } }));
  const teachers = response();
  await UsuariosController.listarProfessores({}, teachers);
  assert.equal(teachers.statusCode, 200);
  const students = response();
  await UsuariosController.listarAlunos({}, students);
  assert.equal(students.statusCode, 200);
  const searched = response();
  await UsuariosController.getAlunoByNameOrEmail({ query: { text: 'Synthetic' } }, searched);
  assert.equal(searched.statusCode, 200);

  const query = {
    select() { return this; },
    then(resolve, reject) { return Promise.resolve(user).then(resolve, reject); },
  };
  t.mock.method(Usuario, 'findById', () => query);
  t.mock.method(Usuario, 'findByIdAndUpdate', async () => user);
  const details = response();
  await UsuariosController.getUsuario({ params: { id: validId } }, details);
  assert.equal(details.statusCode, 200);
  const one = response();
  await UsuariosController.getOne({ params: { id: validId } }, one);
  assert.equal(one.statusCode, 200);
  const updated = response();
  await UsuariosController.atualizarUsuario({ params: { id: validId }, body: { nome: 'Synthetic Updated', senha: 'synthetic-password' } }, updated);
  assert.equal(updated.statusCode, 200);

  t.mock.method(Turma, 'find', async () => []);
  t.mock.method(Simulado, 'aggregate', async () => []);
  const performance = response();
  await UsuariosController.getDesempenhoByAluno({ params: { id: validId }, query: {} }, performance);
  assert.equal(performance.statusCode, 200);
  assert.equal(performance.body.desempenho.length, 4);
});

test('routing modules register API handlers', async () => {
  const [{ default: routes }, { default: authRoutes }] = await Promise.all([
    import('../Routes/routes.js'),
    import('../Routes/AuthRoute.js'),
  ]);
  assert.ok(routes.stack.length > 20);
  assert.ok(authRoutes.stack.length >= 6);
});
