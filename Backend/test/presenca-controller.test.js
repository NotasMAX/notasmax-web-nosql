
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { response } from './helpers.js';

const id = '6a89b73919f4e74b3efe56c4';
const outroId = '6a89b73919f4e74b3efe56c5';
const SEGREDO = 'segredo-sintetico-do-qr';
const HORA = 60 * 60 * 1000;

function consulta(valor) {
    return {
        select() { return this; },
        sort() { return this; },
        then(resolve, reject) { return Promise.resolve(valor).then(resolve, reject); },
    };
}

async function carregar() {
    const [
        { default: Simulado },
        { default: Turma },
        { default: Usuario },
        { default: QrPresenca },
        { default: Presenca },
        { default: PresencasController },
    ] = await Promise.all([
        import('../Models/Simulado.js'),
        import('../Models/Turma.js'),
        import('../Models/Usuario.js'),
        import('../Models/QrPresenca.js'),
        import('../Models/Presenca.js'),
        import('../Controllers/PresencasController.js'),
    ]);
    return { Simulado, Turma, Usuario, QrPresenca, Presenca, PresencasController };
}

async function chamar(controller, metodo, req) {
    const res = response();
    await controller[metodo]({ body: {}, params: {}, user: { id }, ...req }, res);
    return res;
}

function qrPadrao(extra = {}) {
    return {
        _id: id,
        simulado_id: id,
        segredo: SEGREDO,
        ativa: true,
        valido_de: new Date(Date.now() - HORA),
        expira_em: new Date(Date.now() + 23 * HORA),
        ...extra,
    };
}

// Mesmo formato do token gerado pelo controller: JWT com { sid, exp } assinado com o segredo do QR
function tokenDo(qr, segredo = qr.segredo) {
    return jwt.sign({ sid: qr._id, exp: Math.floor(qr.expira_em.getTime() / 1000) }, segredo);
}

const simuladoPadrao = {
    _id: id, numero: 1, tipo: 'objetivo', bimestre: 1,
    data_realizacao: new Date('2026-05-01'), turma_id: id,
};
const turmaPadrao = { _id: id, serie: 3, ano: 2026 };

// ---------- gerarQr ----------

test('gerarQr rejeita id de simulado inválido', async () => {
    const { PresencasController } = await carregar();
    const res = await chamar(PresencasController, 'gerarQr', { body: { simulado_id: 'invalido' } });
    assert.equal(res.statusCode, 422);
});

test('gerarQr rejeita data de início inválida', async () => {
    const { PresencasController } = await carregar();
    const res = await chamar(PresencasController, 'gerarQr', { body: { simulado_id: id, valido_de: 'nao-e-data' } });
    assert.equal(res.statusCode, 422);
    assert.match(res.body.message, /início da validade/);
});

test('gerarQr devolve 422 quando o corpo da requisição está ausente', async () => {
    const { PresencasController } = await carregar();
    const res = await chamar(PresencasController, 'gerarQr', { body: undefined });
    assert.equal(res.statusCode, 422);
});

test('gerarQr devolve 404 quando o simulado não existe', async (t) => {
    const { Simulado, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(null));
    const res = await chamar(PresencasController, 'gerarQr', { body: { simulado_id: id } });
    assert.equal(res.statusCode, 404);
});

test('gerarQr devolve o QR ativo existente sem criar outro', async (t) => {
    const { Simulado, Turma, QrPresenca, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'findById', () => consulta(turmaPadrao));
    t.mock.method(QrPresenca, 'findOne', () => consulta(qrPadrao()));
    const criar = t.mock.method(QrPresenca, 'create', async () => ({}));

    const res = await chamar(PresencasController, 'gerarQr', { body: { simulado_id: id } });

    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /Já existe/);
    assert.equal(typeof res.body.token, 'string');
    assert.equal(criar.mock.callCount(), 0);
});

