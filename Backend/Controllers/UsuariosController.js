import Usuario from "../Models/Usuario.js";
import Turma from "../Models/Turma.js";
import Simulado from "../Models/Simulado.js";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";

const SENHA_PADRAO = "123"; //apenas para uso em testes

export default class UsuariosController {

    static async cadastrarProfessor(req, res) {
        try {
            const { nome, email, telefone_contato, senha } = req.body;

            const emailExistente = await Usuario.findOne({ email });
            if (emailExistente) {
                return res.status(409).json({ error: "Email já cadastrado." });
            }

            const senhaHash = await bcrypt.hash(SENHA_PADRAO, 12);

            const novoProfessor = await Usuario.create({
                nome,
                email,
                telefone_contato,
                senha: senhaHash,
                usa_senha_inicial: true,
                tipo_usuario: "professor"
            });

            return res.status(201).json({
                _id: novoProfessor._id,
                nome: novoProfessor.nome,
                email: novoProfessor.email,
                telefone_contato: novoProfessor.telefone_contato
            });

        } catch (error) {
            return res.status(500).json({ error: "Erro ao cadastrar professor." });
        }
    }

    static async cadastrarAluno(req, res) {
        try {
            const { nome, email, telefone_contato, senha, nome_responsavel, telefone_responsavel } = req.body;

            const emailExistente = await Usuario.findOne({ email });
            if (emailExistente) {
                return res.status(409).json({ error: "Email já cadastrado." });
            }

            // Criptografar senha com salt 12
            const senhaHash = await bcrypt.hash(SENHA_PADRAO, 12);

            const novoAluno = await Usuario.create({
                nome,
                email,
                telefone_contato,
                senha: senhaHash,
                usa_senha_inicial: true,
                nome_responsavel,
                telefone_responsavel,
                tipo_usuario: "aluno"
            });

            return res.status(201).json({
                _id: novoAluno._id,
                nome: novoAluno.nome,
                email: novoAluno.email,
                telefone_contato: novoAluno.telefone_contato,
                nome_responsavel: novoAluno.nome_responsavel,
                telefone_responsavel: novoAluno.telefone_responsavel
            });

        } catch (error) {
            return res.status(500).json({ error: "Erro ao cadastrar aluno." });
        }
    }

    static async listarProfessores(req, res) {
        try {
            const professores = await Usuario.find(
                { tipo_usuario: "professor" },
                "nome email telefone_contato"
            ).sort("nome");

            return res.status(200).json(professores);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar professores." });
        }
    }

    static async listarAlunos(req, res) {
        try {
            const alunos = await Usuario.find(
                { tipo_usuario: "aluno" },
                "nome email telefone_contato"
            ).sort("nome");
            return res.status(200).json(alunos);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar alunos." });
        }
    }

