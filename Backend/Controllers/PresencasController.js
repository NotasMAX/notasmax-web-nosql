import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Types } from "mongoose";
import Simulado from "../Models/Simulado.js";
import Turma from "../Models/Turma.js";
import Usuario from "../Models/Usuario.js";
import QrPresenca from "../Models/QrPresenca.js";
import Presenca from "../Models/Presenca.js";

const VALIDADE_QR_HORAS = 24;

// O token do QR é um JWT assinado com o segredo do próprio QR (não com o JWT_SECRET).
// O "exp" acompanha a expiração salva no banco, então o token pode ser gerado de novo
// a qualquer momento (para reimprimir) sem precisar ser armazenado.
function gerarToken(qr) {
    return jwt.sign(
        { sid: qr._id.toString(), exp: Math.floor(qr.expira_em.getTime() / 1000) },
        qr.segredo
    );
}

function montarResposta(qr, simulado, turma) {
    return {
        qr_id: qr._id,
        token: gerarToken(qr),
        valido_de: qr.valido_de,
        expira_em: qr.expira_em,
        simulado: {
            id: simulado._id,
            numero: simulado.numero,
            tipo: simulado.tipo,
            bimestre: simulado.bimestre,
            data_realizacao: simulado.data_realizacao,
            turma: turma ? { id: turma._id, serie: turma.serie, ano: turma.ano } : null
        }
    };
}

export default class PresencasController {

    // Administrador gera o QR Code de presença de um simulado (pode ser com antecedência).
    // Se já existe um QR ativo, ele é devolvido, a menos que venha { renovar: true }.
    // Body: { simulado_id, valido_de? (padrão: agora), renovar? }
    static async gerarQr(req, res) {
        const { simulado_id, valido_de, renovar } = req.body ?? {};

        if (!Types.ObjectId.isValid(simulado_id))
            return res.status(422).json({ message: "Id de simulado inválido", simulado_id });

        let inicio = new Date();
        if (valido_de) {
            inicio = new Date(valido_de);
            if (isNaN(inicio.getTime()))
                return res.status(422).json({ message: "Data de início da validade inválida" });
        }

        try {
            const simulado = await Simulado.findById(simulado_id);
            if (!simulado)
                return res.status(404).json({ message: "Simulado não encontrado" });

            const turma = await Turma.findById(simulado.turma_id).select("serie ano");

            const existente = await QrPresenca.findOne({
                simulado_id,
                ativa: true,
                expira_em: { $gt: new Date() }
            }).select("+segredo");

            if (existente && renovar !== true) {
                return res.status(200).json({
                    message: "Já existe um QR Code ativo para este simulado.",
                    ...montarResposta(existente, simulado, turma)
                });
            }

            // Renovar revoga os QR Codes anteriores do simulado
            if (existente)
                await QrPresenca.updateMany({ simulado_id, ativa: true }, { ativa: false });

            const qr = await QrPresenca.create({
                simulado_id,
                criado_por: req.user.id,
                valido_de: inicio,
                expira_em: new Date(inicio.getTime() + VALIDADE_QR_HORAS * 60 * 60 * 1000),
                segredo: crypto.randomBytes(32).toString("hex")
            });

            return res.status(201).json({
                message: "QR Code de presença gerado.",
                ...montarResposta(qr, simulado, turma)
            });
        } catch (error) {
            return res.status(500).json({ message: "Erro ao gerar QR Code de presença", error: error.message });
        }
    }

    // Recupera o QR Code ativo de um simulado (para reimprimir sem gerar outro).
    static async obterQrAtivo(req, res) {
        const { simulado_id } = req.params;

        if (!Types.ObjectId.isValid(simulado_id))
            return res.status(422).json({ message: "Id de simulado inválido", simulado_id });

        try {
            const simulado = await Simulado.findById(simulado_id);
            if (!simulado)
                return res.status(404).json({ message: "Simulado não encontrado" });

            const qr = await QrPresenca.findOne({
                simulado_id,
                ativa: true,
                expira_em: { $gt: new Date() }
            }).select("+segredo");

            if (!qr)
                return res.status(404).json({ message: "Nenhum QR Code ativo para este simulado." });

            const turma = await Turma.findById(simulado.turma_id).select("serie ano");
            return res.status(200).json(montarResposta(qr, simulado, turma));
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar QR Code de presença", error: error.message });
        }
    }

