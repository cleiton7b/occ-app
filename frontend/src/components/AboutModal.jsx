/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Info, Code, Calendar, ShieldCheck, Box, BookOpen, Building2 } from 'lucide-react';
import pkg from '../../package.json';

const APP_VERSION = pkg.version;

export default function AboutModal({ isOpen, onClose }) {
  // Fecha o modal ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Faixa superior com acento Vermelho Renner */}
        <div className="h-1.5 w-full bg-[#e30613]" />

        {/* Cabeçalho do Modal no estilo Lojas Renner S/A */}
        <div className="bg-[#1c1c1a] text-white p-5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#e30613]/15 rounded-xl border border-[#e30613]/40 flex items-center justify-center">
              <Box className="text-[#e30613]" size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Sobre o OCC</h2>
                <span className="text-[10px] tracking-wider uppercase bg-[#e30613] text-white font-extrabold px-2 py-0.5 rounded">
                  Lojas Renner S/A
                </span>
              </div>
              <p className="text-xs text-[#d7a17a] font-medium mt-0.5">Object Control Center • Oracle Cloud Storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com as Informações */}
        <div className="p-6 space-y-5 text-sm text-[#1c1c1a] overflow-y-auto flex-1">
          {/* Seção 1: Descrição Oficial */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-[#1c1c1a] text-sm border-b border-stone-200 pb-2.5">
              <BookOpen size={18} className="text-[#e30613]" />
              <span className="tracking-wide uppercase text-xs font-extrabold text-[#1c1c1a]">Descrição</span>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-stone-700">
              <p>
                O <strong className="text-[#1c1c1a] font-bold">OCC (Object Control Center)</strong> é uma plataforma desenvolvida para apoiar os times de Projetos e Sustentação na gestão operacional dos arquivos armazenados no Oracle Object Storage das aplicações Oracle Retail.
              </p>
              <p>
                A solução disponibiliza recursos para monitoramento, consulta, upload, download, movimentação e análise de arquivos, proporcionando maior visibilidade, agilidade e controle sobre os processos de integração e armazenamento.
              </p>
              <p>
                Com uma interface centralizada e segura, o <strong className="text-[#1c1c1a] font-bold">OCC (Object Control Center)</strong> simplifica atividades operacionais, reduz o tempo de diagnóstico e facilita o suporte às aplicações Oracle Retail, contribuindo para a eficiência operacional e a estabilidade dos ambientes.
              </p>
            </div>
          </div>

          {/* Grid com Versão e Informações Legais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seção 2: Versão do Aplicativo */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-[#1c1c1a] text-xs border-b border-stone-200 pb-2 uppercase tracking-wide">
                <Info size={16} className="text-[#be5400]" />
                <span>Versão do Aplicativo</span>
              </div>
              <ul className="space-y-2 text-xs text-stone-600">
                <li className="flex justify-between py-1 border-b border-stone-200/70">
                  <span className="font-semibold text-stone-700">Nome:</span>
                  <span className="font-semibold text-[#1c1c1a]">Object Control Center (OCC)</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-stone-200/70">
                  <span className="font-semibold text-stone-700">Versão:</span>
                  <span className="font-mono bg-[#1c1c1a] text-white px-2 py-0.5 rounded font-bold text-[11px]">
                    {APP_VERSION}
                  </span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span className="font-semibold text-stone-700">Atualização:</span>
                  <span className="text-stone-800 font-medium flex items-center gap-1">
                    <Calendar size={12} className="text-[#487a7b]" /> Outubro de 2026
                  </span>
                </li>
              </ul>
            </div>

            {/* Seção 3: Informações Corporativas e Créditos */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-[#1c1c1a] text-xs border-b border-stone-200 pb-2 uppercase tracking-wide">
                <ShieldCheck size={16} className="text-[#487a7b]" />
                <span>Organização & Créditos</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-stone-200/70">
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <Building2 size={12} className="text-[#e30613]" /> Empresa:
                  </span>
                  <span className="font-bold text-[#1c1c1a]">Lojas Renner S/A</span>
                </div>
                <div className="flex flex-col py-1 border-b border-stone-200/70 gap-0.5">
                  <span className="font-semibold text-stone-700">Área:</span>
                  <span className="font-medium text-stone-800 bg-[#d7a17a]/20 px-2 py-0.5 rounded border border-[#d7a17a]/40 text-[11px]">
                    Soluções Produto Projetos TI - Planning
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700 block mb-1 flex items-center gap-1">
                    <Code size={13} className="text-[#487a7b]" /> Desenvolvedores:
                  </span>
                  <div className="pl-2.5 border-l-2 border-[#e30613] space-y-0.5">
                    <p className="font-medium text-stone-800">Cleiton Otávio de Sousa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-stone-100 border-t border-stone-200 px-6 py-3.5 flex justify-between items-center">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#e30613]" />
            <span>Lojas Renner S/A</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1c1c1a] hover:bg-[#e30613] text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

AboutModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
