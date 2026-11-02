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
      <h3 className="font-bold text-ink flex items-center gap-2 border-b border-stone-200 pb-2 text-sm tracking-wide uppercase">
        <Activity size={17} className="text-brand" /> Status do Ambiente
      </h3>
      <div className="space-y-3.5">
        {/* Card Conectividade */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
          <div className="text-xs text-stone-500 mb-1.5 flex items-center gap-1.5 font-medium">
            <Wifi size={13} className="text-sea" /> Conectividade
          </div>
          <div className="text-sm font-bold text-ink flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectivity?.status === 'online' ? 'bg-sea' : 'bg-brand'}`} />
            {connectivity?.status === 'online' ? 'Conectado' : 'Sem conexão'}
          </div>
        </div>

        {/* Card Ambiente */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
          <div className="text-xs text-stone-500 mb-1.5 flex items-center gap-1.5 font-medium">
            <Server size={13} className="text-brand" /> Ambiente
          </div>
          <div className="flex items-center gap-2">
            <select
              id="env-select"
              value={currentEnv}
              onChange={(e) => onEnvChange?.(e.target.value)}
              className="flex-1 text-sm font-bold text-ink bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            >
              {availableEnvs.map((env) => (
                <option key={env} value={env}>{env}</option>
              ))}
            </select>
            <button
              onClick={onEnvRefresh}
              className="p-1.5 rounded-lg text-stone-500 hover:text-brand hover:bg-brand/10 transition cursor-pointer"
              title="Atualizar ambientes"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Card Prefixo */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
          <div className="text-xs text-stone-500 mb-1.5 flex items-center gap-1.5 font-medium">
            <Folder size={13} className="text-ochre" /> Prefixo ativo
          </div>
          <div className="text-sm font-mono font-bold text-ink break-all">{prefix || '—'}</div>
        </div>
      </div>
    </div>
  );
}

EnvironmentPanel.propTypes = {
  connectivity: PropTypes.object,
  prefix: PropTypes.string,
  isCollapsed: PropTypes.bool,
  currentEnv: PropTypes.string,
  availableEnvs: PropTypes.array,
  onEnvChange: PropTypes.func,
  onEnvRefresh: PropTypes.func,
};