    static async revogarQr(req, res) {
        const { qr_id } = req.params;

        if (!Types.ObjectId.isValid(qr_id))
            return res.status(422).json({ message: "Id de QR Code inválido", qr_id });

        try {
            const qr = await QrPresenca.findByIdAndUpdate(qr_id, { ativa: false }, { new: true });
            if (!qr)
                return res.status(404).json({ message: "QR Code não encontrado" });

            return res.status(200).json({ message: "QR Code revogado." });
        } catch (error) {
            return res.status(500).json({ message: "Erro ao revogar QR Code", error: error.message });
        }
    }

    // O aluno envia o conteúdo lido do QR Code. A identidade vem sempre do JWT de login (req.user).
    static async registrar(req, res) {
        const { token } = req.body ?? {};

        if (!token || typeof token !== "string")
            return res.status(422).json({ message: "Informe o token do QR Code." });

        try {
            // 1. Descobre o QR Code pelo id do token (ainda sem confiar no conteúdo)
            const payload = jwt.decode(token);
            if (!payload?.sid || !Types.ObjectId.isValid(payload.sid))
                return res.status(400).json({ message: "QR Code inválido." });

            const qr = await QrPresenca.findById(payload.sid).select("+segredo");
            if (!qr)
                return res.status(400).json({ message: "QR Code inválido." });

            // 2. Verifica assinatura e expiração do token
            try {
                jwt.verify(token, qr.segredo, { algorithms: ["HS256"] });
            } catch (e) {
                const mensagem = e.name === "TokenExpiredError"
                    ? "Este QR Code expirou."
                    : "QR Code inválido.";
                return res.status(400).json({ message: mensagem });
            }

            // 3. Estado e janela de validade
            if (!qr.ativa)
                return res.status(400).json({ message: "Este QR Code foi revogado." });
            if (new Date() < qr.valido_de)
                return res.status(400).json({ message: "Este QR Code ainda não está disponível." });

            // 4. O simulado precisa existir e o aluno precisa pertencer à turma dele
            const simulado = await Simulado.findById(qr.simulado_id).select("numero tipo data_realizacao turma_id");
            if (!simulado)
                return res.status(404).json({ message: "Simulado não encontrado" });

            const pertenceATurma = await Turma.exists({ _id: simulado.turma_id, alunos: req.user.id });
            if (!pertenceATurma)
                return res.status(403).json({ message: "Você não faz parte da turma deste simulado." });

            // 5. Registra (o índice único simulado_id + aluno_id barra duplicidade)
            await Presenca.create({
                simulado_id: simulado._id,
                aluno_id: req.user.id,
                qr_id: qr._id,
                metodo: "QR"
            });

            return res.status(201).json({
                message: "Presença registrada com sucesso.",
                simulado: {
                    id: simulado._id,
                    numero: simulado.numero,
                    tipo: simulado.tipo,
                    data_realizacao: simulado.data_realizacao
                }
            });
        } catch (error) {
            if (error.code === 11000)
                return res.status(409).json({ message: "Sua presença já foi registrada neste simulado." });

            return res.status(500).json({ message: "Erro ao registrar presença", error: error.message });
        }
    }

    // Lista todos os alunos da turma do simulado, indicando quem está presente.
    static async listarPorSimulado(req, res) {
        const { simulado_id } = req.params;

        if (!Types.ObjectId.isValid(simulado_id))
            return res.status(422).json({ message: "Id de simulado inválido", simulado_id });

        try {
            const simulado = await Simulado.findById(simulado_id);
            if (!simulado)
                return res.status(404).json({ message: "Simulado não encontrado" });

            const turma = await Turma.findById(simulado.turma_id);
            const alunos = await Usuario.find(
                { _id: { $in: turma?.alunos ?? [] } },
                "nome email"
            ).sort("nome");

            const presencas = await Presenca.find({ simulado_id });
            const porAluno = new Map(presencas.map(p => [p.aluno_id.toString(), p]));

            const lista = alunos.map(aluno => {
                const presenca = porAluno.get(aluno._id.toString());
                return {
                    aluno_id: aluno._id,
                    nome: aluno.nome,
                    presente: Boolean(presenca),
                    registrada_em: presenca?.registrada_em ?? null,
                    metodo: presenca?.metodo ?? null
                };
            });

            return res.status(200).json({
                simulado_id,
                total_alunos: lista.length,
                total_presentes: lista.filter(a => a.presente).length,
                alunos: lista
            });
        } catch (error) {
            return res.status(500).json({ message: "Erro ao listar presenças", error: error.message });
        }
    }
}