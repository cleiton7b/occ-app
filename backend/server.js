const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Segurança headers e compressão de respostas
app.use(helmet());
app.use(compression());

// CORS restrito à origem do frontend (configurable via CORS_ORIGIN)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
  })
);

// Rate limiting para proteção da API proxy
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json());

// Log simples de requisições
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[Req] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Função para ler dinamicamente o arquivo .env e carregar múltiplos ambientes (ENV1, ENV2, ENV3...)
function loadEnvironments() {
  const envPath = path.resolve(__dirname, '.env');
  const envs = {};

  if (!fs.existsSync(envPath)) {
    console.warn('[Env Warning] Arquivo .env não encontrado em:', envPath);
    return envs;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  let currentEnvKey = null;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.substring(0, eqIdx).trim();
    const val = line.substring(eqIdx + 1).trim();

    // Identifica declaração de novo ambiente: ENV1=STAGE_APCS, ENV2=DEV_APCS...
    if (/^ENV\d*$/i.test(key)) {
      currentEnvKey = val;
      if (!envs[currentEnvKey]) {
        envs[currentEnvKey] = {};
      }
      continue;
    }

    // Se temos um ambiente ativo, associa os campos conhecidos
    const validFields = ['TENANT', 'BASE_URL', 'IDCS_URL', 'IDCS_CLIENTID', 'IDCS_CLIENTSECRET', 'IDCS_SCOPE'];
    const upperKey = key.toUpperCase();

    if (currentEnvKey && validFields.includes(upperKey)) {
      envs[currentEnvKey][upperKey] = val;
      continue;
    }

    // Suporte complementar a formato prefixado (ex: STAGE-APCS_TENANT=... ou DEV_TENANT=...)
    const prefixMatch = key.match(/^([A-Za-z0-9_-]+)_(TENANT|BASE_URL|IDCS_URL|IDCS_CLIENTID|IDCS_CLIENTSECRET|IDCS_SCOPE)$/i);
    if (prefixMatch) {
      const pfx = prefixMatch[1];
      const field = prefixMatch[2].toUpperCase();
      if (!envs[pfx]) {
        envs[pfx] = {};
      }
      envs[pfx][field] = val;
    }
  }

  return envs;
}

// Carrega os ambientes
const ENVS = loadEnvironments();
const envKeys = Object.keys(ENVS);

let currentEnv = envKeys.length > 0 ? envKeys[0] : 'STAGE_APCS';
let cachedToken = null;
let tokenExpiry = 0;

console.log('[Env] Ambientes carregados do .env:', envKeys);
console.log('[Env] Ambiente ativo inicial:', currentEnv);

function getRemoteName(filePath) {
  if (!filePath) return '';
  return filePath.split('/').pop();
}

