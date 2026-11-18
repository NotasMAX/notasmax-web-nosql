import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProfessorForm from '../components/ProfessorForm';
import { getUsuario, updateUsuario } from '../api/usuariosapi';
import Style from '../styles/ProfessorForm.module.css';
import { Toast } from 'primereact/toast';
import { useToast } from '../hooks/useToast';
import { useFotosDisponiveis } from '../hooks/useFotosDisponiveis';
import { avisoDeFotoNaoSalva, enviarFotoEscolhida, fotoUsuarioUrl } from '../utils/fotoPerfil';

export default function ProfessorEditar() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showError, showSuccessOnRedirect, showWarnOnRedirect } = useToast();
    const fotosDisponiveis = useFotosDisponiveis();
    const [professor, setProfessor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.title = 'NotasMAX - Editar Professor';
    }, []);

    useEffect(() => {
        const fetchProfessor = async () => {
            try {
                const res = await getUsuario(id);
                setProfessor(res.data);
            } catch (err) {
                console.error('Erro ao buscar professor:', err);
                setError('Erro ao carregar professor.');
                showError('Erro ao carregar professor.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProfessor();
        }
    }, [id]);

    const handleUpdate = async (formData, foto) => {
        try {
            await updateUsuario(id, formData);
        } catch (error) {
            console.error("Erro ao atualizar professor:", error);
            showError(error.response?.data?.error || "Erro ao atualizar professor.");
            return;
        }

        // Os dados já foram salvos: se só a foto falhar, eles ficam, com um aviso.
        const problemaNaFoto = await enviarFotoEscolhida(id, foto);
        if (problemaNaFoto) {
            showWarnOnRedirect(avisoDeFotoNaoSalva('Professor atualizado', problemaNaFoto, 'Tente enviá-la novamente.'));
        } else {
            showSuccessOnRedirect('Professor atualizado com sucesso!');
        }
        navigate('/Professores');
    };

    if (loading) return <div className="p-4">Carregando...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div>
            <Toast ref={toast} />
            <h2 className={Style.pageTitle}>Editar Professor</h2>
            {professor && (
                <ProfessorForm
                    initialData={professor}
                    onSubmit={handleUpdate}
                    fotoAtual={fotoUsuarioUrl(id, professor.foto_atualizada_em)}
                    fotosDisponiveis={fotosDisponiveis}
                />
            )}
        </div>
    );
}