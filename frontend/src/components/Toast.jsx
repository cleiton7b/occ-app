/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
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
    success: <CheckCircle size={18} className="text-sea shrink-0" />,
    error: <AlertCircle size={18} className="text-brand shrink-0" />,
    info: <Info size={18} className="text-clay shrink-0" />,
  };

  const styles = {
    success: 'border-sea/30 bg-sea/5',
    error: 'border-brand/30 bg-brand/5',
    info: 'border-clay/30 bg-clay/5',
  };

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lift bg-white ${styles[t.type] || styles.info} animate-rise-in`}
          >
            {icons[t.type] || icons.info}
            <p className="text-sm text-ink font-medium flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-stone-400 hover:text-ink transition cursor-pointer"
              aria-label="Fechar notificação"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

ToastProvider.propTypes = {
  children: PropTypes.node,
};