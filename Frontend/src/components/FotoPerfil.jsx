import React, { useState } from "react";
import Style from "../styles/FotoPerfil.module.css";

// Os mesmos ícones da versão em Postgres, para aluno, professor e administrador.
export function IconePerfil({ tipoUsuario }) {
    return (
        <svg
            aria-hidden="true"
            className={Style.icone}
            data-tipo={tipoUsuario}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            viewBox="0 0 24 24"
        >
            {tipoUsuario === "aluno" ? (
                <>
                    <circle cx="12" cy="8" r="3.2" />
                    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
                </>
            ) : tipoUsuario === "professor" ? (
                <>
                    <path d="M4 5.5h16v13H4z" />
                    <path d="M8 9h8M8 12h5M8 15h3" />
                    <path d="M3 20h18" />
                </>
            ) : (
                <>
                    <path d="m12 3 7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
                    <path d="m9 11 2 2 4-4" />
                </>
            )}
        </svg>
    );
}

/**
 * Mostra a foto, ou o ícone do perfil quando não há foto ou ela não carrega.
 */
export default function FotoPerfil({ src, alt, tipoUsuario }) {
    const [falhou, setFalhou] = useState(null);
    const mostrarFoto = Boolean(src) && src !== falhou;

    return (
        <span className={Style.avatar}>
            {mostrarFoto
                ? <img src={src} alt={alt} className={Style.avatarImagem} onError={() => setFalhou(src)} />
                : <IconePerfil tipoUsuario={tipoUsuario} />}
        </span>
    );
}
