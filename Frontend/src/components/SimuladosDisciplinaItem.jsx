import React, { useState } from 'react'
import Style from "../styles/SimuladosDisciplinaItem.module.css";
import { confirmDialog } from 'primereact/confirmdialog';

export default function SimuladosDisciplinaItem({ disciplina, pesoRestante = 100, pesoMaximo = pesoRestante, pesoRestanteCarregando = false, toast, onClick, removeDisciplina, onUpdate }) {

    const [Disciplina, setDisciplina] = useState({
        quantidade_questoes: disciplina.quantidade_questoes || 0,
        peso: disciplina.peso || 0
    });

    const confirm = (disciplina) => {
        confirmDialog({
            message: 'Deseja excluir esta disciplina do simulado?',
            header: 'Exclusão',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="3rem" height="3rem" viewBox="0 0 24 24"><g fill="none"><path stroke="#ee4544" strokeLinecap="round" strokeWidth="1.5" d="M12 7v6" /><circle cx="12" cy="16" r="1" fill="#ee4544" /><path stroke="#ee4544" strokeLinecap="round" strokeWidth="1.5" d="M9.216 3c1.18-.667 1.954-1 2.784-1c1.114 0 2.128.6 4.157 1.802l.686.406c2.029 1.202 3.043 1.803 3.6 2.792c.557.99.557 2.19.557 4.594v.812c0 2.403 0 3.605-.557 4.594c-.557.99-1.571 1.59-3.6 2.791l-.686.407C14.128 21.399 13.114 22 12 22c-1.114 0-2.128-.6-4.157-1.802l-.686-.407c-2.029-1.2-3.043-1.802-3.6-2.791C3 16.01 3 14.81 3 12.406v-.812C3 9.19 3 7.989 3.557 7C3.996 6.22 4.719 5.682 6 4.9" /></g></svg>,
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            accept: () => removeDisciplina(disciplina),
            reject: () => reject()
        });
    }

    const reject = () => {
        if (toast && toast.current) {
            toast.current.show({ severity: 'warn', summary: 'Aviso', detail: 'Exclusão cancelada', life: 3000 });
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedDisciplina = {
            ...Disciplina,
            [name]: value
        };
        setDisciplina(updatedDisciplina);
        if (onUpdate) {
            onUpdate(disciplina.turma_disciplina_id, { ...disciplina, ...updatedDisciplina });
        }
    }

    return (
        <div className={Style.ContainerDisciplinasRow} onClick={onClick}>
            <div className={Style.ContainerDisciplinasCol} >
                {disciplina.materia.nome}
            </div>
            <div className={Style.ContainerDisciplinasCol} >
                {disciplina.professor.nome}
            </div>
            <div className={Style.ContainerDisciplinasCol} >
                <input value={Disciplina.quantidade_questoes} name='quantidade_questoes' type="number" min="0" max="100" className={Style.DisciplinasInput} onChange={handleChange} />
            </div>
            <div className={Style.ContainerDisciplinasCol} >
                <div className="flex flex-col items-center gap-1">
                    <div>
                        <input value={Disciplina.peso} name='peso' type="number" min="0" max={pesoMaximo} disabled={pesoRestanteCarregando} className={Style.DisciplinasInput} onChange={handleChange} /> %
                    </div>
                    <small className={pesoRestante === 0 ? "text-red-700" : "text-gray-600"}>
                        {pesoRestanteCarregando ? "Consultando..." : `Restante: ${pesoRestante}%`}
                    </small>
                </div>
            </div>
            <div className={Style.ContainerDisciplinasColAcoes}>
                <button className={Style.buttonDeleteDisciplina} onClick={(e) => { e.preventDefault(); e.stopPropagation(); confirm(disciplina); }}>
                    <svg className={Style.ContainerDisciplinasColIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2 7C2 4.23858 4.23858 2 7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7ZM7 4C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V7C20 5.34315 18.6569 4 17 4H7Z" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M8.29289 8.29289C8.68342 7.90237 9.31658 7.90237 9.70711 8.29289L12 10.5858L14.2929 8.29289C14.6834 7.90237 15.3166 7.90237 15.7071 8.29289C16.0976 8.68342 16.0976 9.31658 15.7071 9.70711L13.4142 12L15.7071 14.2929C16.0976 14.6834 16.0976 15.3166 15.7071 15.7071C15.3166 16.0976 14.6834 16.0976 14.2929 15.7071L12 13.4142L9.70711 15.7071C9.31658 16.0976 8.68342 16.0976 8.29289 15.7071C7.90237 15.3166 7.90237 14.6834 8.29289 14.2929L10.5858 12L8.29289 9.70711C7.90237 9.31658 7.90237 8.68342 8.29289 8.29289Z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}