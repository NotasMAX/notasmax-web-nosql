import api from "../utils/api.js";

export const getByTurma = (turma_id) => api.get(`/Turmas/ByTurma/${turma_id}`)
export const cadastrarSimulado = (payload) => api.post('/Simulado/Create', payload);
export const getOne = (id) => api.get(`/Simulado/${id}`);
export const getAll = () => api.get('/Simulados');
export const getTurma = (id) => api.get(`/Turma/Simulado/${id}`)
export const getByAlunoAndBimestre = (aluno, bimestre, simulado) => api.get(`/Simulado/getByAluno/${aluno}/${bimestre}/${simulado}`);
export const findSimuladoByBimestreAnoSerie = (bimestre, ano, serie) => api.get(`/Simulados/FindByBimestreAnoSerie/${bimestre}/${ano}/${serie}`);
export const updateSimulado = (id, payload) => api.patch(`/Simulado/Editar/${id}`, payload);
export const getSimuladosByTurma = (id) => api.get(`/Simulados/Turma/${id}`);
export const atualizarConteudos = (id, payload) => api.patch(`/Simulado/AtualizarConteudos/${id}`, payload);
export const getOneSimple = (id) => api.get(`/Simulado/Simple/${id}`);
export const previaImportacaoNotas = (dados) => api.post('/Importacoes/Notas/Previa', dados, { headers: { 'Content-Type': 'multipart/form-data' } });
export const confirmarImportacaoNotas = (payload) => api.post('/Importacoes/Notas/Confirmar', payload);

export default api;