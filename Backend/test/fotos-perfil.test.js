import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import express from 'express';
import Usuario from '../Models/Usuario.js';
import FotosPerfilController from '../Controllers/FotosPerfilController.js';
import UsuariosController from '../Controllers/UsuariosController.js';
import { receberFoto } from '../middlewares/uploadFoto.js';
import { criarFotosPerfil, fotosPerfil, nomeDaFoto, tipoDaFoto } from '../services/fotosPerfil.js';
import { response } from './helpers.js';

const USUARIO = '507f1f77bcf86cd799439011';
const OUTRO = '507f1f77bcf86cd799439012';
const ADMIN = { id: '507f1f77bcf86cd799439099', tipo_usuario: 'administrador' };
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const ATUALIZADA_EM = new Date('2026-11-15T12:00:00.000Z');

// ===== Serviço =====

function containerFalso({ erroNoDownload } = {}) {
  const chamadas = { enviados: [], baixados: [], aberturas: 0 };
  const container = {
    getBlockBlobClient: (nome) => ({
      uploadData: async (buffer, opcoes) => { chamadas.enviados.push({ nome, buffer, opcoes }); },
      download: async () => {
        chamadas.baixados.push(nome);
        if (erroNoDownload) throw erroNoDownload;
        return { readableStreamBody: Readable.from([PNG]), contentLength: PNG.length };
      },
    }),
  };
  return { chamadas, obterContainer: () => { chamadas.aberturas += 1; return container; } };
}

test('recognizes JPEG and PNG by their first bytes', () => {
  assert.equal(tipoDaFoto(JPEG), 'image/jpeg');
  assert.equal(tipoDaFoto(PNG), 'image/png');
  assert.equal(tipoDaFoto(Buffer.from('<svg></svg>')), null);
  assert.equal(tipoDaFoto(Buffer.alloc(0)), null);
});

test('each user has a single blob for the photo', () => {
  assert.equal(nomeDaFoto(USUARIO), `fotos-perfil/${USUARIO}`);
});

test('stores the photo with its type, replacing the previous one', async () => {
  const { chamadas, obterContainer } = containerFalso();
  const servico = criarFotosPerfil({ obterContainer, ativo: () => true });

  await servico.guardar({ usuario_id: USUARIO, buffer: PNG, tipo: 'image/png' });
  await servico.guardar({ usuario_id: USUARIO, buffer: JPEG, tipo: 'image/jpeg' });

  assert.deepEqual(chamadas.enviados.map(({ nome, opcoes }) => [nome, opcoes]), [
    [`fotos-perfil/${USUARIO}`, { blobHTTPHeaders: { blobContentType: 'image/png' } }],
    [`fotos-perfil/${USUARIO}`, { blobHTTPHeaders: { blobContentType: 'image/jpeg' } }],
  ]);
  assert.equal(chamadas.aberturas, 1);
});

test('opens the stored photo', async () => {
  const { chamadas, obterContainer } = containerFalso();

  const foto = await criarFotosPerfil({ obterContainer, ativo: () => true }).abrir(USUARIO);

  assert.deepEqual(chamadas.baixados, [`fotos-perfil/${USUARIO}`]);
  assert.equal(foto.tamanho, PNG.length);
  assert.deepEqual(Buffer.concat(await foto.conteudo.toArray()), PNG);
});

test('a photo missing from the container opens as null', async () => {
  const erroNoDownload = Object.assign(new Error('The specified blob does not exist.'), { statusCode: 404, details: { errorCode: 'BlobNotFound' } });
  const { obterContainer } = containerFalso({ erroNoDownload });

  assert.equal(await criarFotosPerfil({ obterContainer, ativo: () => true }).abrir(USUARIO), null);
});

test('other storage failures reach the caller', async () => {
  const erroNoDownload = Object.assign(new Error('sem permissão'), { statusCode: 403, details: { errorCode: 'AuthorizationPermissionMismatch' } });
  const { obterContainer } = containerFalso({ erroNoDownload });

  await assert.rejects(criarFotosPerfil({ obterContainer, ativo: () => true }).abrir(USUARIO), /sem permissão/);
});

