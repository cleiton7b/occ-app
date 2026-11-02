# OCC - Object Control Center (`interface-os-ora-cloud`)
> **Lojas Renner S/A** — Soluções Produto Projetos TI - Planning

O **OCC (Object Control Center)** é uma plataforma desenvolvida para apoiar os times de Projetos e Sustentação na gestão operacional dos arquivos armazenados no Oracle Object Storage das aplicações Oracle Retail.

A solução disponibiliza recursos para monitoramento, consulta, upload, download, movimentação e análise de arquivos, proporcionando maior visibilidade, agilidade e controle sobre os processos de integração e armazenamento.

Com uma interface centralizada e segura, o OCC (Object Control Center) simplifica atividades operacionais, reduz o tempo de diagnóstico e facilita o suporte às aplicações Oracle Retail, contribuindo para a eficiência operacional e a estabilidade dos ambientes.

### 🎨 Identidade Visual e Paleta Corporativa (Lojas Renner S/A)
O Web Design da aplicação foi alinhado ao guia visual corporativo das **Lojas Renner S/A**, aplicando os 10 códigos HEX oficiais:
- `#1c1c1a` (Preto Corporativo)
- `#d7a17a` (Bege Quente)
- `#e30613` (Vermelho Renner)
- `#487a7b` (Petróleo / Teal)
- `#be5400` (Terracota Escuro)
- `#cc8400` (Mostarda / Ocre)
- `#d4b59e` (Nude Areia)
- `#e59e6d` (Pêssego Suave)
- `#c0794b` (Caramelo)
- `#d3bc8d` (Dourado Suave)

---

## 📁 Estrutura do Projeto

O projeto é organizado estritamente em **duas pastas principais**:

```
interface-os-ora-cloud/
├── backend/                  # API Proxy Node.js / Express
│   ├── .env                  # Variáveis de ambiente com credenciais Oracle IDCS
│   ├── .env.example          # Modelo das variáveis necessárias
│   ├── node_modules/         # Dependências do backend
│   ├── package.json          # Configuração e dependências (Express, Axios, CORS, Dotenv)
│   ├── package-lock.json
│   └── server.js             # Servidor proxy FTS e autenticação OAuth2 IDCS
│
├── frontend/                 # Aplicação SPA React (Vite + Tailwind CSS)
│   ├── .env.example          # Modelo para configuração da URL da API
│   ├── dist/                 # Artefatos gerados pelo build de produção
│   ├── index.html            # Ponto de entrada HTML
│   ├── node_modules/         # Dependências do frontend
│   ├── package.json          # Dependências (React, Vite, Lucide, Tailwind)
│   ├── package-lock.json
│   ├── postcss.config.cjs
│   ├── tailwind.config.cjs
│   ├── vite.config.js
│   └── src/                  # Componentes e serviços da interface
│       ├── App.jsx           # Componente principal
│       ├── index.css         # Estilos globais e diretivas Tailwind
│       ├── main.jsx          # Bootstrap do React
│       ├── components/       # Telas (Consultation, Deletion, Upload, EnvironmentPanel)
│       └── services/         # Cliente HTTP (api.js)
│
├── .gitignore                # Regras de exclusão de repositório (node_modules, .env, dist, etc.)
├── package.json              # Orquestrador da raiz (scripts e workspaces)
└── README.md                 # Documentação do projeto
```

---

## 🚀 Como Executar

### 1. Pré-requisitos
- **Node.js** (v18 ou superior)
- **npm** (v9 ou superior)

### 2. Instalação das Dependências

Você pode instalar tudo diretamente da raiz:
```bash
npm run install:all
```
Ou individualmente em cada pasta:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configuração de Ambiente

#### Backend:
Configure o arquivo `backend/.env` (baseado no `backend/.env.example`). O sistema suporta **múltiplos ambientes dinâmicos** seguindo a convenção `ENV1`, `ENV2`, `ENV3`...:

```ini
PORT=3001

# STAGE Environment (HML)
ENV1=STAGE_APCS
TENANT=rgbu-rap-lrsa-stg99-rpasce
BASE_URL=https://rap-npe.retail.sa-vinhedo-1.ocs.oraclecloud.com
IDCS_URL=https://idcs-ba2d5241d96f403a983800e7e2272cc4.identity.oraclecloud.com/oauth2/v1/token
IDCS_CLIENTID=RPASCE_STG99_APPID
IDCS_CLIENTSECRET=idcscs-a7bbd721-5df4-43bc-8710-8557c57b2e71
IDCS_SCOPE=rgbu:rpas:psraf-RPASCE-STG99

# DEV Environment
ENV2=DEV_APCS
TENANT=rgbu-rap-lrsa-dev99-apcs
BASE_URL=https://rap-npe.retail.sa-vinhedo-1.ocs.oraclecloud.com
IDCS_URL=https://idcs-ba2d5241d96f403a983800e7e2272cc4.identity.oraclecloud.com/oauth2/v1/token
IDCS_CLIENTID=RPASCE_DEV99_APPID
IDCS_CLIENTSECRET=idcscs-6e4785cf-744b-4811-bfca-418a824a62a0
IDCS_SCOPE=rgbu:rpas:psraf-RPASCE-DEV99

# Voce pode adicionar quantos ambientes precisar (ENV3, ENV4...):
# ENV3=PROD_APCS
# TENANT=...
# BASE_URL=...
# IDCS_URL=...
# IDCS_CLIENTID=...
# IDCS_CLIENTSECRET=...
# IDCS_SCOPE=...
```
Ao iniciar a aplicação, todos os ambientes declarados são carregados e listados automaticamente no picklist do cabeçalho e do painel lateral. Ao trocar o ambiente no picklist, a aplicação realiza o **auto-refresh** imediato sem necessidade de clicar em botões adicionais.

