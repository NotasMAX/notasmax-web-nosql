import Simulado from "../Models/Simulado.js";
import Turma from "../Models/Turma.js";
import { pathToFileURL } from "node:url";

const notaMaxima = 10;

export const gerarResultados = (alunosIdArray, quantidade_questoes) => {
    return alunosIdArray.map(alunoId => gerarResultadoParaAluno(alunoId, quantidade_questoes));
};

export const gerarResultadoParaAluno = (alunoId, quantidade_questoes) => {
    const minAcertos = Math.max(1, Math.floor(quantidade_questoes * 0.3));
    const maxAcertos = quantidade_questoes;
    const acertos = Math.floor(Math.random() * (maxAcertos - minAcertos + 1)) + minAcertos;
    const nota = (notaMaxima / quantidade_questoes) * acertos;
    return {
        aluno_id: alunoId,
        acertos,
        nota,
        notificacao_pendente: "enviada"
    };
};

export const populate = async ({
    SimuladoModel = Simulado,
    TurmaModel = Turma,
    logger = console,
    exit = process.exit,
} = {}) => {
    try {
        logger.log("🌱 Populando simulados cuja data_realizacao é menor que agora...");
        const agora = new Date();

        const simulados = await SimuladoModel.find({ data_realizacao: { $lt: agora } });
        logger.log(`Encontrados ${simulados.length} simulados no passado (antes de ${agora.toISOString()})`);

        let updatedCount = 0;

        for (const sim of simulados) {
            let precisaSalvar = false;

            // buscar alunos da turma associada
            const turma = await TurmaModel.findById(sim.turma_id);
            const alunos = turma && turma.alunos ? turma.alunos.map(a => a.toString()) : [];

            for (let idx = 0; idx < sim.conteudos.length; idx++) {
                const conteudo = sim.conteudos[idx];
                if (!conteudo.resultados) conteudo.resultados = [];

                const presentIds = conteudo.resultados.map(r => (r.aluno_id ? r.aluno_id.toString() : String(r.aluno_id)));
                const quantidade = conteudo.quantidade_questoes || 10;

                // adicionar resultados faltantes para alunos que não aparecem na lista
                for (const alunoId of alunos) {
                    if (!presentIds.includes(alunoId)) {
                        conteudo.resultados.push(gerarResultadoParaAluno(alunoId, quantidade));
                        precisaSalvar = true;
                    }
                }
            }

            if (precisaSalvar) {
                await sim.save();
                updatedCount++;
                logger.log(`✓ Simulado ${sim._id} atualizado com resultados faltantes`);
            }
        }

        logger.log(`✅ Finalizado. Simulados atualizados: ${updatedCount}`);
        exit(0);
    } catch (error) {
        logger.error("❌ Erro populando simulados:", error);
        exit(1);
    }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await import("./conn.js");
    await populate();
}
