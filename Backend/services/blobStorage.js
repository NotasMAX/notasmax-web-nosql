import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { getBlobStorageConfig } from '../config.js';

// Na Container App, a identidade gerenciada já tem permissão no container: nenhuma chave entra no código.
export const containerDaAzure = () => {
    const { endpoint, containerName } = getBlobStorageConfig();
    return new BlobServiceClient(endpoint, new DefaultAzureCredential()).getContainerClient(containerName);
};

// Fora da Azure não existe identidade gerenciada, então só o ambiente de produção usa o Blob Storage.
export const emProducao = () => process.env.NODE_ENV === 'production';

// Código do erro do Blob Storage, no mesmo campo que o SDK consulta nos métodos "IfExists" e "IfNotExists".
export const codigoDoErro = (erro) => erro?.details?.errorCode;
