import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gerarQr, getQrAtivoPorSimulado, listarPresencas, revogarQr } from '../api/presenca.js';

export default function usePresencaSimulado(simuladoId) {
  const [qr, setQr] = useState(null);
  const [presencas, setPresencas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');
  const [simulado, setSimulado] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const intervalRef = useRef(null);

  const fetchPresencas = useCallback(async () => {
    if (!simuladoId) return;

    try {
      const response = await listarPresencas(simuladoId);
      const dados = response.data || {};
      const simuladoLista = dados?.lista?.simulado || dados?.simulado || null;

      setPresencas(Array.isArray(dados?.lista?.alunos ?? dados?.alunos) ? (dados?.lista?.alunos ?? dados?.alunos) : []);
      setSimulado((atual) => ({
        ...(simuladoLista || atual || {}),
        total_alunos: dados?.lista?.total_alunos ?? dados?.total_alunos ?? atual?.total_alunos ?? 0,
        total_presentes: dados?.lista?.total_presentes ?? dados?.total_presentes ?? atual?.total_presentes ?? 0,
      }));
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Não foi possível carregar a lista de presença.');
      }
    }
  }, [simuladoId]);

  const fetchQr = useCallback(async () => {
    if (!simuladoId) return;

    try {
      const response = await getQrAtivoPorSimulado(simuladoId);
      setQr(response.data || null);
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        setQr(null);
        setError('');
        return;
      }

      setQr(null);
      setError(err.response?.data?.message || 'Não foi possível carregar o QR ativo.');
    }
  }, [simuladoId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchQr(), fetchPresencas()]);
    setLoading(false);
  }, [fetchQr, fetchPresencas]);

  const gerarNovoQr = useCallback(async ({ validoDe, renovar = false } = {}) => {
    if (!simuladoId) return;

    setLoadingAction(true);

    try {
      const payload = { simulado_id: simuladoId, ...(validoDe ? { valido_de: new Date(validoDe).toISOString() } : {}), ...(renovar ? { renovar: true } : {}) };
      const response = await gerarQr(payload);
      const dados = response.data || {};
      setQr(dados);
      setError('');
      await fetchPresencas();
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível gerar o QR Code.');
      throw err;
    } finally {
      setLoadingAction(false);
    }
  }, [fetchPresencas, simuladoId]);

  const revogar = useCallback(async () => {
    if (!qr?.qr_id) return false;

    setLoadingAction(true);

    try {
      await revogarQr(qr.qr_id);
      setQr(null);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível revogar o QR Code.');
      return false;
    } finally {
      setLoadingAction(false);
    }
  }, [qr]);

  useEffect(() => {
    if (!simuladoId) return;

    const carregarDados = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchQr(), fetchPresencas()]);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [fetchQr, fetchPresencas, simuladoId]);

  useEffect(() => {
    if (!simuladoId || !qr) return;

    const tick = () => {
      fetchPresencas();
    };

    const visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (intervalRef.current) return;
      intervalRef.current = setInterval(tick, 10000);
    };

    visibilityHandler();
    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [fetchPresencas, qr, simuladoId]);

  const presencasFiltradas = useMemo(() => {
    const textoBusca = busca.trim().toLowerCase();

    return presencas.filter((aluno) => {
      const passouFiltro = filtro === 'todos'
        ? true
        : filtro === 'presentes'
          ? Boolean(aluno.presente)
          : !Boolean(aluno.presente);

      const passouBusca = !textoBusca || (aluno.nome || '').toLowerCase().includes(textoBusca);

      return passouFiltro && passouBusca;
    });
  }, [busca, filtro, presencas]);

  const totalPresentes = presencas.filter((aluno) => Boolean(aluno.presente)).length;

  return {
    qr,
    presencas,
    presencasFiltradas,
    loading,
    loadingAction,
    error,
    filtro,
    setFiltro,
    busca,
    setBusca,
    totalPresentes,
    totalAlunos: presencas.length,
    simulado,
    refresh,
    gerarNovoQr,
    revogar,
  };
}
