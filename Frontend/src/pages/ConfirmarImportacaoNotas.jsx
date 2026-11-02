import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import BimestreAtual from "../components/BimestreAtual";
import ConferenciaColuna from "../components/ConferenciaColuna";
import { confirmarImportacaoNotas } from "../api/simuladoApi";
import { interpretarAcertos, interpretarPeso, montarConfirmacao, validarConferencia } from "../utils/conferenciaNotas";
import StyleTitle from "../styles/Title.module.css";
import Style from "../styles/ImportacaoNotas.module.css";

function PainelProblemas({ classe, titulo, problemas: todos }) {
    // Duas colunas na mesma disciplina geram um problema por coluna, com o mesmo texto.
    const problemas = [...new Map(todos.map((problema) => [problema.mensagem, problema])).values()];
    if (problemas.length === 0) return null;
    return (
        <div className={classe} role={classe === Style.painelBloqueios ? "alert" : undefined}>
            <p className={Style.painelTitulo}>{titulo} ({problemas.length})</p>
            <ul className={Style.painelLista}>
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

    const [estado, setEstado] = useState(() => (previa
        ? { bimestre: previa.bimestre, colunas: previa.colunas, disciplinas: previa.disciplinas, simulados: previa.simulados, linhas: previa.linhas }
        : null));
    const [abertas, setAbertas] = useState(() => previa?.colunas.slice(0, 1).map(({ coluna }) => coluna) ?? []);
    const [bloqueiosDoServidor, setBloqueiosDoServidor] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        document.title = "NotasMAX - Confirmação das notas importadas";
    }, []);

    const conferencia = useMemo(() => (estado ? validarConferencia(estado) : { bloqueios: [], avisos: [] }), [estado]);

    if (!previa) return <Navigate to={`/Simulados/Importar/${turma}/${bimestre}/${aluno}`} replace />;

    const bloqueios = [...previa.problemasDaPlanilha.bloqueios, ...conferencia.bloqueios, ...bloqueiosDoServidor];
    const avisos = [...previa.problemasDaPlanilha.avisos, ...conferencia.avisos];

    const alterar = (mudanca) => {
        setBloqueiosDoServidor([]);
        setEstado(mudanca);
    };

    const ligarColuna = (letra, disciplinaId) => alterar((atual) => ({
        ...atual,
        colunas: atual.colunas.map((c) => (c.coluna === letra ? { ...c, turma_disciplina_id: disciplinaId || null, trocada: true } : c)),
    }));

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

    const alternarColuna = (letra) => {
        setAbertas((atuais) => (atuais.includes(letra) ? atuais.filter((c) => c !== letra) : [...atuais, letra]));
    };

    const enviar = async () => {
        setEnviando(true);
        try {
            const { data } = await confirmarImportacaoNotas(montarConfirmacao({ estado, aluno_id: aluno, turma_id: turma, bimestre }));
            setResultado(data);
        } catch (error) {
            const problemas = error.response?.data?.bloqueios;
            setBloqueiosDoServidor(problemas ?? [{ codigo: "ERRO", mensagem: error.response?.data?.message ?? "Não foi possível importar as notas." }]);
        } finally {
            setEnviando(false);
        }
    };

    const handleConfirmar = () => {
        const alterouTurma = conferencia.avisos.some(({ codigo }) => codigo === "PESO_ALTERADO" || codigo === "TIPO_ALTERADO");
        if (!alterouTurma) {
            enviar();
            return;
        }
        confirmDialog({
            message: "As alterações de tipo e peso valem para a turma inteira. Deseja continuar?",
            header: "Confirmação",
            acceptClassName: "p-button-danger",
            acceptLabel: "Sim",
            rejectLabel: "Não",
            accept: enviar,
        });
    };

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
        const destino = estado.simulados[0]?._id;
        return (
            <div className="flex flex-col gap-4">
                {cabecalho}
                <div className={Style.painelSucesso} role="status">
                    <p className={Style.painelTitulo}>{resultado.message}</p>
                    <p>
                        {resultado.criados} criada(s), {resultado.atualizados} atualizada(s), {resultado.removidos} removida(s) e {resultado.ignorados} sem alteração.
                    </p>
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

            <PainelProblemas classe={Style.painelBloqueios} titulo="Bloqueios" problemas={bloqueios} />
            <PainelProblemas classe={Style.painelAvisos} titulo="Avisos" problemas={avisos} />

            <div className="flex flex-col gap-[10px]">
                <div className={`${Style.cabecalhoTabela} ${Style.colunasResumo}`}>
                    <p className={Style.tituloColuna}>Coluna da planilha</p>
                    <p className={Style.tituloColuna}>Disciplina da turma</p>
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
                        onLigar={ligarColuna}
                        onTipo={alterarTipo}
                        onPeso={alterarPeso}
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