#### Frontend (opcional):
Por padrão o frontend consome `http://localhost:3001`. Se desejar alterar, crie `frontend/.env`:
```ini
VITE_API_BASE_URL=http://localhost:3001
```

---

## 💻 Executando em Desenvolvimento

### Opção 1: Inicialização em 1 Clique (Windows)
Basta dar duplo clique no arquivo [`run.bat`](./run.bat) na raiz do projeto (ou executar `.\run.bat` no terminal). Ele irá:
1. Abrir uma janela dedicada com o **Backend Proxy** (porta 3001 com auto-reload).
2. Abrir uma janela dedicada com o **Frontend Vite** (porta 5173).
3. Abrir automaticamente a aplicação no seu navegador padrão (`http://localhost:5173`).

### Opção 2: A partir da raiz via npm
```bash
# Terminal 1: Iniciar backend (porta 3001)
npm run dev:backend

# Terminal 2: Iniciar frontend (porta 5173)
npm run dev:frontend
```

### Opção 3: Entrando em cada pasta
```bash
# Backend:
cd backend
npm run dev

# Frontend:
cd frontend
npm run dev
```

---

## 📦 Build para Produção (Frontend)

```bash
# Da raiz:
npm run build:frontend

# Ou dentro de frontend/:
cd frontend
npm run build
```
Os arquivos otimizados serão gerados em `frontend/dist/`.

> **Requisito de Node.js:** o frontend usa Vite 7 / Vitest 5 e exige Node `^22.12.0` ou `>=24.0.0`.

---

## 🚀 Deploy em Produção

### Backend (API Proxy)

1. Instale as dependências de produção e inicie o processo:
   ```bash
   npm ci --omit=dev --prefix backend
   npm start --prefix backend
   ```
2. Variáveis de ambiente obrigatórias (via `.env` ou variáveis do orquestrador):

   | Variável | Descrição | Padrão |
   | --- | --- | --- |
   | `PORT` | Porta HTTP do proxy | `3001` |
   | `CORS_ORIGIN` | Origens permitidas, separadas por vírgula | `http://localhost:5173` |
   | `ENV1`, `ENV2`... | Nome do ambiente Oracle (ex.: `STAGE_APCS`) | — |
   | `TENANT`, `BASE_URL`, `IDCS_URL`, `IDCS_CLIENTID`, `IDCS_CLIENTSECRET`, `IDCS_SCOPE` | Credenciais e endpoints por ambiente | — |

   Consulte [`backend/.env.example`](./backend/.env.example) para o formato completo.

3. **Healthcheck:** `GET /health` responde `200` com `{ status, service, environment }`. Use-o no orquestrador (Docker, Kubernetes, PM2 etc.).
4. **Proxy reverso:** publique o backend atrás de HTTPS (Nginx, API Gateway, ALB). O app já define `trust proxy`, então o rate limit e os logs usam o IP real do cliente.
5. **Rate limit:** 300 requisições por IP a cada 15 minutos. Ajuste em `backend/server.js` se o volume de produção exigir.
6. **Persistência de token:** o cache fica em `backend/.token-cache.json` (ignorado pelo Git). Em ambientes efêmeros ele é recriado automaticamente; não versione esse arquivo.

### Frontend

1. Gere o build (`frontend/dist/`) e sirva os arquivos estáticos por CDN ou pelo mesmo proxy reverso.
2. Defina `VITE_API_BASE_URL` **no momento do build** apontando para a URL pública do backend:
   ```bash
   VITE_API_BASE_URL=https://api.exemplo.com npm run build:frontend
   ```
3. Como o app é uma SPA, configure o servidor para devolver `index.html` em rotas desconhecidas.

### Observabilidade e suporte

- Toda requisição recebe um `X-Request-Id` (reaproveitado do cliente quando enviado, gerado com UUID caso contrário).
- Falhas de upstream são registradas no log do servidor com esse ID e devolvidas ao cliente como mensagem genérica + `requestId`, sem vazar detalhes internos.
- Ao abrir um chamado, informe o `requestId` exibido na mensagem de erro para localizar o log correspondente.

### CI

O workflow [`.github/workflows/lint.yml`](./.github/workflows/lint.yml) roda em cada push/PR com Node 22:

1. Lint do backend, checagem de sintaxe e testes (`node --test`).
2. Smoke test do endpoint `/health`.
3. Lint, testes (Vitest) e build do frontend.
4. `npm audit --omit=dev --audit-level=high` em backend e frontend.

Para rodar a mesma verificação localmente:
```bash
npm run lint
npm test
npm run build:frontend
```

### Lacunas conhecidas

- **Mover/renomear arquivos:** não há endpoint de *move* no proxy; hoje é necessário baixar e reenviar o arquivo.
- **Advisories de desenvolvimento:** o `npm audit` completo ainda reporta avisos `minimatch` moderados na cadeia do ESLint. Eles não afetam o runtime e o CI valida apenas dependências de produção.
