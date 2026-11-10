import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getByTurma } from '../api/simuladoApi.js';
import { getOne } from '../api/turmasapi.js';
import { Toast } from 'primereact/toast';
import { getAll } from '../api/simuladoApi.js';
import BimestreSections from '../components/BimestreSections.jsx';
import Style from '../styles/ButtonGroup.module.css';
import TitleStyle from '../styles/Title.module.css';

export default function TurmasSimulados() {

    const navigate = useNavigate();
    const { id } = useParams();
    const [simulados, setSimulados] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [error, setError] = useState(null);
    const [turma, setTurma] = useState(null);
    const [filterBimestre, setFilterBimestre] = useState('all');
    const toast = useRef(null);
    const location = useLocation();
    const toastShown = useRef(false);

    // Paginação por bimestre (2 grupos por página)
    const [page, setPage] = useState(1);
    const groupsPerPage = 2;

    // Reset página ao trocar filtro/rota
    useEffect(() => { setPage(1); }, [filterBimestre, id]);

    useEffect(() => {
        document.title = `NotasMAX - Simulados da Turma`;
        if (location.state && location.state.message && !toastShown.current) {
            toastShown.current = true;
            toast.current.show({ severity: location.state.type || 'success', summary: 'Sucesso', detail: location.state.message, life: 3000 });
        }
    }, [location.state]);

    const loadTurma = async () => {
        try {
            const res = await getOne(id);

            setTurma(res.data.turma);

        } catch (e) {

            setError(e.message || 'Erro ao carregar turma');

        }
    };


    const loadSimulados = async () => {
        try {
            setCarregando(true);

            setError(null);

            const res = await getByTurma(id);
            
            setSimulados(res.data.simulados);
        } catch (e) {

            setError(e.message || 'Erro ao carregar simulados');

        } finally {

            setCarregando(false);

        }
    };

    useEffect(() => {
        if (id) {
            loadTurma();
            loadSimulados();
        }

    }, [id]);


    const BimestreOptions = Array.from(
        new Set(simulados.map((s) => s.bimestre)
            .filter(v => v !== null && v !== undefined)))
        .sort((a, b) => Number(a) - Number(b)
        );

    const displayedSimulados = filterBimestre === 'all'
        ? simulados
        : simulados.filter(s => String(s.bimestre) === String(filterBimestre));


    return (
        <div className='h-full'>            
        <Toast ref={toast} />
            <div className={TitleStyle.titleContent}>  
                <div>
                    <h1 className={TitleStyle.titlePage}>
                        {turma ? `Turma ${turma.serie}º EM - Ano ${turma.ano}` : 'Turma'}
                    </h1>
                    <p className={TitleStyle.spaceBetween}>Lista de simulados separados por bimestres</p>
                </div>
                <div>

                    <div className={Style.formSelectContainer}>


                        <select
                            required
                            className={Style.formSelect}
                            value={filterBimestre}
                            onChange={(e) => setFilterBimestre(e.target.value)}
                        >
                            <option className={Style.formOption} value="all">Selecionar Bimestre</option>
                            {BimestreOptions.map((b) => (
                                <option className={Style.formOption} key={b} value={b}>{b}º Bimestre</option>
                            ))
                            }
                        </select>

                        <svg className={Style.formSelectArrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z" />
                        </svg>

                    </div>

                </div>
            </div>

            <div className='flex gap-3 flex-wrap'>
                <button className={Style.buttonSecondarySmall} onClick={() => navigate(`/Turmas/${id}/Notas/Alunos`)}>
                    Notas dos alunos
                </button>

                <button className={Style.buttonSecondarySmall}  onClick={() => {
                    navigate(`/Turmas/${turma._id}/Simulados/Notas/`);
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 7C12.5523 7 13 7.44772 13 8V11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H13V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11H11V8C11 7.44772 11.4477 7 12 7Z" fill="#4b5563" />
                    </svg>
                    Lançar Notas Turma
                </button>
                <button className={Style.buttonSecondarySmall}
                    onClick={() => (
                        navigate(`/Turmas/Editar/${turma._id}`))}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M7 4C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V11C20 10.4477 20.4477 10 21 10C21.5523 10 22 10.4477 22 11V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2H13C13.5523 2 14 2.44772 14 3C14 3.55228 13.5523 4 13 4H7Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M19.1974 4C18.9845 4 18.7803 4.08457 18.6298 4.23509L10.7528 12.1121L10.3744 13.6256L11.8879 13.2473L19.7649 5.37021C19.9155 5.21969 20 5.01553 20 4.80265C20 4.58978 19.9155 4.38562 19.7649 4.23509C19.6144 4.08457 19.4102 4 19.1974 4ZM17.2156 2.82088C17.7412 2.29528 18.4541 2 19.1974 2C19.9407 2 20.6535 2.29528 21.1791 2.82088C21.7047 3.34648 22 4.05934 22 4.80265C22 5.54596 21.7047 6.25883 21.1791 6.78443L13.1062 14.8573C12.9781 14.9855 12.8175 15.0764 12.6417 15.1204L9.24256 15.9701C8.90178 16.0553 8.54129 15.9555 8.29291 15.7071C8.04453 15.4587 7.94468 15.0982 8.02988 14.7575L8.87966 11.3583C8.92362 11.1825 9.01453 11.0219 9.14269 10.8938L17.2156 2.82088Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289L18.7071 7.29289C19.0976 7.68342 19.0976 8.31658 18.7071 8.70711C18.3166 9.09763 17.6834 9.09763 17.2929 8.70711L15.2929 6.70711C14.9024 6.31658 14.9024 5.68342 15.2929 5.29289Z" fill="#4b5563" />
                    </svg>
                    Editar Turma
                </button>

                <button 
                    className={Style.buttonSecondarySmall}
                    onClick={() => navigate(`/Turma/${id}/desempenho`)}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2 7C2 4.23858 4.23858 2 7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7ZM7 4C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V7C20 5.34315 18.6569 4 17 4H7Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M8 13C8.55228 13 9 13.4477 9 14V16C9 16.5523 8.55228 17 8 17C7.44772 17 7 16.5523 7 16L7 14C7 13.4477 7.44772 13 8 13Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M16 7C16.5523 7 17 7.44772 17 8L17 16C17 16.5523 16.5523 17 16 17C15.4477 17 15 16.5523 15 16L15 8C15 7.44772 15.4477 7 16 7Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 10C12.5523 10 13 10.4477 13 11L13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16L11 11C11 10.4477 11.4477 10 12 10Z" fill="#4b5563" />
                    </svg>

                    Média bimestral classe
                </button>

                <button className={Style.buttonSecondarySmall}
                onClick={() => navigate(`/Turma/${id}/desempenho-materias`)}>
                  
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2 7C2 4.23858 4.23858 2 7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7ZM7 4C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V7C20 5.34315 18.6569 4 17 4H7Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M8 13C8.55228 13 9 13.4477 9 14V16C9 16.5523 8.55228 17 8 17C7.44772 17 7 16.5523 7 16L7 14C7 13.4477 7.44772 13 8 13Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M16 7C16.5523 7 17 7.44772 17 8L17 16C17 16.5523 16.5523 17 16 17C15.4477 17 15 16.5523 15 16L15 8C15 7.44772 15.4477 7 16 7Z" fill="#4b5563" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 10C12.5523 10 13 10.4477 13 11L13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16L11 11C11 10.4477 11.4477 10 12 10Z" fill="#4b5563" />
                    </svg>
                    Acertos por matéria
                </button>
            </div>

            {carregando && <p>Carregando...</p>}
            {error && <p>{error}</p>}

            {!carregando && displayedSimulados.length === 0 && <p>Simulados não encontrados</p>}

            {
                !carregando && displayedSimulados.length > 0 && (() => {
                    // Agrupa por bimestre
                    const grupos = displayedSimulados.reduce((acc, sim) => {
                        const chave = sim.bimestre ?? 'Sem bimestre';
                        (acc[chave] ||= []).push(sim);
                        return acc;
                    }, {});

                    // Chaves ordenadas (bimestres)
                    const allKeys = Object.keys(grupos).sort((a, b) => Number(a) - Number(b));

                    // Paginação das chaves (2 por página)
                    const totalPages = Math.max(1, Math.ceil(allKeys.length / groupsPerPage));
                    const start = (page - 1) * groupsPerPage;
                    const pageKeys = allKeys.slice(start, start + groupsPerPage);

                    return (
                        <>
                            <div className='h-4/6'>
                                {pageKeys.map(b => (
                                    <div key={b} className='mt-5 h-1/2'>
                                        <h2 className='text-2xl mb-2 text-gray-700'>
                                            {isNaN(Number(b)) ? b : `${b}º Bimestre`}
                                        </h2>
                                        <BimestreSections simulados={grupos[b]} />
                                    </div>
                                ))}
                            </div>

                            <div className='flex gap-4 items-end mt-3'>

                                <button className={Style.buttonSecondary} onClick={() => (navigate('/Turmas'))}>
                                    Voltar a lista de turmas
                                </button>

                                {/* Controles de página*/}
                                {totalPages > 1 && (
                                    <div className="mt-6 flex items-center gap-2">
                                        <button
                                            className={Style.buttonPagination}
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <svg className="rotate-180" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M5.58838 2.79431L10.2455 7.45141L5.58838 12.1085" stroke="#4b5563" strokeWidth="1.59672" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>

                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Página {page} de {totalPages}
                                        </span>
                                        <button
                                            className={Style.buttonPagination}
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M5.58838 2.79431L10.2455 7.45141L5.58838 12.1085" stroke="#4b5563" strokeWidth="1.59672" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                            </div>
                        </>
                    );
                })()
            }
        </div >
    );
}