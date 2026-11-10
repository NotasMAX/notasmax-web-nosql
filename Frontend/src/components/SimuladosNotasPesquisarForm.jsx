import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Style from "../styles/SimuladosNotasPesquisarForm.module.css";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";

export default function SimuladosNotasPesquisarForm({ onSubmit, simulados, simulado, turma_id }) {
    const [formData, setFormData] = useState({
        simulado_id: "",
        bimestre: 0
    });
    const navigate = useNavigate();
    const bimestresDisponiveis = [...new Set((simulados || [])
        .map(item => Number(item.bimestre))
        .filter(bimestre => Number.isFinite(bimestre) && bimestre >= 1))]
        .sort((a, b) => a - b);

    useEffect(() => {
        if (simulado) {
            setFormData(prev => ({
                ...prev,
                simulado_id: simulado._id,
                bimestre: simulado.bimestre
            }));
        }
    }, [simulado]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (value !== simulado?._id) {
            confirmDialog({
                message: `Tem certeza de que deseja alterar o simulado neste momento? O processo reiniciará a partir do primeiro aluno.`,
                header: 'Confirmação',
                icon: <svg xmlns="http://www.w3.org/2000/svg" width="3rem" height="3rem" viewBox="0 0 24 24"><g fill="none"><path stroke="#ee4544" strokeLinecap="round" strokeWidth="1.5" d="M12 7v6" /><circle cx="12" cy="16" r="1" fill="#ee4544" /><path stroke="#ee4544" strokeLinecap="round" strokeWidth="1.5" d="M9.216 3c1.18-.667 1.954-1 2.784-1c1.114 0 2.128.6 4.157 1.802l.686.406c2.029 1.202 3.043 1.803 3.6 2.792c.557.99.557 2.19.557 4.594v.812c0 2.403 0 3.605-.557 4.594c-.557.99-1.571 1.59-3.6 2.791l-.686.407C14.128 21.399 13.114 22 12 22c-1.114 0-2.128-.6-4.157-1.802l-.686-.407c-2.029-1.2-3.043-1.802-3.6-2.791C3 16.01 3 14.81 3 12.406v-.812C3 9.19 3 7.989 3.557 7C3.996 6.22 4.719 5.682 6 4.9" /></g></svg>,
                acceptClassName: 'p-button-danger',
                acceptLabel: 'Sim',
                rejectLabel: 'Não',
                accept: () => {
                    navigate(`/Turmas/${turma_id}/Simulados/${value}/Notas/`, { replace: true, state: { message: 'Simulado alterado com sucesso', type: 'success' } });
                },
                reject: () => {
                }
            }
            );
            return;
        }
    }

    const handleChangeBimestre = (e) => {
        const { value } = e.target;

        if (value == simulado?.bimestre){
            setFormData(prev => ({
                ...prev,
                bimestre: simulado.bimestre,
                simulado_id: simulado._id
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            bimestre: value,
            simulado_id: ""
        }));
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    }

    return (
        <form className={Style.formContainer} onSubmit={handleSubmit}>
            <ConfirmDialog />
            <div className={Style.formContainerOption}>
                <label htmlFor="bimestre" className={Style.formLabel}>Bimestre</label>
                <div className={Style.formSelectContainer}>
                    <select
                        required
                        name="bimestre"
                        id="bimestre"
                        value={String(formData.bimestre)}
                        className={Style.formSelect}
                        onChange={handleChangeBimestre}
                    >
                        {bimestresDisponiveis.map(bimestre => (
                            <option className={Style.formOption} key={`bimestre-${bimestre}`} value={bimestre}>
                                {bimestre}º Bimestre
                            </option>
                        ))}
                    </select>
                    <svg className={Style.formSelectArrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z" />
                    </svg>
                </div>
            </div>
            <div className={Style.formContainerOption}>
                <label htmlFor="Simulado" className={Style.formLabel}>Simulado</label>
                <div className={Style.formSelectContainer}>
                    <select
                        required
                        name="Simulado"
                        id="Simulado"
                        value={String(formData.simulado_id)}
                        className={Style.formSelect}
                        onChange={handleChange}
                    >
                        <option className={Style.formOption} value="" disabled>Selecione</option>
                        {simulados.filter(s => s.bimestre == formData.bimestre).map(simulado => (
                            <option className={Style.formOption} key={simulado._id} value={simulado._id}>
                                Simulado {simulado.numero}
                            </option>
                        ))}
                    </select>
                    <svg className={Style.formSelectArrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z" />
                    </svg>
                </div>
            </div>
        </form>
    );
}