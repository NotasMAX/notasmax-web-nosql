import { useEffect, useState } from "react";
import { getDisponibilidadeFotos } from "../api/usuariosapi";

/**
 * Pergunta ao servidor se o envio de fotos funciona, porque só ele sabe se está na Azure.
 * Devolve null enquanto a resposta não chega, e false se a pergunta falhar.
 */
export const useFotosDisponiveis = () => {
    const [disponivel, setDisponivel] = useState(null);

    useEffect(() => {
        let montado = true;
        getDisponibilidadeFotos()
            .then(({ data }) => { if (montado) setDisponivel(data?.disponivel === true); })
            .catch(() => { if (montado) setDisponivel(false); });
        return () => { montado = false; };
    }, []);

    return disponivel;
};
