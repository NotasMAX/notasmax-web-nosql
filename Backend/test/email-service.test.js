import test from 'node:test';
import assert from 'node:assert/strict';

test('password reset email templates are rendered through a fake transport', async () => {
  const priorUser = process.env.EMAIL_USER;
  const priorPass = process.env.EMAIL_PASS;
  delete process.env.EMAIL_PASS;
  process.env.EMAIL_USER = 'synthetic@example.test';
  try {
    const { sendPasswordResetEmail, sendPasswordResetEmailMobile } = await import('../services/emailService.js');
    const sent = [];
    const transport = { async sendMail(message) { sent.push(message); } };

    await sendPasswordResetEmail('student@example.test', 'synthetic-web-token', transport);
    await sendPasswordResetEmailMobile('student@example.test', 'synthetic-mobile-token', transport);

    assert.equal(sent.length, 2);
    assert.equal(sent[0].to, 'student@example.test');
    assert.match(sent[0].html, /synthetic-web-token/);
    assert.equal(sent[1].subject, 'Redefinição de Senha Solicitada (Mobile)');
    assert.match(sent[1].html, /synthetic-mobile-token/);
  } finally {
    if (priorUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = priorUser;
    if (priorPass === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = priorPass;
  }
});
