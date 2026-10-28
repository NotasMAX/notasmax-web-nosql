import mongoose from "mongoose";

const { Schema } = mongoose;

const usuarioSchema = new Schema({
  nome: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  telefone_contato: { type: String, required: true, trim: true },
  senha: { type: String, required: true, select: false },
  tipo_usuario: {
    type: String,
    enum: ["aluno", "professor", "administrador"],
    default: "aluno",
  },
  telefone_responsavel: { type: String },
  nome_responsavel: { type: String, trim: true },
  resetToken: { type: String, select: false, default: null },
  resetTokenExpiry: { type: Date, select: false, default: null }, 
}, {
  timestamps: true,
  strict: true
});

const Usuario = mongoose.model("Usuario", usuarioSchema);
export default Usuario;