test('gerarQr cria um QR novo com validade de 24h a partir do início informado', async (t) => {
    const { Simulado, Turma, QrPresenca, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'findById', () => consulta(turmaPadrao));
    t.mock.method(QrPresenca, 'findOne', () => consulta(null));
    const criar = t.mock.method(QrPresenca, 'create', async (dados) => ({ _id: id, ...dados }));

    const res = await chamar(PresencasController, 'gerarQr', {
        body: { simulado_id: id, valido_de: '2026-01-01T00:00:00.000Z' },
    });

    assert.equal(res.statusCode, 201);
    const dados = criar.mock.calls[0].arguments[0];
    assert.equal(dados.criado_por, id);
    assert.equal(dados.expira_em.toISOString(), '2026-01-02T00:00:00.000Z');
    // o token devolvido é assinado com o segredo salvo no QR
    assert.equal(jwt.verify(res.body.token, dados.segredo, { ignoreExpiration: true }).sid, id);
});

test('gerarQr com renovar revoga os QR anteriores e cria outro', async (t) => {
    const { Simulado, Turma, QrPresenca, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'findById', () => consulta(null));
    t.mock.method(QrPresenca, 'findOne', () => consulta(qrPadrao()));
    const revogar = t.mock.method(QrPresenca, 'updateMany', async () => ({}));
    const criar = t.mock.method(QrPresenca, 'create', async (dados) => ({ _id: id, ...dados }));

    const res = await chamar(PresencasController, 'gerarQr', { body: { simulado_id: id, renovar: true } });

    assert.equal(res.statusCode, 201);
    assert.equal(revogar.mock.callCount(), 1);
    assert.equal(criar.mock.callCount(), 1);
    assert.equal(res.body.simulado.turma, null);
});

test('gerarQr devolve 500 quando a consulta falha', async (t) => {
    const { Simulado, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => { throw new Error('falha sintética'); });
    const res = await chamar(PresencasController, 'gerarQr', { body: { simulado_id: id } });
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'falha sintética');
});

// ---------- obterQrAtivo ----------

test('obterQrAtivo rejeita id de simulado inválido', async () => {
    const { PresencasController } = await carregar();
    const res = await chamar(PresencasController, 'obterQrAtivo', { params: { simulado_id: 'x' } });
    assert.equal(res.statusCode, 422);
});

test('obterQrAtivo devolve 404 quando o simulado não existe', async (t) => {
    const { Simulado, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(null));
    const res = await chamar(PresencasController, 'obterQrAtivo', { params: { simulado_id: id } });
    assert.equal(res.statusCode, 404);
});

test('obterQrAtivo devolve 404 quando não há QR ativo', async (t) => {
    const { Simulado, QrPresenca, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(QrPresenca, 'findOne', () => consulta(null));
    const res = await chamar(PresencasController, 'obterQrAtivo', { params: { simulado_id: id } });
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /Nenhum QR Code ativo/);
});

