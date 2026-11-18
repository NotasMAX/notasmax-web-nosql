import { useRef, useEffect } from 'react';

const TITULOS = { success: 'Sucesso', error: 'Erro', warn: 'Atenção', info: 'Informação' };

export const useToast = () => {
    const toast = useRef(null);

    // Verifica se há mensagem pendente no sessionStorage
    useEffect(() => {
        const pendingMessage = sessionStorage.getItem('toastMessage');
        const pendingSeverity = sessionStorage.getItem('toastSeverity');
        
        if (pendingMessage && pendingSeverity) {
            // Aguarda um pouco para garantir que o componente foi montado
            setTimeout(() => {
                toast.current?.show({
                    severity: pendingSeverity,
                    summary: TITULOS[pendingSeverity] ?? 'Erro',
                    detail: pendingMessage,
                    life: 3000
                });
            }, 100);
            
            // Limpa a mensagem do sessionStorage
            sessionStorage.removeItem('toastMessage');
            sessionStorage.removeItem('toastSeverity');
        }
    }, []);

    const showSuccess = (message = 'Operação realizada com sucesso!') => {
        toast.current?.show({
            severity: 'success',
            summary: 'Sucesso',
            detail: message,
            life: 3000
        });
    };

    const showError = (message = 'Erro ao realizar operação.') => {
        toast.current?.show({
            severity: 'error',
            summary: 'Erro',
            detail: message,
            life: 3000
        });
    };

    const showInfo = (message) => {
        toast.current?.show({
            severity: 'info',
            summary: 'Informação',
            detail: message,
            life: 3000
        });
    };

    const showWarn = (message) => {
        toast.current?.show({
            severity: 'warn',
            summary: 'Atenção',
            detail: message,
            life: 3000
        });
    };

    // Função para agendar toast após navegação
    const showSuccessOnRedirect = (message) => {
        sessionStorage.setItem('toastMessage', message);
        sessionStorage.setItem('toastSeverity', 'success');
    };

    const showErrorOnRedirect = (message) => {
        sessionStorage.setItem('toastMessage', message);
        sessionStorage.setItem('toastSeverity', 'error');
    };

    const showWarnOnRedirect = (message) => {
        sessionStorage.setItem('toastMessage', message);
        sessionStorage.setItem('toastSeverity', 'warn');
    };

    return {
        toast,
        showSuccess,
        showError,
        showInfo,
        showWarn,
        showSuccessOnRedirect,
        showErrorOnRedirect,
        showWarnOnRedirect
    };
};