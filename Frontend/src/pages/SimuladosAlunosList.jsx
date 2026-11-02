import React, { useEffect, useState, useRef } from "react";
import { getOne } from "../api/simuladoApi";
import SimuladoAlunoItem from "../components/SimuladoAlunoItem";
import StyleTitle from "../styles/Title.module.css";
import ButtonStyle from "../styles/ButtonGroup.module.css";
import BimestreAtual from "../components/BimestreAtual";
import { useParams, useNavigate } from "react-router-dom";
import { Tooltip } from "primereact/tooltip";
import { OverlayPanel } from "primereact/overlaypanel";

export default function SimuladosAlunosList() {
  const navigate = useNavigate();
  const { id } = useParams();
  const tooltipRef = useRef(null);
  const importarRef = useRef(null);

  const [simulado, setSimulado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSimulado = async () => {
      try {
        setLoading(true);
        const res = await getOne(id);
        setSimulado(res.data.simulado);
      } catch (err) {
        console.error("Erro ao buscar simulado:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSimulado();
  }, [id]);

  const handleView = async (alunoId, simuladoId, bimestre) => {
    navigate(`/Simulados/Notas/${simuladoId}/${bimestre}/${alunoId}`);
  };

  const algumAlunoRealizou = () => {
    const simuladoAtual = simulado;
    if (!simuladoAtual?.conteudos) return false;

    return simuladoAtual.conteudos.some((conteudo) => {
      return conteudo.resultados && conteudo.resultados.length > 0;
    });
  };

  const totalPages = Math.ceil(simulado.turma?.alunos.length / itemsPerPage);
  const currentItems = simulado.turma?.alunos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <p>Carregando simulado...</p>;
  if (error) return <p className="text-red-600">Erro ao carregar simulado.</p>;
  if (!simulado) return <p>Simulado não encontrado.</p>;

  return (
    <div className="flex flex-col gap-y-2">
      <Tooltip target={tooltipRef} position="right" />

      <div className={StyleTitle.titleContent}>
        <div>
          <h1 className={StyleTitle.titlePage}>
            Turma {simulado.turma.serie}º EM - Simulado {simulado.numero}
          </h1>
          <p className={StyleTitle.subtitlePage}>
            Lista de alunos que realizaram o simulado {simulado.numero}, no{" "}
            {simulado.bimestre}º Bimestre de {simulado.turma.ano}
          </p>
        </div>

        <div>
          <BimestreAtual
            bimestre={simulado.bimestre}
            ano={simulado.turma.ano}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          ref={tooltipRef}
          className={ButtonStyle.buttonSecondarySmall}
          onClick={() => navigate(
            `/Turmas/${simulado.turma._id}/Simulados/${simulado._id}/Notas/`
          )}
          data-pr-tooltip={"Realizar o lançamentos de notas"}
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
          Lançar Notas Turma
        </button>

        <button
          className={ButtonStyle.buttonSecondarySmall}
          onClick={(e) => importarRef.current.toggle(e)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M4 6C4 3.79086 5.79086 2 8 2H16C18.2091 2 20 3.79086 20 6V18C20 20.2091 18.2091 22 16 22H8C5.79086 22 4 20.2091 4 18V6ZM8 4C6.89543 4 6 4.89543 6 6V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V6C18 4.89543 17.1046 4 16 4H8Z" fill="#4B5563" />
            <path fillRule="evenodd" clipRule="evenodd" d="M8 2H8.11111C9.35367 2 10.3977 2.84985 10.6938 4H13.3062C13.6023 2.84985 14.6463 2 15.8889 2H16V4H15.8889C15.5207 4 15.2222 4.29848 15.2222 4.66667C15.2222 5.40305 14.6253 6 13.8889 6H10.1111C9.37473 6 8.77778 5.40305 8.77778 4.66667C8.77778 4.29848 8.4793 4 8.11111 4H8V2Z" fill="#4B5563" />
            <path fillRule="evenodd" clipRule="evenodd" d="M12 9C12.5523 9 13 9.44772 13 10L13 13.5858L14.2929 12.2929C14.6834 11.9024 15.3166 11.9024 15.7071 12.2929C16.0976 12.6834 16.0976 13.3166 15.7071 13.7071L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L8.29289 13.7071C7.90237 13.3166 7.90237 12.6834 8.29289 12.2929C8.68342 11.9024 9.31658 11.9024 9.70711 12.2929L11 13.5858L11 10C11 9.44772 11.4477 9 12 9Z" fill="#4B5563" />
          </svg>
          Importar Excel
        </button>
        {/* A planilha é de um aluno só: o botão pergunta de quem ela é antes de abrir a importação. */}
        <OverlayPanel ref={importarRef}>
          <p className="px-3 pb-2 text-sm text-gray-600">De qual aluno é a planilha?</p>
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {simulado.turma.alunos.map((aluno) => (
              <button
                key={aluno._id}
                className="rounded-md px-3 py-2 text-left hover:bg-gray-100"
                onClick={() => navigate(`/Simulados/Importar/${simulado.turma._id}/${simulado.bimestre}/${aluno._id}`)}
              >
                {aluno.nome}
              </button>
            ))}
          </div>
        </OverlayPanel>

        <button
          className={ButtonStyle.buttonSecondarySmall}
          onClick={() => navigate(`/Turmas/Editar/${simulado.turma._id}`)}
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
              d="M7 4C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V11C20 10.4477 20.4477 10 21 10C21.5523 10 22 10.4477 22 11V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2H13C13.5523 2 14 2.44772 14 3C14 3.55228 13.5523 4 13 4H7Z"
              fill="#4b5563"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M19.1974 4C18.9845 4 18.7803 4.08457 18.6298 4.23509L10.7528 12.1121L10.3744 13.6256L11.8879 13.2473L19.7649 5.37021C19.9155 5.21969 20 5.01553 20 4.80265C20 4.58978 19.9155 4.38562 19.7649 4.23509C19.6144 4.08457 19.4102 4 19.1974 4ZM17.2156 2.82088C17.7412 2.29528 18.4541 2 19.1974 2C19.9407 2 20.6535 2.29528 21.1791 2.82088C21.7047 3.34648 22 4.05934 22 4.80265C22 5.54596 21.7047 6.25883 21.1791 6.78443L13.1062 14.8573C12.9781 14.9855 12.8175 15.0764 12.6417 15.1204L9.24256 15.9701C8.90178 16.0553 8.54129 15.9555 8.29291 15.7071C8.04453 15.4587 7.94468 15.0982 8.02988 14.7575L8.87966 11.3583C8.92362 11.1825 9.01453 11.0219 9.14269 10.8938L17.2156 2.82088Z"
              fill="#4b5563"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289L18.7071 7.29289C19.0976 7.68342 19.0976 8.31658 18.7071 8.70711C18.3166 9.09763 17.6834 9.09763 17.2929 8.70711L15.2929 6.70711C14.9024 6.31658 14.9024 5.68342 15.2929 5.29289Z"
              fill="#4b5563"
            />
          </svg>
          Editar Turma
        </button>
        <button
          className={ButtonStyle.buttonSecondarySmall}
          onClick={() => navigate(`/Simulados/Editar/${id}`)}
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
              d="M7 4C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V11C20 10.4477 20.4477 10 21 10C21.5523 10 22 10.4477 22 11V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2H13C13.5523 2 14 2.44772 14 3C14 3.55228 13.5523 4 13 4H7Z"
              fill="#4b5563"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M19.1974 4C18.9845 4 18.7803 4.08457 18.6298 4.23509L10.7528 12.1121L10.3744 13.6256L11.8879 13.2473L19.7649 5.37021C19.9155 5.21969 20 5.01553 20 4.80265C20 4.58978 19.9155 4.38562 19.7649 4.23509C19.6144 4.08457 19.4102 4 19.1974 4ZM17.2156 2.82088C17.7412 2.29528 18.4541 2 19.1974 2C19.9407 2 20.6535 2.29528 21.1791 2.82088C21.7047 3.34648 22 4.05934 22 4.80265C22 5.54596 21.7047 6.25883 21.1791 6.78443L13.1062 14.8573C12.9781 14.9855 12.8175 15.0764 12.6417 15.1204L9.24256 15.9701C8.90178 16.0553 8.54129 15.9555 8.29291 15.7071C8.04453 15.4587 7.94468 15.0982 8.02988 14.7575L8.87966 11.3583C8.92362 11.1825 9.01453 11.0219 9.14269 10.8938L17.2156 2.82088Z"
              fill="#4b5563"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289L18.7071 7.29289C19.0976 7.68342 19.0976 8.31658 18.7071 8.70711C18.3166 9.09763 17.6834 9.09763 17.2929 8.70711L15.2929 6.70711C14.9024 6.31658 14.9024 5.68342 15.2929 5.29289Z"
              fill="#4b5563"
            />
          </svg>
          Editar Simulado
        </button>
        <button className={ButtonStyle.buttonSecondarySmall}
        onClick={() => navigate(`/Turma/${simulado.turma._id}/desempenho-materias`)}>
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
          Acertos por materia
        </button>
      </div>

      <div>
        <div className="flex w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-3 items-center">
          <div className="w-1/3">Nome do Aluno</div>
          <div className="w-1/3">Nº de Acertos</div>
          <div className="w-1/3">Ações</div>
        </div>

        <div className="flex flex-col gap-y-1 mt-2">
          {error && (
            <p className="text-red-600">
              Erro ao carregar resultados dos alunos.
            </p>
          )}
          {loading && <p>Carregando resultados dos alunos...</p>}

          {!algumAlunoRealizou() ? (
            <p className="text-center py-4 text-gray-600">
              As notas desse simulado ainda não foram lançadas.
            </p>
          ) : (
            currentItems.map((a) => (
              <SimuladoAlunoItem
                key={a._id}
                alunoResultado={a}
                onView={() =>
                  handleView(a._id, simulado._id, simulado.bimestre)
                }
              />
            ))
          )}
        </div>

        <div className="flex gap-4 items-end">
          <button
            className={ButtonStyle.buttonSecondary}
            onClick={() => navigate(`/Turmas/Info/${simulado.turma._id}`)}
          >
            Voltar a lista de simulados
          </button>

          <div className="mt-6 flex items-center gap-2">
            <button
              className={ButtonStyle.buttonPagination}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <svg
                className="rotate-180"
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.58838 2.79431L10.2455 7.45141L5.58838 12.1085"
                  stroke="#4b5563"
                  strokeWidth="1.59672"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>

            <button
              className={ButtonStyle.buttonPagination}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.58838 2.79431L10.2455 7.45141L5.58838 12.1085"
                  stroke="#4b5563"
                  strokeWidth="1.59672"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
