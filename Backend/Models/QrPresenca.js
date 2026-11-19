import mongoose from "../DB/conn.js";

const { Schema } = mongoose;

const QrPresencaSchema = new Schema({
    simulado_id: {
        type: Schema.Types.ObjectId,
        ref: "Simulados",
        required: true,
    },
    criado_por: {
        type: Schema.Types.ObjectId,
        ref: "Usuarios",
        required: true,
    },
    valido_de: {
        type: Date,
        required: true,
    },
    expira_em: {
        type: Date,
        required: true,
    },
    ativa: {
        type: Boolean,
        default: true,
    },
    segredo: {
        type: String,
        required: true,
        select: false,
    },
}, { timestamps: true, strict: true });

QrPresencaSchema.index({ simulado_id: 1, ativa: 1 });

const QrPresenca = mongoose.model("QrPresencas", QrPresencaSchema);
export default QrPresenca;