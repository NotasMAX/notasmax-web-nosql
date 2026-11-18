import { Types } from 'mongoose';
import Simulado from '../Models/Simulado.js';
import Turma from '../Models/Turma.js';
import TurmaDisciplina from '../Models/TurmaDisciplina.js';
import Usuario from '../Models/Usuario.js';
import MapeamentoColuna from '../Models/MapeamentoColuna.js';
import ImportacaoNotas from '../Models/ImportacaoNotas.js';
import { lerPlanilhaNotas } from '../services/planilhaNotasParser.js';
import { armazenamentoPlanilhas } from '../services/armazenamentoPlanilhas.js';
import {
    cadastrarDisciplinasNovas,
    comoDisciplinasDaConferencia,
    desfazerCadastro,
    resolverDisciplinasNovas,
    trocarIdsDasDisciplinas,
} from '../services/disciplinasNovas.js';
import {
    montarEstadoDaConfirmacao,
    montarOperacoes,
    montarPrevia,
    validarConferencia,
    validarOutrosAlunos,
} from '../services/conferenciaNotas.js';

const { ObjectId } = Types;

const validarIdentificadores = ({ aluno_id, turma_id, bimestre }) => {
    if (!ObjectId.isValid(aluno_id)) return 'Id de aluno inválido';
    if (!ObjectId.isValid(turma_id)) return 'Id de turma inválido';
    if (![1, 2, 3, 4].includes(Number(bimestre))) return 'Informe um bimestre válido';
    return null;
};

const buscarDisciplinas = async (turma_id) => {
    const disciplinas = await TurmaDisciplina.aggregate([
        { $match: { turma_id: new ObjectId(turma_id) } },
        { $lookup: { from: 'materias', localField: 'materia_id', foreignField: '_id', as: 'materia' } },
        { $unwind: '$materia' },
        { $lookup: { from: 'usuarios', localField: 'professor_id', foreignField: '_id', as: 'professor' } },
        { $unwind: '$professor' },
        { $project: { materia: '$materia.nome', professor: '$professor.nome', materia_id: 1, professor_id: 1 } },
    ]);
    // Os ids deixam a revisão saber quem já dá cada matéria na turma.
    return disciplinas.map(({ _id, materia, professor, materia_id, professor_id }) => ({
        _id: String(_id),
        materia,
        professor,
        materia_id: materia_id ? String(materia_id) : null,
        professor_id: professor_id ? String(professor_id) : null,
    }));
};

// A confirmação chega como multipart, com a planilha no campo "arquivo" e a conferência em JSON no campo "dados".
const lerDados = (texto) => {
    try {
        const dados = JSON.parse(texto);
        return dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : null;
    } catch {
        return null;
    }
};

const buscarCadastro = async ({ aluno_id, turma_id, bimestre }) => {
    const turma = await Turma.findById(turma_id);
    if (!turma) return { erro: 'Turma não encontrada' };
    if (!turma.alunos.some((id) => String(id) === String(aluno_id))) return { erro: 'O aluno não faz parte desta turma' };

    const aluno = await Usuario.findById(aluno_id);
    if (!aluno) return { erro: 'Aluno não encontrado' };

    return {
        turma,
        aluno,
        disciplinas: await buscarDisciplinas(turma_id),
        simulados: await Simulado.find({ turma_id, bimestre }),
    };
};

const conteudoComObjectId = (conteudo) => ({
    ...conteudo,
    turma_disciplina_id: new ObjectId(conteudo.turma_disciplina_id),
    resultados: conteudo.resultados.map((resultado) => ({ ...resultado, aluno_id: new ObjectId(resultado.aluno_id) })),
});

// Os ids chegam como texto do JSON; no banco, os filtros precisam de ObjectId.
// O simulado novo já recebe o _id aqui, para a resposta apontar para ele.
const paraObjectId = (operacao) => {
    if (operacao.insertOne) {
        const { document } = operacao.insertOne;
        return {
            insertOne: {
                document: {
                    ...document,
                    _id: new ObjectId(),
                    turma_id: new ObjectId(document.turma_id),
                    conteudos: document.conteudos.map(conteudoComObjectId),
                },
            },
        };
    }

    const { filter, update, arrayFilters } = operacao.updateOne;
    const empurrar = update.$push?.['conteudos.$[c].resultados'];
    const retirar = update.$pull?.['conteudos.$[c].resultados'];
    if (empurrar) empurrar.aluno_id = new ObjectId(empurrar.aluno_id);
    if (retirar) retirar.aluno_id = new ObjectId(retirar.aluno_id);
    if (update.$push?.conteudos) update.$push.conteudos = conteudoComObjectId(update.$push.conteudos);

    return {
        updateOne: {
            filter: { _id: new ObjectId(filter._id) },
            update,
            ...(arrayFilters && {
                arrayFilters: arrayFilters.map((item) => Object.fromEntries(
                    Object.entries(item).map(([campo, valor]) => [campo, new ObjectId(valor)]),
                )),
            }),
        },
    };
};

