import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import usePresencaSimulado from '../../hooks/usePresencaSimulado.js';
import { imprimirFolhaQr } from '../../utils/Imprimirfolhaqr.js';
import Style from '../../styles/Presenca.module.css';

const formatarDataHora = (valor) => {
    if (!valor) return '—';
    return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const formatarData = (valor) => {
    if (!valor) return '—';
    return new Date(valor).toLocaleDateString('pt-BR');
};

export default function PresencaSimulado() {
    const navigate = useNavigate();
    const { simuladoId } = useParams();
    const [mostrarModal, setMostrarModal] = useState(false);
    const [proximoInicio, setProximoInicio] = useState('');
    const [confirmandoRevogacao, setConfirmandoRevogacao] = useState(false);
    const [confirmandoRenovacao, setConfirmandoRenovacao] = useState(false);
    const modalRef = useRef(null);
    const qrCodeRef = useRef(null);

    const {
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
        totalAlunos,
        simulado,
        refresh,
        gerarNovoQr,
        revogar,
    } = usePresencaSimulado(simuladoId);

    useEffect(() => {
        document.title = 'NotasMAX - Presença por simulado';
    }, []);

    useEffect(() => {
        if (mostrarModal && modalRef.current) {
            modalRef.current.focus();
        }
    }, [mostrarModal]);

    const deveAbrirModal = useMemo(() => !qr && totalPresentes === 0, [qr, totalPresentes]);

    useEffect(() => {
        if (deveAbrirModal && !loading && !loadingAction) {
            setMostrarModal(true);
        }
    }, [deveAbrirModal, loading, loadingAction]);

    const gerenciarGeracao = async () => {
        try {
            await gerarNovoQr({ validoDe: proximoInicio || new Date().toISOString() });
            setMostrarModal(false);
        } catch {
            // manter erro no hook
        }
    };

    const onRevogar = async () => {
        if (!window.confirm('O QR impresso deixará de funcionar. Deseja revogar este QR?')) {
            return;
        }

        setConfirmandoRevogacao(true);
        const ok = await revogar();
        setConfirmandoRevogacao(false);

        if (ok) {
            setMostrarModal(false);
        }
    };

    const onRenovar = async () => {
        if (!window.confirm('Ao renovar, o QR atual deixa de funcionar. Deseja continuar?')) {
            return;
        }

        setConfirmandoRenovacao(true);
        try {
            await gerarNovoQr({ validoDe: new Date().toISOString(), renovar: true });
        } finally {
            setConfirmandoRenovacao(false);
        }
    };

    const statusText = qr
        ? 'QR ativo'
        : totalPresentes > 0
            ? 'QR expirado ou revogado'
            : 'Sem QR ativo';

    const handleImprimirQr = () => {
        if (!qr || !simulado || !qrCodeRef.current) {
            return;
        }

        const svg = qrCodeRef.current.querySelector('svg');
        if (!svg) {
            return;
        }

        const subtitulo = [
            simulado?.tipo,
            `${simulado?.bimestre ?? ''}º Bimestre`,
            formatarData(simulado?.data_realizacao),
            `Turma ${simulado?.turma?.serie || ''}º`,
            simulado?.turma?.ano,
        ]
            .filter(Boolean)
            .join(' • ');

        imprimirFolhaQr({
            svgMarkup: svg.outerHTML,
            titulo: `Presença do Simulado ${simulado?.numero ?? ''}`.trim() || 'Presença do Simulado',
            subtitulo,
            validade: `Válido de ${formatarDataHora(qr?.valido_de)} até ${formatarDataHora(qr?.expira_em)}`,
        });
    };

    return (
        <div className={Style.canvas}>
            <div className={Style.page}>
                <div className={Style.header}>
                    <p className={Style.breadcrumb}>Presença &gt; Simulado</p>
                    <h1 className={Style.title}>
                        {loading ? 'Carregando simulado...' : simulado ? `Simulado ${simulado.numero}` : 'Simulado'}
                    </h1>
                    {!loading && simulado && (
                        <p className={Style.subtitle}>
                            {simulado.tipo} • {simulado.bimestre}º Bimestre • {formatarData(simulado.data_realizacao)} • Turma {simulado?.turma?.serie || ''}º • {simulado?.turma?.ano || ''}
                        </p>
                    )}
                </div>

                {mostrarModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-gerar-qr">
                        <div ref={modalRef} tabIndex={-1} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl outline-none">
                            <h2 id="modal-gerar-qr" className="text-2xl font-bold text-[#043666]">Este simulado ainda não tem QR Code de presença.</h2>
                            <p className="mt-3 text-base text-[#4B5563]">Deseja gerar agora?</p>

                            <div className="mt-5">
                                <label htmlFor="inicio-qr" className="mb-2 block text-sm font-semibold text-[#1F2937]">Começar a valer em</label>
                                <input
                                    id="inicio-qr"
                                    type="datetime-local"
                                    className={Style.select}
                                    value={proximoInicio}
                                    onChange={(event) => setProximoInicio(event.target.value)}
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" className={Style.secondaryButton} onClick={() => setMostrarModal(false)} disabled={loadingAction}>
                                    Agora não
                                </button>
                                <button type="button" className={Style.primaryButton} onClick={gerenciarGeracao} disabled={loadingAction}>
                                    {loadingAction ? 'Gerando...' : 'Sim, gerar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {(error || !simulado) && !loading && (
                    <div className={Style.error}>{error || 'Não foi possível carregar os dados do simulado.'}</div>
                )}

                {loading && (
                    <div className={Style.empty}>Carregando presença...</div>
                )}

                {!loading && qr && (
                    <div className="mb-6 rounded-2xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-center gap-3">
                                <span className={Style.cardBadge}>{statusText}</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button type="button" className={Style.primaryButton} onClick={handleImprimirQr} disabled={loadingAction}>
                                    Imprimir
                                </button>
                                <button type="button" className={Style.secondaryButton} onClick={onRenovar} disabled={loadingAction || confirmandoRenovacao}>
                                    {confirmandoRenovacao ? 'Renovando...' : 'Renovar'}
                                </button>
                                <button type="button" className={Style.secondaryButton} onClick={onRevogar} disabled={loadingAction || confirmandoRevogacao}>
                                    {confirmandoRevogacao ? 'Revogando...' : 'Revogar'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-6 xl:grid-cols-[260px_1fr] xl:items-start">
                            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center">
                                <div ref={qrCodeRef} className="mx-auto flex w-[220px] items-center justify-center rounded-lg bg-white p-3 shadow-sm">
                                    <QRCodeSVG
                                        value={qr.token}
                                        size={200}
                                        level="M"
                                        includeMargin
                                        bgColor="#ffffff"
                                        fgColor="#111827"
                                        aria-label={`QR Code de presença do simulado ${simulado?.numero || ''}`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 text-[#1F2937]">
                                <p><strong>Válido de:</strong> {formatarDataHora(qr?.valido_de)}</p>
                                <p><strong>Até:</strong> {formatarDataHora(qr?.expira_em)}</p>
                                <p><strong>Simulado:</strong> {simulado?.numero || qr?.simulado?.numero} • {qr?.simulado?.tipo || simulado?.tipo}</p>
                                <p><strong>Turma:</strong> {simulado?.turma?.serie || qr?.simulado?.turma?.serie || ''}º Ano • {simulado?.turma?.ano || qr?.simulado?.turma?.ano || ''}</p>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !qr && totalPresentes > 0 && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        O QR Code anterior não está mais ativo.
                        <button type="button" className={`${Style.primaryButton} ml-3`} onClick={() => setMostrarModal(true)}>
                            Gerar novo QR Code
                        </button>
                    </div>
                )}

                {!loading && !qr && totalPresentes === 0 && !mostrarModal && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-700">
                        <button type="button" className={Style.primaryButton} onClick={() => setMostrarModal(true)}>
                            Gerar QR Code
                        </button>
                    </div>
                )}

                <div className="rounded-2xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-[#043666]">Lista de presença</h2>
                            <p className="text-sm text-[#5B5B5B]">{totalPresentes} de {totalAlunos || presencas.length} presentes</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['todos', 'presentes', 'ausentes'].map((opcao) => (
                                <button
                                    key={opcao}
                                    type="button"
                                    className={filtro === opcao ? 'rounded-md bg-[#043666] px-3 py-2 text-sm font-semibold text-white' : 'rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-semibold text-[#1F2937]'}
                                    onClick={() => setFiltro(opcao)}
                                >
                                    {opcao === 'todos' ? 'Todos' : opcao === 'presentes' ? 'Presentes' : 'Ausentes'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <input
                            type="search"
                            value={busca}
                            onChange={(event) => setBusca(event.target.value)}
                            placeholder="Buscar aluno"
                            className={Style.select}
                            aria-label="Buscar aluno por nome"
                        />
                    </div>

                    <div className="mb-4 flex justify-end">
                        <button type="button" className={Style.secondaryButton} onClick={refresh} disabled={loadingAction || loading}>
                            Atualizar
                        </button>
                    </div>

                    {loading ? (
                        <div className={Style.empty}>Carregando presença...</div>
                    ) : presencasFiltradas.length === 0 ? (
                        <div className={Style.empty}>Nenhum aluno encontrado para os filtros selecionados.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-sm uppercase tracking-wide text-[#4B5563]">
                                        <th className="px-3 py-3">Nome</th>
                                        <th className="px-3 py-3">Status</th>
                                        <th className="px-3 py-3">Horário</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {presencasFiltradas.map((aluno) => (
                                        <tr key={aluno.aluno_id} className="border-b border-[#F3F4F6]">
                                            <td className="px-3 py-3 font-medium text-[#111827]">{aluno.nome}</td>
                                            <td className="px-3 py-3">
                                                <span className={aluno.presente ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700'}>
                                                    {aluno.presente ? 'Presente' : 'Ausente'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-[#4B5563]">{aluno.presente ? formatarDataHora(aluno.registrada_em) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            <div className={Style.actionRow}>
                <button type="button" className={Style.secondaryButton} onClick={() => navigate(-1)}>
                    Voltar
                </button>
            </div>

        </div>
    );
}
