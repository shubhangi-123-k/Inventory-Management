import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

const DeleteConfirmationModal = ({
  isOpen,
  title = 'Confirm Deletion',
  itemName = 'this item',
  onClose,
  onConfirm,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  // Automatically close on intercepted approval event
  useEffect(() => {
    const handleApprovalPending = () => {
      if (isOpen) {
        setReason('');
        setError('');
        setSubmitting(false);
        onClose();
      }
    };
    window.addEventListener('approval:pending', handleApprovalPending);
    return () => window.removeEventListener('approval:pending', handleApprovalPending);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading && !submitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, submitting]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLoading || submitting) return;
    setReason('');
    setError('');
    onClose();
  };

  const handleTextChange = (e) => {
    setReason(e.target.value);
    if (error && e.target.value.trim().length >= 5) {
      setError('');
    }
  };

  const handleConfirmClick = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a reason before deleting.');
      return;
    }
    if (trimmed.length < 5) {
      setError('Reason must be at least 5 characters long for compliance.');
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(trimmed);
      setReason('');
      setError('');
    } catch (err) {
      console.error('Delete action failed in modal:', err);
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to complete deletion');
    } finally {
      setSubmitting(false);
    }
  };

  const isExecuting = isLoading || submitting;
  const trimmedLength = reason.trim().length;
  const isReasonValid = trimmedLength >= 5;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExecuting) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          border: '1px solid #fee2e2',
          overflow: 'hidden',
          animation: 'scaleIn 0.18s ease-out'
        }}
      >
        {/* Header: Destructive / Warning */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={22} color="#dc2626" />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#991b1b',
                  lineHeight: '1.3'
                }}
              >
                {title}
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: '500' }}>
                Enterprise Audit Compliance Required
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isExecuting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              color: '#991b1b',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isExecuting ? 0.4 : 0.8,
              transition: 'all 0.15s'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleConfirmClick}>
          <div style={{ padding: '24px' }}>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '0.92rem',
                color: '#334155',
                lineHeight: '1.5'
              }}
            >
              Are you sure you want to delete <strong>{itemName}</strong>? This action will be recorded in the audit trail.
            </p>

            {/* Required Reason Input */}
            <div style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor="deletion-reason-input"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0
                  }}
                >
                  Reason for Deletion <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span
                  style={{
                    fontSize: '0.74rem',
                    color: isReasonValid ? '#16a34a' : '#64748b',
                    fontWeight: '600'
                  }}
                >
                  {isReasonValid ? '✓ Valid (5+ chars)' : `${trimmedLength}/5 chars minimum`}
                </span>
              </div>
              <textarea
                id="deletion-reason-input"
                rows={3}
                autoFocus
                disabled={isExecuting}
                placeholder="e.g., Discontinued by vendor, damaged inventory, duplicate entry..."
                value={reason}
                onChange={handleTextChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: error ? '1.5px solid #ef4444' : isReasonValid ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'vertical',
                  boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s'
                }}
                onFocus={(e) => {
                  if (!error) e.target.style.borderColor = isReasonValid ? '#16a34a' : '#dc2626';
                }}
                onBlur={(e) => {
                  if (!error) e.target.style.borderColor = isReasonValid ? '#86efac' : '#cbd5e1';
                }}
              />
            </div>

            {/* Validation Error Message */}
            {error && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#dc2626',
                  fontWeight: '600',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <AlertTriangle size={13} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isExecuting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: isExecuting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isExecuting || !isReasonValid}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: !isReasonValid || isExecuting ? '#f87171' : '#dc2626',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: '700',
                cursor: !isReasonValid || isExecuting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: !isReasonValid || isExecuting ? 'none' : '0 2px 4px rgba(220, 38, 38, 0.3)',
                transition: 'all 0.15s',
                opacity: !isReasonValid ? 0.6 : 1
              }}
            >
              {isExecuting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Confirm Deletion</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
