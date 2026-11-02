/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const axios = require('axios');
const app = require('../server');

let server;

before(async () => {
  server = app.listen(0);
});

after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(() => resolve()));
  }
});

test('GET /health deve retornar sucesso', async () => {
  const port = server.address().port;
  const res = await axios.get(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'Success');
  assert.equal(res.data.service, 'fts-backend-proxy');
});

test('GET /health deve responder rapidamente', async () => {
  const port = server.address().port;
  const start = Date.now();
  const res = await axios.get(`http://127.0.0.1:${port}/health`);
  const elapsed = Date.now() - start;
  assert.equal(res.status, 200);
  assert.ok(elapsed < 2000);
});

test('deve gerar X-Request-Id quando o cliente não envia', async () => {
  const port = server.address().port;
  const res = await axios.get(`http://127.0.0.1:${port}/health`);
  assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/i);
});

test('deve reutilizar o X-Request-Id enviado pelo cliente', async () => {
  const port = server.address().port;
  const res = await axios.get(`http://127.0.0.1:${port}/health`, {
    headers: { 'X-Request-Id': 'corr-123' }
  });
  assert.equal(res.headers['x-request-id'], 'corr-123');
});

test('rota inexistente deve retornar 404 com requestId', async () => {
  const port = server.address().port;
  await assert.rejects(
    () => axios.get(`http://127.0.0.1:${port}/nao-existe`),
    (error) => {
      assert.equal(error.response.status, 404);
      assert.equal(error.response.data.error, 'Rota não encontrada');
      assert.ok(error.response.data.requestId);
      return true;
    }
  );
});

test('POST /upload sem parâmetros deve retornar 400', async () => {
  const port = server.address().port;
  await assert.rejects(
    () => axios.post(`http://127.0.0.1:${port}/upload`, {}),
    (error) => {
      assert.equal(error.response.status, 400);
      assert.ok(error.response.data.error.includes('prefix'));
      return true;
    }
  );
});

test('GET /files com prefix inválido deve retornar 400', async () => {
  const port = server.address().port;
  await assert.rejects(
    () => axios.get(`http://127.0.0.1:${port}/files?prefix=%20`),
    (error) => {
      assert.equal(error.response.status, 400);
      return true;
    }
  );
});
