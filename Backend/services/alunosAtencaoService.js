import { Types } from "mongoose";
import Usuario from "../Models/Usuario.js";
import Turma from "../Models/Turma.js";
import TurmaDisciplina from "../Models/TurmaDisciplina.js";
import Simulado from "../Models/Simulado.js";

const MEDIA_ATENCAO = 6;
const MEDIA_ATENCAO_ALTA = 5;
const QUEDA_ATENCAO = 1;
const DIFERENCA_TURMA = 2;
const MINIMO_ACERTOS = 0.5;

const round = (value) => Number(value.toFixed(2));

function addScore(target, alunoId, nota, peso, bimestre, disciplinaId, quantidadeQuestoes, acertos) {
    const aluno = target.get(alunoId);
    if (!aluno) return;

    const pesoValido = Number.isFinite(Number(peso)) && Number(peso) > 0 ? Number(peso) : 1;
    const notaValida = Number(nota);
    if (!Number.isFinite(notaValida)) return;

    if (!aluno.bimestres.has(bimestre)) {
        aluno.bimestres.set(bimestre, { weightedScore: 0, weight: 0, acertos: 0, questoes: 0 });
    }

    const bimestreData = aluno.bimestres.get(bimestre);
    bimestreData.weightedScore += notaValida * pesoValido;
    bimestreData.weight += pesoValido;
    bimestreData.acertos += Number(acertos) || 0;
    bimestreData.questoes += Number(quantidadeQuestoes) || 0;

    if (disciplinaId) {
        const disciplinaKey = `${bimestre}:${disciplinaId}`;
        if (!aluno.disciplinas.has(disciplinaKey)) {
            aluno.disciplinas.set(disciplinaKey, {
                disciplinaId,
                bimestre,
                weightedScore: 0,
                weight: 0
            });
        }
        const disciplinaData = aluno.disciplinas.get(disciplinaKey);
        disciplinaData.weightedScore += notaValida * pesoValido;
        disciplinaData.weight += pesoValido;
    }
}

function getAverage(data) {
    return data && data.weight > 0 ? data.weightedScore / data.weight : null;
}

function getLevel(score) {
    if (score >= 6) return "alto";
    if (score >= 3) return "moderado";
    return "normal";
}

function analyzeStudent(aluno, bimestres, currentBimestre, mediaTurma, disciplinaNames) {
    const atual = aluno.bimestres.get(currentBimestre);
    const mediaAtual = getAverage(atual);
    const bimestreAnterior = [...bimestres]
        .filter((bimestre) => bimestre < currentBimestre && aluno.bimestres.has(bimestre))
        .sort((a, b) => b - a)[0];
    const mediaAnterior = getAverage(aluno.bimestres.get(bimestreAnterior));
    const variacao = mediaAtual !== null && mediaAnterior !== null ? mediaAtual - mediaAnterior : null;
    const percentualAcertos = atual && atual.questoes > 0 ? atual.acertos / atual.questoes : null;
    const motivos = [];
    let pontuacao = 0;

    if (mediaAtual === null) {
        motivos.push("Não há resultado registrado no bimestre selecionado");
        pontuacao += 1;
    } else {
        if (mediaAtual < MEDIA_ATENCAO_ALTA) {
            motivos.push(`Média abaixo de ${MEDIA_ATENCAO_ALTA.toFixed(1)}`);
            pontuacao += 3;
        } else if (mediaAtual < MEDIA_ATENCAO) {
            motivos.push(`Média abaixo de ${MEDIA_ATENCAO.toFixed(1)}`);
            pontuacao += 2;
        }

        if (variacao !== null && variacao <= -QUEDA_ATENCAO) {
            motivos.push(`Queda de ${Math.abs(variacao).toFixed(1)} ponto em relação ao bimestre anterior`);
            pontuacao += 2;
        }

        if (percentualAcertos !== null && percentualAcertos < MINIMO_ACERTOS) {
            motivos.push("Percentual de acertos abaixo de 50%");
            pontuacao += 2;
        }

        if (mediaTurma !== null && mediaAtual <= mediaTurma - DIFERENCA_TURMA) {
            motivos.push("Desempenho pelo menos 2 pontos abaixo da média da turma");
            pontuacao += 2;
        }
    }

    const mediasRecentes = [...bimestres]
        .sort((a, b) => b - a)
        .map((bimestre) => getAverage(aluno.bimestres.get(bimestre)))
        .filter((media) => media !== null);
    if (mediasRecentes.length >= 2 && mediasRecentes[0] < MEDIA_ATENCAO && mediasRecentes[1] < MEDIA_ATENCAO) {
        motivos.push("Duas avaliações consecutivas abaixo de 5,0");
        pontuacao += 2;
    }

    const disciplinasCriticas = [...aluno.disciplinas.values()]
        .filter((data) => data.bimestre === currentBimestre)
        .map((data) => ({
            nome: disciplinaNames.get(data.disciplinaId) || "Disciplina não identificada",
            media: round(getAverage(data))
        }))
        .filter((disciplina) => disciplina.media < MEDIA_ATENCAO)
        .sort((a, b) => a.media - b.media);

    if (disciplinasCriticas.length > 0 && mediaAtual !== null && !motivos.some((motivo) => motivo.includes("Média"))) {
        motivos.push("Possui disciplina com média abaixo de 6,0");
        pontuacao += 1;
    }

    const nivel = getLevel(pontuacao);
    const recomendacoes = nivel === "alto"
        ? ["Acompanhar o aluno individualmente", "Reforçar os conteúdos das disciplinas críticas"]
        : nivel === "moderado"
            ? ["Acompanhar o próximo simulado", "Verificar a evolução nas disciplinas críticas"]
            : [];

    return {
        alunoId: aluno.id,
        nome: aluno.nome,
        turma: aluno.turma,
        nivel,
        pontuacao,
        mediaAtual: mediaAtual === null ? null : round(mediaAtual),
        mediaAnterior: mediaAnterior === null ? null : round(mediaAnterior),
        mediaTurma: mediaTurma === null ? null : round(mediaTurma),
        variacao: variacao === null ? null : round(variacao),
        percentualAcertos: percentualAcertos === null ? null : round(percentualAcertos * 100),
        disciplinasCriticas,
        motivos,
        recomendacoes
    };
}

