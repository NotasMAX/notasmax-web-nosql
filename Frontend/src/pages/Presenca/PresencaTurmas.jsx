import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'primereact/skeleton';
import { getAllTurmas, getTurmasPorAno } from '../../api/turmasapi.js';
import Style from '../../styles/Presenca.module.css';

export default function PresencaTurmas() {
    const navigate = useNavigate();
    const [ano, setAno] = useState(new Date().getFullYear());
    const [anosDisponiveis, setAnosDisponiveis] = useState([]);
    const [turmas, setTurmas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const anoAtual = useMemo(() => new Date().getFullYear(), []);

    useEffect(() => {
        document.title = 'NotasMAX - Lançamento de presença';

        const carregarAnos = async () => {
            try {
                const response = await getAllTurmas();
                const anos = [...new Set((response.data?.turmas || []).map((turma) => Number(turma.ano)).filter(Boolean))]
                    .sort((a, b) => b - a);

                setAnosDisponiveis(anos.length ? anos : [anoAtual]);
                if (anos.length) {
                    setAno((atual) => anos.includes(atual) ? atual : anos[0]);
                }
            } catch {
                setAnosDisponiveis([anoAtual]);
                setAno(anoAtual);
            }
        };

        carregarAnos();
    }, [anoAtual]);

    useEffect(() => {
        if (!anosDisponiveis.length) return;

        const carregarTurmas = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await getTurmasPorAno(ano);
                setTurmas(response.data?.turmas || []);
            } catch (err) {
                setTurmas([]);
                setError(err.response?.data?.message || 'Não foi possível carregar as turmas.');
            } finally {
                setLoading(false);
            }
        };

        carregarTurmas();
    }, [ano, anosDisponiveis]);

    return (
        <div className={Style.page}>
            <div className={Style.header}>
                <p className={Style.breadcrumb}>Presença</p>
                <h1 className={Style.title}>Lançamento de presença</h1>
            </div>

            <div className={Style.toolbar}>
                <div className={Style.fieldWrap}>
                    <label className={Style.label} htmlFor="ano-presenca">Ano</label>
                    <select
                        id="ano-presenca"
                        className={Style.select}
                        value={ano}
                        onChange={(event) => setAno(Number(event.target.value))}
                    >
                        {anosDisponiveis.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className={Style.grid}>
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
                        onClick={() => getTurmasPorAno(ano).then((response) => setTurmas(response.data?.turmas || [])).catch(() => setError('Não foi possível carregar as turmas.'))}
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : turmas.length === 0 ? (
                <div className={Style.empty}>Nenhuma turma cadastrada em {ano}</div>
            ) : (
                <div className={Style.grid}>
                    {turmas.map((turma) => (
                        <button
                            type="button"
                            key={turma._id}
                            className={Style.card}
                            onClick={() => navigate(`/presenca/turma/${turma._id}`)}
                        >
                            <span className={Style.cardBadge}>{turma.ano}</span>
                            <div className={Style.cardTitle}>{turma.serie}º Ano</div>
                            <div className={Style.cardMeta}>
                                <span>Turma: {turma.serie}º EM</span>
                                <span>{turma.alunos?.length || 0} alunos</span>
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
