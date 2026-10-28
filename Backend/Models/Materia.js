import mongoose from "mongoose";

const { Schema } = mongoose;

const MateriaSchema = new Schema({
    nome: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true, strict: true });

const Materia = mongoose.model("Materias", MateriaSchema);
export default Materia;
