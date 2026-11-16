import React, { useState } from "react";
import { calcularNotas, decimal } from "../utils/conferenciaNotas";
import Style from "../styles/ImportacaoNotas.module.css";
import iconeEditar from "../imgs/editar-linha.svg";

const ROTULOS_DE_STATUS = {
    COLUNA_SEM_DISCIPLINA: "sem dono",
    COLUNAS_MESMA_DISCIPLINA: "disciplina repetida",
    ACERTOS_INVALIDO: "acertos inválidos",
    ACERTOS_ACIMA_DO_LIMITE: "acertos acima do limite",
    DISCIPLINA_FORA_DO_SIMULADO: "fora do simulado",
    PESO_INVALIDO: "peso inválido",
    NOTA_ACIMA_DE_10: "nota acima de 10",
    PESO_ALTERADO: "peso alterado",
    FATOR_DIFERENTE: "peso diferente da planilha",
    NOTA_DISSERTATIVA_DIFERENTE: "dissertativa diferente",
    JA_TEM_RESULTADO: "já tinha nota",
};

const TIPOS = { objetivo: "Objetivo", dissertativo: "Dissertativo" };

function textoDoResultado(celula, conteudo) {
    if (celula?.status === "acertos") return `${celula.acertos} / ${conteudo?.quantidade_questoes ?? "—"}`;
    if (celula?.status === "invalida") return celula.bruto;
    return "nulo";
}

function valorDoCampo(celula) {
    if (celula?.status === "acertos") return celula.acertos;
    if (celula?.status === "invalida") return celula.bruto;
    return "";
}

function celulaLancada(conteudo) {
    return typeof conteudo?.acertosAtuais === "number"
        ? { status: "acertos", acertos: conteudo.acertosAtuais }
        : { status: "nao_fez" };
}

