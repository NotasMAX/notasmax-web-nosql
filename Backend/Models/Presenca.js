import mongoose from "../DB/conn.js";

const { Schema } = mongoose;

const PresencaSchema = new Schema({
    simulado_id: {
        type: Schema.Types.ObjectId,
        ref: "Simulados",
        required: true,
    },
    aluno_id: {
        type: Schema.Types.ObjectId,
        ref: "Usuarios",
        required: true,
    },
    qr_id: {
        type: Schema.Types.ObjectId,
        ref: "QrPresencas",
    },
    registrada_em: {
        type: Date,
        default: Date.now,
    },
    metodo: {
        type: String,
        enum: ["QR", "MANUAL"],
        default: "QR",
    },
}, { timestamps: true, strict: true });

PresencaSchema.index({ simulado_id: 1, aluno_id: 1 }, { unique: true });

const Presenca = mongoose.model("Presencas", PresencaSchema);
export default Presenca;