test('obterQrAtivo devolve o QR ativo com um token verificável', async (t) => {
    const { Simulado, Turma, QrPresenca, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(QrPresenca, 'findOne', () => consulta(qrPadrao()));
    t.mock.method(Turma, 'findById', () => consulta(turmaPadrao));

    const res = await chamar(PresencasController, 'obterQrAtivo', { params: { simulado_id: id } });

    assert.equal(res.statusCode, 200);
    assert.equal(jwt.verify(res.body.token, SEGREDO).sid, id);
    assert.deepEqual(res.body.simulado.turma, { id, serie: 3, ano: 2026 });
});

test('obterQrAtivo devolve 500 quando a consulta falha', async (t) => {
    const { Simulado, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => { throw new Error('falha sintética'); });
    const res = await chamar(PresencasController, 'obterQrAtivo', { params: { simulado_id: id } });
    assert.equal(res.statusCode, 500);
});

// ---------- revogarQr ----------

test('revogarQr rejeita id inválido', async () => {
    const { PresencasController } = await carregar();
    const res = await chamar(PresencasController, 'revogarQr', { params: { qr_id: 'x' } });
    assert.equal(res.statusCode, 422);
});

test('revogarQr devolve 404 quando o QR não existe', async (t) => {
    const { QrPresenca, PresencasController } = await carregar();
    t.mock.method(QrPresenca, 'findByIdAndUpdate', async () => null);
    const res = await chamar(PresencasController, 'revogarQr', { params: { qr_id: id } });
    assert.equal(res.statusCode, 404);
});

test('revogarQr desativa o QR', async (t) => {
    const { QrPresenca, PresencasController } = await carregar();
    const atualizar = t.mock.method(QrPresenca, 'findByIdAndUpdate', async () => ({ _id: id }));
    const res = await chamar(PresencasController, 'revogarQr', { params: { qr_id: id } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(atualizar.mock.calls[0].arguments[1], { ativa: false });
});

test('revogarQr devolve 500 quando a atualização falha', async (t) => {
    const { QrPresenca, PresencasController } = await carregar();
    t.mock.method(QrPresenca, 'findByIdAndUpdate', async () => { throw new Error('falha sintética'); });
    const res = await chamar(PresencasController, 'revogarQr', { params: { qr_id: id } });
    assert.equal(res.statusCode, 500);
});

// ---------- registrar ----------

test('registrar exige o token do QR Code', async () => {
    const { PresencasController } = await carregar();
    for (const body of [undefined, {}, { token: 123 }]) {
        const res = await chamar(PresencasController, 'registrar', { body, user: { id: outroId } });
        assert.equal(res.statusCode, 422);
    }
});

test('registrar rejeita token que não é um JWT ou não traz um id de QR válido', async () => {
    const { PresencasController } = await carregar();
    for (const token of ['synthetic-token', jwt.sign({ foo: 1 }, SEGREDO), jwt.sign({ sid: 'nao-e-objectid' }, SEGREDO)]) {
        const res = await chamar(PresencasController, 'registrar', { body: { token }, user: { id: outroId } });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'QR Code inválido.');
    }
});

test('registrar rejeita token de um QR que não existe', async (t) => {
    const { QrPresenca, PresencasController } = await carregar();
    t.mock.method(QrPresenca, 'findById', () => consulta(null));
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qrPadrao()) }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'QR Code inválido.');
});

test('registrar rejeita token assinado com outro segredo', async (t) => {
    const { QrPresenca, PresencasController } = await carregar();
    const qr = qrPadrao();
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr, 'segredo-falsificado') }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'QR Code inválido.');
});

test('registrar rejeita QR expirado', async (t) => {
    const { QrPresenca, PresencasController } = await carregar();
    const qr = qrPadrao({ expira_em: new Date(Date.now() - 1000) });
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr) }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Este QR Code expirou.');
});

test('registrar rejeita QR revogado', async (t) => {
    const { QrPresenca, PresencasController } = await carregar();
    const qr = qrPadrao({ ativa: false });
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr) }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Este QR Code foi revogado.');
});

test('registrar rejeita QR que ainda não começou a valer', async (t) => {
    const { QrPresenca, PresencasController } = await carregar();
    const qr = qrPadrao({ valido_de: new Date(Date.now() + HORA), expira_em: new Date(Date.now() + 25 * HORA) });
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr) }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Este QR Code ainda não está disponível.');
});

test('registrar devolve 404 quando o simulado do QR não existe mais', async (t) => {
    const { Simulado, QrPresenca, PresencasController } = await carregar();
    const qr = qrPadrao();
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    t.mock.method(Simulado, 'findById', () => consulta(null));
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr) }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 404);
});

test('registrar recusa aluno que não pertence à turma do simulado', async (t) => {
    const { Simulado, Turma, QrPresenca, Presenca, PresencasController } = await carregar();
    const qr = qrPadrao();
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'exists', async () => null);
    const criar = t.mock.method(Presenca, 'create', async () => ({}));
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr) }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 403);
    assert.equal(criar.mock.callCount(), 0);
});

