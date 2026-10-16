import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ToastContainer from '../components/ui/Toast.jsx';

const ToastContext = createContext(null);

let toastQueue = [];
let activeToastHandler = null;

/**
 * Universal imperative toast API that can be imported and called anywhere,
 * inside or outside React components.
 */
export const toast = {
  success(message, options) {
    if (activeToastHandler) {
      return activeToastHandler('success', message, options);
    }
    const item = { type: 'success', message, options };
    toastQueue.push(item);
    return item;
  },
  error(message, options) {
    if (activeToastHandler) {
      return activeToastHandler('error', message, options);
    }
    const item = { type: 'error', message, options };
    toastQueue.push(item);
    return item;
  },
  warning(message, options) {
    if (activeToastHandler) {
      return activeToastHandler('warning', message, options);
    }
    const item = { type: 'warning', message, options };
    toastQueue.push(item);
    return item;
  },
  info(message, options) {
    if (activeToastHandler) {
      return activeToastHandler('info', message, options);
    }
    const item = { type: 'info', message, options };
    toastQueue.push(item);
    return item;
  },
  dismiss(id) {
    if (activeToastHandler) {
      activeToastHandler('dismiss', id);
    }
  },
  clear() {
    if (activeToastHandler) {
      activeToastHandler('clear');
    }
    toastQueue = [];
  },
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { toast };
  }
  return ctx;
}

let nextToastId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, options = {}) => {
    const id = options.id || `toast-${nextToastId++}-${Date.now()}`;
    const text = typeof message === 'string'
      ? message
      : message?.message || String(message || '');
    const title = options.title || null;
    const duration = options.duration !== undefined ? options.duration : 4000;

    const newToast = {
      id,
      type,
      title,
      message: text,
      duration,
      action: options.action || null,
      createdAt: Date.now(),
      closing: false,
    };

    setToasts(prev => {
      const filtered = prev.filter(t => t.id !== id);
      // Keep up to 5 simultaneous toasts
      if (filtered.length >= 5) {
        return [...filtered.slice(filtered.length - 4), newToast];
      }
      return [...filtered, newToast];
    });

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev =>
      prev.map(t => t.id === id ? { ...t, closing: true } : t)
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 240);
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Connect singleton toast
  useEffect(() => {
    activeToastHandler = (action, message, options) => {
      if (action === 'dismiss') {
        dismissToast(message);
      } else if (action === 'clear') {
        clearToasts();
      } else {
        return addToast(action, message, options);
      }
    };

    // Flush any pending toasts
    while (toastQueue.length > 0) {
      const q = toastQueue.shift();
      addToast(q.type, q.message, q.options);
    }

    return () => {
      activeToastHandler = null;
    };
  }, [addToast, dismissToast, clearToasts]);

  // Intercept window.alert so all unexpected browser alerts become modern toasts
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      toast.info(String(msg));
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const contextValue = {
    toast,
    toasts,
    addToast,
    dismissToast,
    clearToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export default ToastContext;