test('availability follows the environment', () => {
  assert.equal(criarFotosPerfil({ obterContainer: () => null, ativo: () => true }).disponivel(), true);
  assert.equal(criarFotosPerfil({ obterContainer: () => null, ativo: () => false }).disponivel(), false);
});

// ===== Rotas =====

async function servidor(t, usuario = ADMIN) {
  const app = express();
  app.use((req, res, next) => { req.user = usuario; next(); });
  app.get('/Usuarios/Fotos/Disponibilidade', FotosPerfilController.disponibilidade);
  app.put('/Usuarios/:id/Foto', receberFoto, FotosPerfilController.enviar);
  app.get('/Usuarios/:id/Foto', FotosPerfilController.abrir);
  const instancia = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => instancia.close());
  return `http://127.0.0.1:${instancia.address().port}`;
}

async function enviarFoto(base, { id = USUARIO, conteudo = PNG, tipo = 'image/png', nome = 'foto.png', campo = 'foto' } = {}) {
  const dados = new FormData();
  dados.append(campo, new Blob([conteudo], { type: tipo }), nome);
  const resposta = await fetch(`${base}/Usuarios/${id}/Foto`, { method: 'PUT', body: dados });
  return { status: resposta.status, corpo: await resposta.json() };
}

function simularEnvio(t, { disponivel = true, existe = true } = {}) {
  const chamadas = { guardadas: [], atualizacoes: [] };
  t.mock.method(fotosPerfil, 'disponivel', () => disponivel);
  t.mock.method(fotosPerfil, 'guardar', async (foto) => { chamadas.guardadas.push(foto); });
  t.mock.method(Usuario, 'exists', async () => (existe ? { _id: USUARIO } : null));
  t.mock.method(Usuario, 'updateOne', async (filtro, alteracao) => { chamadas.atualizacoes.push([filtro, alteracao]); });
  return chamadas;
}

test('tells the screen whether photos can be sent', async (t) => {
  t.mock.method(fotosPerfil, 'disponivel', () => false);
  const base = await servidor(t);

  const resposta = await fetch(`${base}/Usuarios/Fotos/Disponibilidade`);

  assert.deepEqual(await resposta.json(), { disponivel: false });
});

test('stores a PNG photo and records its type, size and date', async (t) => {
  const chamadas = simularEnvio(t);
  const base = await servidor(t);

  const { status, corpo } = await enviarFoto(base);

  assert.equal(status, 200);
  assert.equal(corpo.message, 'Foto salva com sucesso.');
  assert.equal(chamadas.guardadas.length, 1);
  assert.deepEqual({ ...chamadas.guardadas[0], buffer: [...chamadas.guardadas[0].buffer] }, { usuario_id: USUARIO, buffer: [...PNG], tipo: 'image/png' });

  const [[filtro, { $set }]] = chamadas.atualizacoes;
  assert.deepEqual(filtro, { _id: USUARIO });
  assert.deepEqual({ tipo: $set.foto.tipo, tamanho: $set.foto.tamanho }, { tipo: 'image/png', tamanho: PNG.length });
  assert.equal(corpo.foto_atualizada_em, $set.foto.atualizada_em.toISOString());
});

test('the type comes from the content, not from what the browser declared', async (t) => {
  const chamadas = simularEnvio(t);
  const base = await servidor(t);

  const { status } = await enviarFoto(base, { conteudo: JPEG, tipo: 'image/png' });

  assert.equal(status, 200);
  assert.equal(chamadas.guardadas[0].tipo, 'image/jpeg');
});

for (const [descricao, opcoes, mensagem] of [
  ['content that is not an image', { conteudo: Buffer.from('<svg onload="x"></svg>'), tipo: 'image/png' }, 'Envie uma foto em JPEG ou PNG.'],
  ['another declared type', { conteudo: PNG, tipo: 'image/gif', nome: 'foto.gif' }, 'Envie uma foto em JPEG ou PNG.'],
  ['a file above 5 MB', { conteudo: Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]) }, 'A foto deve ter no máximo 5 MB.'],
  ['another form field', { campo: 'arquivo' }, 'Envie uma foto em JPEG ou PNG.'],
]) {
  test(`refuses ${descricao}`, async (t) => {
    const chamadas = simularEnvio(t);
    const base = await servidor(t);

    const { status, corpo } = await enviarFoto(base, opcoes);

    assert.equal(status, 422);
    assert.equal(corpo.message, mensagem);
    assert.deepEqual(chamadas.guardadas, []);
  });
}

