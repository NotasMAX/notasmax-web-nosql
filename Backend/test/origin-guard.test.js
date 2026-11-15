import test from 'node:test';
import assert from 'node:assert/strict';
import { originGuard } from '../middlewares/originGuard.js';
import { response } from './helpers.js';

process.env.JWT_SECRET ??= 'synthetic-test-secret';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/NotasMax';
process.env.CORS_ORIGINS = 'http://localhost:5173';

test('write requests reject disallowed browser origins while allowed and native requests proceed', () => {
  for (const req of [
    { method: 'POST', headers: { origin: 'https://attacker.example.test' } },
  ]) {
    const res = response();
    let nextCalls = 0;
    originGuard(req, res, () => nextCalls++);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { message: 'Origem não permitida.' });
    assert.equal(nextCalls, 0);
  }

  for (const req of [
    { method: 'PATCH', headers: { origin: 'http://localhost:5173' } },
    { method: 'POST', headers: {} },
    { method: 'GET', headers: { origin: 'https://attacker.example.test' } },
  ]) {
    const res = response();
    let nextCalls = 0;
    originGuard(req, res, () => nextCalls++);
    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, undefined);
  }
});
