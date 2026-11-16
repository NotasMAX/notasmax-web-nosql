import React, { useEffect, useState } from "react";


export default function NotasCard({ conteudo }) {

    // const materia = 

    return (
        <div className="flex w-full bg-white border border-gray-300 rounded-lg py-2 px-3 items-center">
            <div className="w-1/3">{conteudo.turma_disciplina.materia ?? "—"}</div>
            <div className="w-1/3">{conteudo.turma_disciplina.professor ?? "—"}</div>
            {conteudo.resultado ? (
                <div className="flex w-1/3 items-center gap-3">
                    <p className='w-1/12'>{conteudo.resultado.acertos}</p>
                    <p className="w-1/12">/</p>
                    <p className='w-1/12'>{conteudo.quantidade_questoes}</p>
                </div>
            ) : (
                <p className="w-1/3">nulo</p>
            )}
        </div >
    );
}