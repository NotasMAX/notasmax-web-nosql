import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AlunoForm from '../components/AlunoForm';
import { createAluno } from '../api/usuariosapi';
import Style from '../styles/AlunoForm.module.css';
import { Toast } from 'primereact/toast';
import { useToast } from '../hooks/useToast';
import { useFotosDisponiveis } from '../hooks/useFotosDisponiveis';
import { avisoDeFotoNaoSalva, enviarFotoEscolhida } from '../utils/fotoPerfil';
import StyleTitle from '../styles/Title.module.css';

export default function AlunoCadastrar() {

    useEffect(() => {
        document.title = 'NotasMAX - Cadastrar Aluno';
    }, []);

    const navigate = useNavigate();
    const { toast, showError, showSuccessOnRedirect, showWarnOnRedirect } = useToast();
    const fotosDisponiveis = useFotosDisponiveis();

    const handleCreate = async (formData, foto) => {
        let criado;
        try {
            ({ data: criado } = await createAluno(formData));
        } catch (error) {
            console.error("Erro ao cadastrar aluno:", error);
            showError(error.response?.data?.error || "Erro ao cadastrar aluno.");
            return;
        }

        // O aluno já existe: se só a foto falhar, o cadastro fica, com um aviso.
        const problemaNaFoto = await enviarFotoEscolhida(criado?._id, foto);
        if (problemaNaFoto) {
            showWarnOnRedirect(avisoDeFotoNaoSalva('Aluno cadastrado', problemaNaFoto, 'Edite o aluno para enviá-la novamente.'));
        } else {
            showSuccessOnRedirect('Aluno cadastrado com sucesso!');
        }
        navigate('/Alunos');
    };

    return (
        <div>

            <Toast ref={toast} />
            <h2 className={StyleTitle.titlePage}>Cadastrar Aluno</h2>
            <AlunoForm onSubmit={handleCreate} fotosDisponiveis={fotosDisponiveis} />
        </div>
    );
}
