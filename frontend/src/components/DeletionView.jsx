/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
import React, { useState, useMemo } from 'react';
import { Trash2, RefreshCw, Search, ArrowUpDown, FileText, Database } from 'lucide-react';
import { ftsApi } from '../services/api';
import { useToast } from './Toast';
import PropTypes from 'prop-types';

export default function DeletionView({ prefix, files = [], onDeleted, onRefresh }) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Calcula a soma total do volume dos arquivos no prefixo atual
  const totalSizeBytes = useMemo(() => {
    return (files || []).reduce((acc, f) => acc + (Number(f.size) || 0), 0);
  }, [files]);

  // Converte para MB formatado com vírgula no padrão pt-BR (ex: "0,00 MB")
  const prefixSizeFormatted = useMemo(() => {
    const mb = totalSizeBytes / 1048576;
    return mb.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [totalSizeBytes]);

  // Calcula a soma do volume dos arquivos selecionados para exclusão
  const selectedSizeBytes = useMemo(() => {
    return (files || [])
      .filter(f => selected.includes(f.name))
      .reduce((acc, f) => acc + (Number(f.size) || 0), 0);
  }, [files, selected]);

  const selectedSizeFormatted = useMemo(() => {
    const mb = selectedSizeBytes / 1048576;
    return mb.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [selectedSizeBytes]);

  const toggleFile = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleSelectAll = () => {
    if (selected.length === filteredAndSortedFiles.length) {
      setSelected([]);
    } else {
      setSelected(filteredAndSortedFiles.map(f => f.name));
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedFiles = useMemo(() => {
    let result = (files || []).filter(f =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'size') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [files, searchTerm, sortConfig]);

  const handleConfirmDelete = async () => {
    if (!window.confirm(`Deseja realmente deletar ${selected.length} arquivo(s) do prefixo ${prefix}?`)) return;
    setDeleting(selected);
    try {
      await ftsApi.deleteFiles(prefix, selected);
      onDeleted(selected);
      showToast('Arquivos deletados com sucesso!');
      setSelected([]);
    } catch (e) {
      showToast('Erro ao deletar: ' + e.message, 'error');
    } finally {
      setDeleting([]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Top Header do Card de Exclusão */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="font-bold text-[#e30613] flex items-center gap-2 shrink-0 tracking-tight">
            <Trash2 size={18} /> Selecionar para Exclusão
          </h2>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
            <input
              className="pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#e30613] focus:border-[#e30613] bg-white w-full transition"
              placeholder="Filtrar arquivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-stone-200 rounded-full transition text-stone-600 hover:text-[#e30613] shrink-0 cursor-pointer"
            title="Atualizar Lista"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <button
          onClick={handleConfirmDelete}
          disabled={selected.length === 0}
          className="bg-[#e30613] text-white px-5 py-2 rounded-lg text-xs font-bold disabled:bg-stone-300 hover:bg-[#be5400] transition shrink-0 cursor-pointer shadow-sm active:scale-95"
        >
          Deletar Selecionados ({selected.length})
        </button>
      </div>

      {/* Barra de Prefixo Size & Métricas com Paleta Renner */}
      <div className="px-4 py-3 bg-[#e30613]/5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5">
          <Database size={16} className="text-[#e30613]" />
          <span className="font-bold text-[#1c1c1a]">Prefixo Size:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#1c1c1a] text-white font-mono font-bold text-xs tracking-wide shadow-xs border border-[#d7a17a]/40">
            {prefixSizeFormatted} MB
          </span>
          <span className="text-xs text-stone-600 font-medium ml-1">
            ({files.length} {files.length === 1 ? 'arquivo' : 'arquivos'})
          </span>
          {selected.length > 0 && (
            <span className="ml-2 text-xs font-bold text-[#e30613] bg-[#e30613]/10 px-2.5 py-0.5 rounded-full border border-[#e30613]/30">
              Selecionados: {selected.length} ({selectedSizeFormatted} MB)
            </span>
          )}
        </div>
        {searchTerm && (
          <div className="text-xs text-stone-600 bg-white px-3 py-1 rounded-md border border-stone-200 shadow-2xs font-medium">
            Exibindo <strong className="text-[#1c1c1a]">{filteredAndSortedFiles.length}</strong> de <strong className="text-[#1c1c1a]">{files.length}</strong> arquivos
          </div>
        )}
      </div>

      {/* Tabela de Arquivos */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-700 uppercase text-xs font-bold border-b border-stone-200">
            <tr>
              <th className="p-4 select-none">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-[#e30613] cursor-pointer"
                    checked={filteredAndSortedFiles.length > 0 && selected.length === filteredAndSortedFiles.length}
                    onChange={toggleSelectAll}
                    title="Selecionar todos"
                  />
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:text-[#e30613]"
                    onClick={() => handleSort('name')}
                  >
                    Nome <ArrowUpDown size={12} />
                  </div>
                </div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-stone-200/80 transition select-none" onClick={() => handleSort('size')}>
                <div className="flex items-center gap-1.5 hover:text-[#e30613]">Tamanho <ArrowUpDown size={12} /></div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-stone-200/80 transition select-none" onClick={() => handleSort('scanStatus')}>
                <div className="flex items-center gap-1.5 hover:text-[#e30613]">Status Scan <ArrowUpDown size={12} /></div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-stone-200/80 transition select-none" onClick={() => handleSort('modified')}>
                <div className="flex items-center gap-1.5 hover:text-[#e30613]">Data <ArrowUpDown size={12} /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredAndSortedFiles.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-stone-400">Nenhum arquivo encontrado correspondente à busca.</td></tr>
            ) : filteredAndSortedFiles.map((f) => (
              <tr
                key={f.name}
                className={`transition ${
                  deleting.includes(f.name)
                    ? 'bg-red-100/60'
                    : selected.includes(f.name)
                    ? 'bg-[#e30613]/5'
                    : 'hover:bg-[#d7a17a]/10'
                }`}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-[#e30613] cursor-pointer"
                      checked={selected.includes(f.name)}
                      onChange={() => toggleFile(f.name)}
                    />
                    <div className="flex items-center gap-2">
                      <FileText size={16} className={selected.includes(f.name) ? 'text-[#e30613]' : 'text-stone-400'} />
                      <span className={`font-medium text-xs ${
                        deleting.includes(f.name) || selected.includes(f.name)
                          ? 'line-through text-[#e30613] font-semibold'
                          : 'text-[#1c1c1a]'
                      }`}>
                        {f.name} {deleting.includes(f.name) && <span className="text-[10px] italic ml-2 text-[#be5400]">(Removendo...)</span>}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-stone-600 font-mono text-xs">{(f.size / 1048576).toFixed(2)} MB</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      f.scanStatus === 'Passed'
                        ? 'bg-[#487a7b]/15 text-[#487a7b] border-[#487a7b]/30'
                        : f.scanStatus === 'Failed'
                        ? 'bg-[#e30613]/15 text-[#e30613] border-[#e30613]/30'
                        : 'bg-[#be5400]/15 text-[#be5400] border-[#be5400]/30'
                    }`}
                  >
                    {f.scanStatus}
                  </span>
                </td>
                <td className="p-4 text-stone-500 text-xs">{f.modified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

DeletionView.propTypes = {
  prefix: PropTypes.string,
  files: PropTypes.array,
  onDeleted: PropTypes.func,
  onRefresh: PropTypes.func,
};
