import { useEffect, useRef, useState } from "react";
import { getAlunosEmAtencao, gerarSugestoesAluno } from "../api/usuariosapi";
import { getAllTurmas } from "../api/turmasapi";
import StyleTitle from "../styles/Title.module.css";

const nivelLabel = {
  alto: "Atenção alta",
  moderado: "Atenção moderada",
  normal: "Situação normal"
};

const nivelClasses = {
  alto: "bg-red-100 text-red-800",
  moderado: "bg-yellow-100 text-yellow-800",
  normal: "bg-green-100 text-green-800"
};

function formatNumber(value) {
  return value === null || value === undefined ? "-" : Number(value).toFixed(1);
}

export default function AlunosAtencao() {
  const [turmas, setTurmas] = useState([]);
  const [analise, setAnalise] = useState({ resumo: {}, alunos: [] });
  const [filtros, setFiltros] = useState({ pesquisa: "", turmaId: "", ano: "", bimestre: "", nivel: "" });
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sugestoesIA, setSugestoesIA] = useState(null);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [erroSugestoes, setErroSugestoes] = useState("");
  const requisicaoSugestoesRef = useRef(0);

  useEffect(() => {
    document.title = "NotasMAX - Alunos em atenção";
    getAllTurmas()
      .then((response) => setTurmas(Array.isArray(response.data?.turmas) ? response.data.turmas : []))
      .catch(() => setError("Não foi possível carregar as turmas."));
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    const params = Object.fromEntries(
      Object.entries(filtros).filter(([campo, value]) => campo !== "pesquisa" && value !== "")
    );

    getAlunosEmAtencao(params)
      .then((response) => {
        if (mounted) setAnalise(response.data);
      })
      .catch(() => {
        if (mounted) setError("Não foi possível gerar a análise dos alunos.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [filtros.turmaId, filtros.ano, filtros.bimestre, filtros.nivel]);

  const atualizarFiltro = (campo, valor) => {
    requisicaoSugestoesRef.current += 1;
    setFiltros((anterior) => ({ ...anterior, [campo]: valor }));
    setAlunoSelecionado(null);
    setSugestoesIA(null);
    setCarregandoSugestoes(false);
    setErroSugestoes("");
  };

  const pedirSugestoes = async () => {
    if (!alunoSelecionado) return;

    const alunoId = alunoSelecionado.alunoId;
    const requisicaoId = ++requisicaoSugestoesRef.current;
    setCarregandoSugestoes(true);
    setSugestoesIA(null);
    setErroSugestoes("");

    try {
      const params = Object.fromEntries(
        Object.entries(filtros).filter(([campo, value]) => campo !== "pesquisa" && campo !== "nivel" && value !== "")
      );
      const response = await gerarSugestoesAluno({
        ...params,
        alunoId
      });
      if (requisicaoSugestoesRef.current === requisicaoId) {
        setSugestoesIA(response.data);
      }
    } catch (requestError) {
      if (requisicaoSugestoesRef.current === requisicaoId) {
        setErroSugestoes(requestError.response?.data?.message || "Não foi possível gerar sugestões.");
      }
    } finally {
      if (requisicaoSugestoesRef.current === requisicaoId) {
        setCarregandoSugestoes(false);
      }
    }
  };

  const selecionarAluno = (aluno) => {
    requisicaoSugestoesRef.current += 1;
    setAlunoSelecionado(aluno);
    setSugestoesIA(null);
    setCarregandoSugestoes(false);
    setErroSugestoes("");
  };

  const fecharAnalise = () => {
    requisicaoSugestoesRef.current += 1;
    setAlunoSelecionado(null);
    setSugestoesIA(null);
    setCarregandoSugestoes(false);
    setErroSugestoes("");
  };

  const resumo = analise.resumo || {};
  const alunosFiltrados = analise.alunos.filter((aluno) =>
    aluno.nome.toLocaleLowerCase("pt-BR").includes(filtros.pesquisa.trim().toLocaleLowerCase("pt-BR"))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={StyleTitle.titlePage}>Alunos em atenção</h1>
        <p className={StyleTitle.subtitlePage}>
          Identificação baseada no desempenho dos simulados e na evolução de cada aluno.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
          <p className="text-sm text-red-700">Atenção alta</p>
          <strong className="text-2xl text-red-900">{resumo.atencaoAlta || 0}</strong>
        </div>
        <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-700">Atenção moderada</p>
          <strong className="text-2xl text-yellow-900">{resumo.atencaoModerada || 0}</strong>
        </div>
        <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
          <p className="text-sm text-green-700">Situação normal</p>
          <strong className="text-2xl text-green-900">{resumo.situacaoNormal || 0}</strong>
        </div>
        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">Alunos analisados</p>
          <strong className="text-2xl text-blue-900">{resumo.totalAlunos || 0}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-4 md:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Pesquisar aluno
          <input
            className="rounded border p-2"
            type="search"
            placeholder="Digite o nome"
            value={filtros.pesquisa}
            onChange={(event) => atualizarFiltro("pesquisa", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Turma
          <select className="rounded border p-2" value={filtros.turmaId} onChange={(event) => atualizarFiltro("turmaId", event.target.value)}>
            <option value="">Todas as turmas</option>
            {turmas.map((turma) => (
              <option key={turma._id} value={turma._id}>
                {turma.serie}º EM - {turma.ano}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Ano
          <input className="rounded border p-2" type="number" placeholder="Todos" value={filtros.ano} onChange={(event) => atualizarFiltro("ano", event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Bimestre
          <select className="rounded border p-2" value={filtros.bimestre} onChange={(event) => atualizarFiltro("bimestre", event.target.value)}>
            <option value="">Último disponível</option>
            {[1, 2, 3, 4].map((bimestre) => <option key={bimestre} value={bimestre}>{bimestre}º bimestre</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Nível
          <select className="rounded border p-2" value={filtros.nivel} onChange={(event) => atualizarFiltro("nivel", event.target.value)}>
            <option value="">Todos</option>
            <option value="alto">Atenção alta</option>
            <option value="moderado">Atenção moderada</option>
            <option value="normal">Situação normal</option>
          </select>
        </label>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {loading ? (
        <p>Gerando análise...</p>
      ) : alunosFiltrados.length === 0 ? (
        <p className="rounded border bg-white p-4">Nenhum aluno encontrado para os filtros selecionados.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="p-3">Aluno</th>
                <th className="p-3">Turma</th>
                <th className="p-3">Média atual</th>
                <th className="p-3">Variação</th>
                <th className="p-3">Nível</th>
                <th className="p-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno) => (
                <tr key={aluno.alunoId} className="border-t align-top">
                  <td className="p-3 font-medium">{aluno.nome}</td>
                  <td className="p-3">{aluno.turma}</td>
                  <td className="p-3">{formatNumber(aluno.mediaAtual)}</td>
                  <td className={`p-3 ${aluno.variacao < 0 ? "text-red-700" : "text-gray-700"}`}>
                    {aluno.variacao === null ? "-" : `${aluno.variacao > 0 ? "+" : ""}${formatNumber(aluno.variacao)}`}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${nivelClasses[aluno.nivel]}`}>
                      {nivelLabel[aluno.nivel]}
                    </span>
                  </td>
                  <td className="p-3">
                    <button className="font-medium text-blue-700 hover:underline" onClick={() => selecionarAluno(aluno)}>
                      Ver análise
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {alunoSelecionado && (
        <section className="rounded-lg border bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#043666]">{alunoSelecionado.nome}</h2>
              <p className="text-gray-600">{alunoSelecionado.turma}</p>
            </div>
            <button className="text-gray-500 hover:text-gray-900" onClick={fecharAnalise} aria-label="Fechar análise">Fechar</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <p>Média atual: <strong>{formatNumber(alunoSelecionado.mediaAtual)}</strong></p>
            <p>Média anterior: <strong>{formatNumber(alunoSelecionado.mediaAnterior)}</strong></p>
            <p>Média da turma: <strong>{formatNumber(alunoSelecionado.mediaTurma)}</strong></p>
            <p>Acertos: <strong>{alunoSelecionado.percentualAcertos === null ? "-" : `${formatNumber(alunoSelecionado.percentualAcertos)}%`}</strong></p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Motivos</h3>
              {alunoSelecionado.motivos.length ? <ul className="mt-2 list-disc pl-5 text-gray-700">{alunoSelecionado.motivos.map((motivo) => <li key={motivo}>{motivo}</li>)}</ul> : <p className="mt-2 text-gray-600">Nenhum indicador de atenção.</p>}
            </div>
            <div>
              <h3 className="font-semibold">Disciplinas críticas</h3>
              {alunoSelecionado.disciplinasCriticas.length ? <ul className="mt-2 list-disc pl-5 text-gray-700">{alunoSelecionado.disciplinasCriticas.map((disciplina) => <li key={disciplina.nome}>{disciplina.nome}: {formatNumber(disciplina.media)}</li>)}</ul> : <p className="mt-2 text-gray-600">Nenhuma disciplina abaixo de 6,0.</p>}
            </div>
          </div>
          {alunoSelecionado.recomendacoes.length > 0 && (
            <div className="mt-4 rounded bg-blue-50 p-3">
              <h3 className="font-semibold text-blue-900">Recomendações</h3>
              <ul className="mt-1 list-disc pl-5 text-blue-900">{alunoSelecionado.recomendacoes.map((recomendacao) => <li key={recomendacao}>{recomendacao}</li>)}</ul>
            </div>
          )}
          <div className="mt-5 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#043666]">Sugestões da IA</h3>
                <p className="text-sm text-gray-600">
                  A IA sugere ações com base nos indicadores calculados pelo sistema.
                </p>
              </div>
              <button
                className="rounded bg-[#043666] px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={pedirSugestoes}
                disabled={carregandoSugestoes}
              >
                {carregandoSugestoes ? "Analisando..." : "Pedir sugestão para a IA"}
              </button>
            </div>
            {erroSugestoes && <p className="mt-3 rounded bg-yellow-50 p-3 text-yellow-800">{erroSugestoes}</p>}
            {sugestoesIA && (
              <div className="mt-3 rounded bg-indigo-50 p-4 text-indigo-950">
                <p>{sugestoesIA.resumo}</p>
                <ul className="mt-2 list-disc pl-5">
                  {sugestoesIA.sugestoes.map((sugestao) => <li key={sugestao}>{sugestao}</li>)}
                </ul>
                <p className="mt-3 text-xs text-indigo-800">
                  As sugestões são apoio à decisão e devem ser avaliadas pela equipe pedagógica.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
