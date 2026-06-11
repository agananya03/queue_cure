import React, { createContext, useContext, useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Individual Toast Card with progress bar
const ToastCard = ({ id, message, variant = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  // Styling properties
  const variantStyles = {
    success: 'bg-white border-slate-200 text-slate-800 border-l-4 border-l-[#00A86B]',
    error: 'bg-white border-slate-200 text-slate-800 border-l-4 border-l-[#DC2626]',
    info: 'bg-white border-slate-200 text-slate-800 border-l-4 border-l-[#0066CC]',
    warning: 'bg-white border-slate-200 text-slate-800 border-l-4 border-l-[#F59E0B]'
  };

  const progressBgColors = {
    success: 'bg-[#00A86B]',
    error: 'bg-[#DC2626]',
    info: 'bg-[#0066CC]',
    warning: 'bg-[#F59E0B]'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[#00A86B] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
    info: <Info className="w-5 h-5 text-[#0066CC] shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />
  };

  return (
    <div className={`
      w-80 p-4 rounded-xl shadow-xl border flex flex-col gap-3 relative overflow-hidden bg-white
      animate-toast-slide
    `}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes progressShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-slide {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toast-bar {
          animation: progressShrink 3s linear forwards;
        }
      `}</style>

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          {icons[variant]}
          <span className="text-xs font-bold text-slate-800 leading-normal">{message}</span>
        </div>
        
        <button 
          onClick={() => onClose(id)}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Real-time shrinking progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
        <div className={`h-full animate-toast-bar ${progressBgColors[variant]}`}></div>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, variant = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, variant }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Shortcut functions
  const toastShortcuts = {
    addToast,
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning')
  };

  return (
    <ToastContext.Provider value={toastShortcuts}>
      {children}
      
      {/* Toast Portal/Stack Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastCard 
              id={toast.id}
              message={toast.message}
              variant={toast.variant}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
