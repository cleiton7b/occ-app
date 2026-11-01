import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-stone-100 flex flex-col items-center justify-center text-stone-700 p-8 text-center gap-4">
          <div className="p-4 bg-[#e30613]/10 rounded-2xl border border-[#e30613]/30">
            <AlertCircle size={44} className="text-[#e30613]" />
          </div>
          <h2 className="text-xl font-bold text-[#1c1c1a]">Algo deu errado ao carregar o OCC</h2>
          <p className="text-sm text-stone-500 max-w-md">
            Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-[#e30613] hover:bg-[#be5400] text-white rounded-xl font-bold text-sm transition active:scale-95 cursor-pointer"
          >
            <RefreshCw size={16} /> Recarregar aplicação
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};
