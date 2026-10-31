import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, ArrowRight } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 3500, action = null }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, title, message, action };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Global listener for toasts dispatched via window event
  React.useEffect(() => {
    const handleAppToast = (e) => {
      if (e.detail) {
        addToast(e.detail);
      }
    };
    window.addEventListener('app:toast', handleAppToast);
    return () => window.removeEventListener('app:toast', handleAppToast);
  }, [addToast]);

  const showSuccess = useCallback((message, title = 'Success', action = null) => {
    addToast({ type: 'success', title, message, action });
  }, [addToast]);

  const showError = useCallback((message, title = 'Error', action = null) => {
    addToast({ type: 'error', title, message, action });
  }, [addToast]);

  const showInfo = useCallback((message, title = 'Info', action = null) => {
    addToast({ type: 'info', title, message, action });
  }, [addToast]);

  const showWarning = useCallback((message, title = 'Warning', action = null) => {
    addToast({ type: 'warning', title, message, action });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning, addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '420px',
          width: 'calc(100vw - 40px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const config = {
            success: {
              bg: '#f0fdf4',
              border: '#86efac',
              text: '#15803d',
              icon: <CheckCircle2 size={20} color="#16a34a" />,
              bar: '#22c55e',
            },
            error: {
              bg: '#fef2f2',
              border: '#fca5a5',
              text: '#b91c1c',
              icon: <AlertCircle size={20} color="#dc2626" />,
              bar: '#ef4444',
            },
            warning: {
              bg: '#fffbeb',
              border: '#fde68a',
              text: '#b45309',
              icon: <AlertTriangle size={20} color="#d97706" />,
              bar: '#f59e0b',
            },
            info: {
              bg: '#eff6ff',
              border: '#bfdbfe',
              text: '#1d4ed8',
              icon: <Info size={20} color="#2563eb" />,
              bar: '#3b82f6',
            },
          }[t.type] || {
            bg: '#f8fafc',
            border: '#cbd5e1',
            text: '#334155',
            icon: <Info size={20} color="#64748b" />,
            bar: '#6366f1',
          };

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
                borderRadius: '10px',
                padding: '12px 14px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
                animation: 'slideInRight 0.22s ease-out',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: '2px' }}>{config.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {t.title && (
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      color: config.text,
                      lineHeight: '1.25',
                      marginBottom: t.message ? '3px' : '0',
                    }}
                  >
                    {t.title}
                  </div>
                )}
                {t.message && (
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: '#334155',
                      lineHeight: '1.35',
                      wordBreak: 'break-word',
                    }}
                  >
                    {t.message}
                  </div>
                )}
                {t.action && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof t.action.onClick === 'function') {
                          t.action.onClick();
                        } else if (t.action.url) {
                          window.location.href = t.action.url;
                        }
                        removeToast(t.id);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: config.bar,
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        transition: 'opacity 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <span>{t.action.label || t.action.text || 'View Submission'}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#334155')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <X size={16} />
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  backgroundColor: config.bar,
                }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      showSuccess: (msg) => console.log('Success:', msg),
      showError: (msg) => console.error('Error:', msg),
      showInfo: (msg) => console.log('Info:', msg),
      showWarning: (msg) => console.warn('Warning:', msg),
    };
  }
  return context;
};
