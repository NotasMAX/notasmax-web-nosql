import Simulado from '../Models/Simulado.js';
import Turmas from '../Models/Turma.js';
import './TurmasController.js';
import { Types } from 'mongoose';
import TurmasController from './TurmasController.js';

async function validarPesosDoBimestre({ turma_id, bimestre, conteudos, excluirSimuladoId }) {
    const filtro = { turma_id, bimestre };
    if (excluirSimuladoId) {
        filtro._id = { $ne: excluirSimuladoId };
    }

    const simuladosDoBimestre = await Simulado.find(filtro)
        .select("conteudos.turma_disciplina_id conteudos.peso")
        .lean();
    const pesosUsados = new Map();

    simuladosDoBimestre.forEach((simulado) => {
        (simulado.conteudos || []).forEach((conteudo) => {
            const disciplinaId = String(conteudo.turma_disciplina_id);
            pesosUsados.set(
                disciplinaId,
                (pesosUsados.get(disciplinaId) || 0) + Number(conteudo.peso ?? 1)
            );
        });
    });

    for (const conteudo of conteudos) {
        const disciplinaId = String(conteudo.turma_disciplina_id);
        const pesoAtual = Number(conteudo.peso ?? 1);
        const pesoUsado = pesosUsados.get(disciplinaId) || 0;

        if (!Number.isFinite(pesoAtual) || pesoAtual <= 0 || pesoAtual > 100) {
            return "O peso de cada disciplina deve estar entre 1% e 100%.";
        }

        if (pesoUsado + pesoAtual > 100) {
            const nomeDisciplina = typeof conteudo.materia === "string"
                ? conteudo.materia
                : conteudo.materia?.nome || disciplinaId;
            return `O peso da disciplina ${nomeDisciplina} ultrapassa o limite de 100% no bimestre.`;
        }

        pesosUsados.set(disciplinaId, pesoUsado + pesoAtual);
    }

    return null;
}

export default class SimuladosController {
    static async create(req, res) {
        const {
            numero,
            conteudos,
            tipo,
            bimestre,
            data_realizacao,
            turma_id } = req.body;

        if (!numero)
            return res.status(422).json({ message: "Informe o número do simulado" });
        if (!tipo)
            return res.status(422).json({ message: "Informe o tipo do simulado" });
        if (!bimestre)
            return res.status(422).json({ message: "Informe o bimestre" });
        if (!data_realizacao)
            return res.status(422).json({ message: "Informe a data de realização" });
        if (!turma_id)
            return res.status(422).json({ message: "Informe a turma" });

        try {
            const existingSimulado = await Simulado.findOne({ numero, bimestre, turma_id });
            if (existingSimulado) {
                return res.status(422).json({ message: "Já existe um simulado com este número e bimestre para a turma" });
            }
            if (!conteudos || conteudos.length <= 0)
                return res.status(422).json({ message: "Informe as disciplinas." });

            const turmaExists = await TurmasController.BuscarTurma({ _id: turma_id });
            if (!turmaExists)
                return res.status(422).json({ message: "Turma não encontrada" });

            const erroPeso = await validarPesosDoBimestre({ turma_id, bimestre, conteudos });
            if (erroPeso) {
                return res.status(422).json({ message: erroPeso });
            }

            const simulado = new Simulado({
                numero,
                tipo,
                bimestre,
                data_realizacao,
                turma_id,
                conteudos,
            })

            const simuladoSave = await simulado.save();
            res.status(200).json({ message: 'Sucesso ao inserir o simulado', simulado: simuladoSave });

        } catch (error) {
            res.status(500).json({ message: 'erro ao inserir simulado', error });
        }
    }

    static async getAll(req, res) {

        try {
            const simulados = await Simulado.find({}).sort("+createdAt");
            res.status(200).json({ simulados });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar simulados', error })
        }

    }

