import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enviarFotoUsuario } from '../api/usuariosapi';
import { ACEITA_FOTO, avisoDeFotoNaoSalva, enviarFotoEscolhida, fotoUsuarioUrl, validarFoto } from './fotoPerfil';

vi.mock('../api/usuariosapi', () => ({ enviarFotoUsuario: vi.fn() }));

const arquivo = (tipo, tamanho = 4, nome = 'foto') => new File([new Uint8Array(tamanho)], nome, { type: tipo });

describe('validarFoto', () => {
  it('accepts JPEG and PNG up to 5 MB', () => {
    expect(ACEITA_FOTO).toBe('image/jpeg,image/png');
    expect(validarFoto(arquivo('image/jpeg'))).toBeNull();
    expect(validarFoto(arquivo('image/png', 5 * 1024 * 1024))).toBeNull();
  });

  it('refuses other types, empty files and files above 5 MB', () => {
    expect(validarFoto(arquivo('image/gif'))).toBe('Escolha uma foto em JPEG ou PNG.');
    expect(validarFoto(arquivo('image/png', 0))).toBe('O arquivo escolhido está vazio.');
    expect(validarFoto(arquivo('image/png', 5 * 1024 * 1024 + 1))).toBe('A foto deve ter no máximo 5 MB.');
  });
});

describe('fotoUsuarioUrl', () => {
  it('points to the photo route, with the change date as the version', () => {
    expect(fotoUsuarioUrl('u 1', '2026-11-15T12:00:00.000Z')).toBe('http://localhost:5000/NotasMax/Usuarios/u%201/Foto?v=2026-11-15T12:00:00.000Z');
  });

  it('has no address when the user has no photo', () => {
    expect(fotoUsuarioUrl('u1', null)).toBeNull();
    expect(fotoUsuarioUrl('u1', undefined)).toBeNull();
  });
});

describe('enviarFotoEscolhida', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing without a photo', async () => {
    expect(await enviarFotoEscolhida('u1', null)).toBeNull();
    expect(enviarFotoUsuario).not.toHaveBeenCalled();
  });

  it('sends the photo and answers null when it works', async () => {
    const foto = arquivo('image/png');
    enviarFotoUsuario.mockResolvedValue({});

    expect(await enviarFotoEscolhida('u1', foto)).toBeNull();
    expect(enviarFotoUsuario).toHaveBeenCalledWith('u1', foto);
  });

  it('answers the problem when the upload fails', async () => {
    enviarFotoUsuario.mockRejectedValueOnce({ response: { data: { message: 'Não foi possível guardar a foto.' } } });
    expect(await enviarFotoEscolhida('u1', arquivo('image/png'))).toBe('Não foi possível guardar a foto.');

    enviarFotoUsuario.mockRejectedValueOnce(new Error('rede'));
    expect(await enviarFotoEscolhida('u1', arquivo('image/png'))).toBe('Não foi possível enviar a foto.');
  });
});

describe('avisoDeFotoNaoSalva', () => {
  it('says what was saved, what failed and what to do', () => {
    expect(avisoDeFotoNaoSalva('Aluno cadastrado', 'Não foi possível guardar a foto.', 'Edite o aluno para enviá-la novamente.'))
      .toBe('Aluno cadastrado, mas a foto não foi salva. Não foi possível guardar a foto. Edite o aluno para enviá-la novamente.');
    expect(avisoDeFotoNaoSalva('Aluno atualizado', 'Id de usuário inválido', 'Tente enviá-la novamente.'))
      .toBe('Aluno atualizado, mas a foto não foi salva. Id de usuário inválido. Tente enviá-la novamente.');
  });
});
