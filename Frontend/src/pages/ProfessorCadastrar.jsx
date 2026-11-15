import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ProfessorForm from '../components/ProfessorForm';
import { createProfessor } from '../api/usuariosapi';
import Style from '../styles/ProfessorForm.module.css';
import { Toast } from 'primereact/toast';
import { useToast } from '../hooks/useToast';
import { useFotosDisponiveis } from '../hooks/useFotosDisponiveis';
import { avisoDeFotoNaoSalva, enviarFotoEscolhida } from '../utils/fotoPerfil';

export default function ProfessorCadastrar() {

    useEffect(() => {
        document.title = 'NotasMAX - Cadastrar Professor';
    }, []);

    const navigate = useNavigate();
    const { toast, showError, showSuccessOnRedirect, showWarnOnRedirect } = useToast();
    const fotosDisponiveis = useFotosDisponiveis();

    const handleCreate = async (formData, foto) => {
        let criado;
        try {
            ({ data: criado } = await createProfessor(formData));
        } catch (error) {
            console.error("Erro ao cadastrar professor:", error);
            showError(error.response?.data?.error || "Erro ao cadastrar professor.");
            return;
        }

        // O professor já existe: se só a foto falhar, o cadastro fica, com um aviso.
        const problemaNaFoto = await enviarFotoEscolhida(criado?._id, foto);
        if (problemaNaFoto) {
            showWarnOnRedirect(avisoDeFotoNaoSalva('Professor cadastrado', problemaNaFoto, 'Edite o professor para enviá-la novamente.'));
        } else {
            showSuccessOnRedirect('Professor cadastrado com sucesso!');
        }
        navigate('/Professores');
    };

    return (
        <div>
            <Toast ref={toast} />
            <h2 className={Style.pageTitle}>Cadastrar Professor</h2>
            <ProfessorForm onSubmit={handleCreate} fotosDisponiveis={fotosDisponiveis} />
        </div>
    );
}
