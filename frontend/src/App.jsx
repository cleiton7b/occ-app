import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Upload,
  Trash2,
  AlertCircle,
  Server,
  ChevronLeft,
  ChevronRight,
  Info,
  Box
} from 'lucide-react';
import ConsultationView from './components/ConsultationView';
import EnvironmentPanel from './components/EnvironmentPanel';
import UploadView from './components/UploadView';
import DeletionView from './components/DeletionView';
import AboutModal from './components/AboutModal';
import { ToastProvider } from './components/Toast';
import { ftsApi } from './services/api';

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
  const [connectivity, setConnectivity] = useState({ status: 'Checking...', color: 'text-stone-400' });
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const abortRef = useRef(null);

  const loadInitialData = async () => {
    setLoading(true);
    setConnectivity({ status: 'Checking...', color: 'text-stone-400' });
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
      setConnectivity({ status: 'Failure', color: 'text-[#e30613]' });
    } finally {
      setLoading(false);
    }
  };

  const checkConnectivity = async () => {
    try {
      const ok = await ftsApi.checkPing();
      setConnectivity({ status: ok ? 'Success' : 'Failure', color: ok ? 'text-[#487a7b]' : 'text-[#e30613]' });
    } catch {
      setConnectivity({ status: 'Failure', color: 'text-[#e30613]' });
    }
  };

  const handleRefresh = async () => {
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
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[Refresh Error]', e);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handlePrefixChange = async (newPrefix) => {
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
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    } else {
      setFiles([]);
    }
  };

  // Troca de ambiente com REFRESH AUTOMÁTICO garantido sem precisar clicar em botão
  const handleEnvChange = async (newEnv) => {
    if (!newEnv) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setCurrentEnv(newEnv);
    setLoading(true);
    setConnectivity({ status: 'Checking...', color: 'text-stone-400' });

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
      } else {
        setFiles([]);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[Env Change Error]', e);
        setConnectivity({ status: 'Failure', color: 'text-[#e30613]' });
        setFiles([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleEnvRefresh = async () => {
    await handleEnvChange(currentEnv);
  };

  const handleOnDeleted = (filenames) => {
    setDeletedFiles(filenames);
    setTimeout(() => {
      handleRefresh();
    }, 500);
  };

  // Carregamento inicial de ambientes ao abrir a aplicação
  useEffect(() => {
    loadInitialData();
  }, []);

  // Cleanup: aborta requisições em andamento ao desmontar a aplicação
  useEffect(() => () => abortRef.current?.abort(), []);

  // Intervalo de Auto-Refresh
  useEffect(() => {
    let interval;
    if (autoRefresh && prefix) {
      interval = setInterval(() => handleRefresh(), refreshInterval);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, prefix, refreshInterval]);

  return (
    <ToastProvider>
    <div className="flex h-screen bg-stone-100 font-sans text-[#1c1c1a]">
      {/* Sidebar Lateral no estilo Lojas Renner S/A */}
      <aside className={`bg-[#1c1c1a] text-white transition-all duration-300 flex flex-col border-r border-stone-800 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Topo da Sidebar com Branding */}
        <div className={`p-4 border-b border-stone-800 flex items-center gap-3 overflow-hidden whitespace-nowrap ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="p-2 bg-[#e30613] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Box className="text-white" size={20} />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-wider text-white">OCC</span>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-[#e30613] text-white px-1.5 py-0.2 rounded">
                  Renner
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#d7a17a] truncate">Object Control Center</span>
            </div>
          )}
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-3 space-y-1.5">
          <button
            onClick={() => setView('consult')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              view === 'consult'
                ? 'bg-[#e30613] text-white shadow-md'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-[#d7a17a]'
            } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title="Consultar Arquivos"
          >
            <Search size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span>Consultar</span>}
          </button>

          <button
            onClick={() => setView('upload')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              view === 'upload'
                ? 'bg-[#e30613] text-white shadow-md'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-[#d7a17a]'
            } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title="Upload de Arquivos"
          >
            <Upload size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span>Upload</span>}
          </button>

          <button
            onClick={() => setView('delete')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              view === 'delete'
                ? 'bg-[#e30613] text-white shadow-md'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-[#d7a17a]'
            } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title="Deletar Arquivos"
          >
            <Trash2 size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span>Deletar</span>}
          </button>
        </nav>

        {/* Link / Botão About do OCC */}
        <div className="p-3 border-t border-stone-800">
          <button
            onClick={() => setIsAboutOpen(true)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition cursor-pointer ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Sobre o aplicativo OCC"
          >
            <Info size={16} className="text-[#e30613] shrink-0" />
            {!isSidebarCollapsed && <span>Sobre o OCC</span>}
          </button>
        </div>

        {/* Rodapé Corporativo Renner & Recolher */}
        <div className="p-3 border-t border-stone-800 flex items-center justify-between text-stone-500 text-[10px]">
          {!isSidebarCollapsed && (
            <span className="font-semibold text-stone-400">Lojas Renner S/A</span>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg transition cursor-pointer ml-auto"
            title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Superior com Picklist de Ambiente e Prefixo */}
        <header className="bg-white border-b border-stone-200 p-4 flex flex-wrap justify-between items-center gap-4 shadow-2xs z-10">
          <div className="flex flex-wrap items-center gap-4">
            {/* Picklist de Ambiente Dinâmico no Header */}
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 shadow-2xs">
              <Server size={15} className="text-[#e30613]" />
              <label className="text-xs font-extrabold text-stone-600 uppercase tracking-wider">Ambiente:</label>
              <select
                value={currentEnv}
                onChange={(e) => handleEnvChange(e.target.value)}
                className="bg-transparent text-sm font-bold text-[#1c1c1a] outline-none cursor-pointer"
              >
                {availableEnvs.map(env => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>

            {/* Seletor de Prefixo Cloud */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">Prefixo Cloud:</label>
              <select
                value={prefix}
                onChange={(e) => handlePrefixChange(e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-stone-50 text-[#1c1c1a] font-medium outline-none focus:ring-2 focus:ring-[#e30613] focus:border-[#e30613] cursor-pointer transition"
              >
                <option value="">Selecione um prefixo...</option>
                {availablePrefixes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Configuração de Auto-Refresh */}
            <div className="flex items-center gap-2 text-xs text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="cursor-pointer accent-[#e30613]"
              />
              <label htmlFor="autoRefresh" className="cursor-pointer select-none font-semibold text-stone-700">Auto-Refresh</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
                className="border border-stone-300 rounded px-1.5 py-0.5 text-xs bg-white text-stone-800 outline-none disabled:opacity-50"
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
          </div>

          {/* Status de Sincronismo */}
          <div className="flex items-center gap-2.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-full shadow-2xs">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                connectivity.status === 'Success'
                  ? 'bg-[#487a7b]'
                  : connectivity.status === 'Failure'
                  ? 'bg-[#e30613]'
                  : 'bg-[#cc8400]'
              }`}
            />
            <div className="text-xs font-semibold text-stone-700">
              {loading ? 'Atualizando...' : 'Sincronizado'}
            </div>
          </div>
        </header>

        {/* Área Central e Painel Lateral */}
        <div className="flex-1 flex overflow-hidden relative">
          <section className={`flex-1 p-6 overflow-auto transition-all duration-300 ${isPanelCollapsed ? 'max-w-full' : ''}`}>
            {!prefix ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-400">
                <div className="p-4 bg-stone-200/50 rounded-2xl mb-4 border border-stone-300/60">
                  <AlertCircle size={44} className="text-[#be5400]/70" />
                </div>
                <p className="text-base font-bold text-stone-700">Por favor, selecione um prefixo acima para começar.</p>
                <p className="text-xs text-stone-500 mt-1">
                  Ambiente atual: <strong className="text-[#1c1c1a]">{currentEnv}</strong>
                </p>
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
                  />
                )}
                {view === 'upload' && <UploadView prefix={prefix} onUploadSuccess={handleRefresh} />}
                {view === 'delete' && <DeletionView prefix={prefix} files={files} onDeleted={handleOnDeleted} onRefresh={handleRefresh} />}
              </div>
            )}
          </section>

          {/* Painel Lateral de Informações do Ambiente */}
          <aside className={`bg-white border-l border-stone-200 transition-all duration-300 ${isPanelCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-80'}`}>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">Info Ambiente</span>
                <button
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1 hover:bg-stone-200 rounded text-stone-400 hover:text-stone-700 transition cursor-pointer"
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
              className="absolute right-0 top-6 p-2 bg-white border border-stone-300 rounded-l-lg shadow-md hover:bg-stone-50 transition cursor-pointer text-stone-600 hover:text-[#e30613]"
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
