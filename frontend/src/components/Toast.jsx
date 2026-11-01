import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import PropTypes from 'prop-types';

const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 5000);
  };

  const icons = {
    success: <CheckCircle size={18} className="text-[#487a7b] shrink-0" />,
    error: <AlertCircle size={18} className="text-[#e30613] shrink-0" />,
    info: <Info size={18} className="text-[#be5400] shrink-0" />,
  };

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-stone-200 border-l-4 rounded-lg shadow-lg p-3 flex items-start gap-2 text-sm text-[#1c1c1a]"
            style={{ borderLeftColor: t.type === 'error' ? '#e30613' : t.type === 'info' ? '#be5400' : '#487a7b' }}
          >
            <div className="mt-0.5">{icons[t.type] || icons.info}</div>
            <p className="flex-1 font-medium">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-stone-400 hover:text-stone-700 cursor-pointer text-lg leading-none"
              title="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
