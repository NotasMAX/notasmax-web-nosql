import { createHash } from 'node:crypto';
import { codigoDoErro, containerDaAzure, emProducao } from './blobStorage.js';

const PASTA = 'importacoes-notas';
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// O nome vem do conteúdo: o mesmo arquivo enviado para vários alunos da turma vira um blob só.
// O nome original fica só no banco, porque vem do usuário e pode ter acento ou barra.
export const nomeDoBlob = ({ buffer, turma_id, bimestre }) => {
    const conteudo = createHash('sha256').update(buffer).digest('hex');
    return `${PASTA}/${turma_id}/${bimestre}/${conteudo}.xlsx`;
};

const jaExiste = (erro) => ['BlobAlreadyExists', 'ConditionNotMet'].includes(codigoDoErro(erro));

export const criarArmazenamento = ({ obterContainer = containerDaAzure, ativo = emProducao } = {}) => {
    let container = null;
    const doContainer = () => {
        container ??= obterContainer();
        return container;
    };

    return {
        /**
         * Guarda a planilha e devolve { nome, novo }, ou null quando o ambiente não guarda planilhas.
         * "novo" é falso quando o mesmo arquivo já estava guardado, por outra importação.
         */
        async guardar({ buffer, turma_id, bimestre }) {
            if (!ativo()) {
                console.warn('Planilha não guardada: o Blob Storage só é usado em produção.');
                return null;
            }

            const nome = nomeDoBlob({ buffer, turma_id, bimestre });
            try {
                // Sem sobrescrever: a gravação só acontece se o blob ainda não existe.
                await doContainer().getBlockBlobClient(nome).uploadData(buffer, {
                    blobHTTPHeaders: { blobContentType: TIPO_XLSX },
                    conditions: { ifNoneMatch: '*' },
                });
                return { nome, novo: true };
            } catch (erro) {
                if (jaExiste(erro)) return { nome, novo: false };
                throw erro;
            }
        },

        async apagar(nome) {
            if (!nome) return;
            await doContainer().getBlockBlobClient(nome).deleteIfExists();
        },
    };
};

// Objeto único, para os testes do controller trocarem os métodos com t.mock.method.
export const armazenamentoPlanilhas = criarArmazenamento();
