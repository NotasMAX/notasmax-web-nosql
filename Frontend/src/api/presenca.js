import api from '../utils/api.js';

export const getQrAtivoPorSimulado = (simuladoId) => api.get(`/Presenca/Qr/Simulado/${simuladoId}`);
export const gerarQr = (payload) => api.post('/Presenca/Qr/Gerar', payload);
export const revogarQr = (qrId) => api.patch(`/Presenca/Qr/${qrId}/Revogar`);
export const listarPresencas = (simuladoId) => api.get(`/Presenca/Simulado/${simuladoId}`);

export default api;
