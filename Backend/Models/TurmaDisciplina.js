import mongoose from "mongoose";

const { Schema } = mongoose;

const TurmaDisciplinaSchema = new Schema({
    turma_id:
    {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Turmas",
    },
    professor_id:
    {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Usuarios",
    },
    materia_id: {
        type: Schema.Types.ObjectId,
        ref: "Materias",
        required: true,
    },

}, { timestamps: true, strict: true });

const TurmaDisciplina = mongoose.model("TurmaDisciplinas", TurmaDisciplinaSchema);
export default TurmaDisciplina;
