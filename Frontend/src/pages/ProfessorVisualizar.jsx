import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUsuario } from '../api/usuariosapi';
import FotoPerfil from '../components/FotoPerfil';
import { fotoUsuarioUrl } from '../utils/fotoPerfil';
import Style from '../styles/ProfessorForm.module.css';
import StyleFoto from '../styles/FotoPerfil.module.css';

export default function ProfessorVisualizar() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [professor, setProfessor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.title = 'NotasMAX - Informações do Professor';
    }, []);

    useEffect(() => {
        const fetchProfessor = async () => {
            try {
                const res = await getUsuario(id);
                setProfessor(res.data);
            } catch (err) {
                console.error('Erro ao buscar professor:', err);
                setError('Erro ao carregar informações do professor.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProfessor();
        }
    }, [id]);

    if (loading) return <div className="p-4">Carregando informações...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;
    if (!professor) return <div className="p-4">Professor não encontrado.</div>;

    return (
        <div>
            <h2 className={Style.pageTitle}>Informações Professor</h2>

            <div className={Style.form}>
                {/* Foto */}
                <div className={StyleFoto.blocoFoto}>
                    <FotoPerfil src={fotoUsuarioUrl(id, professor.foto_atualizada_em)} alt={`Foto de ${professor.nome}`} tipoUsuario="professor" />
                </div>

                {/* Nome Completo */}
                <div className={Style.formGroup}>
                    <label className={Style.formLabel}>Nome Completo</label>
                    <div className={Style.formInputReadonly}>
                        {professor.nome}
                    </div>
                </div>

                {/* E-mail e Telefone - Lado a lado */}
                <div className={Style.formRow}>
                    <div className={Style.formGroup}>
                        <label className={Style.formLabel}>E-mail institucional</label>
                        <div className={Style.formInputReadonly}>
                            {professor.email}
                        </div>
                    </div>

                    <div className={Style.formGroup}>
                        <label className={Style.formLabel}>Telefone</label>
                        <div className={Style.formInputReadonly}>
                            {professor.telefone_contato}
                        </div>
                    </div>
                </div>

                {/* Botões */}
                <div className={Style.buttonGroup}>
                    <button
                        type="button"
                        className={Style.buttonSecondary}
                        onClick={() => navigate(-1)}
                    >
                        Voltar
                    </button>
                    <button 
                        type="button"
                        className={Style.buttonPrimary}
                        onClick={() => navigate(`/Professores/Editar/${id}`)}
                    >
                        Editar
                    </button>
                </div>
            </div>
        </div>
    );
}