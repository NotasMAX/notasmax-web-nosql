import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import BimestreAtual from "../components/BimestreAtual";
import ConferenciaColuna from "../components/ConferenciaColuna";
import SetaExpandir from "../components/SetaExpandir";
import { confirmarImportacaoNotas } from "../api/simuladoApi";
import { listarMaterias } from "../api/materiaApi";
import { getProfessores } from "../api/usuariosapi";
import { normalizar } from "../utils/cabecalhoPlanilha";
import {
    completarSimulados,
    dataDoCampo,
    interpretarAcertos,
    interpretarPeso,
    montarConfirmacao,
    validarConferencia,
} from "../utils/conferenciaNotas";
import StyleTitle from "../styles/Title.module.css";
import Style from "../styles/ImportacaoNotas.module.css";

// Avisos de mudanças que valem para a turma inteira: pedem confirmação antes de gravar.
const CODIGOS_DA_TURMA = ["PESO_ALTERADO", "TIPO_ALTERADO", "QUESTOES_ALTERADAS", "SIMULADO_NOVO", "NOVO_RESPONSAVEL", "DISCIPLINA_NOVA"];

// A mesma matéria com o mesmo professor é a mesma disciplina, cadastrada ou escolhida na revisão.
const chaveDaDisciplina = ({ materia, materia_id, professor_id }) => `${materia_id ?? `nome:${normalizar(materia)}`}|${professor_id}`;

// Bloqueios ou avisos: o título é um botão que abre e fecha a lista.
function PainelProblemas({ classe, titulo, problemas: todos, aberto, onAlternar, alerta = false }) {
    const idDaLista = useId();
    // Duas colunas na mesma disciplina geram um problema por coluna, com o mesmo texto.
    const problemas = [...new Map(todos.map((problema) => [problema.mensagem, problema])).values()];
    if (problemas.length === 0) return null;
    return (
        <div className={classe} role={alerta ? "alert" : undefined}>
            <button type="button" className={Style.painelBotao} aria-expanded={aberto} aria-controls={idDaLista} onClick={onAlternar}>
                <SetaExpandir className={aberto ? Style.setaPainelAberta : Style.setaPainelFechada} />
                {titulo} ({problemas.length})
            </button>
            <ul id={idDaLista} className={Style.painelLista} hidden={!aberto}>
                {problemas.map(({ codigo, mensagem }, indice) => <li key={`${codigo}-${indice}`}>{mensagem}</li>)}
            </ul>
        </div>
    );
}