export default class ImportacaoController {
    static async previa(req, res) {
        const { aluno_id, turma_id, bimestre, aba } = req.body;

        if (!req.file)
            return res.status(422).json({ message: 'Envie a planilha.' });
        const invalido = validarIdentificadores({ aluno_id, turma_id, bimestre });
        if (invalido)
            return res.status(422).json({ message: invalido });

        try {
            const cadastro = await buscarCadastro({ aluno_id, turma_id, bimestre: Number(bimestre) });
            if (cadastro.erro)
                return res.status(422).json({ message: cadastro.erro });

            const { turma, aluno, disciplinas, simulados } = cadastro;
            const leitura = await lerPlanilhaNotas(req.file.buffer, { nomeAluno: aluno.nome, aba });
            const mapeamentos = await MapeamentoColuna.find({ turma_id });

            const previa = montarPrevia({
                leitura,
                bimestreTela: Number(bimestre),
                aluno: { _id: String(aluno._id), nome: aluno.nome },
                turma: { _id: String(turma._id), serie: turma.serie, ano: turma.ano },
                disciplinas,
                simulados,
                mapeamentos,
            });

            return res.status(200).json(previa);
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao ler a planilha', error: error.message });
        }
    }

    static async confirmar(req, res) {
        if (!req.file)
            return res.status(422).json({ message: 'Envie a planilha.' });
        const corpo = lerDados(req.body?.dados);
        if (!corpo)
            return res.status(422).json({ message: 'Os dados da conferência não vieram no formato esperado.' });

        const { aluno_id, turma_id, bimestre } = corpo;
        const invalido = validarIdentificadores({ aluno_id, turma_id, bimestre });
        if (invalido)
            return res.status(422).json({ message: invalido });

        try {
            const cadastro = await buscarCadastro({ aluno_id, turma_id, bimestre: Number(bimestre) });
            if (cadastro.erro)
                return res.status(422).json({ message: cadastro.erro });

            const { turma, disciplinas, simulados } = cadastro;

            // Disciplinas escolhidas na revisão para colunas sem dono: conferidas agora e cadastradas só depois
            // que a importação inteira passar nas validações. Até lá, valem com o id provisório.
            const novas = await resolverDisciplinasNovas({ pedidas: corpo.disciplinasNovas, turma_id });
            const corpoConferido = trocarIdsDasDisciplinas(corpo, novas.existentes);
            const montarEstado = (payload, disciplinasDaTurma) => montarEstadoDaConfirmacao({
                payload,
                disciplinas: disciplinasDaTurma,
                simulados,
                aluno_id,
                bimestre: Number(bimestre),
            });
            const { estado, bloqueios: bloqueiosDosIds } = montarEstado(corpoConferido, [...disciplinas, ...comoDisciplinasDaConferencia(novas.aCriar)]);

            const alunosDaTurma = await Usuario.find({ _id: { $in: turma.alunos } });
            const { bloqueios, avisos } = validarConferencia(estado);
            const bloqueiosDaTurma = validarOutrosAlunos({
                estado,
                simulados,
                aluno_id,
                nomesDosAlunos: new Map(alunosDaTurma.map(({ _id, nome }) => [String(_id), nome])),
            });

            const todos = [...novas.bloqueios, ...bloqueiosDosIds, ...bloqueios, ...bloqueiosDaTurma];
            if (todos.length > 0)
                return res.status(422).json({ message: 'A importação tem problemas que precisam ser corrigidos.', bloqueios: todos, avisos });

            // A planilha sobe antes de qualquer gravação: toda importação gravada fica com o arquivo que a originou.
            let guardada;
            try {
                guardada = await armazenamentoPlanilhas.guardar({ buffer: req.file.buffer, turma_id, bimestre: Number(bimestre) });
            } catch (error) {
                console.error('Erro ao guardar a planilha no Blob Storage:', error.message);
                return res.status(502).json({ message: 'Não foi possível guardar a planilha. Nenhuma nota foi gravada.' });
            }

            let cadastroNovo = { mapa: new Map(), criados: { materias: [], disciplinas: [] } };
            let contagem;
            let primeiro;
            try {
                cadastroNovo = await cadastrarDisciplinasNovas({ aCriar: novas.aCriar, turma_id });

                // Com as disciplinas cadastradas, os ids provisórios viram os reais antes de montar as operações.
                const corpoFinal = trocarIdsDasDisciplinas(corpoConferido, cadastroNovo.mapa);
                const { estado: estadoFinal } = montarEstado(corpoFinal, [...disciplinas, ...comoDisciplinasDaConferencia(novas.aCriar, cadastroNovo.mapa)]);
                const montadas = montarOperacoes({ estado: estadoFinal, aluno_id, turma_id, simulados });
                const operacoes = montadas.operacoes.map(paraObjectId);
                contagem = {
                    ...montadas.contagem,
                    disciplinasCadastradas: cadastroNovo.criados.disciplinas.length,
                    materiasCadastradas: cadastroNovo.criados.materias.length,
                };

                // As notas do aluno abrem no primeiro simulado do bimestre, que pode ser um dos criados agora.
                primeiro = [
                    ...simulados.map(({ _id, numero }) => ({ _id, numero })),
                    ...operacoes.filter(({ insertOne }) => insertOne).map(({ insertOne: { document } }) => document),
                ].sort((a, b) => a.numero - b.numero)[0];

                if (operacoes.length > 0)
                    await Simulado.bulkWrite(operacoes);

                const trocadas = (corpoFinal.colunas ?? []).filter(({ trocada }) => trocada);
                if (trocadas.length > 0) {
                    await MapeamentoColuna.bulkWrite(trocadas.map(({ cabecalho, turma_disciplina_id }) => ({
                        updateOne: {
                            filter: { turma_id: new ObjectId(turma_id), cabecalho },
                            update: { $set: { turma_disciplina_id: new ObjectId(turma_disciplina_id) } },
                            upsert: true,
                        },
                    })));
                }
            } catch (error) {
                // As notas não foram gravadas: a matéria e a disciplina cadastradas agora também saem.
                await desfazerCadastro(cadastroNovo.criados);
                // Só apaga o arquivo criado agora: um que já existia é de outra importação.
                if (guardada?.novo) {
                    try {
                        await armazenamentoPlanilhas.apagar(guardada.nome);
                    } catch (erroAoApagar) {
                        console.error('Erro ao apagar a planilha do Blob Storage:', erroAoApagar.message);
                    }
                }
                throw error;
            }

            // Notas e planilha já estão gravadas: uma falha só no registro não desfaz a importação.
            try {
                await ImportacaoNotas.create({
                    turma_id,
                    aluno_id,
                    bimestre: Number(bimestre),
                    importado_por: req.user?.id,
                    planilha: {
                        blob: guardada?.nome ?? null,
                        nome_original: req.file.originalname,
                        tamanho: req.file.size,
                        aba: typeof corpo.aba === 'string' ? corpo.aba : null,
                    },
                    contagem,
                });
            } catch (error) {
                console.error('Erro ao registrar a importação de notas:', error.message);
            }

            return res.status(200).json({ message: 'Notas importadas com sucesso', ...contagem, simulado_id: primeiro ? String(primeiro._id) : null });
        } catch (error) {
            // Os simulados novos vão antes das notas: com o número já cadastrado, nenhuma nota foi gravada, e a
            // matéria e a disciplina cadastradas antes já foram desfeitas.
            if (error.code === 11000) {
                const bloqueio = { codigo: 'SIMULADO_INVALIDO', mensagem: 'Um dos SIMs novos foi cadastrado enquanto a tela estava aberta. Importe de novo.', celulas: [], coluna: null };
                return res.status(422).json({ message: 'A importação tem problemas que precisam ser corrigidos.', bloqueios: [bloqueio] });
            }
            return res.status(500).json({ message: 'Erro ao importar as notas', error: error.message });
        }
    }
}
