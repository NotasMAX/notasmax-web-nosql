import mongoose from "mongoose";

const { Schema } = mongoose;

const TurmaSchema = new Schema({
    serie: {
        type: Number,
        required: true,
    },
    ano: {
        type: Number,
        required: true,
    },
    alunos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Usuarios",
        },
    ],
}, { timestamps: true, strict: true });

const Turma = mongoose.model("Turmas", TurmaSchema);
export default Turma;