export default function ConfirmarImportacaoNotas() {
    const { turma, bimestre, aluno } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const previa = state?.previa;
    const arquivo = state?.arquivo;

    // Linhas SIM sem simulado e disciplinas que faltam viram itens novos, com a data de hoje deste navegador.
    const [estado, setEstado] = useState(() => (previa
        ? completarSimulados({ bimestre: previa.bimestre, colunas: previa.colunas, disciplinas: previa.disciplinas, simulados: previa.simulados, linhas: previa.linhas })
        : null));
    const [abertas, setAbertas] = useState(() => previa?.colunas.slice(0, 1).map(({ coluna }) => coluna) ?? []);
    const [bloqueiosDoServidor, setBloqueiosDoServidor] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);
    // Bloqueios e avisos começam recolhidos: o admin abre o que quiser ler.
    const [paineisAbertos, setPaineisAbertos] = useState({ bloqueios: false, avisos: false });
    // Numera as disciplinas escolhidas na revisão, que só ganham id de verdade quando o servidor as cadastra.
    const proximaNova = useRef(1);

    // Matérias e professores do sistema alimentam o seletor de professor das colunas.
    const [materias, setMaterias] = useState([]);
    const [professores, setProfessores] = useState([]);
    useEffect(() => {
        let ativo = true;
        listarMaterias().then(({ data }) => ativo && setMaterias(data.materias ?? [])).catch(() => {});
        getProfessores().then(({ data }) => ativo && setProfessores(data ?? [])).catch(() => {});
        return () => { ativo = false; };
    }, []);

    useEffect(() => {
        document.title = "NotasMAX - Confirmação das notas importadas";
    }, []);

    const conferencia = useMemo(() => (estado ? validarConferencia(estado) : { bloqueios: [], avisos: [] }), [estado]);

    if (!previa || !arquivo) return <Navigate to={`/Simulados/Importar/${turma}/${bimestre}/${aluno}`} replace />;

    const bloqueios = [...previa.problemasDaPlanilha.bloqueios, ...conferencia.bloqueios, ...bloqueiosDoServidor];
    const avisos = [...previa.problemasDaPlanilha.avisos, ...conferencia.avisos];

    // Toda mudança recompleta o estado: trocar a disciplina de uma coluna muda o que falta no cadastro.
    const alterar = (mudanca) => {
        setBloqueiosDoServidor([]);
        setEstado((atual) => completarSimulados(mudanca(atual)));
    };

    const ligarColuna = (letra, disciplinaId) => alterar((atual) => ({
        ...atual,
        colunas: atual.colunas.map((c) => (c.coluna === letra ? { ...c, turma_disciplina_id: disciplinaId || null, trocada: true } : c)),
    }));

    // Disciplina escolhida para uma coluna sem dono: nada é salvo agora, ela entra só na revisão, com um id
    // provisório, e o servidor a cadastra ao confirmar. A mesma matéria com o mesmo professor reaproveita a que já está na lista.
    const adicionarDisciplina = (letra, pedido) => {
        const idNovo = `nova-${proximaNova.current}`;
        proximaNova.current += 1;
        alterar((atual) => {
            const igual = atual.disciplinas.find((d) => chaveDaDisciplina(d) === chaveDaDisciplina(pedido));
            const disciplina = igual ?? { ...pedido, _id: idNovo, nova: true };
            return {
                ...atual,
                disciplinas: igual ? atual.disciplinas : [...atual.disciplinas, disciplina],
                colunas: atual.colunas.map((c) => (c.coluna === letra ? { ...c, turma_disciplina_id: disciplina._id, trocada: true } : c)),
            };
        });
    };

    const alterarTipo = (simuladoId, tipo) => alterar((atual) => ({
        ...atual,
        simulados: atual.simulados.map((s) => (s._id === simuladoId ? { ...s, tipo } : s)),
    }));

    const alterarPeso = (simuladoId, disciplinaId, valor) => alterar((atual) => ({
        ...atual,
        simulados: atual.simulados.map((s) => (s._id !== simuladoId ? s : {
            ...s,
            conteudos: s.conteudos.map((c) => (c.turma_disciplina_id === disciplinaId ? { ...c, peso: interpretarPeso(valor) } : c)),
        })),
    }));

    const alterarQuestoes = (simuladoId, disciplinaId, valor) => alterar((atual) => ({
        ...atual,
        simulados: atual.simulados.map((s) => (s._id !== simuladoId ? s : {
            ...s,
            conteudos: s.conteudos.map((c) => (c.turma_disciplina_id === disciplinaId ? { ...c, quantidade_questoes: interpretarPeso(valor) } : c)),
        })),
    }));

    const alterarData = (simuladoId, valor) => alterar((atual) => ({
        ...atual,
        simulados: atual.simulados.map((s) => {
            if (s._id !== simuladoId) return s;
            const data_realizacao = dataDoCampo(valor);
            return { ...s, data_realizacao, dataFutura: data_realizacao !== "" && new Date(data_realizacao).getTime() > Date.now() };
        }),
    }));

    const alterarAcertos = (numero, letra, valor) => alterar((atual) => {
        const nova = (celula) => ({ coluna: letra, celula, ...interpretarAcertos(valor) });
        // Simulado fora da planilha não tem célula: ela nasce aqui, só com o que o admin digitou.
        const endereco = `SIM ${numero}, coluna ${letra}`;

        if (!atual.linhas.some((linha) => linha.numero === numero)) {
            return { ...atual, linhas: [...atual.linhas, { numero, celulas: [nova(endereco)] }] };
        }
        return {
            ...atual,
            linhas: atual.linhas.map((linha) => {
                if (linha.numero !== numero) return linha;
                return {
                    ...linha,
                    celulas: linha.celulas.some((c) => c.coluna === letra)
                        ? linha.celulas.map((c) => (c.coluna === letra ? nova(c.celula) : c))
                        : [...linha.celulas, nova(endereco)],
                };
            }),
        };
    });

    const alternarPainel = (painel) => setPaineisAbertos((atuais) => ({ ...atuais, [painel]: !atuais[painel] }));

    const alternarColuna = (letra) => {
        setAbertas((atuais) => (atuais.includes(letra) ? atuais.filter((c) => c !== letra) : [...atuais, letra]));
    };

    const enviar = async () => {
        const dados = new FormData();
        dados.append("arquivo", arquivo);
        dados.append("dados", JSON.stringify(montarConfirmacao({ estado, aluno_id: aluno, turma_id: turma, bimestre, aba: previa.aba })));

        setEnviando(true);
        try {
            const { data } = await confirmarImportacaoNotas(dados);
            setResultado(data);
        } catch (error) {
            const problemas = error.response?.data?.bloqueios;
            setBloqueiosDoServidor(problemas ?? [{ codigo: "ERRO", mensagem: error.response?.data?.message ?? "Não foi possível importar as notas." }]);
            // O servidor recusou: os bloqueios abrem sozinhos para mostrar o motivo.
            setPaineisAbertos((atuais) => ({ ...atuais, bloqueios: true }));
        } finally {
            setEnviando(false);
        }
    };

    const handleConfirmar = () => {
        const alterouTurma = conferencia.avisos.some(({ codigo }) => CODIGOS_DA_TURMA.includes(codigo));
        if (!alterouTurma) {
            enviar();
            return;
        }
        confirmDialog({
            message: "Os simulados criados e as alterações de tipo, peso, questões e disciplinas valem para a turma inteira. Deseja continuar?",
            header: "Confirmação",
            acceptClassName: "p-button-danger",
            acceptLabel: "Sim",
            rejectLabel: "Não",
            accept: enviar,
        });
    };

    // Antes do Confirmar nada foi salvo, nem as disciplinas escolhidas na revisão: cancelar só volta.
    const handleCancelar = () => {
        confirmDialog({
            message: "Deseja realmente cancelar a importação? Nada será salvo.",
            header: "Confirmação",
            acceptClassName: "p-button-danger",
            acceptLabel: "Sim",
            rejectLabel: "Não",
            accept: () => navigate(-1),
        });
    };

    const cabecalho = (
        <div className="flex flex-col gap-[10px]">
            <div className={StyleTitle.titleContent}>
                <h1 className={StyleTitle.titlePage}>Confirmação das notas Importadas</h1>
                <div>
                    <BimestreAtual bimestre={bimestre} ano={previa.turma.ano} />
                </div>
            </div>
            <p className={Style.descricaoGrande}>
                {resultado ? `Aluno: ${previa.aluno.nome}` : "Verifique se as notas importadas do excel estão corretas"}
            </p>
        </div>
    );

    if (resultado) {
        const destino = resultado.simulado_id ?? estado.simulados.find(({ novo }) => !novo)?._id;
        const cadastro = [
            resultado.simuladosCriados > 0 && `${resultado.simuladosCriados} simulado(s) criado(s)`,
            resultado.disciplinasCadastradas > 0 && `${resultado.disciplinasCadastradas} disciplina(s) cadastrada(s) na turma`,
            resultado.materiasCadastradas > 0 && `${resultado.materiasCadastradas} matéria(s) nova(s)`,
            resultado.disciplinasAdicionadas > 0 && `${resultado.disciplinasAdicionadas} disciplina(s) adicionada(s) a simulados`,
        ].filter(Boolean).join(", ");
        return (
            <div className="flex flex-col gap-4">
                {cabecalho}
                <div className={Style.painelSucesso} role="status">
                    <p className={Style.painelTitulo}>{resultado.message}</p>
                    <p>
                        {resultado.criados} criada(s), {resultado.atualizados} atualizada(s), {resultado.removidos} removida(s) e {resultado.ignorados} sem alteração.
                    </p>
                    {cadastro && <p>{cadastro}.</p>}
                </div>
                <div className={Style.acoes}>
                    <button
                        type="button"
                        className={Style.botaoPrimario}
                        onClick={() => navigate(`/Simulados/Notas/${destino}/${bimestre}/${aluno}`)}
                    >
                        Ver notas do aluno
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ConfirmDialog />
            {cabecalho}

            <div className="flex items-center gap-[23px] text-xl text-[#404040]">
                <p>Aluno: {previa.aluno.nome}</p>
                <p>Turma: {previa.turma.serie}º EM</p>
                <p>Aba: {previa.aba}</p>
            </div>

            <PainelProblemas
                classe={Style.painelBloqueios}
                titulo="Bloqueios"
                problemas={bloqueios}
                alerta
                aberto={paineisAbertos.bloqueios}
                onAlternar={() => alternarPainel("bloqueios")}
            />
            <PainelProblemas
                classe={Style.painelAvisos}
                titulo="Avisos"
                problemas={avisos}
                aberto={paineisAbertos.avisos}
                onAlternar={() => alternarPainel("avisos")}
            />

            <div className="flex flex-col gap-[10px]">
                <div className={`${Style.cabecalhoTabela} ${Style.colunasResumo}`}>
                    <p className={Style.tituloColuna}>Coluna da planilha</p>
                    <span aria-hidden="true" />
                    <p className={Style.tituloColuna}>Status</p>
                </div>
                {estado.colunas.map((coluna) => (
                    <ConferenciaColuna
                        key={coluna.coluna}
                        coluna={coluna}
                        estado={estado}
                        bloqueios={conferencia.bloqueios.filter((p) => p.coluna === coluna.coluna)}
                        avisos={conferencia.avisos.filter((p) => p.coluna === coluna.coluna)}
                        aberta={abertas.includes(coluna.coluna)}
                        onAlternar={() => alternarColuna(coluna.coluna)}
                        materias={materias}
                        professores={professores}
                        onLigar={ligarColuna}
                        onNovaDisciplina={adicionarDisciplina}
                        onTipo={alterarTipo}
                        onPeso={alterarPeso}
                        onQuestoes={alterarQuestoes}
                        onData={alterarData}
                        onAcertos={alterarAcertos}
                    />
                ))}
            </div>

            <div className={Style.acoes}>
                <button type="button" className={Style.botaoSecundario} onClick={handleCancelar}>
                    Cancelar
                </button>
                <button
                    type="button"
                    className={Style.botaoPrimario}
                    disabled={bloqueios.length > 0 || enviando}
                    onClick={handleConfirmar}
                >
                    {enviando ? "Importando..." : "Confirmar"}
                </button>
            </div>
        </div>
    );
}
