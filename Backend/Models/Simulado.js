import mongoose from "mongoose";

const { Schema } = mongoose;


const ResultadoSchema = new Schema({
    aluno_id: {
        type: Schema.Types.ObjectId,
        ref: "Usuarios",
        required: true,
    },
    nota: {
        type: Number,
        required: true,
    },
    acertos: {
        type: Number,
        required: true,
    },
    notificacao_enviada: {
        type: String,
        enum: ["enviada", "pendente"],
        default: "pendente",
    }
}, { timestamps: true, strict: true });


const ConteudoSchema = new Schema({
    turma_disciplina_id: {
        type: Schema.Types.ObjectId,
        ref: "TurmaDisciplinas",
        required: true,
    },
    quantidade_questoes: {
        type: Number,
        default: 0,
        required: true,
    },
    peso: {
        type: Number,
        default: 1.0,
        required: true,
    },
    resultados: [ResultadoSchema],
}, { timestamps: true, strict: true });

const SimuladoSchema = new Schema({
    numero: {
        type: Number,
        required: true,
    },
    tipo: {
        type: String,
        enum: ["objetivo", "dissertativo"],
        required: true,
    },
    bimestre: {
        type: Number,
        required: true,
    },
    data_realizacao: {
        type: Date,
        required: true,
    },
    turma_id: {
        type: Schema.Types.ObjectId,
        ref: "Turmas",
        required: true,
    },
    conteudos: [ConteudoSchema],
}, { timestamps: true, strict: true });

const Simulado = mongoose.model("Simulados", SimuladoSchema);
export default Simulado;