test('registrar grava a presença com QR válido de aluno da turma', async (t) => {
    const { Simulado, Turma, QrPresenca, Presenca, PresencasController } = await carregar();
    const qr = qrPadrao();
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'exists', async () => ({ _id: id }));
    const criar = t.mock.method(Presenca, 'create', async (dados) => dados);

    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr) }, user: { id: outroId },
    });

    assert.equal(res.statusCode, 201);
    assert.deepEqual(criar.mock.calls[0].arguments[0], {
        simulado_id: id, aluno_id: outroId, qr_id: id, metodo: 'QR',
    });
    assert.equal(res.body.simulado.id, id);
});

test('registrar devolve 409 quando a presença já foi registrada', async (t) => {
    const { Simulado, Turma, QrPresenca, Presenca, PresencasController } = await carregar();
    const qr = qrPadrao();
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'exists', async () => ({ _id: id }));
    t.mock.method(Presenca, 'create', async () => { throw Object.assign(new Error('duplicado'), { code: 11000 }); });
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr) }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 409);
});

test('registrar devolve 500 para falhas inesperadas', async (t) => {
    const { Simulado, Turma, QrPresenca, Presenca, PresencasController } = await carregar();
    const qr = qrPadrao();
    t.mock.method(QrPresenca, 'findById', () => consulta(qr));
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'exists', async () => ({ _id: id }));
    t.mock.method(Presenca, 'create', async () => { throw new Error('falha sintética'); });
    const res = await chamar(PresencasController, 'registrar', {
        body: { token: tokenDo(qr) }, user: { id: outroId },
    });
    assert.equal(res.statusCode, 500);
});

// ---------- listarPorSimulado ----------

test('listarPorSimulado rejeita id inválido', async () => {
    const { PresencasController } = await carregar();
    const res = await chamar(PresencasController, 'listarPorSimulado', { params: { simulado_id: 'x' } });
    assert.equal(res.statusCode, 422);
});

test('listarPorSimulado devolve 404 quando o simulado não existe', async (t) => {
    const { Simulado, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(null));
    const res = await chamar(PresencasController, 'listarPorSimulado', { params: { simulado_id: id } });
    assert.equal(res.statusCode, 404);
});

test('listarPorSimulado marca quem está presente e totaliza', async (t) => {
    const { Simulado, Turma, Usuario, Presenca, PresencasController } = await carregar();
    const registrada = new Date('2026-05-01T10:00:00.000Z');
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'findById', () => consulta({ ...turmaPadrao, alunos: [id, outroId] }));
    t.mock.method(Usuario, 'find', () => consulta([
        { _id: id, nome: 'Ana' },
        { _id: outroId, nome: 'Bia' },
    ]));
    t.mock.method(Presenca, 'find', async () => [{ aluno_id: id, registrada_em: registrada, metodo: 'QR' }]);

    const res = await chamar(PresencasController, 'listarPorSimulado', { params: { simulado_id: id } });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.total_alunos, 2);
    assert.equal(res.body.total_presentes, 1);
    assert.deepEqual(res.body.alunos[0], {
        aluno_id: id, nome: 'Ana', presente: true, registrada_em: registrada, metodo: 'QR',
    });
    assert.deepEqual(res.body.alunos[1], {
        aluno_id: outroId, nome: 'Bia', presente: false, registrada_em: null, metodo: null,
    });
});

test('listarPorSimulado funciona quando a turma do simulado não existe', async (t) => {
    const { Simulado, Turma, Usuario, Presenca, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => consulta(simuladoPadrao));
    t.mock.method(Turma, 'findById', () => consulta(null));
    t.mock.method(Usuario, 'find', () => consulta([]));
    t.mock.method(Presenca, 'find', async () => []);

    const res = await chamar(PresencasController, 'listarPorSimulado', { params: { simulado_id: id } });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.simulado.turma, null);
    assert.equal(res.body.total_alunos, 0);
});

test('listarPorSimulado devolve 500 quando a consulta falha', async (t) => {
    const { Simulado, PresencasController } = await carregar();
    t.mock.method(Simulado, 'findById', () => { throw new Error('falha sintética'); });
    const res = await chamar(PresencasController, 'listarPorSimulado', { params: { simulado_id: id } });
    assert.equal(res.statusCode, 500);
});
