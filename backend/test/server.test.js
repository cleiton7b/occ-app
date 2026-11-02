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
