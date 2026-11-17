import React, { useState, useEffect, useRef, use } from "react";
import { useNavigate } from "react-router-dom";
import Style from "../styles/SimuladosForm.module.css";
import { getAllTurmas, getOne } from "../api/turmasapi";
import { getByTurma } from "../api/simuladoApi";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { OverlayPanel } from "primereact/overlaypanel";
import SimuladosDisciplinaItem from "./SimuladosDisciplinaItem";
import SimuladosDisciplinaForm from "./SimuladosDisciplinaForm";

export default function SimuladosForm({ initialData, onSubmit, response }) {
    const [formData, setFormData] = useState(initialData || {
        numero: 0,
        tipo: "",
        bimestre: 0,
        data_realizacao: "",
        turma_id: "",
        conteudos: [],
    });
    const navigate = useNavigate();
    const [Turmas, setTurmas] = useState([]);
    const [pesosRestantes, setPesosRestantes] = useState({});
    const [erroPesos, setErroPesos] = useState("");
    const [carregandoPesos, setCarregandoPesos] = useState(false);
    const toast = useRef(null);
    const overlayRef = useRef(null);

    const removeDisciplina = (disciplinaToRemove) => {
        setFormData(prevData => ({
            ...prevData,
            conteudos: prevData.conteudos.filter(conteudo => conteudo.turma_disciplina_id !== disciplinaToRemove.turma_disciplina_id)
        }));
        if (toast && toast.current) {
            toast.current.show({ severity: 'success', summary: 'Sucesso', detail: 'Disciplina excluída com sucesso', life: 3000 });
        }
    };

    const handleUpdateDisciplina = (turma_disciplina_id, updatedDisciplina) => {
        setFormData(prevData => ({
            ...prevData,
            conteudos: prevData.conteudos.map(conteudo =>
                conteudo.turma_disciplina_id === turma_disciplina_id ? updatedDisciplina : conteudo
            )
        }));
    };

    useEffect(() => {
        if (response) {
            if (toast && toast.current) {
                toast.current.show({ severity: 'error', summary: 'Erro', detail: response.message, life: 5000 });
            }
        }
    }, [response]);

    const fetchTurmas = async () => {
        try {
            const response = await getAllTurmas();
            setTurmas(response.data.turmas);
        } catch (error) {
            console.error('Error fetching turmas:', error);
        }
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
        fetchTurmas();
    }, [initialData]);

    useEffect(() => {
        let mounted = true;

        if (!formData.turma_id || !formData.bimestre) {
            setPesosRestantes({});
            setErroPesos("");
            setCarregandoPesos(false);
            return () => {
                mounted = false;
            };
        }

        const fetchPesosRestantes = async () => {
            try {
                setCarregandoPesos(true);
                setErroPesos("");
                const response = await getByTurma(formData.turma_id);
                const simulados = Array.isArray(response.data?.simulados)
                    ? response.data.simulados
                    : [];
                const pesosUsados = {};

                simulados
                    .filter((simulado) => Number(simulado.bimestre) === Number(formData.bimestre))
                    .forEach((simulado) => {
                        (simulado.conteudos || []).forEach((conteudo) => {
                            const disciplinaId = String(conteudo.turma_disciplina_id);
                            pesosUsados[disciplinaId] =
                                (pesosUsados[disciplinaId] || 0) + Number(conteudo.peso ?? 1);
                        });
                    });

                if (mounted) {
                    setPesosRestantes(
                        Object.fromEntries(
                            Object.entries(pesosUsados).map(([disciplinaId, pesoUsado]) => [
                                disciplinaId,
                                Math.max(0, 100 - pesoUsado)
                            ])
                        )
                    );
                }
            } catch (error) {
                if (mounted) {
                    setPesosRestantes({});
                    setErroPesos("Não foi possível consultar os pesos já utilizados neste bimestre.");
                }
                console.error("Erro ao consultar pesos dos simulados:", error);
            } finally {
                if (mounted) {
                    setCarregandoPesos(false);
                }
            }
        };

        fetchPesosRestantes();

        return () => {
            mounted = false;
        };
    }, [formData.turma_id, formData.bimestre]);

    const fetchDisciplinas = async (e) => {
        e.preventDefault();
        const oldFormData = { ...formData };
        if (!formData.turma_id) {
            toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'Selecione uma turma antes de buscar disciplinas.', life: 3000 });
            return;
        }
        try {
            const response = await getOne(formData.turma_id);
            if (!response.data.turma.disciplinas[0]._id) {
                toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'A turma selecionada não possui disciplinas.', life: 3000 });
                return;
            }
            const newConteudos = [];
            response.data.turma.disciplinas.forEach(element => {
                newConteudos.push(
                    {
                        turma_disciplina_id: element._id,
                        materia: element.materia,
                        professor: element.professor,
                        quantidade_questoes: 0,
                        peso: 0
                    }
                );
            });
            newConteudos.forEach(conteudo => {
                if (oldFormData.conteudos.some(oldConteudo => oldConteudo.turma_disciplina_id === conteudo.turma_disciplina_id)) {
                    conteudo.quantidade_questoes = oldFormData.conteudos.find(oldConteudo => oldConteudo.turma_disciplina_id === conteudo.turma_disciplina_id).quantidade_questoes;
                    conteudo.peso = oldFormData.conteudos.find(oldConteudo => oldConteudo.turma_disciplina_id === conteudo.turma_disciplina_id).peso;
                }
            });
            setFormData(prevData => ({ ...prevData, conteudos: newConteudos }));
            if (JSON.stringify(oldFormData.conteudos) !== JSON.stringify(newConteudos)) {
                if (toast && toast.current) {
                    toast.current.show({ severity: 'success', summary: 'Aviso', detail: 'Disciplinas carregadas com sucesso', life: 3000 });
                }
            }
        } catch (error) {
            console.error('Error fetching turma:', error);
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    const handleChangeTurma = (e) => {
        const { name, value } = e.target;
        if (formData.turma_id !== value) {
            if (formData.conteudos.length > 0 && formData.conteudos[0].turma_disciplina_id) {
                confirmDialog({
                    message: 'Alterar a turma irá limpar as disciplinas selecionadas. Deseja continuar?',
                    header: 'Confirmação',
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="3rem" height="3rem" viewBox="0 0 24 24"><g fill="none"><path stroke="#ee4544" strokeLinecap="round" strokeWidth="1.5" d="M12 7v6" /><circle cx="12" cy="16" r="1" fill="#ee4544" /><path stroke="#ee4544" strokeLinecap="round" strokeWidth="1.5" d="M9.216 3c1.18-.667 1.954-1 2.784-1c1.114 0 2.128.6 4.157 1.802l.686.406c2.029 1.202 3.043 1.803 3.6 2.792c.557.99.557 2.19.557 4.594v.812c0 2.403 0 3.605-.557 4.594c-.557.99-1.571 1.59-3.6 2.791l-.686.407C14.128 21.399 13.114 22 12 22c-1.114 0-2.128-.6-4.157-1.802l-.686-.407c-2.029-1.2-3.043-1.802-3.6-2.791C3 16.01 3 14.81 3 12.406v-.812C3 9.19 3 7.989 3.557 7C3.996 6.22 4.719 5.682 6 4.9" /></g></svg>,
                    acceptClassName: 'p-button-danger',
                    acceptLabel: 'Sim',
                    rejectLabel: 'Não',
                    accept: () => {
                        if (toast && toast.current) {
                            toast.current.show({ severity: 'success', summary: 'Sucesso', detail: 'Turma alterada com sucesso', life: 3000 });
                        }
                        setFormData(prevData => ({ ...prevData, [name]: value, conteudos: [] }));
                    },
                    reject: () => {
                        if (toast && toast.current) {
                            toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'Alteração cancelada', life: 3000 });
                        }
                    }
                });
            }
            else {
                setFormData(prevData => ({ ...prevData, [name]: value, conteudos: [] }));
            }
        };
    };

    const handleChangeDate = (e) => {
        if (e.target.value < new Date().toISOString().split("T")[0]) {
            toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'A data é anterior à atual.', life: 3000 });
        }
        if (e.target.value === new Date().toISOString().split("T")[0]) {
            toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'A data é igual à data atual.', life: 3000 });
        }
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = (e) => {
        let error = false;
        e.preventDefault();

        const pesosValidos = document.getElementsByName("peso");
        const questoesValidas = document.getElementsByName("quantidade_questoes");

        if (formData.turma_id && formData.bimestre && (carregandoPesos || erroPesos)) {
            toast.current.show({
                severity: "error",
                summary: "Erro",
                detail: erroPesos || "Aguarde a consulta dos pesos utilizados neste bimestre.",
                life: 5000
            });
            return;
        }

        Array.from(pesosValidos).forEach(element => {
            if (element.value <= 0) {
                element.reportValidity();
                element.focus();
                element.setCustomValidity("O peso deve ser maior que zero.");
                error = true;
                return;
            }
            if (element.value > 100) {
                element.reportValidity();
                element.focus();
                element.setCustomValidity("O peso não pode ser maior que 100.");
                error = true;
                return;
            }
        });
        Array.from(questoesValidas).forEach(element => {
            if (element.value <= 0) {
                element.reportValidity();
                element.focus();
                element.setCustomValidity("A quantidade de questões deve ser maior que zero.");
                error = true;
                return;
            }
            if (element.value > 10) {
                element.reportValidity();
                element.focus();
                element.setCustomValidity("A quantidade de questões não pode ser maior que 10.");
                error = true;
                return;
            }
        });

        if (!formData.turma_id) {
            const input_turma_id = document.getElementById("input_turma_id");
            if (input_turma_id) {
                input_turma_id.focus();
                input_turma_id.setCustomValidity("A turma é obrigatória.");
                input_turma_id.reportValidity();
            }
            return;
        }
        if (!formData.bimestre) {
            const input_bimestre = document.getElementById("input_bimestre");
            if (input_bimestre) {
                input_bimestre.focus();
                input_bimestre.setCustomValidity("O bimestre é obrigatório.");
                input_bimestre.reportValidity();
            }
            return;
        }
        if (!formData.tipo) {
            const input_tipo = document.getElementById("input_tipo");
            if (input_tipo) {
                input_tipo.focus();
                input_tipo.setCustomValidity("O tipo é obrigatório.");
                input_tipo.reportValidity();
            }
            return;
        }
        if (!formData.numero) {
            const input_numero = document.getElementById("input_numero");
            if (input_numero) {
                input_numero.focus();
                input_numero.setCustomValidity("O número é obrigatório.");
                input_numero.reportValidity();
            }
            return;
        }
        if (!formData.data_realizacao) {
            const input_data_realizacao = document.getElementById("input_data_realizacao");
            if (input_data_realizacao) {
                input_data_realizacao.focus();
                input_data_realizacao.setCustomValidity("A data de realização é obrigatória.");
                input_data_realizacao.reportValidity();
            }
            return;
        }
        if (formData.conteudos.length === 0) {
            toast.current.show({ severity: 'error', summary: 'Erro', detail: 'Adicione pelo menos uma disciplina.', life: 5000 });
        }

        if (!formData.turma_id || !formData.bimestre || !formData.tipo || !formData.numero || !formData.data_realizacao || formData.conteudos.length === 0 || !questoesValidas || !pesosValidos) {
            return;
        }
        if (!error) {
            const dataParts = formData.data_realizacao.split('-');
            const dataCorrigida = new Date(dataParts[0], dataParts[1] - 1, dataParts[2], 0, 0, 0);

            const dataSubmit = {
                ...formData,
                data_realizacao: dataCorrigida.toISOString()
            };

            onSubmit(dataSubmit);
        }
    };


    const handleAddDisciplina = (disciplina) => {
        overlayRef.current.hide();
        const exists = formData.conteudos.some(conteudo => conteudo.turma_disciplina_id === disciplina._id);
        if (exists) {
            toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'Esta disciplina já foi adicionada.', life: 3000 });
            return;
        }
        const novaConteudo = {
            turma_disciplina_id: disciplina._id,
            materia: disciplina.materia,
            professor: disciplina.professor,
            quantidade_questoes: 0,
            peso: 0
        };
        setFormData(prevData => ({
            ...prevData,
            conteudos: [...prevData.conteudos, novaConteudo]
        }));
    };


    return (
        <div>
            <Toast ref={toast} />
            <ConfirmDialog />
            <OverlayPanel ref={overlayRef} >
                <SimuladosDisciplinaForm toast={toast} turma_id={formData.turma_id} overlayRef={overlayRef} onSubmit={handleAddDisciplina} />
            </OverlayPanel>
            <form>
                <div className={Style.formGroup}>
                    <div className={Style.formSelectContainerLarge}>
                        <select
                            id="input_turma_id"
                            name="turma_id"
                            value={String(formData.turma_id)}
                            className={Style.formSelect}
                            onChange={handleChangeTurma}
                        >
                            <option className={Style.formOption} value="">Turma</option>
                            {Turmas.map((turma) => (
                                <option className={Style.formOption} key={turma._id} value={turma._id}>
                                    {turma.ano} - {turma.serie}º EM
                                </option>
                            ))}
                        </select>
                        <svg className={Style.formSelectArrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z" />
                        </svg>
                    </div>
                    <div className={Style.formSelectContainerLarge}>
                        <select
                            id="input_bimestre"
                            name="bimestre"
                            value={String(formData.bimestre)}
                            className={Style.formSelect}
                            onChange={handleChange}
                        >
                            <option className={Style.formOption} value=""> Bimestre</option>
                            {[1, 2, 3, 4].map(bimestre => (
                                <option className={Style.formOption} key={bimestre} value={bimestre}>
                                    {bimestre}º Bimestre
                                </option>
                            ))}
                        </select>
                        <svg className={Style.formSelectArrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z" />
                        </svg>
                    </div>
                </div>
                <div className={Style.formGroup}>
                    <div className={Style.formSelectContainerLarge}>
                        <select
                            id="input_tipo"
                            name="tipo"
                            value={String(formData.tipo)}
                            className={Style.formSelect}
                            onChange={handleChange}
                        >
                            <option className={Style.formOption} value=""> Tipo</option>
                            <option className={Style.formOption} key="dissertativo" value="dissertativo">
                                Dissertativo
                            </option>
                            <option className={Style.formOption} key="objetivo" value="objetivo">
                                Objetivo
                            </option>
                        </select>
                        <svg className={Style.formSelectArrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z" />
                        </svg>
                    </div>
                    <div className={Style.formSelectContainerLarge}>
                        <select
                            className={Style.formSelect}
                            id="input_numero" name="numero"
                            value={formData.numero}
                            onChange={handleChange}>
                            <option className={Style.formOption} value=""> Numeração</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <option className={Style.formOption} key={num} value={num}>
                                    {num}
                                </option>
                            ))}
                        </select>
                        <svg className={Style.formSelectArrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z" />
                        </svg>
                    </div>
                    <div className={Style.formSelectContainer}>
                        <input
                            type="date"
                            id="input_data_realizacao"
                            name="data_realizacao"
                            value={formData.data_realizacao}
                            className={Style.formInput}
                            onChange={handleChangeDate}
                        />
                    </div>
                </div>
                <div className={Style.formGroupDisciplinas}>
                    <button onClick={(e) => {
                        e.preventDefault();
                        if (!formData.turma_id) {
                            toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'Selecione uma turma antes de buscar disciplinas.', life: 3000 });
                            return;
                        }
                        overlayRef.current.toggle(e)
                    }} className={Style.buttonDisciplinas}>
                        <svg className={Style.buttonDisciplinasIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 7C12.5523 7 13 7.44772 13 8V11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H13V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11H11V8C11 7.44772 11.4477 7 12 7Z" />
                        </svg>
                        Adicionar uma disciplina
                    </button>

                    <button onClick={fetchDisciplinas} className={Style.buttonDisciplinasLarge}>
                        <svg className={Style.buttonDisciplinasIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 7C12.5523 7 13 7.44772 13 8V11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H13V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11H11V8C11 7.44772 11.4477 7 12 7Z" />
                        </svg>
                        Adicionar todas as disciplinas
                    </button>
                </div>
                <div className={Style.SimuladoContainerDisciplinas}>
                    <div className={Style.ContainerDisciplinasHeader}>
                        <div className={Style.ContainerDisciplinasCol}>
                            Disciplina
                        </div>
                        <div className={Style.ContainerDisciplinasCol}>
                            Professor
                        </div>
                        <div className={Style.ContainerDisciplinasCol}>
                            Nº Questões
                        </div>
                        <div className={Style.ContainerDisciplinasCol}>
                            Peso
                        </div>
                        <div className={Style.ContainerDisciplinasColAcoes}>
                        </div>
                    </div>
                    {formData.conteudos.length === 0 || !formData.conteudos[0].turma_disciplina_id ? (
                        <div className={Style.ContainerDisciplinasEmpty}>
                            Nenhuma disciplina adicionada.
                        </div>
                    ) : (
                        [...formData.conteudos].sort((a, b) => (a.materia.nome || '').localeCompare(b.materia.nome || '')).map((disciplina, index) => (
                            <SimuladosDisciplinaItem
                                key={disciplina.turma_disciplina_id || index}
                                disciplina={disciplina}
                                pesoRestante={pesosRestantes[String(disciplina.turma_disciplina_id)] ?? 100}
                                pesoRestanteCarregando={carregandoPesos}
                                removeDisciplina={removeDisciplina}
                                onUpdate={handleUpdateDisciplina}
                                toast={toast}
                            />
                        ))
                    )}
                </div>
                {erroPesos && (
                    <p className="mb-4 rounded bg-yellow-50 p-3 text-yellow-800">
                        {erroPesos}
                    </p>
                )}
                <div className={Style.buttonGroup}>
                    <div className={Style.buttonGroup}>

                        <button
                            type="button"
                            className={Style.buttonSecondary}
                            onClick={() => {
                                confirmDialog({
                                    message: 'Deseja realmente cancelar o cadastro do simulado? As alterações não serão salvas.',
                                    header: 'Confirmação',
                                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="3rem" height="3rem" viewBox="0 0 24 24"><g fill="none"><path stroke="#ee4544" strokeLinecap="round" strokeWidth="1.5" d="M12 7v6" /><circle cx="12" cy="16" r="1" fill="#ee4544" /><path stroke="#ee4544" strokeLinecap="round" strokeWidth="1.5" d="M9.216 3c1.18-.667 1.954-1 2.784-1c1.114 0 2.128.6 4.157 1.802l.686.406c2.029 1.202 3.043 1.803 3.6 2.792c.557.99.557 2.19.557 4.594v.812c0 2.403 0 3.605-.557 4.594c-.557.99-1.571 1.59-3.6 2.791l-.686.407C14.128 21.399 13.114 22 12 22c-1.114 0-2.128-.6-4.157-1.802l-.686-.407c-2.029-1.2-3.043-1.802-3.6-2.791C3 16.01 3 14.81 3 12.406v-.812C3 9.19 3 7.989 3.557 7C3.996 6.22 4.719 5.682 6 4.9" /></g></svg>,
                                    acceptClassName: 'p-button-danger',
                                    acceptLabel: 'Sim',
                                    rejectLabel: 'Não',
                                    accept: () => {
                                        navigate(-1)
                                    },
                                    reject: () => {
                                        if (toast && toast.current) {
                                            toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'Mudança de página cancelada', life: 3000 });
                                        }
                                    }
                                });
                            }}>
                            Cancelar
                        </button>
                        <button type="submit" className={Style.buttonPrimary} onClick={handleSubmit}>
                            Cadastrar Simulado
                        </button>
                    </div>
                </div>
            </form >
        </div >
    );
}