import api from "../utils/api";

// Endpoints de Professores
export const getProfessores = () => api.get("/Usuarios/Professores");
export const createProfessor = (data) => api.post("/Usuarios/Professor", data);

// Endpoints de Alunos
export const getAlunos = () => api.get("/Usuarios/Alunos");
export const createAluno = (data) => api.post("/Usuarios/Aluno", data);
export const getDesempenhoAluno = (aluno_id, ano, turmaId, bimestre) =>
  api.get(`/Usuarios/Aluno/${aluno_id}/desempenho`, {
    params: { ano, turmaId, bimestre }
  });

// Endpoints Comuns (Alunos e Professores)
export const getUsuario = (id) => api.get(`/Usuarios/Detalhes/${id}`);
export const updateUsuario = (id, data) => api.put(`/Usuarios/Editar/${id}`, data);

// Fotos de perfil: o servidor só guarda fotos no ambiente da Azure
export const getDisponibilidadeFotos = () => api.get("/Usuarios/Fotos/Disponibilidade");
export const enviarFotoUsuario = (id, foto) => {
  const dados = new FormData();
  dados.append("foto", foto);
  return api.put(`/Usuarios/${encodeURIComponent(id)}/Foto`, dados, { headers: { "Content-Type": "multipart/form-data" } });
};

// Endpoints de Busca
export const buscarAlunosPorNomeOuEmail = (text) => api.get(`/Usuarios/Buscar/Alunos?text=${encodeURIComponent(text)}`);
export const buscarProfessoresPorNomeOuEmail = (text) => api.get(`/Usuarios/Buscar/Professores?text=${encodeURIComponent(text)}`);

// Endpoint antigo (manter para compatibilidade)
export const cadastrarAluno = (payload) => api.post("/Usuarios/CadastrarAluno", payload);

export default api;