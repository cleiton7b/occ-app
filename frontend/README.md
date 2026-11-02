# Frontend — OCC (Object Control Center)

Interface Web (SPA) do **OCC (Object Control Center)** — solução de monitoramento, consulta, upload, download, movimentação e análise de arquivos do Oracle Object Storage (Oracle Retail).

A aplicação frontend é construída com:

- **React 18** (function components + hooks)
- **Vite 4** (build e dev server)
- **Tailwind CSS 3** com tokens corporativos das **Lojas Renner S/A** (`tailwind.config.cjs`)
- **Lucide React** (ícones)
- **PropTypes** (validação de props)
- **Context API** (Toast e estado global da aplicação)

---

## 🚀 Como Executar

### Pré-requisitos

- **Node.js** `^22.12.0` ou `>=24.0.0` (exigido pelo Vite 7)
- **npm** (v9 ou superior)

### Instalação

```bash
# Instalar dependências (a partir da raiz do monorepo)
npm install
```

O monorepo usa **npm workspaces**: um único `node_modules/` na raiz atende `backend/` e `frontend/`. Não rode `npm install` dentro de `frontend/`.

### Desenvolvimento

```bash
# a partir da raiz
npm run dev:frontend

# ou dentro de frontend/
npm run dev
```

O frontend roda em `http://localhost:5173` com hot-reload.

### Build de Produção

```bash
# a partir da raiz
npm run build:frontend

# ou dentro de frontend/
npm run build
```

Os artefatos otimizados são gerados em `frontend/dist/`.

---

## ⚙️ Configuração

Crie o arquivo `frontend/.env` (baseado no `frontend/.env.example`):

```ini
VITE_API_BASE_URL=http://localhost:3001
```

O valor define a URL base consumida pelo cliente HTTP (`src/services/api.js`) para comunicação com o backend proxy.

---

## 🧪 Qualidade (Lint)

```bash
npm run lint --prefix frontend
```

O ESLint utiliza **flat config** (`eslint.config.js`) com:

- `eslint` + `@eslint/js` (regras recomendadas)
- `eslint-plugin-react` (regras de componentes React)
- `eslint-plugin-react-hooks` (regras de hooks)
- `globals` (ambientes browser)

O script de lint está definido no `package.json` do frontend (`"lint": "eslint ."`).

---

## 📁 Estrutura

```
frontend/
├── .env.example              # Modelo da variável VITE_API_BASE_URL
├── index.html                # Ponto de entrada HTML
├── postcss.config.cjs        # PostCSS (Tailwind)
├── tailwind.config.cjs       # Tokens Tailwind (cores, sombras, animações)
├── vite.config.js            # Configuração do Vite
├── eslint.config.js          # Configuração ESLint (flat config)
└── src/
    ├── main.jsx              # Bootstrap do React
    ├── App.jsx               # Componente principal (estado global, abas, polling)
    ├── index.css             # Estilos globais e diretivas Tailwind
    ├── components/
    │   ├── AboutModal.jsx           # Modal de informações/versão
    │   ├── ConsultationView.jsx   # Tabela de arquivos consultáveis (com paginação)
    │   ├── DeletionView.jsx       # Tabela de exclusão (seleção múltipla)
    │   ├── EnvironmentPanel.jsx   # Painel lateral de status do ambiente
    │   ├── ErrorBoundary.jsx      # Captura de erros React (fallback UI)
    │   ├── Toast.jsx               # Sistema de notificações/toasts
    │   └── UploadView.jsx         # Upload (arrastar/soltar, múltiplos arquivos)
    └── services/
        └── api.js             # Cliente HTTP (axios/fetch) + camada FTS
```

---

## 🧩 Componentes Principais

### `App.jsx` — Componente Principal

Responsável por:

- Consolidação do estado global (ambiente selecionado, conectividade, abas, arquivos, loading);
- Carregamento inicial de ambientes via backend;
- Polling automático (auto-refresh) com limpeza no unmount;
- AbortController para cancelar requisições em andamento (evita stale responses);
- Alternância entre views (Consultar / Excluir / Upload).

### `Toast.jsx` — Sistema de Notificações

- Context API (`ToastProvider` / `useToast`);
- Tipos: `success`, `error`, `info`;
- Auto-dismiss (5 segundos);
- Renderização fixa no canto inferior direito.

### Views

- **ConsultationView**: tabela com busca, ordenação, badge de status de scan, paginação client-side (10 registros por página);
- **DeletionView**: seleção múltipla com exclusão em lote e feedback via toast;
- **UploadView**: upload por clique ou drag-and-drop, suporta múltiplos arquivos, feedback por toast.

### ErrorBoundary

- Captura erros não tratados de renderização React;
- Renderiza fallback com opção de recuperação.

---

## 🎨 Design System (Tailwind)

Tokens definidos em `tailwind.config.cjs` (via `theme.extend`), com paleta corporativa:

- Corporativo: `#1c1c1a`
- Bege Quente: `#d7a17a`
- Vermelho Renner: `#e30613`
- Petróleo/Teal: `#487a7b`
- Terracota Escuro: `#be5400`
- ... (outros tons)

Tokens customizados relevantes:

- `boxShadow: { '2xs': ... }`
- `blur: { xs: ... }`
- `animation: { fadeIn: ... }` com keyframes `fadeIn`
- Classes utilitárias: `animate-fade-in`, sombras `shadow-2xs`, blur `backdrop-blur-xs`.

---

## 🧪 Testes

Atualmente **não há suíte de testes automatizados** configurada. O quality gate do CI (`.github/workflows/lint.yml`) executa:

- Backend: ESLint + validação de sintaxe (`node --check`) + build check
- Frontend: ESLint + build de produção (Vite)

---

## 📌 Notas de Desenvolvimento

- Evitar `alert()` — usar o sistema de toasts (`useToast`);
- Keys de listas devem ser estáveis e reais (ex.: `f.name` do arquivo), nunca índice;
- Requisições abortáveis — usar `AbortController` via `ftsApi`;
- Erros de rede/FTS são tratados com mensagens em PT-BR.
