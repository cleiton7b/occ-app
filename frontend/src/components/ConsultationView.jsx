/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
import React, { useState, useMemo } from 'react';
import { RefreshCw, Search, ArrowUpDown, FileText, Download, Database, AlertCircle } from 'lucide-react';
import { ftsApi } from '../services/api';
import { useToast } from './Toast';
import { processFiles, formatFileSizeMB, sumFileSizes, getNextSortConfig } from '../utils/fileList';
import PropTypes from 'prop-types';

export default function ConsultationView({ files = [], prefix = '', onRefresh, isAutoRefresh, deletedFiles = [], error = null }) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Calcula a soma total do volume dos arquivos no prefixo atual
  const totalSizeBytes = useMemo(() => sumFileSizes(files), [files]);

  // Converte para MB formatado com vírgula no padrão pt-BR (ex: "0,00 MB")
  const prefixSizeFormatted = useMemo(() => formatFileSizeMB(totalSizeBytes), [totalSizeBytes]);

  const handleSort = (key) => {
    const next = getNextSortConfig(sortConfig, key);
    setSortConfig(next);
    setPage(1);
  };

  const filteredAndSortedFiles = useMemo(
    () => processFiles(files, searchTerm, sortConfig),
    [files, searchTerm, sortConfig]
  );

  // Paginação client-side da lista filtrada
  const paginatedFiles = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedFiles.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAndSortedFiles.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedFiles, page]);

  return (
    <div className="bg-white rounded-xl shadow-card border border-stone-200 overflow-hidden">
      {/* Top Header do Card de Arquivos */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand" />
            <h2 className="font-bold text-ink tracking-tight">Arquivos no Prefixo</h2>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-stone-200 rounded-full transition text-stone-600 hover:text-brand cursor-pointer"
            title="Atualizar lista de arquivos"
          >
            <RefreshCw size={17} className={`transition-transform ${isAutoRefresh ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
          <input
            className="pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand w-64 bg-white transition"
            placeholder="Filtrar arquivos..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Barra de Prefixo Size & Métricas com Paleta Renner */}
      <div className="px-4 py-3 bg-sand/15 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5">
          <Database size={16} className="text-brand" />
          <span className="font-bold text-ink">Prefixo Size:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-ink text-white font-mono font-bold text-xs tracking-wide shadow-2xs border border-sand/40">
            {prefixSizeFormatted} MB
          </span>
          <span className="text-xs text-stone-600 font-medium ml-1">
            ({files.length} {files.length === 1 ? 'arquivo' : 'arquivos'})
          </span>
        </div>
        {searchTerm && (
          <div className="text-xs text-stone-600 bg-white px-3 py-1 rounded-md border border-stone-200 shadow-2xs font-medium">
            Exibindo <strong className="text-ink">{filteredAndSortedFiles.length}</strong> de <strong className="text-ink">{files.length}</strong> arquivos
          </div>
        )}
      </div>

      {/* Tabela de Arquivos */}
      {error ? (
        <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle size={36} className="text-brand" />
          <p className="text-sm font-bold text-ink">Erro ao carregar arquivos</p>
          <p className="text-xs text-stone-500">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-brand hover:bg-clay text-white transition cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-700 uppercase text-xs font-bold border-b border-stone-200">
            <tr>
              <th className="p-4 cursor-pointer hover:bg-stone-200/80 transition select-none" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1.5 hover:text-brand">Nome <ArrowUpDown size={12} /></div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-stone-200/80 transition select-none" onClick={() => handleSort('size')}>
                <div className="flex items-center gap-1.5 hover:text-brand">Tamanho <ArrowUpDown size={12} /></div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-stone-200/80 transition select-none" onClick={() => handleSort('scanStatus')}>
                <div className="flex items-center gap-1.5 hover:text-brand">Status Scan <ArrowUpDown size={12} /></div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-stone-200/80 transition select-none" onClick={() => handleSort('modified')}>
                <div className="flex items-center gap-1.5 hover:text-brand">Data <ArrowUpDown size={12} /></div>
              </th>
              <th className="p-4 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredAndSortedFiles.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-stone-400">Nenhum arquivo encontrado neste prefixo.</td></tr>
            ) : paginatedFiles.map((f) => (
              <tr
                key={f.name}
                className={`transition cursor-default ${
                  deletedFiles.includes(f.name)
                    ? 'bg-red-50/70'
                    : 'hover:bg-sand/10'
                }`}
              >
                <td className="p-4 flex items-center gap-2 font-medium text-ink">
                  <FileText size={16} className={deletedFiles.includes(f.name) ? 'text-brand' : 'text-stone-400'} />
                  <span className={deletedFiles.includes(f.name) ? 'text-brand line-through' : ''}>{f.name}</span>
                </td>
                <td className="p-4 text-stone-600 font-mono text-xs">{formatFileSizeMB(f.size)} MB</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      f.scanStatus === 'Passed'
                        ? 'bg-sea/15 text-sea border-sea/30'
                        : f.scanStatus === 'Failed'
                        ? 'bg-brand/15 text-brand border-brand/30'
                        : 'bg-clay/15 text-clay border-clay/30'
                    }`}
                  >
                    {f.scanStatus}
                  </span>
                </td>
                <td className="p-4 text-stone-500 text-xs">{f.modified}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => ftsApi.downloadFile(prefix, f.name).catch(e => showToast(e.message, 'error'))}
                    className="p-2 text-stone-600 hover:text-brand hover:bg-brand/10 rounded-full transition cursor-pointer"
                    title="Baixar Arquivo"
                  >
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      {/* Paginação */}
      {filteredAndSortedFiles.length > PAGE_SIZE && (
        <div className="p-4 border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-600">
            Página {Math.min(page, Math.max(1, Math.ceil(filteredAndSortedFiles.length / PAGE_SIZE)))} de {Math.ceil(filteredAndSortedFiles.length / PAGE_SIZE)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page < 2}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(filteredAndSortedFiles.length / PAGE_SIZE)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand text-white border border-brand hover:bg-clay disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ConsultationView.propTypes = {
  files: PropTypes.array,
  prefix: PropTypes.string,
  onRefresh: PropTypes.func,
  isAutoRefresh: PropTypes.bool,
  deletedFiles: PropTypes.array,
  error: PropTypes.string,
};