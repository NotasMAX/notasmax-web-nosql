import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from 'primereact/skeleton';
import { getOne } from '../../api/turmasapi.js';
import { getSimuladosByTurma } from '../../api/simuladoApi.js';
import Style from '../../styles/Presenca.module.css';

export default function PresencaSimulados() {
    const { turmaId } = useParams();
    const navigate = useNavigate();
    const [turma, setTurma] = useState(null);
    const [simulados, setSimulados] = useState([]);
    const [bimestreSelecionado, setBimestreSelecionado] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = 'NotasMAX - Simulados da turma';

        const carregarDados = async () => {
            try {
                setLoading(true);
                setError('');

                const [turmaResponse, simuladosResponse] = await Promise.all([
                    getOne(turmaId),
                    getSimuladosByTurma(turmaId)
                ]);

                const turmaDetalhe = turmaResponse.data?.turma || null;
                const listaSimulados = Array.isArray(simuladosResponse.data?.simulados)
                    ? simuladosResponse.data.simulados
                    : [];

                setTurma(turmaDetalhe);
                setSimulados([...listaSimulados].sort((a, b) => {
                    const ordemBimestre = Number(a.bimestre) - Number(b.bimestre);
                    if (ordemBimestre !== 0) return ordemBimestre;
                    return Number(a.numero) - Number(b.numero);
                }));
            } catch (err) {
                setTurma(null);
                setSimulados([]);
                setError(err.response?.data?.message || 'Não foi possível carregar os simulados desta turma.');
            } finally {
                setLoading(false);
            }
        };

        if (turmaId) {
            carregarDados();
        }
    }, [turmaId]);

    const bimestres = useMemo(
        () => [...new Set(simulados.map((simulado) => Number(simulado.bimestre)).filter(Boolean))].sort((a, b) => a - b),
        [simulados]
    );

    const simuladosFiltrados = useMemo(
        () => bimestreSelecionado === 'all'
            ? simulados
            : simulados.filter((simulado) => Number(simulado.bimestre) === Number(bimestreSelecionado)),
        [bimestreSelecionado, simulados]
    );

    return (
        <div className={Style.page}>
            <div className={Style.header}>
                <p className={Style.breadcrumb}>
                    Presença {turma ? `> ${turma.ano} > ${turma.serie}º Ano` : ''}
                </p>
                <h1 className={Style.title}>Simulados da turma</h1>
            </div>

            <div className={Style.toolbar}>
                <div className={Style.fieldWrap}>
                    <label className={Style.label} htmlFor="bimestre-presenca">Filtrar por bimestre</label>
                    <select
                        id="bimestre-presenca"
                        className={Style.select}
                        value={bimestreSelecionado}
                        onChange={(event) => setBimestreSelecionado(event.target.value)}
                    >
                        <option value="all">Todos</option>
                        {bimestres.map((bimestre) => (
                            <option key={bimestre} value={bimestre}>{bimestre}º Bimestre</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className={Style.list}>
                    <Skeleton className={Style.skeleton} />
                    <Skeleton className={Style.skeleton} />
                    <Skeleton className={Style.skeleton} />
                </div>
            ) : error ? (
                <div className={Style.error}>
                    {error}
                    <button
                        type="button"
                        className={`${Style.secondaryButton} mt-3`}
                        onClick={() => window.location.reload()}
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : simuladosFiltrados.length === 0 ? (
                <div className={Style.empty}>Nenhum simulado lançado para esta turma</div>
            ) : (
                <div className={Style.list}>
                    {simuladosFiltrados.map((simulado) => (
                        <button
                            key={simulado._id}
                            type="button"
                            className={Style.item}
                            onClick={() => navigate(`/presenca/turma/${turmaId}/simulado/${simulado._id}`)}
                        >
                            <div className={Style.itemInfo}>
                                <span className={Style.cardBadge}>Simulado Nº {simulado.numero}</span>
                                <div className={Style.itemTitle}>{simulado.tipo}</div>
                                <div className={Style.itemMeta}>
                                    {simulado.bimestre}º Bimestre • {new Date(simulado.data_realizacao).toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                            <div className={Style.itemMeta}>
                                Abrir presença
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <div className={Style.actionRow}>
                <button type="button" className={Style.secondaryButton} onClick={() => navigate(-1)}>
                    Voltar
                </button>
            </div>
        </div>
    );
}
