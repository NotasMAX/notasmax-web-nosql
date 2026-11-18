import api from "./api";
import { enviarFotoUsuario } from "../api/usuariosapi";

// Mesma política da versão em Postgres: JPEG ou PNG, com até 5 MB. O servidor confere de novo.
export const TIPOS_DE_FOTO = ["image/jpeg", "image/png"];
export const ACEITA_FOTO = TIPOS_DE_FOTO.join(",");
export const LIMITE_DA_FOTO_EM_BYTES = 5 * 1024 * 1024;

export const validarFoto = (arquivo) => {
    if (!TIPOS_DE_FOTO.includes(arquivo.type)) return "Escolha uma foto em JPEG ou PNG.";
    if (arquivo.size === 0) return "O arquivo escolhido está vazio.";
    if (arquivo.size > LIMITE_DA_FOTO_EM_BYTES) return "A foto deve ter no máximo 5 MB.";
    return null;
};

/**
 * Endereço da foto para usar no <img>, ou null quando o usuário não tem foto.
 * A versão é a data da última troca: ela muda o endereço, e o navegador não mostra a foto antiga.
 */
export const fotoUsuarioUrl = (id, versao) => (versao
    ? api.getUri({ url: `/Usuarios/${encodeURIComponent(id)}/Foto`, params: { v: versao } })
    : null);

/**
 * Envia a foto escolhida, depois que os dados do usuário já foram salvos.
 * Devolve null quando deu certo ou não havia foto, e a mensagem do problema quando falhou.
 */
export const enviarFotoEscolhida = async (id, foto) => {
    if (!foto) return null;
    try {
        await enviarFotoUsuario(id, foto);
        return null;
    } catch (error) {
        return error.response?.data?.message ?? "Não foi possível enviar a foto.";
    }
};

const comPonto = (frase) => (/[.!?]$/.test(frase) ? frase : `${frase}.`);

// Os dados foram salvos e só a foto falhou: a mensagem diz as duas coisas.
export const avisoDeFotoNaoSalva = (inicio, problema, final) => `${inicio}, mas a foto não foi salva. ${comPonto(problema)} ${final}`;
