import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BimestreAtual from "../components/BimestreAtual";
import { previaImportacaoNotas } from "../api/simuladoApi";
import { getUsuario } from "../api/usuariosapi";
import { getOne as getOneTurma } from "../api/turmasapi";
import StyleTitle from "../styles/Title.module.css";
import Style from "../styles/ImportacaoNotas.module.css";
import iconeImportar from "../imgs/importar-arquivo.svg";
import iconeArquivo from "../imgs/arquivo-selecionado.svg";

export default function ImportarNotas() {
    const { turma: turmaId, bimestre, aluno: alunoId } = useParams();
    const navigate = useNavigate();

    const [aluno, setAluno] = useState(null);
    const [turma, setTurma] = useState(null);
    const [arquivo, setArquivo] = useState(null);
    const [arrastando, setArrastando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erros, setErros] = useState([]);
    const [abas, setAbas] = useState([]);
    const [aba, setAba] = useState("");

    useEffect(() => {
        document.title = "NotasMAX - Importar notas do Excel";
    }, []);

    useEffect(() => {
        const carregar = async () => {
            try {
                const [respostaAluno, respostaTurma] = await Promise.all([getUsuario(alunoId), getOneTurma(turmaId)]);
                setAluno(respostaAluno.data);
                setTurma(respostaTurma.data.turma);
            } catch {
                navigate("/404");
            }
        };
        carregar();
    }, [alunoId, turmaId]);

    const escolherArquivo = (novo) => {
        if (!novo) return;
        setErros(/\.xlsx$/i.test(novo.name) ? [] : ["Envie uma planilha .xlsx."]);
        setArquivo(/\.xlsx$/i.test(novo.name) ? novo : null);
        setAbas([]);
        setAba("");
    };

    const soltarArquivo = (e) => {
        e.preventDefault();
        setArrastando(false);
        escolherArquivo(e.dataTransfer.files[0]);
    };

    const handleConfirmar = async () => {
        const dados = new FormData();
        dados.append("arquivo", arquivo);
        dados.append("aluno_id", alunoId);
        dados.append("turma_id", turmaId);
        dados.append("bimestre", bimestre);
        if (aba) dados.append("aba", aba);

        setEnviando(true);
        try {
            const { data } = await previaImportacaoNotas(dados);
            if (data.podeConferir) {
                navigate(`/Simulados/Importar/${turmaId}/${bimestre}/${alunoId}/Confirmar`, { state: { previa: data } });
                return;
            }
            setErros(data.bloqueios.map(({ mensagem }) => mensagem));
            setAbas(data.abas.length > 1 ? data.abas : []);
        } catch (error) {
            setErros([error.response?.data?.message ?? "Não foi possível ler a planilha."]);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="flex flex-col gap-[25px]">
            <div className="flex flex-col gap-[14px]">
                <div className={StyleTitle.titleContent}>
                    <h1 className={StyleTitle.titlePage}>Importando notas do Excel</h1>
                    <div>
                        <BimestreAtual bimestre={bimestre} ano={turma?.ano} />
                    </div>
                </div>
                <div className="flex flex-col gap-[2px]">
                    <p className={Style.descricao}>As Notas serão importadas para o aluno e sua turma informado abaixo</p>
                    <div className={Style.infoAluno}>
                        <p>Aluno: {aluno?.nome}</p>
                        <p>Turma: {turma ? `${turma.serie}º EM` : ""}</p>
                    </div>
                </div>
            </div>

            <label
                htmlFor="arquivoPlanilha"
                className={`${Style.areaArquivo} ${arrastando ? Style.areaArquivoAtiva : ""}`}
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={soltarArquivo}
            >
                <input
                    id="arquivoPlanilha"
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    aria-label="Planilha de notas"
                    onChange={(e) => escolherArquivo(e.target.files[0])}
                />
                {arquivo ? (
                    <div className="flex flex-col items-center gap-[10px]">
                        <div className={Style.iconeArquivo}><img src={iconeArquivo} alt="" /></div>
                        <p className={Style.textoArquivo}>{arquivo.name}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-[20px]">
                        <div className={Style.iconeImportar}><img src={iconeImportar} alt="" /></div>
                        <div>
                            <p className={Style.textoArquivo}>Selecione o arquivo que será importado</p>
                            <p className={Style.textoArquivoSecundario}>ou arraste e solte arquivo</p>
                        </div>
                    </div>
                )}
            </label>

            {erros.length > 0 && (
                <div className={Style.painelBloqueios} role="alert">
                    <p className={Style.painelTitulo}>Não foi possível importar esta planilha</p>
                    <ul className={Style.painelLista}>
                        {erros.map((erro) => <li key={erro}>{erro}</li>)}
                    </ul>
                </div>
            )}

            {abas.length > 0 && (
                <label className={Style.seletorAba}>
                    Aba da planilha
                    <select className={Style.campoSelecao} value={aba} onChange={(e) => setAba(e.target.value)}>
                        <option value="">Escolha a aba</option>
                        {abas.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
                    </select>
                </label>
            )}

            <div className={Style.acoes}>
                <button type="button" className={Style.botaoSecundario} onClick={() => navigate(-1)}>
                    Voltar
                </button>
                <button
                    type="button"
                    className={Style.botaoPrimario}
                    disabled={!arquivo || enviando || (abas.length > 0 && !aba)}
                    onClick={handleConfirmar}
                >
                    {enviando ? "Lendo..." : "Confirmar"}
                </button>
            </div>
        </div>
    );
}
