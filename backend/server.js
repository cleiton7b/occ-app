/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Confia em proxy reverso para rate-limit e logs corretos de IP
app.set('trust proxy', 1);

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
    origin: (origin, callback) => {
      // Permite requisições sem Origin (curl, server-to-server), origin "null" (file://) e origens explicitamente configuradas
      if (!origin || origin === 'null' || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Em desenvolvimento, libera qualquer porta de localhost/127.0.0.1 para evitar bloqueio de CORS
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
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

// Log de requisições com ID de correlação (aceita X-Request-Id do cliente ou gera um novo)
app.use((req, res, next) => {
  const incoming = req.get('X-Request-Id');
  req.id = isValidString(incoming) && incoming.length <= 128 ? incoming.trim() : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const start = Date.now();
  res.on('finish', () => {
    console.log(`[Req] ${req.id} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Função para ler dinamicamente o arquivo .env e carregar múltiplos ambientes (ENV1, ENV2, ENV3...)
function loadEnvironments() {
  // Procura o .env ao lado do executável (para o pacote compartilhável) e, em seguida, ao lado do script
  const candidatePaths = [
    path.resolve(path.dirname(process.execPath), '.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
  ];
  const envPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
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

// Cache de tokens por ambiente (memória + persistência em disco)
const tokenCache = new Map(); // envKey -> { token, expiry }
const tokenInflight = new Map(); // envKey -> Promise (refresh em andamento)
const TOKEN_CACHE_FILE = path.resolve(path.dirname(process.execPath), '.token-cache.json');

function loadTokenCacheFromDisk() {
  try {
    if (!fs.existsSync(TOKEN_CACHE_FILE)) return;
    const raw = fs.readFileSync(TOKEN_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [envKey, entry] of Object.entries(parsed)) {
        if (entry && typeof entry.token === 'string' && typeof entry.expiry === 'number' && entry.expiry > Date.now()) {
          tokenCache.set(envKey, { token: entry.token, expiry: entry.expiry });
        }
      }
      console.log(`[Auth] Cache de tokens carregado do disco (${tokenCache.size} válido(s))`);
    }
  } catch (e) {
    console.warn('[Auth Warning] Não foi possível carregar cache de tokens:', e.message);
  }
}

function persistTokenCache() {
  try {
    const obj = {};
    for (const [envKey, entry] of tokenCache.entries()) {
      if (entry && entry.expiry > Date.now()) {
        obj[envKey] = { token: entry.token, expiry: entry.expiry };
      }
    }
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(obj), 'utf8');
  } catch (e) {
    console.warn('[Auth Warning] Não foi possível persistir cache de tokens:', e.message);
  }
}

function invalidateToken(envKey) {
  tokenCache.delete(envKey);
  tokenInflight.delete(envKey);
  persistTokenCache();
}

loadTokenCacheFromDisk();

console.log('[Env] Ambientes carregados do .env:', envKeys);
console.log('[Env] Ambiente ativo inicial:', currentEnv);

function getRemoteName(filePath) {
  if (!filePath) return '';
  return filePath.split('/').pop();
}

function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Erros de upstream são registrados no servidor e devolvidos de forma genérica,
// evitando vazar detalhes internos (URLs, tokens, mensagens do provedor) ao cliente.
function sendUpstreamError(req, res, error, message = 'Falha ao comunicar com o serviço de armazenamento') {
  console.error(`[Upstream Error] ${req.id} ${req.method} ${req.originalUrl}:`, error?.message || error);
  res.status(502).json({ error: message, requestId: req.id });
}

// Valida a resposta do FTS antes de acessar propriedades aninhadas.
function extractAccessUri(parResponse) {
  const entry = parResponse && Array.isArray(parResponse.parList) ? parResponse.parList[0] : null;
  if (!entry || !isValidString(entry.accessUri)) {
    throw new Error('Resposta do FTS inválida: accessUri ausente em parList[0]');
  }
  return entry.accessUri;
}

async function getAccessToken(envKey = currentEnv) {
  const cached = tokenCache.get(envKey);
  if (cached && Date.now() < cached.expiry) return cached.token;

  // Reaproveita refresh em andamento para evitar autenticações duplicadas
  if (tokenInflight.has(envKey)) {
    return tokenInflight.get(envKey);
  }

  const config = ENVS[envKey];
  if (!config) {
    throw new Error(`Ambiente '${envKey}' não encontrado nas configurações do .env.`);
  }

  const requiredFields = ['TENANT', 'BASE_URL', 'IDCS_URL', 'IDCS_CLIENTID', 'IDCS_CLIENTSECRET', 'IDCS_SCOPE'];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Configuração ausente para o ambiente '${envKey}': campo '${field}' não definido.`);
    }
  }

  console.log(`[Auth] Solicitando token para ambiente: ${envKey}`);
  const auth = Buffer.from(`${config.IDCS_CLIENTID}:${config.IDCS_CLIENTSECRET}`).toString('base64');

  const refreshPromise = (async () => {
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
      const token = response.data.access_token;
      const expiresIn = Number(response.data.expires_in) || 3600;
      const expiry = Date.now() + (expiresIn * 1000) - 60000;
      tokenCache.set(envKey, { token, expiry });
      persistTokenCache();
      console.log(`[Auth] Token obtido com sucesso para ${envKey} (expira em ${Math.round((expiry - Date.now()) / 1000)}s)`);
      return token;
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      console.error(`[Auth Error] Falha no IDCS (${envKey}):`, errorMsg);
      throw new Error(`Falha na autenticação IDCS (${envKey}): ${errorMsg}`, { cause: error });
    }
  })();

  tokenInflight.set(envKey, refreshPromise);
  try {
    return await refreshPromise;
  } finally {
    tokenInflight.delete(envKey);
  }
}

async function ftsRequest(method, endpoint, payload = null, retried = false) {
  const token = await getAccessToken(currentEnv);
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
    // Token expirado/inválido (401): invalida cache e tenta uma única vez com novo token
    if (!retried && error.response && error.response.status === 401) {
      console.warn(`[Auth] Token 401 para ${currentEnv}; renovando e tentando novamente...`);
      invalidateToken(currentEnv);
      return ftsRequest(method, endpoint, payload, true);
    }
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
    // Mantém cache por ambiente; apenas força revalidação se o token estiver expirado
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
    sendUpstreamError(req, res, e, 'Falha ao verificar a conectividade com o serviço de armazenamento');
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
    sendUpstreamError(req, res, e, 'Falha ao listar os prefixos');
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
    sendUpstreamError(req, res, e, 'Falha ao listar os arquivos');
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
    res.json({ accessUri: extractAccessUri(parResponse) });
  } catch (e) {
    sendUpstreamError(req, res, e, 'Falha ao preparar o upload do arquivo');
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
    sendUpstreamError(req, res, e, 'Falha ao excluir os arquivos');
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
    res.json({ accessUri: extractAccessUri(parResponse) });
  } catch (e) {
    sendUpstreamError(req, res, e, 'Falha ao preparar o download do arquivo');
  }
});

// Servir o frontend (build) quando disponível — permite empacotar front+back em um único executável
const frontendDist = path.join(__dirname, 'public');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    const acceptsHtml = (req.headers.accept || '').includes('text/html');
    const indexPath = path.join(frontendDist, 'index.html');
    if (acceptsHtml && fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    res.status(404).json({ error: 'Rota não encontrada', requestId: req.id });
  });
}

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada', requestId: req.id });
});

// Middleware global de erros
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[ErrorHandler] ${req.id} Erro não tratado:`, err?.message || err);
  if (status >= 500) {
    res.status(500).json({ error: 'Erro interno do servidor', requestId: req.id });
  } else {
    res.status(status).json({ error: 'Erro na requisição', requestId: req.id });
  }
});

const PORT = process.env.PORT || 3001;
let server = null;

// Só inicia o servidor quando executado diretamente (permite import da app para testes)
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`Backend Proxy FTS rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    // Abre o navegador automaticamente (Windows)
    if (process.platform === 'win32') {
      try {
        const { exec } = require('child_process');
        exec(`start "" "http://localhost:${PORT}"`);
      } catch (e) {
        /* ignore */
      }
    }
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`[Shutdown] Recebido sinal ${signal}. Encerrando...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
