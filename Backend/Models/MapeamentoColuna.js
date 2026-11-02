import mongoose from "mongoose";

const { Schema } = mongoose;

const MapeamentoColunaSchema = new Schema({
    turma_id: {
        type: Schema.Types.ObjectId,
        ref: "Turmas",
        required: true,
    },
    cabecalho: {
        type: String,
        required: true,
        trim: true,
    },
    turma_disciplina_id: {
        type: Schema.Types.ObjectId,
        ref: "TurmaDisciplinas",
        required: true,
    },
}, { timestamps: true, strict: true });

MapeamentoColunaSchema.index({ turma_id: 1, cabecalho: 1 }, { unique: true });

const MapeamentoColuna = mongoose.model("MapeamentoColunas", MapeamentoColunaSchema);
export default MapeamentoColuna;