test('refuses the upload without a file', async (t) => {
  simularEnvio(t);
  const base = await servidor(t);

  const resposta = await fetch(`${base}/Usuarios/${USUARIO}/Foto`, { method: 'PUT', body: new FormData() });

  assert.equal(resposta.status, 422);
  assert.equal((await resposta.json()).message, 'Envie a foto.');
});

test('outside Azure the upload is turned off', async (t) => {
  const chamadas = simularEnvio(t, { disponivel: false });
  const base = await servidor(t);

  const { status, corpo } = await enviarFoto(base);

  assert.equal(status, 503);
  assert.equal(corpo.message, 'O envio de fotos só funciona no ambiente da Azure.');
  assert.deepEqual(chamadas.guardadas, []);
});

test('refuses an invalid id and an unknown user', async (t) => {
  const chamadas = simularEnvio(t, { existe: false });
  const base = await servidor(t);

  assert.equal((await enviarFoto(base, { id: 'abc' })).status, 422);
  const desconhecido = await enviarFoto(base);
  assert.equal(desconhecido.status, 404);
  assert.equal(desconhecido.corpo.message, 'Usuário não encontrado.');
  assert.deepEqual(chamadas.guardadas, []);
});

test('reports a failure looking up the user', async (t) => {
  simularEnvio(t);
  t.mock.method(Usuario, 'exists', async () => { throw new Error('banco fora do ar'); });
  const base = await servidor(t);

  const { status, corpo } = await enviarFoto(base);

  assert.equal(status, 500);
  assert.equal(corpo.error, 'banco fora do ar');
});

test('does not record the photo when the Blob Storage fails', async (t) => {
  const chamadas = simularEnvio(t);
  t.mock.method(fotosPerfil, 'guardar', async () => { throw new Error('sem permissão'); });
  const erros = t.mock.method(console, 'error', () => {});
  const base = await servidor(t);

  const { status, corpo } = await enviarFoto(base);

  assert.equal(status, 502);
  assert.equal(corpo.message, 'Não foi possível guardar a foto.');
  assert.deepEqual(chamadas.atualizacoes, []);
  assert.match(erros.mock.calls[0].arguments.join(' '), /sem permissão/);
});

test('reports a failure recording the photo', async (t) => {
  simularEnvio(t);
  t.mock.method(Usuario, 'updateOne', async () => { throw new Error('escrita falhou'); });
  const base = await servidor(t);

  const { status, corpo } = await enviarFoto(base);

  assert.equal(status, 500);
  assert.equal(corpo.error, 'escrita falhou');
});

function simularAbertura(t, { disponivel = true, foto = { tipo: 'image/png', tamanho: PNG.length, atualizada_em: ATUALIZADA_EM }, aberta = { conteudo: Readable.from([PNG]), tamanho: PNG.length } } = {}) {
  t.mock.method(fotosPerfil, 'disponivel', () => disponivel);
  t.mock.method(fotosPerfil, 'abrir', async () => aberta);
  t.mock.method(Usuario, 'findById', () => ({ select: async () => ({ foto }) }));
}

test('serves the photo with its type and without content sniffing', async (t) => {
  simularAbertura(t);
  const base = await servidor(t);

  const resposta = await fetch(`${base}/Usuarios/${USUARIO}/Foto?v=1`);

  assert.equal(resposta.status, 200);
  assert.equal(resposta.headers.get('content-type'), 'image/png');
  assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(resposta.headers.get('cache-control'), 'private, max-age=86400');
  assert.equal(resposta.headers.get('content-length'), String(PNG.length));
  assert.deepEqual(Buffer.from(await resposta.arrayBuffer()), PNG);
});

test('a user sees their own photo, but not someone else’s', async (t) => {
  simularAbertura(t);
  const base = await servidor(t, { id: USUARIO, tipo_usuario: 'aluno' });

  assert.equal((await fetch(`${base}/Usuarios/${USUARIO}/Foto`)).status, 200);
  const outro = await fetch(`${base}/Usuarios/${OUTRO}/Foto`);
  assert.equal(outro.status, 403);
  assert.equal((await outro.json()).message, 'Acesso negado.');
});

