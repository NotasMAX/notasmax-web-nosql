import React, { useState } from "react";
import { calcularNotas, dataParaCampo, decimal } from "../utils/conferenciaNotas";
import NovaDisciplinaImportacao from "./NovaDisciplinaImportacao";
import SeletorProfessorColuna from "./SeletorProfessorColuna";
import SetaExpandir from "./SetaExpandir";
import Style from "../styles/ImportacaoNotas.module.css";
import iconeEditar from "../imgs/editar-linha.svg";

const ROTULOS_DE_STATUS = {
    COLUNA_SEM_DISCIPLINA: "sem dono",
    COLUNAS_MESMA_DISCIPLINA: "disciplina repetida",
    DISCIPLINA_NOVA: "disciplina nova",
    ACERTOS_INVALIDO: "acertos inválidos",
    ACERTOS_ACIMA_DO_LIMITE: "acertos acima do limite",
    PESO_INVALIDO: "peso inválido",
    QUESTOES_INVALIDAS: "questões inválidas",
    NOTA_ACIMA_DE_10: "nota acima de 10",
    NOVO_RESPONSAVEL: "novo responsável",
    PESO_ALTERADO: "peso alterado",
    QUESTOES_ALTERADAS: "questões alteradas",
    FATOR_DIFERENTE: "peso diferente da planilha",
    NOTA_DISSERTATIVA_DIFERENTE: "dissertativa diferente",
    JA_TEM_RESULTADO: "já tinha nota",
};

const TIPOS = { objetivo: "Objetivo", dissertativo: "Dissertativo" };

function textoDoResultado(celula, conteudo) {
    const questoes = conteudo?.quantidade_questoes === "" ? "?" : conteudo?.quantidade_questoes ?? "—";
    if (celula?.status === "acertos") return `${celula.acertos} / ${questoes}`;
    if (celula?.status === "invalida") return celula.bruto;
    return "nulo";
}

function valorDoCampo(celula) {
    if (celula?.status === "acertos") return celula.acertos;
    // Texto digitado continua no campo, sem destaque, e vale como nulo.
    return celula?.bruto ?? "";
}

function celulaLancada(conteudo) {
    return typeof conteudo?.acertosAtuais === "number"
        ? { status: "acertos", acertos: conteudo.acertosAtuais }
        : { status: "nao_fez" };
}

export default function ConferenciaColuna({
    coluna, estado, bloqueios, avisos, aberta, materias = [], professores = [],
    onAlternar, onLigar, onNovaDisciplina, onTipo, onPeso, onQuestoes, onData, onAcertos,
}) {
    const [emEdicao, setEmEdicao] = useState([]);
    // null: formulário fechado; id: aberto para dar nome à matéria do cabeçalho, com esse professor já escolhido.
    const [professorDoFormulario, setProfessorDoFormulario] = useState(null);
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

    // Na lista, o seletor só aparece quando há decisão a tomar: coluna sem dono ou disciplina repetida.
    // Numa coluna ligada certa, a troca é o botão "Trocar professor", dentro da coluna aberta.
    const repetida = bloqueios.some(({ codigo }) => codigo === "COLUNAS_MESMA_DISCIPLINA");
    const mostrarSeletor = !disciplinaId || repetida;

    const ligar = (id) => {
        setProfessorDoFormulario(null);
        onLigar(letra, id);
    };

    const ligarNova = (nova) => {
        setProfessorDoFormulario(null);
        onNovaDisciplina(letra, nova);
    };

    const seletor = (comoBotao) => (
        <SeletorProfessorColuna
            coluna={coluna}
            disciplinas={estado.disciplinas}
            materias={materias}
            professores={professores}
            comoBotao={comoBotao}
            onEscolher={ligar}
            onNovaDisciplina={ligarNova}
            onMateriaNova={setProfessorDoFormulario}
        />
    );

    const status = bloqueios.length > 0
        ? { classe: Style.statusBloqueio, texto: `Bloqueio: ${ROTULOS_DE_STATUS[bloqueios[0].codigo]}` }
        : avisos.length > 0
            ? { classe: Style.statusAviso, texto: `Aviso: ${ROTULOS_DE_STATUS[avisos[0].codigo]}` }
            : { classe: Style.statusOk, texto: "Ok" };

    return (
        <div className="flex flex-col gap-[10px]">
            <div className={`${Style.linha} ${Style.colunasResumo}`}>
                <div className="flex min-w-0 flex-col">
                    <button type="button" className={Style.botaoCabecalho} aria-expanded={aberta} onClick={onAlternar}>
                        <SetaExpandir className={aberta ? Style.setaAberta : Style.setaFechada} />
                        {cabecalhoOriginal}
                    </button>
                    {disciplina && !mostrarSeletor && (
                        <span className={Style.disciplinaLigada}>
                            {disciplina.materia} - {disciplina.professor}
                            {/* Escolhida na revisão: só é cadastrada na turma ao confirmar. */}
                            {disciplina.nova && <span className={Style.etiquetaNova}>nova</span>}
                        </span>
                    )}
                </div>
                <div className={Style.areaProfessor}>
                    {mostrarSeletor && seletor(false)}
                </div>
                <span className={status.classe}>{status.texto}</span>
            </div>

            {professorDoFormulario !== null && (
                <NovaDisciplinaImportacao
                    cabecalhoOriginal={cabecalhoOriginal}
                    professorInicial={professorDoFormulario}
                    onCancelar={() => setProfessorDoFormulario(null)}
                    onCriada={ligarNova}
                />
            )}

            {aberta && (
                <div className={Style.corpoColuna}>
                    <div className="flex flex-wrap items-center gap-4">
                        <p className={Style.tituloDisciplina}>
                            {disciplina ? `${disciplina.materia} - ${disciplina.professor}` : cabecalhoOriginal}
                        </p>
                        {disciplina && !mostrarSeletor && seletor(true)}
                    </div>

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
                                <div className={Style.textoColuna}>
                                    {numero}
                                    {simulado && !(editando && simulado.novo) && simulado.data_realizacao && (
                                        <span className={Style.dataSimulado}>{new Date(simulado.data_realizacao).toLocaleDateString("pt-BR")}</span>
                                    )}
                                    {editando && simulado?.novo && (
                                        <input
                                            type="date"
                                            className={Style.campoData}
                                            aria-label={`Data de realização do simulado ${numero}`}
                                            value={dataParaCampo(simulado.data_realizacao)}
                                            onChange={(e) => onData(simulado._id, e.target.value)}
                                        />
                                    )}
                                    {simulado?.novo && <span className={Style.etiquetaNova}>novo simulado</span>}
                                    {!simulado?.novo && conteudo?.novo && <span className={Style.etiquetaNova}>novo responsável</span>}
                                    {!daPlanilha && <span className={Style.dataSimulado}>fora da planilha</span>}
                                </div>
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
                                        <span>/</span>
                                        {conteudo ? (
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                className={Style.campoAcertos}
                                                placeholder="questões"
                                                aria-label={`Questões do simulado ${numero} em ${cabecalhoOriginal}`}
                                                value={conteudo.quantidade_questoes}
                                                onChange={(e) => onQuestoes(simulado._id, disciplinaId, e.target.value)}
                                            />
                                        ) : (
                                            <span>—</span>
                                        )}
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
