import { listarAlunosEmAtencao } from "../services/alunosAtencaoService.js";
import { gerarSugestoesAluno } from "../services/azureIAService.js";

export default class IAController {
    static async listarAlunosEmAtencao(req, res) {
        try {
            const { turmaId, ano, bimestre, nivel } = req.query;
            const analise = await listarAlunosEmAtencao({ turmaId, ano, bimestre, nivel });
            return res.status(200).json(analise);
        } catch (error) {
            const statusCode = error.statusCode || 500;
            console.error("Erro ao identificar alunos em atenção:", error);
            return res.status(statusCode).json({
                message: statusCode === 500
                    ? "Erro ao analisar os alunos."
                    : error.message
            });
        }
    }

    static async sugerirAcoesAluno(req, res) {
        try {
            const { alunoId, turmaId, ano, bimestre } = req.body;

            if (!alunoId) {
                return res.status(422).json({ message: "Aluno é obrigatório." });
            }

            const analise = await listarAlunosEmAtencao({ turmaId, ano, bimestre });
            const aluno = analise.alunos.find((item) => item.alunoId === alunoId);

            if (!aluno) {
                return res.status(404).json({ message: "Aluno não encontrado na análise selecionada." });
            }

            const resultado = await gerarSugestoesAluno(aluno);
            return res.status(200).json({ alunoId, ...resultado });
        } catch (error) {
            const statusCode = error.statusCode || 500;
            console.error("Erro ao gerar sugestões para aluno:", error);
            return res.status(statusCode).json({
                message: statusCode === 500
                    ? "Erro ao gerar sugestões com IA."
                    : error.message
            });
        }
    }

}
