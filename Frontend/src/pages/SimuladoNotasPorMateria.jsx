import React, { useEffect, useState } from "react";
import { getByAlunoAndBimestre } from "../api/simuladoApi.js";
import { getUsuario } from "../api/usuariosapi.js";
import { useParams, useNavigate } from "react-router-dom";
import NotasSimuladosCard from "../components/NotasSimuladosCard";
import BimestreAtual from "../components/BimestreAtual";
import StyleTitle from "../styles/Title.module.css";
import ButtonStyle from "../styles/ButtonGroup.module.css";

export default function SimuladoNotasPorMateria() {
  const navigate = useNavigate();
  const { simuladoIdParams, bimestre, alunoId } = useParams();

  const [simuladoId, setSimuladoId] = useState(null);
  const [simulados, setSimulados] = useState([]);
  const [aluno, setAluno] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [materiaSelecionada, setMateriaSelecionada] = useState("");

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

  useEffect(() => {
    if (simulados.length > 0 && !materiaSelecionada) {
      const materias = obterMaterias();
      if (materias.length > 0) {
        setMateriaSelecionada(materias[0].id);
      }
    }
  }, [simulados]);


  const obterMaterias = () => {
    const materiasSet = new Set();

    simulados.forEach((simulado) => {
      simulado.conteudos?.forEach((conteudo) => {
        if (conteudo.turma_disciplina) {
          materiasSet.add(
            JSON.stringify({
              id: conteudo.turma_disciplina._id,
              nome: conteudo.turma_disciplina.materia,
              professor: conteudo.turma_disciplina.professor || "N/A",
            })
          );
        }
      });
    });

    return Array.from(materiasSet)
      .map((m) => JSON.parse(m))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const materias = obterMaterias();

  const calcularMediaObjetiva = () => {
    return simulados
      .filter((simulado) => simulado.tipo === "objetivo")
      .reduce((total, simulado) => {
        const conteudosDoAluno =
          simulado.conteudos?.filter(
            (conteudo) =>
              conteudo.resultado?.aluno_id === alunoId &&
              conteudo.turma_disciplina._id === materiaSelecionada
          ) || [];

        const somaNotas = conteudosDoAluno.reduce((acc, conteudo) => {
          const acertos = conteudo.resultado?.acertos || 0;
          const peso = conteudo.peso || 0;
          const nota = (acertos * peso) / 100;
          return acc + nota;
        }, 0);

        return total + somaNotas;
      }, 0);
  };

  const calcularMediaDissertativa = () => {
    return simulados
      .filter((simulado) => simulado.tipo === "dissertativo")
      .reduce((total, simulado) => {
        const conteudosDoAluno =
          simulado.conteudos?.filter(
            (conteudo) =>
              conteudo.resultado?.aluno_id === alunoId &&
              conteudo.turma_disciplina._id === materiaSelecionada
          ) || [];

        const somaNotas = conteudosDoAluno.reduce((acc, conteudo) => {
          const acertos = conteudo.resultado?.acertos || 0;
          const peso = conteudo.peso || 0;
          const nota = (acertos * peso) / 100;
          return acc + nota;
        }, 0);

        return total + somaNotas;
      }, 0);
  };

  const calcularNotaFinal = () => {
    return calcularMediaDissertativa() + calcularMediaObjetiva();
  };

  const totalResultadosMateria = () => {
    if (!materiaSelecionada) return 0;

    return simulados.reduce((total, simulado) => {
      const conteudosDaMateria =
        simulado.conteudos?.filter(
          (conteudo) =>
            conteudo.turma_disciplina?._id === materiaSelecionada &&
            (conteudo.resultado?.aluno_id === alunoId ||
              conteudo.resultados?.some((r) => r.aluno === alunoId))
        ) || [];

      const acertosDaMateria = conteudosDaMateria.reduce((acc, conteudo) => {
        return acc + (conteudo.resultado?.acertos || 0);
      }, 0);

      return total + acertosDaMateria;
    }, 0);
  };

  const totalQuestoesMateria = () => {
    if (!materiaSelecionada) return 0;

    return simulados.reduce((total, simulado) => {
      const conteudosDaMateria =
        simulado.conteudos?.filter(
          (conteudo) =>
            conteudo.turma_disciplina?._id === materiaSelecionada &&
            (conteudo.resultado?.aluno_id === alunoId ||
              conteudo.resultados?.some((r) => r.aluno === alunoId))
        ) || [];

      const questoesDaMateria = conteudosDaMateria.reduce((acc, conteudo) => {
        return acc + (conteudo.quantidade_questoes || 0);
      }, 0);

      return total + questoesDaMateria;
    }, 0);
  };

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="textRed-600">{error}</p>;
  if (!simulados) return <p>Simulado não encontrado.</p>;

  return (
    <div className="flex flex-col gap-y-2">
      <div className={StyleTitle.titleContent}>
        <div>
          <h1 className={StyleTitle.titlePage}>
            Notas Aluno(a) - {aluno.nome}
          </h1>
          <p className={StyleTitle.subtitlePage}>
            Número de acertos, visualização individual por materia
          </p>
        </div>

        <div>
          <BimestreAtual
            bimestre={simulados[0]?.bimestre}
            ano={simulados[0]?.turma.ano}
          />
        </div>
      </div>

      {/* <div className="flex gap-3">
        <button
          className={ButtonStyle.buttonSecondarySmall}
          onClick={() => navigate()}
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
          Média Materia
        </button>
      </div> */}

      <div className="mb-2 flex justify-between">
        <div className={ButtonStyle.formSelectContainer}>
          <select
            className={ButtonStyle.formSelect}
            value={materiaSelecionada}
            onChange={(e) => setMateriaSelecionada(e.target.value)}
          >
            {materias.map((materia) => (
              <option key={materia.id} value={materia.id}>
                {materia.nome} - {materia.professor}
              </option>
            ))}
          </select>

          <svg
            className={`${ButtonStyle.formSelectArrowRightLarge}`}
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
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-3 items-center">
          <div className="w-1/4">Nº Simulado</div>
          <div className="w-1/4">Tipo</div>
          <div className="w-1/4">Peso</div>
          <div className="w-1/4">Resultado</div>
        </div>

        <div className="flex flex-col gap-y-1">
          {simulados
            .sort((a, b) => a.numero - b.numero)
            .map((simulado) => {
              let conteudosDoAluno =
                simulado.conteudos?.filter(
                  (conteudo) =>
                    (conteudo.resultado?.aluno_id === alunoId ||
                      conteudo.resultados?.some((r) => r.aluno === alunoId)) &&
                    conteudo.turma_disciplina._id === materiaSelecionada
                ) || [];

              return conteudosDoAluno.map((conteudo, index) => (
                <NotasSimuladosCard
                  key={conteudo._id || index}
                  conteudo={conteudo}
                  simulado={simulado}
                />
              ));
            })}
        </div>

        <div className="flex w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-3 items-center">
          <div className="w-3/4">
            Total de Acertos
          </div>
          <div className="flex w-1/4 gap-3">
            <p className="w-1/12">{totalResultadosMateria()}</p>
            <p className="w-1/12">/</p>
            <p className="w-1/12">{totalQuestoesMateria()}</p>
          </div>
        </div>

        <div className="flex w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-3 items-center">
          <div className="w-1/2">Média Objetiva</div>
          <div className="w-1/2">{calcularMediaObjetiva().toFixed(2).replace('.', ',')}</div>
        </div>

        <div className="flex w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-3 items-center">
          <div className="w-1/2">Média Dissertativa</div>
          <div className="w-1/2">{calcularMediaDissertativa().toFixed(2).replace('.', ',')}</div>
        </div>

        <div className="flex w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-3 items-center">
          <div className="w-1/2">Nota Final</div>
          <div className="w-1/2">{calcularNotaFinal().toFixed(2).replace('.', ',')}</div>
        </div>
      </div>

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
              navigate(`/Simulados/Notas/${simuladoId}/${bimestre}/${alunoId}`)
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
            Visualização por simulado
          </button>
        </div>
      </div>
    </div>
  );
}
