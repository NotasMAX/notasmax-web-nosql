import api from "../utils/api.js";

// Oculta simulados com bimestre inválido nas consultas de listagem.
// Os registros permanecem intactos no MongoDB.
export const bimestreValido = (simulado) => Number.isFinite(Number(simulado?.bimestre)) && simulado?.bimestre !== null && simulado?.bimestre !== undefined && Number(simulado.bimestre) >= 1;
const somenteBimestresValidos = (requisicao) => requisicao.then((resposta) => ({
  ...resposta,
  data: {
    ...resposta.data,
    ...(Array.isArray(resposta.data?.simulados)
      ? { simulados: resposta.data.simulados.filter(bimestreValido) }
      : {}),
  },
}));

export const getByTurma = (turma_id) => somenteBimestresValidos(api.get(`/Turmas/ByTurma/${turma_id}`))
export const cadastrarSimulado = (payload) => api.post('/Simulado/Create', payload);
export const getOne = (id) => api.get(`/Simulado/${id}`);
export const getAll = () => somenteBimestresValidos(api.get('/Simulados'));
export const getTurma = (id) => api.get(`/Turma/Simulado/${id}`)
export const getByAlunoAndBimestre = (aluno, bimestre, simulado) => somenteBimestresValidos(api.get(`/Simulado/getByAluno/${aluno}/${bimestre}/${simulado}`));
export const findSimuladoByBimestreAnoSerie = (bimestre, ano, serie) => somenteBimestresValidos(api.get(`/Simulados/FindByBimestreAnoSerie/${bimestre}/${ano}/${serie}`));
export const updateSimulado = (id, payload) => api.patch(`/Simulado/Editar/${id}`, payload);
export const getSimuladosByTurma = (id) => somenteBimestresValidos(api.get(`/Simulados/Turma/${id}`));
export const atualizarConteudos = (id, payload) => api.patch(`/Simulado/AtualizarConteudos/${id}`, payload);
export const getOneSimple = (id) => api.get(`/Simulado/Simple/${id}`);

export default api;