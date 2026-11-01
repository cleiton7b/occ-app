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
Basta dar duplo clique no arquivo [`run.bat`](file:///C:/DEV/repos/cleiton7b-jpg/interface-os-ora-cloud/run.bat) na raiz do projeto (ou executar `.\run.bat` no terminal). Ele irá:
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
