/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Upload,
  Trash2,
  AlertCircle,
  Server,
  ChevronLeft,
  ChevronRight,
  Info,
  Box,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import ConsultationView from './components/ConsultationView';
import EnvironmentPanel from './components/EnvironmentPanel';
import UploadView from './components/UploadView';
import DeletionView from './components/DeletionView';
import AboutModal from './components/AboutModal';
import { ToastProvider } from './components/Toast';
import { ftsApi } from './services/api';

const NAV_ITEMS = [
  {
    id: 'consult',
    label: 'Consultar',
    title: 'Consultar Arquivos',
    subtitle: 'Explore, filtre e baixe os arquivos do prefixo selecionado.',
    icon: Search,
  },
  {
    id: 'upload',
    label: 'Upload',
    title: 'Upload de Arquivos',
    subtitle: 'Envie arquivos para o Oracle Cloud Storage com segurança.',
    icon: Upload,
  },
  {
    id: 'delete',
    label: 'Deletar',
    title: 'Deletar Arquivos',
    subtitle: 'Selecione os arquivos que deseja remover do prefixo.',
    icon: Trash2,
  },
];

export default function App() {
  const [view, setView] = useState('consult');
  const [prefix, setPrefix] = useState('');
  const [availablePrefixes, setAvailablePrefixes] = useState([]);
  const [availableEnvs, setAvailableEnvs] = useState([]);
  const [currentEnv, setCurrentEnv] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000); // 60s padrão
  const [connectivity, setConnectivity] = useState({ status: 'Checking...' });
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [listError, setListError] = useState(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const abortRef = useRef(null);

  const checkConnectivity = useCallback(async () => {
    try {
      const ok = await ftsApi.checkPing();
      setConnectivity({ status: ok ? 'Success' : 'Failure' });
    } catch {
      setConnectivity({ status: 'Failure' });
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!prefix) return;
    // Cancela qualquer refresh anterior ainda em andamento
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const data = await ftsApi.listFiles(prefix, controller.signal);
      if (controller.signal.aborted) return;
      setFiles(data || []);
      setDeletedFiles([]);
      setListError(null);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[Refresh Error]', e);
        setListError(e.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [prefix]);

  const handlePrefixChange = useCallback(async (newPrefix) => {
    setPrefix(newPrefix);
    setDeletedFiles([]);

    if (newPrefix) {
      // Cancela qualquer busca anterior ainda em andamento
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const data = await ftsApi.listFiles(newPrefix, controller.signal);
        if (controller.signal.aborted) return;
        setFiles(data || []);
        setListError(null);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error(e);
          setListError(e.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    } else {
      setFiles([]);
    }
  }, []);

  // Troca de ambiente com REFRESH AUTOMÁTICO garantido sem precisar clicar em botão
  const handleEnvChange = useCallback(async (newEnv) => {
    if (!newEnv) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setCurrentEnv(newEnv);
    setLoading(true);
    setConnectivity({ status: 'Checking...' });

    try {
      // 1. Notifica o backend para chavear as credenciais e limpar o token em cache
      await ftsApi.setEnvironment(newEnv);

      // 2. Testa conectividade imediatamente
      await checkConnectivity();

      // 3. Obtém a lista de prefixos do novo ambiente
      const prefixes = await ftsApi.getPrefixes();
      const prefixList = Array.isArray(prefixes) ? prefixes : [];
      setAvailablePrefixes(prefixList);

      // 4. Seleciona o prefixo adequado (mantém o atual se existir no novo ambiente, senão pega o primeiro)
      let nextPrefix = '';
      if (prefixList.length > 0) {
        if (prefix && prefixList.includes(prefix)) {
          nextPrefix = prefix;
        } else {
          nextPrefix = prefixList[0];
        }
      }

      setPrefix(nextPrefix);
      setDeletedFiles([]);

      // 5. AUTO-REFRESH DOS ARQUIVOS: busca e lista automaticamente os arquivos sem intervenção do usuário
      if (nextPrefix) {
        const fileList = await ftsApi.listFiles(nextPrefix, controller.signal);
        if (controller.signal.aborted) return;
        setFiles(fileList || []);
        setListError(null);
      } else {
        setFiles([]);
        setListError(null);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[Env Change Error]', e);
        setConnectivity({ status: 'Failure' });
        setFiles([]);
        setListError(e.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [checkConnectivity, prefix]);

  const handleEnvRefresh = useCallback(async () => {
    await handleEnvChange(currentEnv);
  }, [handleEnvChange, currentEnv]);

  const handleOnDeleted = useCallback((filenames) => {
    setDeletedFiles(filenames);
    setTimeout(() => {
      handleRefresh();
    }, 500);
  }, [handleRefresh]);

  // Carregamento inicial de ambientes ao abrir a aplicação
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setConnectivity({ status: 'Checking...' });
    try {
      // 1. Busca dinamicamente os ambientes disponíveis no backend (.env)
      const envData = await ftsApi.getEnvironments();
      const envList = Array.isArray(envData) ? envData : (envData.environments || []);
      setAvailableEnvs(envList);

      const initialEnv = envList.length > 0 ? envList[0] : 'STAGE_APCS';
      setCurrentEnv(initialEnv);

      // 2. Aplica o ambiente e carrega prefixos e arquivos automaticamente
      await handleEnvChange(initialEnv);
    } catch (e) {
      console.error('[Load Error]', e);
      setConnectivity({ status: 'Failure' });
    } finally {
      setLoading(false);
    }
  }, [handleEnvChange]);

  const initialLoadRef = useRef(null);
  useEffect(() => {
    initialLoadRef.current = loadInitialData;
  }, [loadInitialData]);
  useEffect(() => {
    initialLoadRef.current?.();
  }, []);

  // Cleanup: aborta requisições em andamento ao desmontar a aplicação
  useEffect(() => () => abortRef.current?.abort(), []);

  // Intervalo de Auto-Refresh
  const refreshRef = useRef(handleRefresh);
  useEffect(() => {
    refreshRef.current = handleRefresh;
  }, [handleRefresh]);
  useEffect(() => {
    let interval;
    if (autoRefresh && prefix) {
      interval = setInterval(() => refreshRef.current(), refreshInterval);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, prefix, refreshInterval]);

  const activeNav = useMemo(
    () => NAV_ITEMS.find((item) => item.id === view) || NAV_ITEMS[0],
    [view]
  );

  const connectionState = useMemo(() => {
    if (loading) {
      return {
        label: 'Sincronizando…',
        dot: 'bg-ochre',
        text: 'text-ochre',
        chip: 'bg-ochre/10 border-ochre/25',
      };
    }
    if (connectivity.status === 'Failure') {
      return {
        label: 'Sem conexão',
        dot: 'bg-brand',
        text: 'text-brand',
        chip: 'bg-brand-soft border-brand/25',
      };
    }
    if (connectivity.status === 'Success') {
      return {
        label: 'Conectado',
        dot: 'bg-sea',
        text: 'text-sea',
        chip: 'bg-sea/10 border-sea/25',
      };
    }
    return {
      label: 'Verificando…',
      dot: 'bg-ochre',
      text: 'text-ochre',
      chip: 'bg-ochre/10 border-ochre/25',
    };
  }, [loading, connectivity.status]);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-stone-100 font-sans text-ink">
        {/* Sidebar Lateral no estilo Lojas Renner S/A */}
        <aside
          className={`bg-ink text-white transition-all duration-300 flex flex-col border-r border-white/5 ${
            isSidebarCollapsed ? 'w-[76px]' : 'w-64'
          }`}
        >
          {/* Topo da Sidebar com o logo oficial */}
          <div className={`border-b border-white/5 ${isSidebarCollapsed ? 'p-3' : 'p-4'}`}>
            {isSidebarCollapsed ? (
              <div
                className="mx-auto p-2 bg-brand rounded-xl flex items-center justify-center shadow-sm"
                title="Lojas Renner S/A"
              >
                <Box className="text-white" size={20} />
              </div>
            ) : (
              <div className="rounded-xl bg-white p-2.5 shadow-sm">
                <img
                  src="/logo-renner.png"
                  alt="Lojas Renner S/A"
                  className="w-full h-auto rounded"
                  width="495"
                  height="137"
                />
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black tracking-[0.18em] text-white">OCC</p>
                  <p className="text-[10px] font-medium text-stone-400 truncate">
                    Object Control Center
                  </p>
                </div>
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-brand text-white px-1.5 py-0.5 rounded">
                  Renner
                </span>
              </div>
            )}
          </div>

          {/* Links de Navegação */}
          <nav className="flex-1 p-3 overflow-y-auto">
            {!isSidebarCollapsed && (
              <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                Operações
              </p>
            )}
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-stone-400 hover:bg-white/5 hover:text-white'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={item.title}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Link / Botão About do OCC */}
          <div className="p-3 border-t border-white/5">
            <button
              onClick={() => setIsAboutOpen(true)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-semibold text-stone-400 hover:text-white hover:bg-white/5 transition cursor-pointer ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Sobre o aplicativo OCC"
            >
              <Info size={16} className="text-brand shrink-0" />
              {!isSidebarCollapsed && <span>Sobre o OCC</span>}
            </button>
          </div>

          {/* Rodapé Corporativo Renner & Recolher */}
          <div className="p-3 border-t border-white/5 flex items-center justify-between gap-2 text-stone-500 text-[10px]">
            {!isSidebarCollapsed && (
              <span className="font-semibold text-stone-400 truncate">Lojas Renner S/A</span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 hover:bg-white/5 text-stone-400 hover:text-white rounded-lg transition cursor-pointer ml-auto"
              title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header Superior */}
          <header className="bg-white border-b border-stone-200 z-10">
            {/* Linha 1: título da tela + estado de conexão */}
            <div className="px-6 py-4 flex flex-wrap justify-between items-center gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
                  OCC · Object Control Center
                </p>
                <h1 className="text-xl font-bold tracking-tight text-ink leading-tight">
                  {activeNav.title}
                </h1>
                <p className="text-xs text-ink-muted mt-0.5">{activeNav.subtitle}</p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 border px-3 py-1.5 rounded-full ${connectionState.chip}`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${connectionState.dot}`} />
                  <span className={`text-xs font-bold ${connectionState.text}`}>
                    {connectionState.label}
                  </span>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={!prefix || loading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-ink-muted hover:text-brand hover:border-brand/40 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Atualizar lista de arquivos"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>
            </div>

            {/* Linha 2: barra de controles */}
            <div className="px-6 py-3 bg-stone-50/80 border-t border-stone-200/70 flex flex-wrap items-center gap-3">
              {/* Picklist de Ambiente Dinâmico */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="env-select"
                  className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.14em]"
                >
                  Ambiente
                </label>
                <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <Server size={14} className="text-brand" />
                  <select
                    id="env-select"
                    value={currentEnv}
                    onChange={(e) => handleEnvChange(e.target.value)}
                    className="bg-transparent text-sm font-bold text-ink outline-none cursor-pointer"
                  >
                    {availableEnvs.map((env) => (
                      <option key={env} value={env}>{env}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Seletor de Prefixo Cloud */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="prefix-select"
                  className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.14em]"
                >
                  Prefixo
                </label>
                <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <FolderOpen size={14} className="text-sand" />
                  <select
                    id="prefix-select"
                    value={prefix}
                    onChange={(e) => handlePrefixChange(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-ink outline-none cursor-pointer max-w-[16rem]"
                  >
                    <option value="">Selecione um prefixo…</option>
                    {availablePrefixes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Configuração de Auto-Refresh */}
              <div className="flex items-center gap-2 text-xs text-ink-muted bg-white px-2.5 py-1.5 rounded-lg border border-stone-200 shadow-2xs">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="cursor-pointer accent-brand"
                />
                <label
                  htmlFor="autoRefresh"
                  className="cursor-pointer select-none font-semibold text-ink"
                >
                  Auto-Refresh
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  disabled={!autoRefresh}
                  className="border border-stone-200 rounded px-1.5 py-0.5 text-xs bg-white text-ink outline-none disabled:opacity-50 cursor-pointer"
                >
                  <option value={10000}>10s</option>
                  <option value={20000}>20s</option>
                  <option value={30000}>30s</option>
                  <option value={40000}>40s</option>
                  <option value={60000}>60s</option>
                  <option value={90000}>90s</option>
                  <option value={120000}>120s</option>
                </select>
              </div>

              {prefix && (
                <span className="ml-auto text-[11px] font-medium text-ink-muted">
                  Prefixo ativo:{' '}
                  <span className="font-mono font-bold text-ink">{prefix}</span>
                </span>
              )}
            </div>
          </header>

          {/* Área Central e Painel Lateral */}
          <div className="flex-1 flex overflow-hidden relative">
            <section className="flex-1 p-6 overflow-auto transition-all duration-300">
              {!prefix ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-card animate-rise-in">
                    <div className="mx-auto mb-5 p-3.5 bg-ochre/10 rounded-2xl border border-ochre/20 w-fit">
                      <AlertCircle size={34} className="text-ochre" />
                    </div>
                    <h2 className="text-base font-bold text-ink">
                      Selecione um prefixo para começar
                    </h2>
                    <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                      Escolha o ambiente e o prefixo na barra de controles acima para
                      visualizar os arquivos disponíveis no Oracle Cloud Storage.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-100 border border-stone-200 px-3 py-1.5 text-[11px] font-medium text-ink-muted">
                      Ambiente atual:
                      <strong className="font-bold text-ink">{currentEnv || '—'}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  {view === 'consult' && (
                    <ConsultationView
                      files={files}
                      prefix={prefix}
                      onRefresh={handleRefresh}
                      isAutoRefresh={autoRefresh}
                      deletedFiles={deletedFiles}
                      error={listError}
                    />
                  )}
                  {view === 'upload' && (
                    <UploadView prefix={prefix} onUploadSuccess={handleRefresh} />
                  )}
                  {view === 'delete' && (
                    <DeletionView
                      prefix={prefix}
                      files={files}
                      onDeleted={handleOnDeleted}
                      onRefresh={handleRefresh}
                      error={listError}
                    />
                  )}
                </div>
              )}
            </section>

            {/* Painel Lateral de Informações do Ambiente */}
            <aside
              className={`bg-white border-l border-stone-200 transition-all duration-300 ${
                isPanelCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-80'
              }`}
            >
              <div className="flex flex-col h-full">
                <div className="px-4 py-3.5 border-b border-stone-200 flex justify-between items-center bg-white">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.14em]">
                    Info Ambiente
                  </span>
                  <button
                    onClick={() => setIsPanelCollapsed(true)}
                    className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-ink transition cursor-pointer"
                    title="Recolher painel"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <EnvironmentPanel
                  connectivity={connectivity}
                  prefix={prefix}
                  isCollapsed={isPanelCollapsed}
                  currentEnv={currentEnv}
                  availableEnvs={availableEnvs}
                  onEnvChange={handleEnvChange}
                  onEnvRefresh={handleEnvRefresh}
                />
              </div>
            </aside>
            {isPanelCollapsed && (
              <button
                onClick={() => setIsPanelCollapsed(false)}
                className="absolute right-0 top-6 p-2 bg-white border border-stone-200 rounded-l-lg shadow-md hover:bg-stone-50 transition cursor-pointer text-ink-muted hover:text-brand"
                title="Expandir painel"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>
        </main>

        {/* Pop-up Modal de About do OCC */}
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </div>
    </ToastProvider>
  );
}
