import React, { useEffect, useId, useState } from "react";
import { listarMaterias } from "../api/materiaApi";
import { getProfessores } from "../api/usuariosapi";
import { capitalizarNome, normalizar, professorDoCabecalho, separarCabecalho } from "../utils/cabecalhoPlanilha";
import Style from "../styles/ImportacaoNotas.module.css";

/**
 * Escolhe a disciplina de uma coluna cuja matéria não existe no sistema. Nada é salvo aqui: a disciplina (e a
 * matéria nova) entram na revisão e só são cadastradas quando a importação for confirmada.
 * A matéria é um campo só, já com o nome do cabeçalho: um nome igual ao de uma matéria cadastrada usa essa
 * matéria, para não criar outra igual; qualquer outro nome será criado.
 * professorInicial vem do seletor de professor da coluna, quando o admin já escolheu quem dá a matéria.
 */
export default function NovaDisciplinaImportacao({ cabecalhoOriginal, professorInicial = "", onCriada, onCancelar }) {
    const sugestao = separarCabecalho(cabecalhoOriginal);
    const idDasSugestoes = useId();
    const idDaDica = useId();
    const [materias, setMaterias] = useState([]);
    const [professores, setProfessores] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [nomeMateria, setNomeMateria] = useState(() => capitalizarNome(sugestao.materia));
    const [professorId, setProfessorId] = useState("");
    const [erro, setErro] = useState("");

    const materiaExistente = materias.find((m) => normalizar(m.nome) === normalizar(nomeMateria));

    useEffect(() => {
        let ativo = true;
        Promise.all([listarMaterias(), getProfessores()])
            .then(([respostaMaterias, respostaProfessores]) => {
                if (!ativo) return;
                const listaProfessores = respostaProfessores.data ?? [];
                setMaterias(respostaMaterias.data.materias ?? []);
                setProfessores(listaProfessores);
                const professor = listaProfessores.find(({ _id }) => _id === professorInicial)
                    ?? professorDoCabecalho(listaProfessores, sugestao.professor);
                setProfessorId(professor ? professor._id : "");
            })
            .catch(() => ativo && setErro("Não foi possível carregar as matérias e os professores."))
            .finally(() => ativo && setCarregando(false));
        return () => { ativo = false; };
    }, [sugestao.professor, professorInicial]);

    const adicionar = () => {
        const professor = professores.find(({ _id }) => _id === professorId);
        if (!nomeMateria.trim()) {
            setErro("Informe a matéria.");
            return;
        }
        if (!professor) {
            setErro("Escolha o professor.");
            return;
        }
        onCriada({
            nova: true,
            materia: materiaExistente?.nome ?? nomeMateria.trim(),
            materia_id: materiaExistente?._id ?? null,
            professor: professor.nome,
            professor_id: professor._id,
        });
    };

    return (
        <div className={Style.novaDisciplina} role="group" aria-label={`Adicionar disciplina para a coluna ${cabecalhoOriginal}`}>
            <p className={Style.painelTitulo}>Adicionar disciplina à turma para "{cabecalhoOriginal}"</p>
            {carregando ? (
                <p>Carregando matérias e professores...</p>
            ) : (
                <div className={Style.novaDisciplinaCampos}>
                    <div className="flex flex-col gap-1">
                        <label className={Style.rotuloCampo}>
                            Matéria
                            <input
                                className={Style.campoSugestoes}
                                list={idDasSugestoes}
                                aria-describedby={nomeMateria.trim() ? idDaDica : undefined}
                                value={nomeMateria}
                                onChange={(e) => setNomeMateria(e.target.value)}
                            />
                        </label>
                        {/* Enquanto o admin digita, o navegador sugere as matérias que já existem. */}
                        <datalist id={idDasSugestoes}>
                            {materias.map(({ _id, nome }) => <option key={_id} value={nome} />)}
                        </datalist>
                        {nomeMateria.trim() && (
                            <p id={idDaDica} className={Style.textoAjuda}>
                                {materiaExistente
                                    ? `Usa a matéria já cadastrada "${materiaExistente.nome}".`
                                    : `Cria a matéria nova "${nomeMateria.trim()}".`}
                            </p>
                        )}
                    </div>
                    <label className={Style.rotuloCampo}>
                        Professor
                        <select className={Style.campoSelecao} value={professorId} onChange={(e) => setProfessorId(e.target.value)}>
                            <option value="">Escolher</option>
                            {professores.map(({ _id, nome }) => <option key={_id} value={_id}>{nome}</option>)}
                        </select>
                    </label>
                </div>
            )}
            <p className={Style.textoAjuda}>
                {materiaExistente || !nomeMateria.trim()
                    ? "Nada é salvo agora: a disciplina só é cadastrada na turma quando a importação for confirmada."
                    : "Nada é salvo agora: a disciplina e a matéria nova só são cadastradas quando a importação for confirmada."}
            </p>
            {erro && <p className={Style.textoInvalido} role="alert">{erro}</p>}
            <div className={Style.acoes}>
                <button type="button" className={Style.botaoSecundario} onClick={onCancelar}>Cancelar</button>
                <button type="button" className={Style.botaoPrimario} onClick={adicionar} disabled={carregando}>Adicionar</button>
            </div>
        </div>
    );
}
