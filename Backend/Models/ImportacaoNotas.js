import mongoose from "mongoose";

const { Schema } = mongoose;

// Uma importação de notas por planilha confirmada, com o arquivo que a originou.
const ImportacaoNotasSchema = new Schema({
    turma_id: {
        type: Schema.Types.ObjectId,
        ref: "Turmas",
        required: true,
    },
    aluno_id: {
        type: Schema.Types.ObjectId,
        ref: "Usuarios",
        required: true,
    },
    bimestre: {
        type: Number,
        required: true,
    },
    importado_por: {
        type: Schema.Types.ObjectId,
        ref: "Usuarios",
        required: true,
    },
    planilha: {
        // Nome do arquivo no container do Blob Storage; nulo quando o ambiente não guarda planilhas.
        // Importações do mesmo arquivo para alunos diferentes apontam para o mesmo blob.
        blob: { type: String, default: null },
        nome_original: { type: String, required: true },
        tamanho: { type: Number, required: true },
        // O arquivo pode ter uma aba por aluno: esta é a que foi importada.
        aba: { type: String, default: null },
    },
    contagem: {
        criados: { type: Number, required: true },
        atualizados: { type: Number, required: true },
        removidos: { type: Number, required: true },
        ignorados: { type: Number, required: true },
        simuladosCriados: { type: Number, default: 0 },
        disciplinasAdicionadas: { type: Number, default: 0 },
        // Cadastradas na turma pela revisão, para colunas sem dono, e as matérias novas delas.
        disciplinasCadastradas: { type: Number, default: 0 },
        materiasCadastradas: { type: Number, default: 0 },
    },
}, { timestamps: true, strict: true });

const ImportacaoNotas = mongoose.model("ImportacoesNotas", ImportacaoNotasSchema);
export default ImportacaoNotas;
