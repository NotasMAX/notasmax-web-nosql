import test from 'node:test';
import assert from 'node:assert/strict';
import { getCookieOptions, getJwtSecret, loadRuntimeConfig } from '../config.js';

const baseline = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/NotasMax',
  JWT_SECRET: 'synthetic-test-secret',
  CORS_ORIGINS: 'http://localhost:5173,https://school.example.test',
};

test('runtime config requires Mongo URI, JWT secret, and explicit CORS origins', () => {
  for (const name of ['MONGODB_URI', 'JWT_SECRET', 'CORS_ORIGINS']) {
    const env = { ...baseline };
    delete env[name];
    assert.throws(() => loadRuntimeConfig(env), new RegExp(name));
  }
});

test('runtime config accepts local and SRV Mongo URIs and exact origins', () => {
  const config = loadRuntimeConfig({ ...baseline, PORT: '8080' });
  assert.equal(config.port, 8080);
  assert.deepEqual(config.corsOrigins, ['http://localhost:5173', 'https://school.example.test']);
  assert.equal(config.cookie.sameSite, 'lax');
  assert.equal(loadRuntimeConfig({ ...baseline, MONGODB_URI: 'mongodb+srv://cluster.example.test/app' }).mongoUri,
    'mongodb+srv://cluster.example.test/app');
});

test('runtime config rejects invalid port, wildcard origins, and unsafe cross-site cookies', () => {
  assert.throws(() => loadRuntimeConfig({ ...baseline, PORT: '70000' }), /PORT/);
  assert.throws(() => loadRuntimeConfig({ ...baseline, CORS_ORIGINS: '*' }), /CORS_ORIGINS/);
  assert.throws(() => loadRuntimeConfig({ ...baseline, CORS_ORIGINS: 'https://school.example.test/path' }), /CORS_ORIGINS/);
  assert.throws(() => loadRuntimeConfig({ ...baseline, COOKIE_SAME_SITE: 'none' }), /COOKIE_SECURE/);
});

test('Azure cross-site cookie options require and preserve Secure', () => {
  const config = loadRuntimeConfig({ ...baseline, COOKIE_SECURE: 'true', COOKIE_SAME_SITE: 'none' });
  assert.deepEqual(config.cookie, {
    httpOnly: true, secure: true, sameSite: 'none', maxAge: 24 * 60 * 60 * 1000,
  });
});

test('JWT and cookie helpers fail safely when required values are absent', () => {
  const originalSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    assert.throws(() => getJwtSecret(), /JWT_SECRET/);
  } finally {
    if (originalSecret !== undefined) process.env.JWT_SECRET = originalSecret;
  }

  const originalSecure = process.env.COOKIE_SECURE;
  const originalSameSite = process.env.COOKIE_SAME_SITE;
  process.env.COOKIE_SECURE = 'true';
  process.env.COOKIE_SAME_SITE = 'none';
  try {
    assert.equal(getCookieOptions().secure, true);
    assert.equal(getCookieOptions().sameSite, 'none');
  } finally {
    if (originalSecure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = originalSecure;
    if (originalSameSite === undefined) delete process.env.COOKIE_SAME_SITE;
    else process.env.COOKIE_SAME_SITE = originalSameSite;
  }
});
