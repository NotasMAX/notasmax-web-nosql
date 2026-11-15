import React, { useEffect, useRef, useState } from "react";
import FotoPerfil from "./FotoPerfil";
import { ACEITA_FOTO, validarFoto } from "../utils/fotoPerfil";
import Style from "../styles/FotoPerfil.module.css";

const textoDeAjuda = ({ disponivel, foto, fotoAtual }) => {
    if (disponivel === null) return "Verificando se o envio de fotos está disponível...";
    if (disponivel === false) return "O envio de fotos só funciona no ambiente da Azure.";
    if (foto) return `Foto selecionada: ${foto.name}. Ela será salva com os demais dados.`;
    if (fotoAtual) return "JPEG ou PNG, com até 5 MB. Uma nova foto substitui a atual.";
    return "JPEG ou PNG, com até 5 MB.";
};

/**
 * Campo opcional de foto, como na versão em Postgres: mostra a prévia, e a foto só é enviada ao salvar.
 * "disponivel" vem do servidor: null enquanto verifica, false fora da Azure.
 */
export default function FotoPerfilCampo({ tipoUsuario, fotoAtual = null, foto = null, erro = null, disponivel, somenteLeitura = false, onChange }) {
    const [previa, setPrevia] = useState(null);
    const previaRef = useRef(null);

    useEffect(() => () => {
        if (previaRef.current) URL.revokeObjectURL(previaRef.current);
    }, []);

    const trocarPrevia = (nova) => {
        if (previaRef.current) URL.revokeObjectURL(previaRef.current);
        previaRef.current = nova;
        setPrevia(nova);
    };

    const escolher = (e) => {
        const entrada = e.currentTarget;
        const escolhida = entrada.files?.[0];
        // Limpar o input permite escolher o mesmo arquivo de novo depois de um erro ou de desfazer.
        entrada.value = "";
        if (!escolhida) return;

        const problema = validarFoto(escolhida);
        if (problema) {
            trocarPrevia(null);
            onChange(null, problema);
            return;
        }
        trocarPrevia(URL.createObjectURL(escolhida));
        onChange(escolhida, null);
    };

    const desfazer = () => {
        trocarPrevia(null);
        onChange(null, null);
    };

    const avatar = (
        <FotoPerfil
            src={previa ?? fotoAtual}
            alt={previa ? "Prévia da nova foto" : "Foto atual"}
            tipoUsuario={tipoUsuario}
        />
    );

    if (somenteLeitura) {
        return (
            <div className={Style.campo}>
                <p className={Style.legenda}>Foto</p>
                {avatar}
            </div>
        );
    }

    const desligado = disponivel !== true;
    const temFoto = previa !== null || fotoAtual !== null;

    return (
        <fieldset className={Style.campo}>
            <legend className={Style.legenda}>Foto (opcional)</legend>
            <div className={Style.linha}>
                {avatar}
                <div>
                    <div className={Style.botoes}>
                        <input
                            id="foto-perfil"
                            type="file"
                            accept={ACEITA_FOTO}
                            className={Style.entradaOculta}
                            disabled={desligado}
                            aria-describedby={erro ? "foto-perfil-ajuda foto-perfil-erro" : "foto-perfil-ajuda"}
                            aria-invalid={erro ? true : undefined}
                            onChange={escolher}
                        />
                        <label htmlFor="foto-perfil" className={Style.botao}>
                            {temFoto ? "Trocar foto" : "Escolher foto"}
                        </label>
                        {foto && (
                            <button type="button" className={Style.botao} onClick={desfazer}>
                                Desfazer escolha
                            </button>
                        )}
                    </div>
                    <p id="foto-perfil-ajuda" className={Style.ajuda}>{textoDeAjuda({ disponivel, foto, fotoAtual })}</p>
                    {erro && <p id="foto-perfil-erro" className={Style.erro}>{erro}</p>}
                </div>
            </div>
        </fieldset>
    );
}
