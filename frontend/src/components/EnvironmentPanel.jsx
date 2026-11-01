/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
import React from 'react';
import { Activity, Server, Folder, Wifi, RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';

export default function EnvironmentPanel({ connectivity, prefix, isCollapsed, currentEnv, availableEnvs = [], onEnvChange, onEnvRefresh }) {
  if (isCollapsed) return null;

  return (
    <div className="p-5 flex flex-col gap-5 h-full bg-stone-50/50">
      <h3 className="font-bold text-[#1c1c1a] flex items-center gap-2 border-b border-stone-200 pb-2 text-sm tracking-wide uppercase">
        <Activity size={17} className="text-[#e30613]" /> Status do Ambiente
      </h3>
      <div className="space-y-3.5">
        {/* Card Conectividade */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
          <div className="text-xs text-stone-500 mb-1.5 flex items-center gap-1.5 font-medium">
            <Wifi size={13} className="text-[#487a7b]" /> Conectividade
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connectivity.status === 'Success'
                    ? 'bg-[#487a7b]'
                    : connectivity.status === 'Failure'
                    ? 'bg-[#e30613]'
                    : 'bg-[#cc8400]'
                }`}
              />
              <span
                className={`font-bold text-sm ${
                  connectivity.status === 'Success'
                    ? 'text-[#487a7b]'
                    : connectivity.status === 'Failure'
                    ? 'text-[#e30613]'
                    : 'text-[#cc8400]'
                }`}
              >
                {connectivity.status === 'Success'
                  ? 'Sucesso'
                  : connectivity.status === 'Failure'
                  ? 'Falha'
                  : 'Verificando...'}
              </span>
            </div>
            <button
              onClick={onEnvRefresh}
              className="p-1.5 hover:bg-stone-100 rounded-full transition text-stone-500 hover:text-[#e30613] cursor-pointer"
              title="Atualizar Conexão"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Card Ambiente */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
          <div className="text-xs text-stone-500 mb-1.5 flex items-center gap-1.5 font-medium">
            <Server size={13} className="text-[#be5400]" /> Ambiente
          </div>
          <div className="flex gap-2 mt-1">
            <select
              value={currentEnv}
              onChange={(e) => onEnvChange(e.target.value)}
              className="w-full text-xs font-bold text-[#1c1c1a] bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#e30613] focus:border-[#e30613] cursor-pointer transition shadow-2xs"
            >
              {(availableEnvs.length > 0 ? availableEnvs : [currentEnv]).map(env => (
                <option key={env} value={env}>{env}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Card Prefixo Ativo */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
          <div className="text-xs text-stone-500 mb-1.5 flex items-center gap-1.5 font-medium">
            <Folder size={13} className="text-[#d7a17a]" /> Prefixo Ativo
          </div>
          <div className="text-xs font-semibold text-[#1c1c1a] bg-stone-50 p-2 rounded-lg border border-stone-200 truncate font-mono">
            {prefix || 'Nenhum selecionado'}
          </div>
        </div>
      </div>
    </div>
  );
}

EnvironmentPanel.propTypes = {
  connectivity: PropTypes.shape({
    status: PropTypes.string,
    color: PropTypes.string,
  }),
  prefix: PropTypes.string,
  isCollapsed: PropTypes.bool,
  currentEnv: PropTypes.string,
  availableEnvs: PropTypes.array,
  onEnvChange: PropTypes.func,
  onEnvRefresh: PropTypes.func,
};
