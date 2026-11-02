import { Types } from 'mongoose';
import Simulado from '../Models/Simulado.js';
import Turma from '../Models/Turma.js';
import TurmaDisciplina from '../Models/TurmaDisciplina.js';
import Usuario from '../Models/Usuario.js';
import MapeamentoColuna from '../Models/MapeamentoColuna.js';
import { lerPlanilhaNotas } from '../services/planilhaNotasParser.js';
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
        { $project: { materia: '$materia.nome', professor: '$professor.nome' } },
    ]);
    return disciplinas.map(({ _id, materia, professor }) => ({ _id: String(_id), materia, professor }));
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

// Os ids chegam como texto do JSON; no banco, os filtros precisam de ObjectId.
const paraObjectId = (operacao) => {
    const { filter, update, arrayFilters } = operacao.updateOne;
    const empurrar = update.$push?.['conteudos.$[c].resultados'];
    const retirar = update.$pull?.['conteudos.$[c].resultados'];
    if (empurrar) empurrar.aluno_id = new ObjectId(empurrar.aluno_id);
    if (retirar) retirar.aluno_id = new ObjectId(retirar.aluno_id);

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
        const { aluno_id, turma_id, bimestre } = req.body;

        const invalido = validarIdentificadores({ aluno_id, turma_id, bimestre });
        if (invalido)
            return res.status(422).json({ message: invalido });

        try {
            const cadastro = await buscarCadastro({ aluno_id, turma_id, bimestre: Number(bimestre) });
            if (cadastro.erro)
                return res.status(422).json({ message: cadastro.erro });

            const { turma, disciplinas, simulados } = cadastro;
            const { estado, bloqueios: bloqueiosDosIds } = montarEstadoDaConfirmacao({
                payload: req.body,
                disciplinas,
                simulados,
                aluno_id,
                bimestre: Number(bimestre),
            });

            const alunosDaTurma = await Usuario.find({ _id: { $in: turma.alunos } });
            const { bloqueios, avisos } = validarConferencia(estado);
            const bloqueiosDaTurma = validarOutrosAlunos({
                estado,
                simulados,
                aluno_id,
                nomesDosAlunos: new Map(alunosDaTurma.map(({ _id, nome }) => [String(_id), nome])),
            });

            const todos = [...bloqueiosDosIds, ...bloqueios, ...bloqueiosDaTurma];
            if (todos.length > 0)
                return res.status(422).json({ message: 'A importação tem problemas que precisam ser corrigidos.', bloqueios: todos, avisos });

            const { operacoes, contagem } = montarOperacoes({ estado, aluno_id });
            if (operacoes.length > 0)
                await Simulado.bulkWrite(operacoes.map(paraObjectId));

            const trocadas = (req.body.colunas ?? []).filter(({ trocada }) => trocada);
            if (trocadas.length > 0) {
                await MapeamentoColuna.bulkWrite(trocadas.map(({ cabecalho, turma_disciplina_id }) => ({
                    updateOne: {
                        filter: { turma_id: new ObjectId(turma_id), cabecalho },
                        update: { $set: { turma_disciplina_id: new ObjectId(turma_disciplina_id) } },
                        upsert: true,
                    },
                })));
            }

            return res.status(200).json({ message: 'Notas importadas com sucesso', ...contagem });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao importar as notas', error: error.message });
        }
    }
}