for (const [descricao, opcoes] of [
  ['the environment does not store photos', { disponivel: false }],
  ['the user has no photo', { foto: null }],
  ['the photo is missing from the container', { aberta: null }],
]) {
  test(`answers 404 when ${descricao}`, async (t) => {
    simularAbertura(t, opcoes);
    const base = await servidor(t);

    const resposta = await fetch(`${base}/Usuarios/${USUARIO}/Foto`);

    assert.equal(resposta.status, 404);
    assert.equal((await resposta.json()).message, 'Foto não encontrada.');
  });
}

test('refuses an invalid id when opening', async (t) => {
  simularAbertura(t);
  const base = await servidor(t);

  assert.equal((await fetch(`${base}/Usuarios/abc/Foto`)).status, 422);
});

test('reports failures looking up and opening the photo', async (t) => {
  simularAbertura(t);
  t.mock.method(Usuario, 'findById', () => ({ select: async () => { throw new Error('banco fora do ar'); } }));
  const base = await servidor(t);
  assert.equal((await fetch(`${base}/Usuarios/${USUARIO}/Foto`)).status, 500);

  t.mock.method(Usuario, 'findById', () => ({ select: async () => ({ foto: { tipo: 'image/png', atualizada_em: ATUALIZADA_EM } }) }));
  t.mock.method(fotosPerfil, 'abrir', async () => { throw new Error('sem permissão'); });
  const erros = t.mock.method(console, 'error', () => {});
  const resposta = await fetch(`${base}/Usuarios/${USUARIO}/Foto`);
  assert.equal(resposta.status, 502);
  assert.equal((await resposta.json()).message, 'Não foi possível abrir a foto.');
  assert.match(erros.mock.calls[0].arguments.join(' '), /sem permissão/);
});

test('a failure in the middle of sending the photo is only logged', async (t) => {
  const quebrada = new Readable({ read() { this.destroy(new Error('conexão caiu')); } });
  simularAbertura(t, { aberta: { conteudo: quebrada } });
  const erros = t.mock.method(console, 'error', () => {});
  const base = await servidor(t);

  await fetch(`${base}/Usuarios/${USUARIO}/Foto`).then((resposta) => resposta.arrayBuffer()).catch(() => {});

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.match(erros.mock.calls.map(({ arguments: args }) => args.join(' ')).join('\n'), /conexão caiu/);
});

// ===== Dados do usuário =====

test('the user details tell when the photo changed, without the rest of it', async (t) => {
  const usuario = {
    nome: 'Ana', tipo_usuario: 'aluno', foto: { tipo: 'image/png', tamanho: 10, atualizada_em: ATUALIZADA_EM },
    toObject() { return { nome: this.nome, tipo_usuario: this.tipo_usuario, foto: this.foto }; },
  };
  t.mock.method(Usuario, 'findById', () => ({ select: async () => usuario }));
  const res = response();

  await UsuariosController.getUsuario({ params: { id: USUARIO } }, res);

  assert.deepEqual(res.body, { nome: 'Ana', foto_atualizada_em: ATUALIZADA_EM });
});

test('the user details answer a null photo date when there is no photo', async (t) => {
  t.mock.method(Usuario, 'findById', () => ({ select: async () => ({ toObject: () => ({ nome: 'Ana' }) }) }));
  const res = response();

  await UsuariosController.getUsuario({ params: { id: USUARIO } }, res);

  assert.equal(res.body.foto_atualizada_em, null);
});

test('updating the user never changes the photo', async (t) => {
  const atualizacoes = [];
  t.mock.method(Usuario, 'findById', async () => ({ _id: USUARIO }));
  t.mock.method(Usuario, 'findByIdAndUpdate', async (id, alteracao) => { atualizacoes.push(alteracao); return { nome: 'Ana' }; });
  const res = response();

  await UsuariosController.atualizarUsuario({
    params: { id: USUARIO },
    body: { nome: 'Ana', foto: { tipo: 'image/png', atualizada_em: new Date() }, foto_atualizada_em: '2026-01-01' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(atualizacoes, [{ nome: 'Ana' }]);
});
