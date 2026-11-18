import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FotoPerfilCampo from "./FotoPerfilCampo";
import Style from "../styles/ProfessorForm.module.css";

export default function ProfessorForm({ initialData, onSubmit, isEditMode = true, fotoAtual = null, fotosDisponiveis = null }) {
    const [formData, setFormData] = useState(initialData || {
        nome: "",
        email: "",
        telefone_contato: "",
        senha: ""
    });

    const [errors, setErrors] = useState({});
    const [foto, setFoto] = useState(null);
    const [erroFoto, setErroFoto] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Limpa o erro do campo quando o usuário começa a digitar
        if (value.trim() !== "" && errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }

        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.nome.trim()) {
            newErrors.nome = "Campo obrigatório";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Campo obrigatório";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "E-mail inválido";
        }

        if (!formData.telefone_contato.trim()) {
            newErrors.telefone_contato = "Campo obrigatório";
        }

        // Senha é obrigatória apenas no cadastro (não na edição)
        /*if (!initialData && !formData.senha.trim()) {
            newErrors.senha = "Campo obrigatório";
        }*/

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // A data da foto vem dos dados carregados e não é editável aqui.
        const { foto_atualizada_em, ...dados } = formData;

        // Remove espaços extras
        const cleanData = {
            ...dados,
            nome: formData.nome.trim(),
            email: formData.email.trim(),
            telefone_contato: formData.telefone_contato.trim(),
            tipo_usuario: "professor"
        };

        // A foto vai à parte, porque só é enviada depois que os dados foram salvos.
        onSubmit(cleanData, foto);
    };

    return (
        <form onSubmit={handleSubmit} className={Style.form}>
            <FotoPerfilCampo
                tipoUsuario="professor"
                fotoAtual={fotoAtual}
                foto={foto}
                erro={erroFoto}
                disponivel={fotosDisponiveis}
                somenteLeitura={!isEditMode}
                onChange={(nova, problema) => { setFoto(nova); setErroFoto(problema); }}
            />

            {/* Nome Completo */}
            <div className={Style.formGroup}>
                <label className={Style.formLabel}>Nome Completo</label>
                <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    className={Style.formInput}
                    onChange={handleChange}
                    disabled={!isEditMode}
                />
                {errors.nome && <span className={Style.spanError}>{errors.nome}</span>}
            </div>

            {/* E-mail e Telefone - Lado a lado */}
            <div className={Style.formRow}>
                <div className={Style.formGroup}>
                    <label className={Style.formLabel}>E-mail institucional</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        className={Style.formInput}
                        onChange={handleChange}
                        disabled={!isEditMode}
                    />
                    {errors.email && <span className={Style.spanError}>{errors.email}</span>}
                </div>

                <div className={Style.formGroup}>
                    <label className={Style.formLabel}>Telefone</label>
                    <input
                        type="tel"
                        name="telefone_contato"
                        value={formData.telefone_contato}
                        className={Style.formInput}
                        onChange={handleChange}
                        disabled={!isEditMode}
                    />
                    {errors.telefone_contato && <span className={Style.spanError}>{errors.telefone_contato}</span>}
                </div>
            </div>

            {/* Senha - Apenas no cadastro */}
            {/*{!initialData && (
                <div className={Style.formGroup}>
                    <label className={Style.formLabel}>Senha</label>
                    <input
                        type="password"
                        name="senha"
                        value={formData.senha}
                        className={Style.formInput}
                        onChange={handleChange}
                        placeholder="Digite a senha"
                    />
                    {errors.senha && <span className={Style.spanError}>{errors.senha}</span>}
                </div>
            )}*/}

            {/* Botões */}
            <div className={Style.buttonGroup}>
                <button
                    type="button"
                    className={Style.buttonSecondary}
                    onClick={() => navigate(-1)}
                >
                    Voltar
                </button>
                {isEditMode && (
                    <button type="submit" className={Style.buttonPrimary}>
                        Salvar
                    </button>
                )}
            </div>
        </form>
    );
}