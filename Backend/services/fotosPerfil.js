import { codigoDoErro, containerDaAzure, emProducao } from './blobStorage.js';

const PASTA = 'fotos-perfil';

// Mesma política da versão em Postgres: JPEG ou PNG, com até 5 MB.
export const TIPOS_DE_FOTO = ['image/jpeg', 'image/png'];
export const LIMITE_DA_FOTO_EM_BYTES = 5 * 1024 * 1024;

const ASSINATURA_JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Descobre o tipo pelos primeiros bytes do arquivo, e não pelo que o navegador declarou.
 * Devolve null quando o conteúdo não é JPEG nem PNG.
 */
export const tipoDaFoto = (buffer) => {
    if (buffer.subarray(0, ASSINATURA_JPEG.length).equals(ASSINATURA_JPEG)) return 'image/jpeg';
    if (buffer.subarray(0, ASSINATURA_PNG.length).equals(ASSINATURA_PNG)) return 'image/png';
    return null;
};

// Um blob por usuário: uma foto nova substitui a anterior.
export const nomeDaFoto = (usuario_id) => `${PASTA}/${usuario_id}`;

export const criarFotosPerfil = ({ obterContainer = containerDaAzure, ativo = emProducao } = {}) => {
    let container = null;
    const doContainer = () => {
        container ??= obterContainer();
        return container;
    };

    return {
        // Fora da Azure, o envio fica desligado e as telas mostram só o ícone.
        disponivel: () => ativo(),

        async guardar({ usuario_id, buffer, tipo }) {
            await doContainer().getBlockBlobClient(nomeDaFoto(usuario_id)).uploadData(buffer, {
                blobHTTPHeaders: { blobContentType: tipo },
            });
        },

        /**
         * Abre a foto para enviar ao navegador, ou devolve null quando ela não existe no container.
         */
        async abrir(usuario_id) {
            try {
                const resposta = await doContainer().getBlockBlobClient(nomeDaFoto(usuario_id)).download();
                return { conteudo: resposta.readableStreamBody, tamanho: resposta.contentLength };
            } catch (erro) {
                if (codigoDoErro(erro) === 'BlobNotFound') return null;
                throw erro;
            }
        },
    };
};

// Objeto único, para os testes do controller trocarem os métodos com t.mock.method.
export const fotosPerfil = criarFotosPerfil();
