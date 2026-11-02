import React, { useEffect, useState } from "react";
import { getByAlunoAndBimestre, getOneSimple } from "../api/simuladoApi.js";
import { getUsuario } from "../api/usuariosapi.js";
import { useParams, useNavigate } from "react-router-dom";
import NotasCard from "../components/NotasCard";
import BimestreAtual from "../components/BimestreAtual";
import StyleTitle from "../styles/Title.module.css";
import ButtonStyle from "../styles/ButtonGroup.module.css";

export default function SimuladoNotasPorSimulado({}) {
  const navigate = useNavigate();
  const { simuladoIdParams, bimestre, alunoId } = useParams();

  const [simuladoId, setSimuladoId] = useState(null);
  const [simulados, setSimulados] = useState([]);
  const [aluno, setAluno] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!simuladoIdParams) return;
    setSimuladoId(simuladoIdParams);
  }, [simuladoIdParams]);

  useEffect(() => {
    if (!alunoId) return;

    const loadAluno = async () => {
      try {
        const res = await getUsuario(alunoId);
        setAluno(res.data);
      } catch (e) {
        setError(e.message || "Erro ao carregar informações de aluno");
      }
    };

    loadAluno();
  }, [alunoId]);

  useEffect(() => {
    if (!alunoId || !bimestre) return;

    const loadSimulados = async () => {
      try {
        const res = await getByAlunoAndBimestre(alunoId, bimestre, simuladoIdParams);
        setSimulados(res.data.simulados || []);
        setLoading(false);
      } catch (e) {
        setError(e.message || "Erro ao carregar lista de simulados");
      }
    };

    loadSimulados();
  }, [alunoId, bimestre]);

  // Função para calcular o total de acertos
  const totalResultados = () => {
    const simuladoAtual = simulados.find((s) => s._id === simuladoId);
    if (!simuladoAtual?.conteudos) return 0;

    return simuladoAtual.conteudos.reduce((total, conteudo) => {
      return total + (conteudo.resultado?.acertos || 0);
    }, 0);
  };

  // Função para calcular o total de questões
  const totalQuestoes = () => {
    const simuladoAtual = simulados.find((s) => s._id === simuladoId);
    if (!simuladoAtual?.conteudos) return 0;

    return simuladoAtual.conteudos.reduce((total, conteudo) => {
      return total + (conteudo.quantidade_questoes || 0);
    }, 0);
  };

  // O aluno pode ainda não ter nota no bimestre: nesse caso a lista vem vazia, e a turma sai do simulado aberto.
  const importarExcel = async () => {
    try {
      const res = await getOneSimple(simuladoIdParams);
      navigate(`/Simulados/Importar/${res.data.simulado.turma_id}/${bimestre}/${alunoId}`);
    } catch (e) {
      setError(e.message || "Erro ao abrir a importação");
    }
  };

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="textRed-600">{error}</p>;
  if (!simulados) return <p>Simulado não encontrado.</p>;

  return (
    <div className="flex flex-col gap-y-2">
      <div className={StyleTitle.titleContent}>
        <div>
          <h1 className={StyleTitle.titlePage}>
            Notas Aluno(a) - {(aluno) ? aluno.nome : ""}
          </h1>
          <p className={StyleTitle.subtitlePage}>
            Lista com o números de acertos, separado pelas materias
          </p>
        </div>

        <div>
          <BimestreAtual
            bimestre={simulados[0]?.bimestre ?? bimestre}
            ano={simulados[0]?.turma.ano}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className={ButtonStyle.buttonSecondarySmall}
          onClick={() => navigate(`/Turmas/${simulados[0]?.turma._id}/Aluno/${alunoId}/Simulado/${simuladoId}/Notas/`)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z"
              fill="#4b5563"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 7C12.5523 7 13 7.44772 13 8V11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H13V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11H11V8C11 7.44772 11.4477 7 12 7Z"
              fill="#4b5563"
            />
          </svg>
          Lançar Notas Simulado
        </button>
        <button
          className={ButtonStyle.buttonSecondarySmall}
          onClick={importarExcel}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M4 6C4 3.79086 5.79086 2 8 2H16C18.2091 2 20 3.79086 20 6V18C20 20.2091 18.2091 22 16 22H8C5.79086 22 4 20.2091 4 18V6ZM8 4C6.89543 4 6 4.89543 6 6V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V6C18 4.89543 17.1046 4 16 4H8Z" fill="#4B5563" />
            <path fillRule="evenodd" clipRule="evenodd" d="M8 2H8.11111C9.35367 2 10.3977 2.84985 10.6938 4H13.3062C13.6023 2.84985 14.6463 2 15.8889 2H16V4H15.8889C15.5207 4 15.2222 4.29848 15.2222 4.66667C15.2222 5.40305 14.6253 6 13.8889 6H10.1111C9.37473 6 8.77778 5.40305 8.77778 4.66667C8.77778 4.29848 8.4793 4 8.11111 4H8V2Z" fill="#4B5563" />
            <path fillRule="evenodd" clipRule="evenodd" d="M12 9C12.5523 9 13 9.44772 13 10L13 13.5858L14.2929 12.2929C14.6834 11.9024 15.3166 11.9024 15.7071 12.2929C16.0976 12.6834 16.0976 13.3166 15.7071 13.7071L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L8.29289 13.7071C7.90237 13.3166 7.90237 12.6834 8.29289 12.2929C8.68342 11.9024 9.31658 11.9024 9.70711 12.2929L11 13.5858L11 10C11 9.44772 11.4477 9 12 9Z" fill="#4B5563" />
          </svg>
          Importar Excel
        </button>
        <button
          className={ButtonStyle.buttonSecondarySmall}
          onClick={() => navigate(`/Usuarios/Aluno/${alunoId}/desempenho`)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M2 7C2 4.23858 4.23858 2 7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7ZM7 4C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V7C20 5.34315 18.6569 4 17 4H7Z"
              fill="#4b5563"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8 13C8.55228 13 9 13.4477 9 14V16C9 16.5523 8.55228 17 8 17C7.44772 17 7 16.5523 7 16L7 14C7 13.4477 7.44772 13 8 13Z"
              fill="#4b5563"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M16 7C16.5523 7 17 7.44772 17 8L17 16C17 16.5523 16.5523 17 16 17C15.4477 17 15 16.5523 15 16L15 8C15 7.44772 15.4477 7 16 7Z"
              fill="#4b5563"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 10C12.5523 10 13 10.4477 13 11L13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16L11 11C11 10.4477 11.4477 10 12 10Z"
              fill="#4b5563"
            />
          </svg>
          Média Bimestral
        </button>
      </div>

      <div className={ButtonStyle.formSelectContainer}>
        <select
          required
          className={ButtonStyle.formSelect}
          value={simuladoId ?? "Selecione um simulado"}
          onChange={(e) => setSimuladoId(e.target.value)}
        >
          {simulados.length > 0 ? (
            simulados
              .sort((a, b) => a.numero - b.numero)
              .map((s) => (
                <option
                  className={ButtonStyle.formOption}
                  key={s._id}
                  value={s._id}
                >
                  {s.name ?? `Simulado ${s.numero} - ${s.tipo}`}
                </option>
              ))
          ) : (
            <option disabled>Simulados não encontrados...</option>
          )}
        </select>

        <svg
          className={ButtonStyle.formSelectArrowRightLarge}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z"
          />
        </svg>
      </div>

      {/* inicio tabela */}
      <div className="flex w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-3 items-center">
        <div className="w-1/3">Disciplina</div>
        <div className="w-1/3">Professor</div>
        <div className="w-1/3">Resultado</div>
      </div>

      <div className="flex flex-col gap-y-1">
        {simulados
          .find((s) => s._id === simuladoId)
          ?.conteudos?.map((conteudo, index) => (
            <NotasCard key={conteudo._id || index} conteudo={conteudo} />
          ))}
      </div>

      <div className="flex w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-3 items-center">
        <div className="w-2/3">Total de Acertos</div>
        <div className="flex w-1/3 gap-3">
          <p className="w-1/12">{totalResultados()}</p>
          <p className="w-1/12">/</p>
          <p className="w-1/12">{totalQuestoes()}</p>
        </div>
      </div>

      {/* btns de voltar ou mudar forma de vizualizar */}
      <div className="flex items-center justify-end">
        <div className="flex justify-end gap-3">
          <button
            className={ButtonStyle.buttonSecondary}
            onClick={() => navigate(`/Turmas/Simulado/Aluno/${simuladoId}`)}
          >
            Voltar a lista de alunos
          </button>

          <button
            className={ButtonStyle.buttonPrimary}
            onClick={() =>
              navigate(
                `/Simulados/Notas/Materia/${simuladoId}/${bimestre}/${alunoId}`
              )
            }
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7 4C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V13C20 12.4477 20.4477 12 21 12C21.5523 12 22 12.4477 22 13V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2H11C11.5523 2 12 2.44772 12 3C12 3.55228 11.5523 4 11 4H7Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M21.7071 2.29289C22.0976 2.68342 22.0976 3.31658 21.7071 3.70711L12.7071 12.7071C12.3166 13.0976 11.6834 13.0976 11.2929 12.7071C10.9024 12.3166 10.9024 11.6834 11.2929 11.2929L20.2929 2.29289C20.6834 1.90237 21.3166 1.90237 21.7071 2.29289Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14 3C14 2.44772 14.4477 2 15 2H21C21.5523 2 22 2.44772 22 3V9C22 9.55228 21.5523 10 21 10C20.4477 10 20 9.55228 20 9V4H15C14.4477 4 14 3.55228 14 3Z"
                fill="white"
              />
            </svg>
            Visualização individualmente por materia
          </button>
        </div>
      </div>
    </div>
  );
}