    static async getUsuario(req, res) {
        try {
            const id = req.params.id?.trim();
            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({ error: "ID inválido." });
            }

            const usuario = await Usuario.findById(id).select(
                "nome email telefone_contato nome_responsavel telefone_responsavel tipo_usuario foto"
            );


            if (!usuario) {
                return res.status(404).json({ error: "Usuário não encontrado." });
            }

            // Da foto, as telas só precisam saber se ela existe e quando mudou.
            const { tipo_usuario, foto, ...resto } = usuario.toObject();
            return res.status(200).json({ ...resto, foto_atualizada_em: foto?.atualizada_em ?? null });

        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar o usuário." });
        }
    }

    static async atualizarUsuario(req, res) {
        try {
            const id = req.params.id?.trim();
            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({ error: "ID inválido." });
            }

            const usuario = await Usuario.findById(id);

            if (!usuario) {
                return res.status(404).json({ error: "Usuário não encontrado." });
            }

            // A foto só muda pela rota de foto, que confere o arquivo e guarda no Blob Storage.
            const updates = { ...(req.body ?? {}) };
            delete updates.foto;
            delete updates.foto_atualizada_em;
            delete updates.usa_senha_inicial;

            if (updates.senha) {
                updates.senha = await bcrypt.hash(updates.senha, 12);
                updates.usa_senha_inicial = false;
            }

            const usuarioAtualizado = await Usuario.findByIdAndUpdate(
                id,
                updates,
                {
                    new: true,
                    runValidators: true,
                    fields: "nome email telefone_contato nome_responsavel telefone_responsavel"
                }
            );

            return res.status(200).json(usuarioAtualizado);

        } catch (error) {
            return res.status(500).json({ error: "Erro ao atualizar usuário." });
        }
    }

    static async getOne(req, res) {

        const id = req.params.id;
        const ObjectId = Types.ObjectId;
        if (!ObjectId.isValid(id)) {
            return res.status(422).json({ message: "ID do aluno inválido" });
        }
        try {
            const aluno = await Usuario.findById(id);
            if (!aluno) {
                return res.status(404).json({ message: "Aluno não encontrado." });
            }
            res.status(200).json(aluno);
        } catch (error) {
            res.status(500).json({ message: "Erro ao buscar o Aluno", error });
        }
    }

    static async getAlunoByNameOrEmail(req, res) {
        const { text } = req.query;
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return res.status(422).json({ message: "Texto de busca inválido" });
        }
        try {
            const alunos = await Usuario.find({ $or: [{ nome: { $regex: text, $options: "i" } }, { email: { $regex: text, $options: "i" } }] }).where({ tipo_usuario: "aluno" }).sort("nome");
            res.status(200).json({ alunos });
        } catch (error) {
            res.status(500).json({ message: "Erro ao buscar o Aluno", error });
        }
    }

    static async getProfessorByNameOrEmail(req, res) {
        const { text } = req.query;
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return res.status(422).json({ message: "Texto de busca inválido" });
        }
        try {
            const professores = await Usuario.find({ $or: [{ nome: { $regex: text, $options: "i" } }, { email: { $regex: text, $options: "i" } }] }).where({ tipo_usuario: "professor" }).sort("nome");
            res.status(200).json({ professores });
        } catch (error) {
            res.status(500).json({ message: "Erro ao buscar o Professor", error });
        }
    }

    static async findUsuarioById(id) {
        try {
            return await Usuario.findById(id);
        } catch (error) {
            throw error;
        }
    }

    static async getDesempenhoByAluno(req, res) {
        const alunoId = req.params.id;
        const { ano, turmaId, bimestre } = req.query;

        if (!Types.ObjectId.isValid(alunoId))
            return res.status(422).json({ message: "Aluno inválido" });

        try {
            const aluno = await Usuario.findById(alunoId);
            if (!aluno) return res.status(404).json({ message: "Aluno não encontrado" });

            const turmasAluno = await Turma.find({ alunos: aluno._id });

            let turmaNome = "Sem turma";
            let turmaAtual = turmasAluno.at(-1);

            if (turmaAtual)
                turmaNome = `${turmaAtual.serie}º Ano - ${turmaAtual.ano}`;

            const matchSimulado = {
                "conteudos.resultados.aluno_id": new Types.ObjectId(alunoId)
            };

            if (turmaId && Types.ObjectId.isValid(turmaId)) {
                matchSimulado.turma_id = new Types.ObjectId(turmaId);
            }

            if (ano) {
                matchSimulado["turma.ano"] = Number(ano);
            }

            if (bimestre) {
                matchSimulado.bimestre = Number(bimestre);
            }

        const simulados = await Simulado.aggregate([
            {
                $lookup: {
                    from: "turmas",
                    localField: "turma_id",
                    foreignField: "_id",
                    as: "turma"
                }
            },
            { $unwind: "$turma" },
            { $unwind: "$conteudos" },
            { $unwind: "$conteudos.resultados" },
            { $match: matchSimulado },
            {
                $group: {
                    _id: "$bimestre",
                    media: { $avg: "$conteudos.resultados.nota" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const desempenho = [1, 2, 3, 4].map(bi => {
            const d = simulados.find(s => s._id === bi);
            return { bimestre: bi, media: d?.media ?? 0 };
        });

        return res.status(200).json({
            alunoNome: aluno.nome,
            turmaNome,
            turmasDoAluno: turmasAluno.map(t => ({
                id: t._id,
                serie: t.serie,
                ano: t.ano
            })),
            desempenho
        });

        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar desempenho", error });
        }
    }
};



