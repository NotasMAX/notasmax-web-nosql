import test from 'node:test';
import assert from 'node:assert/strict';
import { codigoDoErro, containerDaAzure, emProducao } from '../services/blobStorage.js';
import { comAmbiente } from './ambiente.js';

test('the Azure container uses the endpoint and container from the configuration', (t) => {
  comAmbiente(t, { AZURE_STORAGE_BLOB_ENDPOINT: 'https://exemplo.blob.core.windows.net', AZURE_STORAGE_CONTAINER_NAME: 'planilhas' });

  const container = containerDaAzure();

  assert.equal(container.containerName, 'planilhas');
  assert.equal(container.url, 'https://exemplo.blob.core.windows.net/planilhas');
});

test('only production uses the Blob Storage', (t) => {
  comAmbiente(t, { NODE_ENV: 'production' });
  assert.equal(emProducao(), true);

  process.env.NODE_ENV = 'development';
  assert.equal(emProducao(), false);
});

test('reads the Blob Storage error code where the SDK puts it', () => {
  assert.equal(codigoDoErro({ details: { errorCode: 'BlobNotFound' } }), 'BlobNotFound');
  assert.equal(codigoDoErro(new Error('sem código')), undefined);
  assert.equal(codigoDoErro(undefined), undefined);
});