function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const config = ENVS[currentEnv];
  if (!config) {
    throw new Error(`Ambiente '${currentEnv}' não encontrado nas configurações do .env.`);
  }

  const requiredFields = ['TENANT', 'BASE_URL', 'IDCS_URL', 'IDCS_CLIENTID', 'IDCS_CLIENTSECRET', 'IDCS_SCOPE'];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Configuração ausente para o ambiente '${currentEnv}': campo '${field}' não definido.`);
    }
  }

  console.log(`[Auth] Solicitando token para ambiente: ${currentEnv}`);
  const auth = Buffer.from(`${config.IDCS_CLIENTID}:${config.IDCS_CLIENTSECRET}`).toString('base64');

  try {
    const response = await axios.post(config.IDCS_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: config.IDCS_SCOPE
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    console.log(`[Auth] Token obtido com sucesso para ${currentEnv}`);
    return cachedToken;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    console.error(`[Auth Error] Falha no IDCS (${currentEnv}):`, errorMsg);
    throw new Error(`Falha na autenticação IDCS (${currentEnv}): ${errorMsg}`, { cause: error });
  }
}

async function ftsRequest(method, endpoint, payload = null) {
  const token = await getAccessToken();
  const config = ENVS[currentEnv];
  const url = `${config.BASE_URL}/${config.TENANT}/RetailAppsReSTServices/services/private/FTSWrapper/${endpoint}`;
  console.log(`[FTS Request] ${method} ${endpoint} | Env: ${currentEnv}`);
  try {
    const response = await axios({
      method,
      url,
      data: payload,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en'
      },
      timeout: 15000,
      responseType: 'json'
    });
    return response.data;
  } catch (error) {
    let errorMsg = 'Unknown Error';
    if (error.response) {
      if (typeof error.response.data === 'string') {
        errorMsg = error.response.data;
      } else if (typeof error.response.data === 'object') {
        errorMsg = error.response.data.message || JSON.stringify(error.response.data);
      }
    } else if (error.message) {
      errorMsg = error.message;
    }
    console.error(`[FTS Error] ${method} ${endpoint} (${currentEnv}):`, errorMsg);
    throw new Error(`Erro FTS (${currentEnv}): ${errorMsg}`, { cause: error });
  }
}

// ENDPOINTS

app.get('/environments', (req, res) => {
  // Atualiza a lista em tempo de execução para refletir alterações no .env
  const refreshedEnvs = loadEnvironments();
  for (const k in refreshedEnvs) {
    ENVS[k] = refreshedEnvs[k];
  }
  res.json(Object.keys(ENVS));
});

app.post('/set-env', (req, res) => {
  const { env } = req.body;
  const refreshedEnvs = loadEnvironments();
  for (const k in refreshedEnvs) {
    ENVS[k] = refreshedEnvs[k];
  }

  if (ENVS[env]) {
    currentEnv = env;
    cachedToken = null; // Limpa o token para forçar nova autenticação no ambiente selecionado
    tokenExpiry = 0;
    console.log(`[Env] Ambiente alterado com sucesso para: ${currentEnv}`);
    res.json({ success: true, currentEnv });
  } else {
    res.status(400).json({
      success: false,
      message: `Ambiente inválido: '${env}'. Ambientes disponíveis no .env: ${Object.keys(ENVS).join(', ')}`
    });
  }
});

app.get('/ping', async (req, res) => {
  try {
    await ftsRequest('GET', 'ping');
    res.json({ status: 'Success' });
  } catch (e) {
    res.status(500).json({ status: 'Failure', error: e.message });
  }
});

// Healthcheck local do serviço proxy
app.get('/health', (req, res) => {
  res.json({ status: 'Success', service: 'fts-backend-proxy', environment: currentEnv });
});

app.get('/prefixes', async (req, res) => {
  try {
    const data = await ftsRequest('GET', 'listprefixes');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/files', async (req, res) => {
  const prefix = typeof req.query.prefix === 'string' ? req.query.prefix.trim() : '';
  if (req.query.prefix !== undefined && !isValidString(req.query.prefix)) {
    return res.status(400).json({ error: 'Parâmetro inválido: prefix deve ser uma string não vazia' });
  }
  try {
    const data = await ftsRequest('GET', `listfiles?prefix=${encodeURIComponent(prefix)}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/upload', async (req, res) => {
  const { prefix, filename } = req.body || {};
  if (!isValidString(prefix) || !isValidString(filename)) {
    return res.status(400).json({ error: 'Parâmetros inválidos: prefix e filename são obrigatórios' });
  }
  try {
    const remoteName = getRemoteName(filename);
    const parResponse = await ftsRequest('POST', 'upload', {
      listOfFiles: [{ storagePrefix: prefix, fileName: remoteName }]
    });
    res.json({ accessUri: parResponse.parList[0].accessUri });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/delete', async (req, res) => {
  const { prefix, filenames } = req.body || {};
  if (!Array.isArray(filenames) || filenames.length === 0 || !filenames.every((n) => typeof n === 'string' && n.trim())) {
    return res.status(400).json({ error: 'Parâmetros inválidos: filenames deve ser uma lista não vazia de strings' });
  }
  try {
    const payload = {
      listOfFiles: filenames.map(name => {
        let relativePath = name;
        if (prefix && name.startsWith(prefix)) {
          relativePath = name.substring(prefix.length).replace(/^\//, '');
        }
        return {
          storagePrefix: prefix,
          fileName: relativePath
        };
      })
    };
    await ftsRequest('DELETE', 'delete', payload);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/download', async (req, res) => {
  const { prefix, filename } = req.body || {};
  if (!isValidString(prefix) || !isValidString(filename)) {
    return res.status(400).json({ error: 'Parâmetros inválidos: prefix e filename são obrigatórios' });
  }
  try {
    let relativeName = filename;
    if (prefix && filename.startsWith(prefix)) {
      relativeName = filename.substring(prefix.length).replace(/^\//, '');
    }

    const parResponse = await ftsRequest('POST', 'download', {
      listOfFiles: [{ storagePrefix: prefix, fileName: relativeName }]
    });
    res.json({ accessUri: parResponse.parList[0].accessUri });
  } catch (e) {
    console.error(`[Download Error] ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware global de erros
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error('[ErrorHandler] Erro não tratado:', err?.message || err);
  if (status >= 500) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  } else {
    res.status(status).json({ error: err.message || 'Erro na requisição' });
  }
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Backend Proxy FTS rodando na porta ${PORT}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[Shutdown] Recebido sinal ${signal}. Encerrando...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
