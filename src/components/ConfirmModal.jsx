import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  itemName = '',
  itemCode = '',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  loading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'scaleIn 0.18s ease-out',
        }}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: isDanger ? '#fee2e2' : '#fef3c7',
                color: isDanger ? '#dc2626' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isDanger ? <AlertTriangle size={24} /> : <AlertTriangle size={24} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  lineHeight: '1.3',
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '0.88rem',
                  color: '#64748b',
                  lineHeight: '1.5',
                }}
              >
                {message}
              </p>

              {(itemName || itemCode) && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  {itemCode && (
                    <span
                      style={{
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#e0e7ff',
                        color: '#4338ca',
                      }}
                    >
                      {itemCode}
                    </span>
                  )}
                  {itemName && (
                    <span
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {itemName}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: '4px',
                borderRadius: '6px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isDanger ? '#dc2626' : '#4338ca',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isDanger
                ? '0 2px 4px rgba(220, 38, 38, 0.25)'
                : '0 2px 4px rgba(67, 56, 202, 0.25)',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {isDanger && <Trash2 size={16} />}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