export default function ConferenciaColuna({ coluna, estado, bloqueios, avisos, aberta, onAlternar, onLigar, onTipo, onPeso, onAcertos }) {
    const [emEdicao, setEmEdicao] = useState([]);
    const { coluna: letra, cabecalhoOriginal, turma_disciplina_id: disciplinaId, notaDissertativaPlanilha } = coluna;
    const disciplina = estado.disciplinas.find(({ _id }) => _id === disciplinaId);
    const notas = disciplinaId ? calcularNotas(estado, disciplinaId) : null;

    // Todo simulado da disciplina aparece, mesmo fora da planilha, para o admin poder alterar a nota à mão.
    const linhas = [
        ...estado.linhas,
        ...estado.simulados
            .filter(({ numero, conteudos }) => !estado.linhas.some((linha) => linha.numero === numero)
                && conteudos.some((c) => c.turma_disciplina_id === disciplinaId))
            .map(({ numero }) => ({ numero, celulas: [] })),
    ].sort((a, b) => a.numero - b.numero);

    const alternarEdicao = (numero) => {
        setEmEdicao((atuais) => (atuais.includes(numero) ? atuais.filter((n) => n !== numero) : [...atuais, numero]));
    };

    const status = bloqueios.length > 0
        ? { classe: Style.statusBloqueio, texto: `Bloqueio: ${ROTULOS_DE_STATUS[bloqueios[0].codigo]}` }
        : avisos.length > 0
            ? { classe: Style.statusAviso, texto: `Aviso: ${ROTULOS_DE_STATUS[avisos[0].codigo]}` }
            : { classe: Style.statusOk, texto: "Ok" };

    return (
        <div className="flex flex-col gap-[10px]">
            <div className={`${Style.linha} ${Style.colunasResumo}`}>
                <button type="button" className={Style.botaoCabecalho} aria-expanded={aberta} onClick={onAlternar}>
                    <svg className={aberta ? Style.setaAberta : Style.setaFechada} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z" />
                    </svg>
                    {cabecalhoOriginal}
                </button>
                <select
                    className={Style.campoSelecao}
                    aria-label={`Disciplina da coluna ${cabecalhoOriginal}`}
                    value={disciplinaId ?? ""}
                    onChange={(e) => onLigar(letra, e.target.value)}
                >
                    <option value="">Escolher</option>
                    {estado.disciplinas.map(({ _id, materia, professor }) => (
                        <option key={_id} value={_id}>{materia} - {professor}</option>
                    ))}
                </select>
                <span className={status.classe}>{status.texto}</span>
            </div>

            {aberta && (
                <div className={Style.corpoColuna}>
                    <p className={Style.tituloDisciplina}>
                        {disciplina ? `${disciplina.materia} - ${disciplina.professor}` : cabecalhoOriginal}
                    </p>

                    <div className={`${Style.cabecalhoTabela} ${Style.colunasTabela}`}>
                        <p className={Style.tituloColuna}>Simulado</p>
                        <p className={Style.tituloColuna}>Tipo</p>
                        <p className={Style.tituloColuna}>Peso</p>
                        <p className={Style.tituloColuna}>Resultado</p>
                        <p className={`${Style.tituloColuna} justify-self-center`}>Ações</p>
                    </div>

                    {linhas.map(({ numero, celulas }, indice) => {
                        const iguais = estado.simulados.filter((s) => s.numero === numero);
                        const simulado = iguais.length === 1 ? iguais[0] : null;
                        const conteudo = simulado?.conteudos.find((c) => c.turma_disciplina_id === disciplinaId);
                        const daPlanilha = celulas.find((c) => c.coluna === letra);
                        const celula = daPlanilha ?? celulaLancada(conteudo);
                        const editando = emEdicao.includes(numero);

                        return (
                            <div key={`${numero}-${indice}`} className={`${Style.linha} ${Style.colunasTabela}`}>
                                <p className={Style.textoColuna}>
                                    {numero}
                                    {simulado && <span className={Style.dataSimulado}>{new Date(simulado.data_realizacao).toLocaleDateString("pt-BR")}</span>}
                                    {!daPlanilha && <span className={Style.dataSimulado}>fora da planilha</span>}
                                </p>
                                {editando && simulado ? (
                                    <select
                                        className={Style.campoTipo}
                                        aria-label={`Tipo do simulado ${numero}`}
                                        value={simulado.tipo}
                                        onChange={(e) => onTipo(simulado._id, e.target.value)}
                                    >
                                        {Object.entries(TIPOS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                                    </select>
                                ) : (
                                    <p className={Style.textoColuna}>{simulado ? TIPOS[simulado.tipo] : "—"}</p>
                                )}
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    className={Style.campoPeso}
                                    aria-label={`Peso do simulado ${numero} em ${cabecalhoOriginal}`}
                                    disabled={!conteudo}
                                    value={conteudo?.peso ?? ""}
                                    onChange={(e) => onPeso(simulado._id, disciplinaId, e.target.value)}
                                />
                                {editando ? (
                                    <div className={Style.campoResultado}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className={Style.campoAcertos}
                                            placeholder="nulo"
                                            aria-label={`Acertos do simulado ${numero} em ${cabecalhoOriginal}`}
                                            value={valorDoCampo(celula)}
                                            onChange={(e) => onAcertos(numero, letra, e.target.value)}
                                        />
                                        <span>/ {conteudo?.quantidade_questoes ?? "—"}</span>
                                    </div>
                                ) : (
                                    <p className={celula?.status === "invalida" ? Style.textoInvalido : Style.textoResultado}>
                                        {textoDoResultado(celula, conteudo)}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    className={Style.botaoEditar}
                                    aria-label={`Editar simulado ${numero} de ${cabecalhoOriginal}`}
                                    aria-pressed={editando}
                                    onClick={() => alternarEdicao(numero)}
                                >
                                    <img src={iconeEditar} alt="" />
                                </button>
                            </div>
                        );
                    })}

                    <div className={`${Style.linha} ${Style.colunasTotal}`}>
                        <p className={Style.textoColuna}>Total Acertos</p>
                        <p className={Style.textoResultado}>{notas ? `${notas.totalAcertos}/${notas.totalQuestoes}` : "—"}</p>
                    </div>
                    <div className={`${Style.linhaDestaque} ${Style.colunasTotal}`}>
                        <p className={Style.textoColuna}>Nota Objetivo</p>
                        <p className={Style.textoResultado}>{notas ? decimal(notas.objetiva) : "—"}</p>
                    </div>
                    <div className={`${Style.linhaDestaque} ${Style.colunasTotal}`}>
                        <p className={Style.textoColuna}>Nota Dissertativo</p>
                        <p className={Style.textoResultado}>
                            {notas ? decimal(notas.dissertativa) : "—"}
                            {typeof notaDissertativaPlanilha === "number" && (
                                <span className={Style.valorPlanilha}>Na planilha: {decimal(notaDissertativaPlanilha)}</span>
                            )}
                        </p>
                    </div>
                    <div className={`${Style.linhaDestaque} ${Style.colunasTotal}`}>
                        <p className={Style.textoColuna}>Nota Final</p>
                        <p className={Style.textoResultado}>{notas ? decimal(notas.final) : "—"}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