    static async getOneSimple(req, res) {
        const id = req.params.id;
        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(id))
            return res.status(422).json({ message: "Id de simulado invalido", id });
        try {
            const simulado = await Simulado.findById(id);
            if (!simulado)
                return res.status(404).json({ message: 'Simulado não encontrado' });
            res.status(200).json({ simulado });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar simulado', error });
        }
    }

    static async getOne(req, res) {
        const id = req.params.id;
        const ObjectId = Types.ObjectId;

        if (!ObjectId.isValid(id))
            return res.status(422).json({ message: "Id de simulado invalido", id });

        try {
            const simulado = await Simulado.aggregate([
                { $match: { _id: new ObjectId(id) } },
                {
                    $lookup: {
                        from: 'turmas',
                        localField: 'turma_id',
                        foreignField: '_id',
                        as: 'turma'
                    }
                },
                { $unwind: { path: "$turma", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField:
                            'turma.alunos',
                        foreignField: '_id',
                        as: 'turma.alunosDetalhes'
                    }
                },
                {
                    $unwind: {
                        path: "$conteudos", preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'turmadisciplinas',
                        localField: 'conteudos.turma_disciplina_id',
                        foreignField: '_id',
                        as: 'conteudos.turma_disciplina'
                    }
                },
                { $unwind: { path: "$conteudos.turma_disciplina", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: { simulado_id: "$_id", conteudo_id: "$conteudos._id" },
                        numero: { $first: "$numero" },
                        tipo: { $first: "$tipo" },
                        bimestre: { $first: "$bimestre" },
                        data_realizacao: { $first: "$data_realizacao" },
                        turma: { $first: "$turma" },
                        conteudo: {
                            $first: {
                                _id: "$conteudos._id",
                                turma_disciplina_id: "$conteudos.turma_disciplina_id",
                                turma_disciplina: {
                                    _id: "$conteudos.turma_disciplina._id",
                                    turma_id: "$conteudos.turma_disciplina.turma_id",
                                    professor_id: "$conteudos.turma_disciplina.professor_id",
                                    materia_id: "$conteudos.turma_disciplina.materia_id"
                                },
                                quantidade_questoes: "$conteudos.quantidade_questoes",
                                peso: "$conteudos.peso",
                                resultados: "$conteudos.resultados"
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id.simulado_id",
                        numero: { $first: "$numero" },
                        tipo: { $first: "$tipo" },
                        bimestre: { $first: "$bimestre" },
                        data_realizacao: { $first: "$data_realizacao" },
                        turma: { $first: "$turma" },
                        conteudos: { $push: "$conteudo" }
                    }
                },
                {
                    $addFields: {
                        "turma.alunos": {
                            $map: {
                                input: "$turma.alunosDetalhes",
                                as: "aluno",
                                in: {
                                    _id: "$$aluno._id",
                                    nome: "$$aluno.nome",
                                    email: "$$aluno.email",
                                    resultados: {
                                        $map: {
                                            input: "$conteudos",
                                            as: "conteudo",
                                            in: {
                                                conteudo_id: "$$conteudo._id",
                                                disciplina: "$$conteudo.turma_disciplina.materia_id", // ou outro campo se quiser nome depois de outro lookup
                                                quantidade_questoes: "$$conteudo.quantidade_questoes",
                                                resultado: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: "$$conteudo.resultados",
                                                                cond: { $eq: [ "$$this.aluno_id", "$$aluno._id" ] }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        numero: 1,
                        tipo: 1,
                        bimestre: 1,
                        data_realizacao: 1,
                        turma: { _id: 1, ano: 1, serie: 1, alunos: 1 },
                        conteudos: 1,
                        createdAt: 1
                    }
                }
            ]);

            if (!simulado || simulado.length === 0)
                return res.status(404).json({ message: 'Simulado não encontrado' });

            res.status(200).json({ simulado: simulado[ 0 ] });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar simulado', error: error.message });
        }
    }

    static async getByTurma(req, res) {

        const id = req.params.turma_id;
        const ObjectId = Types.ObjectId;

        if (!ObjectId.isValid(id))
            return res.status(422).json({ message: "Id de simulado invalido", id });

        try {

            const simulados = await Simulado.find({ turma_id: id });
            res.status(200).json({ simulados });

        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar simulado por turma', error });
        }
    }

    static async getByAlunoAndBimestre(req, res) {
        const aluno_id = req.params.aluno;
        const simulado_id = req.params.simulado;
        const bimestre = Number(req.params.bimestre); // Converter para número

        const ObjectId = Types.ObjectId;

        if (!ObjectId.isValid(aluno_id))
            return res.status(422).json({ message: "Id de Aluno inválido", aluno_id });

        if (!ObjectId.isValid(simulado_id))
            return res.status(422).json({ message: "Id de Simulado inválido", simulado_id });

        if (!bimestre || isNaN(bimestre) || bimestre <= 0)
            return res.status(422).json({ message: "Informe um bimestre válido (número positivo)" });

        const turma_id = await Simulado.findOne({ _id: simulado_id }).then(s => s ? s.turma_id : null);

        try {
            const simulados = await Simulado.aggregate([
                {
                    $match: {
                        "conteudos.resultados.aluno_id": new ObjectId(aluno_id),
                        bimestre: bimestre,
                        turma_id: turma_id
                    }
                },
                {
                    $lookup: {
                        from: 'turmas',
                        localField: 'turma_id',
                        foreignField: '_id',
                        as: 'turma'
                    }
                },
                { $unwind: '$turma' },
                { $unwind: '$conteudos' },
                {
                    $lookup: {
                        from: 'turmadisciplinas',
                        localField: 'conteudos.turma_disciplina_id',
                        foreignField: '_id',
                        as: 'conteudos.turma_disciplina'
                    }
                },
                { $unwind: { path: '$conteudos.turma_disciplina', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'materias',
                        localField: 'conteudos.turma_disciplina.materia_id',
                        foreignField: '_id',
                        as: 'conteudos.turma_disciplina.materia'
                    }
                },
                { $unwind: { path: '$conteudos.turma_disciplina.materia', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'conteudos.turma_disciplina.professor_id',
                        foreignField: '_id',
                        as: 'conteudos.turma_disciplina.professor'
                    }
                },
                { $unwind: { path: '$conteudos.turma_disciplina.professor', preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        "conteudos.resultado_aluno": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$conteudos.resultados",
                                        cond: { $eq: [ "$$this.aluno_id", new ObjectId(aluno_id) ] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        numero: { $first: "$numero" },
                        tipo: { $first: "$tipo" },
                        bimestre: { $first: "$bimestre" },
                        data_realizacao: { $first: "$data_realizacao" },
                        turma: { $first: "$turma" },
                        conteudos: {
                            $push: {
                                turma_disciplina: {
                                    _id: "$conteudos.turma_disciplina._id",
                                    turma_id: "$conteudos.turma_disciplina.turma_id",
                                    professor_id: "$conteudos.turma_disciplina.professor_id",
                                    professor: "$conteudos.turma_disciplina.professor.nome",
                                    materia_id: "$conteudos.turma_disciplina.materia_id",
                                    materia: "$conteudos.turma_disciplina.materia.nome",
                                },
                                quantidade_questoes: "$conteudos.quantidade_questoes",
                                peso: "$conteudos.peso",
                                resultado: "$conteudos.resultado_aluno"
                            }
                        }
                    }
                },
                { $sort: { data_realizacao: -1, numero: -1 } }
            ]);
            res.status(200).json({ simulados });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar simulado por aluno', error: error.message });
        }
    }

    static async findSimuladoByAlunoId(id, turma_id) {
        return await Simulado.find({
            turma_id: turma_id,
            "conteudos.resultados.aluno_id": id
        });;
    }

    static async findSimuladoByDisciplinaId(id) {
        return await Simulado.find({
            "conteudos.turma_disciplina_id": id
        });;
    }

    static async findSimuladoByBimestreAnoSerie(req, res) {
        const { bimestre, ano, serie } = req.params;

        const bimestreNum = Number(bimestre);
        const anoNum = Number(ano);
        const serieNum = serie !== undefined ? Number(serie) : null;

        if (!bimestre || isNaN(bimestreNum) || bimestreNum <= 0)
            return res.status(422).json({ message: "Informe um bimestre válido (número positivo)" });
        if (!ano || isNaN(anoNum) || anoNum <= 0)
            return res.status(422).json({ message: "Informe um ano válido (número positivo)" });

        try {
            if (serie !== "undefined") {
                const simulados = await Simulado.aggregate([
                    { $match: { bimestre: bimestreNum } },
                    { $lookup: { from: 'turmas', localField: 'turma_id', foreignField: '_id', as: 'turma' } },
                    { $unwind: '$turma' },
                    { $match: { 'turma.serie': serieNum, 'turma.ano': anoNum } },
                    { $project: { turma: 1, numero: 1, tipo: 1, bimestre: 1, data_realizacao: 1, conteudos: 1, createdAt: 1 } },
                    { $sort: { 'turma.serie': 1, numero: 1 } }
                ]);
                return res.status(200).json({ simulados });
            }
            const simulados = await Simulado.aggregate([
                { $match: { bimestre: bimestreNum } },
                { $lookup: { from: 'turmas', localField: 'turma_id', foreignField: '_id', as: 'turma' } },
                { $unwind: '$turma' },
                { $match: { 'turma.ano': anoNum } },
                { $project: { turma: 1, numero: 1, tipo: 1, bimestre: 1, data_realizacao: 1, conteudos: 1, createdAt: 1 } },
                { $sort: { 'turma.serie': 1, numero: 1 } }
            ]);
            return res.status(200).json({ simulados });
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar simulados", error });
        }
    }

    static async update(req, res) {
        const {
            numero,
            conteudos,
            tipo,
            bimestre,
            data_realizacao,
            turma_id } = req.body;

        if (!numero)
            return res.status(422).json({ message: "Informe o número do simulado" });
        if (!tipo)
            return res.status(422).json({ message: "Informe o tipo do simulado" });
        if (!bimestre)
            return res.status(422).json({ message: "Informe o bimestre" });
        if (!data_realizacao)
            return res.status(422).json({ message: "Informe a data de realização" });
        if (!turma_id)
            return res.status(422).json({ message: "Informe a turma" });

        try {

            const existingSimulado = await Simulado.findOne({ _id: req.params.id });
            if (!existingSimulado) {
                return res.status(422).json({ message: "Simulado não existe" });
            }

            const existingSimuladoNumero = await Simulado.findOne({ numero, bimestre, turma_id });
            if (existingSimuladoNumero && existingSimuladoNumero._id.toString() !== req.params.id) {
                return res.status(422).json({ message: "Já existe um simulado com este número e bimestre para a turma" });
            }

            if (!conteudos || conteudos.length <= 0)
                return res.status(422).json({ message: "Informe as disciplinas." });

            const erroPeso = await validarPesosDoBimestre({
                turma_id,
                bimestre,
                conteudos,
                excluirSimuladoId: req.params.id
            });
            if (erroPeso) {
                return res.status(422).json({ message: erroPeso });
            }

            const simuladoupdate = await Simulado.findByIdAndUpdate(req.params.id, {
                numero,
                tipo,
                bimestre,
                data_realizacao,
                turma_id,
                conteudos,
            }, { new: true });

            res.status(200).json({ message: 'Sucesso ao atualizar o simulado', simulado: simuladoupdate });

        } catch (error) {
            res.status(500).json({ message: 'erro ao atualizar simulado', error });
        }
    }

    static async getSimuladosByTurma(req, res) {
        try {
            const id = req.params.id;
            const ObjectId = Types.ObjectId;

            if (!ObjectId.isValid(id))
                return res.status(422).json({ message: "Id da turma invalido", id });

            const turmaExists = await TurmasController.BuscarTurma({ _id: id });

            if (!turmaExists)
                return res.status(422).json({ message: "Turma não encontrada" });

            const simulados = await Simulado.find().where({ turma_id: id });

            if (!simulados || simulados.length === 0)
                return res.status(404).json({ message: 'Simulados não encontrados.' });

            res.status(200).json({ simulados });

        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar simulado', error });
        }
    }

    static async atualizarConteudos(req, res) {
        const { conteudos } = req.body;

        if (!conteudos || conteudos.length <= 0)
            return res.status(422).json({ message: "Informe os conteúdos com os resultados." });
        try {
            const simulado = await Simulado.findById(req.params.id);
            if (!simulado)
                return res.status(404).json({ message: 'Simulado não encontrado...' });

            const simuladoAtualizado = await Simulado.findByIdAndUpdate(req.params.id, {
                conteudos: conteudos
            }, { new: true });

            res.status(200).json({ message: 'Notas atualizadas com sucesso', simulado: simuladoAtualizado });

        } catch (error) {
            res.status(500).json({ message: 'Erro ao adicionar resultados', error });
        }

    }

    static async getByAluno(req, res) {
        const aluno_id = req.params.aluno;
        const ObjectId = Types.ObjectId;

        if (!ObjectId.isValid(aluno_id))
            return res.status(422).json({ message: "Id de Aluno inválido", aluno_id });

        try {
            const simulados = await Simulado.aggregate([
                {
                    $match: {
                        "conteudos.resultados.aluno_id": new ObjectId(aluno_id),
                    }
                },
                { $unwind: '$conteudos' },
                {
                    $lookup: {
                        from: 'turmadisciplinas',
                        localField: 'conteudos.turma_disciplina_id',
                        foreignField: '_id',
                        as: 'conteudos.turma_disciplina'
                    }
                },
                { $unwind: { path: '$conteudos.turma_disciplina', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'materias',
                        localField: 'conteudos.turma_disciplina.materia_id',
                        foreignField: '_id',
                        as: 'conteudos.turma_disciplina.materia'
                    }
                },
                { $unwind: { path: '$conteudos.turma_disciplina.materia', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'conteudos.turma_disciplina.professor_id',
                        foreignField: '_id',
                        as: 'conteudos.turma_disciplina.professor'
                    }
                },
                { $unwind: { path: '$conteudos.turma_disciplina.professor', preserveNullAndEmptyArrays: true } },
                // Extrai apenas o resultado do aluno solicitado
                {
                    $addFields: {
                        "conteudos.resultado_aluno": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$conteudos.resultados",
                                        cond: { $eq: [ "$$this.aluno_id", new ObjectId(aluno_id) ] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                // Remonta cada simulado agrupando as matérias já formatadas
                {
                    $group: {
                        _id: "$_id",
                        numero: { $first: "$numero" },
                        tipo: { $first: "$tipo" },
                        bimestre: { $first: "$bimestre" },
                        data_realizacao: { $first: "$data_realizacao" },
                        materias: {
                            $push: {
                                materia_id: "$conteudos.turma_disciplina.materia_id",
                                materia: "$conteudos.turma_disciplina.materia.nome",
                                professor: "$conteudos.turma_disciplina.professor.nome",
                                quantidade_questoes: "$conteudos.quantidade_questoes",
                                acertos: "$conteudos.resultado_aluno.acertos",
                                nota: "$conteudos.resultado_aluno.nota"
                            }
                        }
                    }
                },
                // Calcula a média do simulado (média simples das notas das matérias)
                {
                    $addFields: {
                        media_simulado: { $avg: "$materias.nota" }
                    }
                },
                { $sort: { bimestre: 1, numero: 1 } },
                // Agrupa tudo em um único documento para calcular médias gerais
                {
                    $group: {
                        _id: null,
                        simulados: {
                            $push: {
                                id: "$_id",
                                numero: "$numero",
                                tipo: "$tipo",
                                bimestre: "$bimestre",
                                data_realizacao: "$data_realizacao",
                                media_simulado: "$media_simulado",
                                materias: "$materias"
                            }
                        },
                        // Junta todas as notas de todos os simulados para calcular médias por matéria
                        todas_materias: { $push: "$materias" }
                    }
                },
                // Desconstrói o array de arrays em array plano para calcular média por matéria
                {
                    $addFields: {
                        todas_materias: {
                            $reduce: {
                                input: "$todas_materias",
                                initialValue: [],
                                in: { $concatArrays: [ "$$value", "$$this" ] }
                            }
                        }
                    }
                },
                // Agrupa por matéria para calcular média individual
                {
                    $addFields: {
                        media_por_materia: {
                            $map: {
                                input: {
                                    $reduce: {
                                        input: "$todas_materias",
                                        initialValue: [],
                                        in: {
                                            $cond: [
                                                { $in: [ "$$this.materia_id", "$$value.materia_id" ] },
                                                "$$value",
                                                { $concatArrays: [ "$$value", [ "$$this" ] ] }
                                            ]
                                        }
                                    }
                                },
                                as: "mat_unica",
                                in: {
                                    materia_id: "$$mat_unica.materia_id",
                                    materia: "$$mat_unica.materia",
                                    professor: "$$mat_unica.professor",
                                    simulados_realizados: {
                                        $size: {
                                            $filter: {
                                                input: "$todas_materias",
                                                cond: { $eq: [ "$$this.materia_id", "$$mat_unica.materia_id" ] }
                                            }
                                        }
                                    },
                                    media: {
                                        $avg: {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: "$todas_materias",
                                                        cond: { $eq: [ "$$this.materia_id", "$$mat_unica.materia_id" ] }
                                                    }
                                                },
                                                as: "r",
                                                in: "$$r.nota"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // Calcula a média geral (média de todas as notas de todos os simulados)
                {
                    $addFields: {
                        media_geral: { $avg: "$todas_materias.nota" }
                    }
                },
                // Formata o documento final
                {
                    $project: {
                        _id: 0,
                        aluno_id: { $toString: new ObjectId(aluno_id) },
                        media_geral: { $round: [ "$media_geral", 2 ] },
                        media_por_materia: 1,
                        simulados: 1
                    }
                }
            ]);

            const result = simulados[ 0 ] ?? {
                aluno_id,
                media_geral: 0,
                media_por_materia: [],
                simulados: []
            };

            res.status(200).json(result);

        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar notas do aluno', error: error.message });
        }
    }

    static async getDesempenhoByDisciplina(req, res) {
        // existing method unchanged
        const disciplina_id = req.params.disciplina;
        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(disciplina_id))
            return res.status(422).json({ message: "Id de disciplina invalido", disciplina_id });

        try {
            const dataAtual = new Date();
            // Etapa 1: Buscar todos os simulados da disciplina com notas
            const simulados = await Simulado.aggregate([
                { $match: { "conteudos.turma_disciplina_id": new ObjectId(disciplina_id), data_realizacao: { $lt: dataAtual } } },
                { $unwind: "$conteudos" },
                { $match: { "conteudos.turma_disciplina_id": new ObjectId(disciplina_id) } },
                { $unwind: "$conteudos.resultados" },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'conteudos.resultados.aluno_id',
                        foreignField: '_id',
                        as: 'aluno_info'
                    }
                },
                { $unwind: { path: "$aluno_info", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        simulado_id: "$_id",
                        numero: "$numero",
                        aluno_id: "$conteudos.resultados.aluno_id",
                        aluno_nome: "$aluno_info.nome",
                        nota: "$conteudos.resultados.nota"
                    }
                }
            ]);

            if (!simulados || simulados.length === 0)
                return res.status(404).json({ message: 'Simulados não encontrados' });

            // Processar dados para formato final
            const mapaAlunos = {};
            const mapaSimuladoMedia = {};
            const todasAsNotas = [];

            simulados.forEach(doc => {
                const alunoId = doc.aluno_id.toString();
                const simuladoId = doc.simulado_id.toString();

                // Acumular notas dos alunos
                if (!mapaAlunos[ alunoId ]) {
                    mapaAlunos[ alunoId ] = {
                        id: doc.aluno_id,
                        nome: doc.aluno_nome,
                        notas: []
                    };
                }
                mapaAlunos[ alunoId ].notas.push(doc.nota);
                todasAsNotas.push(doc.nota);

                // Acumular notas por simulado
                if (!mapaSimuladoMedia[ simuladoId ]) {
                    mapaSimuladoMedia[ simuladoId ] = {
                        simulado_id: doc.simulado_id,
                        numero_simulado: doc.numero,
                        notas: []
                    };
                }
                mapaSimuladoMedia[ simuladoId ].notas.push(doc.nota);
            });

            // Calcular médias dos alunos
            const alunos = Object.values(mapaAlunos).map(aluno => ({
                id: aluno.id,
                nome: aluno.nome,
                media: aluno.notas.reduce((a, b) => a + b, 0) / aluno.notas.length
            }));

            // Calcular médias dos simulados
            const notasSimulados = Object.values(mapaSimuladoMedia).map(sim => ({
                simulado_id: sim.simulado_id,
                numero_simulado: sim.numero_simulado,
                media: sim.notas.reduce((a, b) => a + b, 0) / sim.notas.length
            }));

            // Calcular média geral
            const mediaGeral = todasAsNotas.length > 0 ? todasAsNotas.reduce((a, b) => a + b, 0) / todasAsNotas.length : 0;

            // Calcular distribuição
            const mediasAlunos = alunos.map(a => a.media);
            const distribuicao = [
                { faixa: "<5", quantidade: mediasAlunos.filter(m => m < 5).length },
                { faixa: "5-7", quantidade: mediasAlunos.filter(m => m >= 5 && m < 7).length },
                { faixa: ">7", quantidade: mediasAlunos.filter(m => m >= 7).length }
            ];

            const resposta = {
                alunos,
                simulados: {
                    media: mediaGeral,
                    notas: notasSimulados
                },
                distribuicao
            };

            res.status(200).json(resposta);

        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar simulado', error: error.message });
        }
    }

    static async getDesempenhoByAnoAndAluno(req, res) {
        const aluno_id = req.params.aluno;
        const ano = req.params.ano;

        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(aluno_id))
            return res.status(422).json({ message: "Id de aluno invalido", aluno_id });
        if (!ano || isNaN(Number(ano)) || Number(ano) <= 0)
            return res.status(422).json({ message: "Informe um ano válido (número positivo)", ano });

        try {
            const dataAtual = new Date();
            const turmas = await Turmas.find({ ano: Number(ano) });
            if (!turmas || turmas.length === 0) {
                return res.status(200).json({
                    materias: [],
                    simulados: []
                });
            }

            const turmaIds = turmas.map(turma => turma._id);

            const simulados = await Simulado.aggregate([
                { $match: { turma_id: { $in: turmaIds }, data_realizacao: { $lt: dataAtual } } },
                { $unwind: "$conteudos" },
                { $unwind: "$conteudos.resultados" },
                { $match: { "conteudos.resultados.aluno_id": new ObjectId(aluno_id) } },
                {
                    $lookup: {
                        from: 'turmadisciplinas',
                        localField: 'conteudos.turma_disciplina_id',
                        foreignField: '_id',
                        as: 'turma_disciplina'
                    }
                },
                { $unwind: { path: "$turma_disciplina", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'materias',
                        localField: 'turma_disciplina.materia_id',
                        foreignField: '_id',
                        as: 'materia'
                    }
                },
                { $unwind: { path: "$materia", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        simulado_id: "$_id",
                        numero: "$numero",
                        data: "$data_realizacao",
                        materia_id: "$materia._id",
                        materia_nome: "$materia.nome",
                        nota: "$conteudos.resultados.nota"
                    }
                }
            ]);

            if (!simulados || simulados.length === 0) {
                return res.status(200).json({
                    materias: [],
                    simulados: []
                });
            }

            const materiasMap = {};
            const simuladosMap = {};

            simulados.forEach(item => {
                const materiaId = item.materia_id ? item.materia_id.toString() : 'unknown';
                const simuladoId = item.simulado_id.toString();

                if (!materiasMap[ materiaId ]) {
                    materiasMap[ materiaId ] = {
                        nome: item.materia_nome || 'Desconhecida',
                        notas: []
                    };
                }
                materiasMap[ materiaId ].notas.push(item.nota);

                if (!simuladosMap[ simuladoId ]) {
                    simuladosMap[ simuladoId ] = {
                        numero: item.numero,
                        data: item.data,
                        notas: []
                    };
                }
                simuladosMap[ simuladoId ].notas.push(item.nota);
            });

            const materias = Object.values(materiasMap).map(m => ({
                nome: m.nome,
                media: Number((m.notas.reduce((a, b) => a + b, 0) / m.notas.length).toFixed(2))
            }));

            const simuladosResult = Object.values(simuladosMap).map(s => ({
                numero: s.numero,
                media: Number((s.notas.reduce((a, b) => a + b, 0) / s.notas.length).toFixed(2)),
                data: s.data
            }));

            return res.status(200).json({
                materias,
                simulados: simuladosResult
            });

        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar desempenho", error });
        }
    }

    static async getDesempenhoAlunoBySimulado(req, res) {
        const simulado_id = req.params.simulado;
        const aluno_id = req.params.aluno;

        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(simulado_id))
            return res.status(422).json({ message: "Id de simulado invalido", simulado_id });
        if (!ObjectId.isValid(aluno_id))
            return res.status(422).json({ message: "Id de aluno invalido", aluno_id });

        try {
            const simulado = await Simulado.aggregate([
                { $match: { _id: new ObjectId(simulado_id) } },
                {
                    $unwind: {
                        path: "$conteudos",
                        includeArrayIndex: "conteudo_index"
                    }
                },
                {
                    $lookup: {
                        from: 'turmadisciplinas',
                        localField: 'conteudos.turma_disciplina_id',
                        foreignField: '_id',
                        as: 'turma_disciplina'
                    }
                },
                { $unwind: { path: "$turma_disciplina", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'materias',
                        localField: 'turma_disciplina.materia_id',
                        foreignField: '_id',
                        as: 'materia'
                    }
                },
                { $unwind: { path: "$materia", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        resultado_aluno: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$conteudos.resultados",
                                        cond: { $eq: [ "$$this.aluno_id", new ObjectId(aluno_id) ] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        numero: { $first: "$numero" },
                        data_realizacao: { $first: "$data_realizacao" },
                        disciplinas: {
                            $push: {
                                ordem: "$conteudo_index",
                                materia_nome: "$materia.nome",
                                nota: "$resultado_aluno.nota"
                            }
                        }
                    }
                }
            ]);

            if (!simulado || simulado.length === 0) {
                return res.status(404).json({ message: 'Simulado não encontrado' });
            }

            const disciplinas = simulado[ 0 ].disciplinas
                .filter(item => item.materia_nome !== undefined && item.nota !== undefined && item.nota !== null)
                .sort((a, b) => a.ordem - b.ordem)
                .map(item => ({
                    materia_nome: item.materia_nome,
                    nota: item.nota
                }));

            const media = disciplinas.length > 0
                ? disciplinas.reduce((soma, disciplina) => soma + disciplina.nota, 0) / disciplinas.length
                : 0;

            return res.status(200).json({
                numero: simulado[ 0 ].numero,
                data_realizacao: simulado[ 0 ].data_realizacao,
                media: Number(media.toFixed(2)),
                disciplinas
            });

        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar desempenho", error });
        }
    }

    static async getSimuladosByAnoAndAluno(req, res) {
        const aluno_id = req.params.aluno;
        const ano = req.params.ano;

        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(aluno_id))
            return res.status(422).json({ message: "Id de aluno invalido", aluno_id });
        if (!ano || isNaN(Number(ano)) || Number(ano) <= 0)
            return res.status(422).json({ message: "Informe um ano válido (número positivo)", ano });

        try {
            // 1. Encontrar a turma do aluno no ano especificado
            const turmaDoAluno = await Turmas.findOne({
                ano: Number(ano),
                alunos: new ObjectId(aluno_id)
            });

            if (!turmaDoAluno) {
                return res.status(200).json({ simulados: [] });
            }

            // 2. Buscar todos os simulados cadastrados nessa turma (incluindo futuros)
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const simulados = await Simulado.find({
                turma_id: turmaDoAluno._id
            }).sort({
                data_realizacao: 1,
                numero: 1
            });
            // 3. Calcular a média do aluno para cada simulado
            const resultado = simulados.map(sim => {
                const notasAluno = [];

                if (Array.isArray(sim.conteudos)) {
                    sim.conteudos.forEach(conteudo => {
                        if (Array.isArray(conteudo.resultados)) {
                            conteudo.resultados.forEach(r => {
                                if (r.aluno_id && r.aluno_id.toString() === aluno_id.toString()) {
                                    if (typeof r.nota === 'number') notasAluno.push(r.nota);
                                }
                            });
                        }
                    });
                }

                const media = notasAluno.length > 0 ? (notasAluno.reduce((a, b) => a + b, 0) / notasAluno.length) : 0;

                return {
                    id: sim._id,
                    numero: sim.numero,
                    data_realizacao: sim.data_realizacao,
                    media: Number(media.toFixed(2))
                };
            });

            return res.status(200).json({ simulados: resultado });

        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar desempenho", error });
        }
    }

    static async getCalendarioByAluno(req, res) {
        const aluno_id = req.params.aluno;
        const anoAtual = new Date().getFullYear();

        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(aluno_id))
            return res.status(422).json({ message: "Id de aluno invalido", aluno_id });

        try {
            const turmaDoAluno = await Turmas.findOne({
                ano: anoAtual,
                alunos: new ObjectId(aluno_id)
            });

            if (!turmaDoAluno) {
                return res.status(200).json({ simulados: [] });
            }

            const simulados = await Simulado.find({ turma_id: turmaDoAluno._id })
                .sort({ data_realizacao: 1, numero: 1 })
                .select({ numero: 1, data_realizacao: 1, tipo: 1, _id: 0 });

            return res.status(200).json({ simulados });

        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar calendário do aluno", error: error.message });
        }
    }
    // New route: Get professor data for current year
    static async getProfessorDataCurrentYear(req, res) {
        const professorId = req.params.professor;
        const ObjectId = Types.ObjectId;
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

        if (!ObjectId.isValid(professorId)) {
            return res.status(422).json({ message: "Id de professor inválido", professorId });
        }

        try {
            const data = await Simulado.aggregate([
                { $match: { data_realizacao: { $gte: startOfYear, $lte: new Date() } } },
                {
                    $lookup: {
                        from: 'turmas',
                        localField: 'turma_id',
                        foreignField: '_id',
                        as: 'turma'
                    }
                },
                { $unwind: { path: '$turma', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'turmadisciplinas',
                        localField: 'conteudos.turma_disciplina_id',
                        foreignField: '_id',
                        as: 'conteudos.turma_disciplina'
                    }
                },
                { $unwind: { path: '$conteudos.turma_disciplina', preserveNullAndEmptyArrays: true } },
                { $match: { 'conteudos.turma_disciplina.professor_id': new ObjectId(professorId) } },
                {
                    $lookup: {
                        from: 'materias',
                        localField: 'conteudos.turma_disciplina.materia_id',
                        foreignField: '_id',
                        as: 'materia'
                    }
                },
                { $unwind: { path: '$materia', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            turma_id: '$turma._id',
                            turma_serie: '$turma.serie',
                            disciplina_id: '$conteudos.turma_disciplina._id',
                            materia_nome: '$materia.nome'
                        },
                        simulados: { $push: { id: '$_id', numero: '$numero' } }
                    }
                },
                {
                    $group: {
                        _id: { turma_id: '$_id.turma_id', turma_serie: '$_id.turma_serie' },
                        disciplinas: {
                            $push: {
                                id: '$_id.disciplina_id',
                                materia_nome: '$_id.materia_nome',
                                simulados: '$simulados'
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        id: '$_id.turma_id',
                        serie: '$_id.turma_serie',
                        disciplinas: 1
                    }
                }
            ]);
            return res.status(200).json({ turmas: data });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Erro ao buscar dados do professor', error: error.message });
        }
    }

    static async getByProfessor(req, res) {

        const professor_id = req.params.professor;

        const ObjectId = Types.ObjectId;

        if (!ObjectId.isValid(professor_id))
            return res.status(422).json({ message: "Id de Professor inválido", professor_id });

        try {

            const simulados = await Simulado.aggregate([

                // ── 1. Abre cada conteúdo como documento próprio ──────────────
                { $unwind: { path: "$conteudos", preserveNullAndEmptyArrays: false } },

                // ── 2. Resolve TurmaDisciplina do conteúdo ────────────────────
                {
                    $lookup: {
                        from: "turmadisciplinas",
                        localField: "conteudos.turma_disciplina_id",
                        foreignField: "_id",
                        as: "turmaDisciplina",
                    },
                },
                { $unwind: "$turmaDisciplina" },

                // ── 3. Filtra apenas conteúdos do professor solicitado ─────────
                { $match: { "turmaDisciplina.professor_id": new ObjectId(professor_id) } },

                // ── 4. Resolve a matéria ───────────────────────────────────────
                {
                    $lookup: {
                        from: "materias",
                        localField: "turmaDisciplina.materia_id",
                        foreignField: "_id",
                        as: "materia",
                    },
                },
                { $unwind: "$materia" },

                // ── 5. Resolve dados da turma ─────────────────────────────────
                {
                    $lookup: {
                        from: "turmas",
                        localField: "turma_id",
                        foreignField: "_id",
                        as: "turma",
                    },
                },
                { $unwind: "$turma" },

                // ── 6. Abre cada resultado (nota por aluno) ───────────────────
                // preserveNullAndEmptyArrays: true mantém simulados sem resultados ainda lançados
                {
                    $unwind: {
                        path: "$conteudos.resultados",
                        preserveNullAndEmptyArrays: true,
                    },
                },

                // ── 7. Resolve dados do aluno ──────────────────────────────────
                {
                    $lookup: {
                        from: "usuarios",
                        localField: "conteudos.resultados.aluno_id",
                        foreignField: "_id",
                        as: "aluno",
                    },
                },
                {
                    $unwind: {
                        path: "$aluno",
                        preserveNullAndEmptyArrays: true,
                    },
                },

                // ── 8. Agrupa por (turma + matéria + aluno) ───────────────────
                //    → calcula média individual do aluno por matéria
                {
                    $group: {
                        _id: {
                            turma_id: "$turma._id",
                            materia_id: "$materia._id",
                            aluno_id: "$aluno._id",
                        },
                        turma_serie: { $first: "$turma.serie" },
                        turma_ano: { $first: "$turma.ano" },
                        turma_alunos: { $first: "$turma.alunos" },
                        materia_nome: { $first: "$materia.nome" },
                        aluno_nome: { $first: "$aluno.nome" },
                        aluno_email: { $first: "$aluno.email" },
                        media_aluno: { $avg: "$conteudos.resultados.nota" },
                        total_acertos_aluno: { $sum: "$conteudos.resultados.acertos" },
                        qtd_simulados_aluno: { $sum: 1 },
                        simulados_set: {
                            $addToSet: {
                                simulado_id: "$_id",
                                numero: "$numero",
                                tipo: "$tipo",
                                bimestre: "$bimestre",
                                data_realizacao: "$data_realizacao",
                            },
                        },
                    },
                },

                // ── 9. Agrupa por (turma + matéria) ───────────────────────────
                //    → monta desempenho de cada aluno + média geral da matéria
                {
                    $group: {
                        _id: {
                            turma_id: "$_id.turma_id",
                            materia_id: "$_id.materia_id",
                        },
                        turma_serie: { $first: "$turma_serie" },
                        turma_ano: { $first: "$turma_ano" },
                        turma_alunos_ids: { $first: "$turma_alunos" },
                        materia_nome: { $first: "$materia_nome" },
                        media_geral_materia: { $avg: "$media_aluno" },
                        desempenho_alunos: {
                            $push: {
                                aluno_id: "$_id.aluno_id",
                                nome: "$aluno_nome",
                                email: "$aluno_email",
                                media: { $round: [ "$media_aluno", 2 ] },
                                total_acertos: "$total_acertos_aluno",
                                total_simulados_realizados: "$qtd_simulados_aluno",
                            },
                        },
                        simulados_set: { $first: "$simulados_set" },
                    },
                },

                // ── 10. Agrupa por turma ───────────────────────────────────────
                //     → junta todas as matérias do professor + média geral da turma
                {
                    $group: {
                        _id: "$_id.turma_id",
                        turma_serie: { $first: "$turma_serie" },
                        turma_ano: { $first: "$turma_ano" },
                        turma_alunos_ids: { $first: "$turma_alunos_ids" },
                        media_geral_turma: { $avg: "$media_geral_materia" },
                        materias: {
                            $push: {
                                materia_id: "$_id.materia_id",
                                nome: "$materia_nome",
                                media_materia: { $round: [ "$media_geral_materia", 2 ] },
                                desempenho_alunos: "$desempenho_alunos",
                            },
                        },
                        simulados_aplicados: { $first: "$simulados_set" },
                    },
                },

                // ── 11. Projeta o shape final por turma ───────────────────────
                {
                    $project: {
                        _id: 0,
                        turma_id: "$_id",
                        serie: "$turma_serie",
                        ano: "$turma_ano",
                        total_alunos: { $size: { $ifNull: [ "$turma_alunos_ids", [] ] } },
                        media_geral_turma: { $round: [ "$media_geral_turma", 2 ] },
                        total_simulados_na_turma: { $size: "$simulados_aplicados" },
                        simulados_aplicados: 1,
                        materias: 1,
                    },
                },

                // ── 12. Agrupamento raiz: consolida tudo em um único objeto ───
                {
                    $group: {
                        _id: null,
                        turmas: { $push: "$$ROOT" },
                        total_turmas: { $sum: 1 },
                        total_simulados_aplicados: { $sum: "$total_simulados_na_turma" },
                        media_geral_todas_turmas: { $avg: "$media_geral_turma" },
                    },
                },

                // ── 13. Shape final da resposta ───────────────────────────────
                {
                    $project: {
                        _id: 0,
                        professor_id: { $literal: new ObjectId(professor_id) },
                        total_turmas: 1,
                        total_simulados_aplicados: 1,
                        media_geral_todas_turmas: { $round: [ "$media_geral_todas_turmas", 2 ] },
                        turmas: 1,
                    },
                },

            ]);

            // aggregate retorna array; professor sem simulados → retorno vazio padronizado
            if (!simulados.length) {
                return res.status(200).json({
                    professor_id,
                    total_turmas: 0,
                    total_simulados_aplicados: 0,
                    media_geral_todas_turmas: null,
                    turmas: [],
                });
            }

            return res.status(200).json(simulados[ 0 ]);

        } catch (error) {
            console.error("[SimuladoController.getByProfessor]", error);
            return res.status(500).json({
                message: "Erro interno ao buscar simulados do professor.",
                error: error.message,
            });
        }
    }



    static async getSimuladoDisciplinaAlunos(req, res) {
        const simulado_id = req.params.simulado_id;
        const disciplina_id = req.params.disciplina_id;
        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(simulado_id))
            return res.status(422).json({ message: "Id de simulado invalido", simulado_id });
        if (!ObjectId.isValid(disciplina_id))
            return res.status(422).json({ message: "Id de disciplina invalido", disciplina_id });
        try {
            const result = await Simulado.aggregate([
                { $match: { _id: new ObjectId(simulado_id), "conteudos.turma_disciplina_id": new ObjectId(disciplina_id) } },
                { $unwind: "$conteudos" },
                { $match: { "conteudos.turma_disciplina_id": new ObjectId(disciplina_id) } },
                { $unwind: "$conteudos.resultados" },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'conteudos.resultados.aluno_id',
                        foreignField: '_id',
                        as: 'aluno_info'
                    }
                },
                { $unwind: { path: '$aluno_info', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: null,
                        simulado_id: { $first: '$_id' },
                        turma_disciplina_id: { $first: '$conteudos.turma_disciplina_id' },
                        alunos: {
                            $push: {
                                id: '$aluno_info._id',
                                nome: '$aluno_info.nome',
                                acertos: '$conteudos.resultados.acertos',
                                nota: '$conteudos.resultados.nota',
                                quantidade_questoes: '$conteudos.quantidade_questoes'
                            }
                        }
                    }
                },
                { $project: { _id: 0 } }
            ]);
            if (!result || result.length === 0) return res.status(404).json({ message: 'Dados não encontrados' });
            res.status(200).json(result[ 0 ]);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar dados', error: error.message });
        }
    }

    // Save edited notes for a specific discipline within a simulado
    static async salvarNotas(req, res) {
        const simuladoId = req.params.simuladoId;
        const disciplinaId = req.params.disciplinaId;
        const alunos = req.body;

        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(simuladoId))
            return res.status(422).json({ message: "Id de simulado invalido", simuladoId });
        if (!ObjectId.isValid(disciplinaId))
            return res.status(422).json({ message: "Id de disciplina invalido", disciplinaId });

        try {
            const simulado = await Simulado.findOne({ _id: new ObjectId(simuladoId), "conteudos.turma_disciplina_id": new ObjectId(disciplinaId) });
            if (!simulado) return res.status(404).json({ message: "Simulado ou disciplina não encontrado" });

            const conteudo = simulado.conteudos.find(c => c.turma_disciplina_id?.toString() === disciplinaId);
            if (!conteudo) return res.status(404).json({ message: "Disciplina não encontrada no simulado" });

            const quantidadeQuestoes = conteudo.quantidade_questoes || 0;

            for (const aluno of alunos) {
                const resultado = conteudo.resultados.find(r => r.aluno_id?.toString() === aluno.id);
                if (resultado) {
                    if (typeof aluno.acertos !== "undefined") {
                        // Clamp acertos between 0 and quantidadeQuestoes
                        const acertosValidos = Math.min(Math.max(0, aluno.acertos), quantidadeQuestoes);
                        resultado.acertos = acertosValidos;

                        // Recalculate and update the grade based on clamped acertos
                        if (quantidadeQuestoes > 0) {
                            resultado.nota = Math.round(((acertosValidos / quantidadeQuestoes) * 10) * 100) / 100;
                        } else {
                            resultado.nota = 0;
                        }
                    }
                }
            }

            conteudo.markModified('resultados');
            await simulado.save();

            return res.status(200).json({ message: "Notas salvas com sucesso", simulado });
        } catch (error) {
            return res.status(500).json({ message: "Erro ao salvar notas", error: error.message });
        }
    }
}