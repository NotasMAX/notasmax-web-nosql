import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { response } from './helpers.js';

const originalEmailUser = process.env.EMAIL_USER;
const originalEmailPass = process.env.EMAIL_PASS;
before(async () => {
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  await import('../Controllers/AuthController.js');
  if (originalEmailUser === undefined) delete process.env.EMAIL_USER;
  else process.env.EMAIL_USER = originalEmailUser;
  if (originalEmailPass === undefined) delete process.env.EMAIL_PASS;
  else process.env.EMAIL_PASS = originalEmailPass;
});

function selectQuery(value) {
  return {
    select() { return this; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

test('login returns an authenticated user and sets the JWT cookie using a fake user model', async (t) => {
  const [{ default: Usuario }, { login }] = await Promise.all([
    import('../Models/Usuario.js'),
    import('../Controllers/AuthController.js'),
  ]);
  const user = {
    _id: 'synthetic-user-id',
    nome: 'Synthetic User',
    email: 'student@example.test',
    senha: await bcrypt.hash('synthetic-password', 4),
    tipo_usuario: 'aluno',
  };
  t.mock.method(Usuario, 'findOne', () => selectQuery(user));
  const res = response();
  await login({ body: { email: user.email, senha: 'synthetic-password' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.usuario.email, user.email);
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET || 'chave-secreta-super-segura').id, user._id);
  assert.equal(res.cookieValue.name, 'jwt');
});

test('password reset validates a synthetic token and updates a fake user record', async (t) => {
  const [{ default: Usuario }, { resetPassword }] = await Promise.all([
    import('../Models/Usuario.js'),
    import('../Controllers/AuthController.js'),
  ]);
  const token = 'synthetic-reset-token';
  const user = { _id: 'synthetic-user-id', resetToken: await bcrypt.hash(token, 4) };
  const findOne = t.mock.method(Usuario, 'findOne', () => selectQuery(user));
  const updateOne = t.mock.method(Usuario, 'updateOne', async () => ({ acknowledged: true }));
  const res = response();
  await resetPassword({ body: { token, novaSenha: 'synthetic-new-password' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(findOne.mock.callCount(), 1);
  assert.equal(updateOne.mock.callCount(), 1);
});

test('web and mobile recovery use fake persistence and credential-free mail delivery', async (t) => {
  const [{ default: Usuario }, { forgotPassword, forgotPasswordMobile }] = await Promise.all([
    import('../Models/Usuario.js'),
    import('../Controllers/AuthController.js'),
  ]);
  const user = { _id: 'synthetic-user-id', email: 'student@example.test' };
  t.mock.method(Usuario, 'findOne', () => selectQuery(user));
  t.mock.method(Usuario, 'updateOne', async () => ({ acknowledged: true }));
  const originalLog = console.log;
  const logs = [];
  console.log = (message) => logs.push(String(message));
  t.after(() => { console.log = originalLog; });

  const web = response();
  await forgotPassword({ body: { email: user.email } }, web);
  const mobile = response();
  await forgotPasswordMobile({ body: { email: user.email } }, mobile);
  assert.equal(web.statusCode, 200);
  assert.equal(mobile.statusCode, 200);
  assert.ok(logs.every((line) => !line.includes('synthetic-user-id')));
});
