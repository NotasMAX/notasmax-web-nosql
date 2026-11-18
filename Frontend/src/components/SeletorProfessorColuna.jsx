import React from "react";
import { capitalizarNome, normalizar, separarCabecalho } from "../utils/cabecalhoPlanilha";
import Style from "../styles/ImportacaoNotas.module.css";

/**
 * Escolhe quem dá a matéria do cabeçalho. A matéria vem da planilha, e o admin só escolhe o professor:
 * quem já dá a matéria na turma liga direto; outro professor vira uma disciplina nova, que só é cadastrada na
 * turma quando a importação for confirmada. Se a matéria do cabeçalho não existe no sistema, escolher um
 * professor chama `onMateriaNova`, que abre o formulário para dar nome à matéria.
 * Com `comoBotao`, vira o botão "Trocar professor" da coluna já ligada: um clique abre a mesma lista.
 */
export default function SeletorProfessorColuna({ coluna, disciplinas, materias, professores, comoBotao = false, onEscolher, onNovaDisciplina, onMateriaNova }) {
    const { cabecalhoOriginal, turma_disciplina_id: disciplinaId } = coluna;
    const materiaDoCabecalho = separarCabecalho(cabecalhoOriginal).materia;

    const daMateria = disciplinas.filter((d) => normalizar(d.materia) === normalizar(materiaDoCabecalho));
    const materia = materias.find((m) => normalizar(m.nome) === normalizar(materiaDoCabecalho));
    // Matéria nova aparece com o mesmo nome que o formulário vai sugerir ("ARTES" vira "Artes").
    const nomeDaMateria = materia?.nome ?? daMateria[0]?.materia ?? capitalizarNome(materiaDoCabecalho);
    const outros = professores.filter(({ _id }) => !daMateria.some((d) => d.professor_id === _id));
    // A ligação atual pode ser de outra matéria (escolha guardada ou feita antes): continua visível para não sumir.
    const atualDeOutraMateria = disciplinas.find((d) => d._id === disciplinaId && !daMateria.includes(d));

    const escolher = (valor) => {
        const [tipo, id] = valor.split(":");
        if (tipo === "d") {
            // Escolher de novo o professor atual não muda a ligação.
            if (id !== disciplinaId) onEscolher(id);
            return;
        }

        const professor = professores.find(({ _id }) => _id === id);
        if (!professor) return;
        if (!materia) {
            onMateriaNova(professor._id);
            return;
        }
        onNovaDisciplina({ nova: true, materia: materia.nome, materia_id: materia._id, professor: professor.nome, professor_id: professor._id });
    };

    // Como botão, o seletor fica sempre no texto "Trocar professor", e a lista marca quem dá a matéria agora.
    const rotulo = (texto, id) => (comoBotao && id === disciplinaId ? `${texto} (atual)` : texto);

    return (
        <select
            className={comoBotao ? Style.botaoSeletor : Style.seletorProfessor}
            aria-label={`${comoBotao ? "Trocar professor" : "Professor"} da coluna ${cabecalhoOriginal}`}
            value={!comoBotao && disciplinaId ? `d:${disciplinaId}` : ""}
            onChange={(e) => escolher(e.target.value)}
        >
            {comoBotao ? (
                <option value="" disabled hidden>Trocar professor</option>
            ) : (
                <option value="">Escolher professor</option>
            )}
            {daMateria.length > 0 && (
                <optgroup label={`Já dão ${nomeDaMateria} nesta turma`}>
                    {daMateria.map(({ _id, professor }) => <option key={_id} value={`d:${_id}`}>{rotulo(professor, _id)}</option>)}
                </optgroup>
            )}
            {atualDeOutraMateria && (
                <optgroup label="Ligação atual">
                    <option value={`d:${atualDeOutraMateria._id}`}>
                        {rotulo(`${atualDeOutraMateria.materia} - ${atualDeOutraMateria.professor}`, atualDeOutraMateria._id)}
                    </option>
                </optgroup>
            )}
            {outros.length > 0 && (
                <optgroup label={materia ? `Adicionar ${nomeDaMateria} à turma com` : `Outros professores (cadastra a matéria ${nomeDaMateria})`}>
                    {outros.map(({ _id, nome }) => <option key={_id} value={`p:${_id}`}>{nome}</option>)}
                </optgroup>
            )}
        </select>
    );
}