export async function listarAlunosEmAtencao({ turmaId, ano, bimestre, nivel }) {
    const turmaFilter = {};
    if (turmaId) {
        if (!Types.ObjectId.isValid(turmaId)) {
            const error = new Error("Turma inválida");
            error.statusCode = 422;
            throw error;
        }
        turmaFilter._id = turmaId;
    }
    if (ano) turmaFilter.ano = Number(ano);

    const turmas = await Turma.find(turmaFilter).select("_id serie ano alunos").lean();
    const alunosIds = [...new Set(turmas.flatMap((turma) => turma.alunos.map((id) => String(id))))];
    const alunos = await Usuario.find({ _id: { $in: alunosIds }, tipo_usuario: "aluno" }).select("_id nome").lean();
    const alunoNames = new Map(alunos.map((aluno) => [String(aluno._id), aluno.nome]));

    const turmaIds = turmas.map((turma) => turma._id);
    const disciplinas = await TurmaDisciplina.find({ turma_id: { $in: turmaIds } })
        .populate("materia_id", "nome")
        .select("_id turma_id materia_id")
        .lean();
    const disciplinaNames = new Map(disciplinas.map((disciplina) => [
        String(disciplina._id),
        disciplina.materia_id?.nome || "Disciplina não identificada"
    ]));
    const disciplinaTurmas = new Map(disciplinas.map((disciplina) => [
        String(disciplina._id),
        String(disciplina.turma_id)
    ]));

    const simulados = await Simulado.find({ turma_id: { $in: turmaIds } })
        .select("turma_id bimestre data_realizacao conteudos")
        .lean();
    const agora = new Date();
    const resultados = [];
    for (const turma of turmas) {
        const turmaIdString = String(turma._id);
        const alunosDaTurma = turma.alunos
            .map((id) => String(id))
            .filter((id) => alunoNames.has(id));
        const simuladosDaTurma = simulados.filter((simulado) =>
            String(simulado.turma_id) === turmaIdString &&
            new Date(simulado.data_realizacao) <= agora &&
            (!bimestre || Number(simulado.bimestre) <= Number(bimestre))
        );
        const bimestres = [...new Set(simuladosDaTurma.map((simulado) => Number(simulado.bimestre)))].sort((a, b) => a - b);
        const selectedBimestre = bimestre ? Number(bimestre) : bimestres.at(-1);
        if (!selectedBimestre) continue;

        const dadosPorAluno = new Map(alunosDaTurma.map((id) => [
            id,
            {
                id,
                nome: alunoNames.get(id),
                turma: `${turma.serie}º EM - ${turma.ano}`,
                bimestres: new Map(),
                disciplinas: new Map()
            }
        ]));

        for (const simulado of simuladosDaTurma) {
            for (const conteudo of simulado.conteudos || []) {
                const disciplinaId = String(conteudo.turma_disciplina_id);
                if (disciplinaTurmas.get(disciplinaId) !== turmaIdString) continue;
                for (const resultado of conteudo.resultados || []) {
                    addScore(
                        dadosPorAluno,
                        String(resultado.aluno_id),
                        resultado.nota,
                        conteudo.peso,
                        Number(simulado.bimestre),
                        disciplinaId,
                        conteudo.quantidade_questoes,
                        resultado.acertos
                    );
                }
            }
        }

        const mediasDaTurma = [...dadosPorAluno.values()]
            .map((aluno) => getAverage(aluno.bimestres.get(selectedBimestre)))
            .filter((media) => media !== null);
        const mediaTurma = mediasDaTurma.length
            ? mediasDaTurma.reduce((total, media) => total + media, 0) / mediasDaTurma.length
            : null;

        for (const aluno of dadosPorAluno.values()) {
            resultados.push(analyzeStudent(
                aluno,
                bimestres,
                selectedBimestre,
                mediaTurma,
                disciplinaNames
            ));
        }
    }

    const nivelFiltro = ["normal", "moderado", "alto"].includes(nivel) ? nivel : null;
    const filtrados = nivelFiltro ? resultados.filter((aluno) => aluno.nivel === nivelFiltro) : resultados;
    const resumo = {
        totalAlunos: resultados.length,
        atencaoAlta: resultados.filter((aluno) => aluno.nivel === "alto").length,
        atencaoModerada: resultados.filter((aluno) => aluno.nivel === "moderado").length,
        situacaoNormal: resultados.filter((aluno) => aluno.nivel === "normal").length
    };

    return {
        filtros: { turmaId: turmaId || null, ano: ano ? Number(ano) : null, bimestre: bimestre ? Number(bimestre) : null },
        resumo,
        alunos: filtrados.sort((a, b) => b.pontuacao - a.pontuacao || a.nome.localeCompare(b.nome, "pt-BR"))
    };
}
