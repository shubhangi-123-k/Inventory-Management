import React, { useState } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { X, Scale, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

const ACTION_OPTIONS = [
  {
    value: 'BILL_THE_GAP',
    label: 'Bill the Gap (Tax Invoice Inward)',
    description: 'Increases Virtual Stock to match physical excess by issuing official invoice'
  },
  {
    value: 'PURCHASE_BILL_INWARD',
    label: 'Purchase Bill Inward',
    description: 'Books vendor invoice to close inward gap and register GST purchase'
  },
  {
    value: 'PHYSICAL_ADJUSTMENT',
    label: 'Physical Adjustment (Damage / Scrap / Count Fix)',
    description: 'Adjusts ground floor count to match tax books with an audit trail reason'
  },
  {
    value: 'SET_INITIAL_BALANCES',
    label: 'Set Initial Balances',
    description: 'Manually sets physical and virtual baselines for opening stock alignment'
  }
];

const ReconcileGapModal = ({ product, isOpen, onClose, onSuccess }) => {
  const { showSuccess, showError, showWarning } = useToast();

  const [action, setAction] = useState('BILL_THE_GAP');
  const [qty, setQty] = useState(() => {
    if (!product) return 1;
    const gap = Math.abs(parseFloat(product.stock_gap ?? (product.physical_stock - product.virtual_stock) ?? 0));
    return gap > 0 ? gap : 1;
  });
  const [reason, setReason] = useState('Official tax bill issued for physical floor excess');
  const [submitting, setSubmitting] = useState(false);

  // Additional fields for SET_INITIAL_BALANCES
  const [physicalBaseline, setPhysicalBaseline] = useState(product?.physical_stock ?? 0);
  const [virtualBaseline, setVirtualBaseline] = useState(product?.virtual_stock ?? 0);

  if (!isOpen || !product) return null;

  const currentPhysical = parseFloat(product.physical_stock ?? product.remaining_qty ?? 0);
  const currentVirtual = parseFloat(product.virtual_stock ?? product.remaining_qty ?? 0);
  const currentGap = parseFloat(product.stock_gap ?? (currentPhysical - currentVirtual));

  const handleActionChange = (newAction) => {
    setAction(newAction);
    if (newAction === 'BILL_THE_GAP') {
      setReason('Official tax bill issued for physical floor excess');
    } else if (newAction === 'PURCHASE_BILL_INWARD') {
      setReason('Vendor purchase invoice recorded to close inward gap');
    } else if (newAction === 'PHYSICAL_ADJUSTMENT') {
      setReason(currentGap > 0 ? 'Physical floor recount / found surplus' : 'Physical floor damage / scrap adjustment');
    } else if (newAction === 'SET_INITIAL_BALANCES') {
      setReason('Initial opening balance baseline reconciliation');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qty || parseFloat(qty) <= 0) {
      showWarning('Please enter a valid reconciliation quantity greater than 0.');
      return;
    }
    if (!reason || reason.trim() === '') {
      showWarning('Please enter an audit reason for reconciliation compliance.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        product_id: product.id,
        action,
        qty: parseFloat(qty),
        reason: reason.trim()
      };

      if (action === 'SET_INITIAL_BALANCES') {
        payload.physical_baseline = parseFloat(physicalBaseline) || 0;
        payload.virtual_baseline = parseFloat(virtualBaseline) || 0;
      }

      await api.post('/admin/stock/reconcile-gap', payload);
      showSuccess(
        `Gap for "${product.name || product.code}" successfully reconciled via ${action}!`,
        'Reconciliation Complete'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Gap reconciliation failed:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to reconcile stock gap');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Scale size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#ffffff' }}>
                Reconcile Stock Gap
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                {product.name || product.product_name} ({product.code || product.sku || `#${product.id}`})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Current State Summary Card */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            textAlign: 'center'
          }}
        >
          <div style={{ backgroundColor: '#e0f2fe', padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>Physical Stock</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>
              {currentPhysical}
            </div>
          </div>

          <div style={{ backgroundColor: '#f3e8ff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6d28d9', textTransform: 'uppercase' }}>Govt / Virtual</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>
              {currentVirtual}
            </div>
          </div>

          <div
            style={{
              backgroundColor: currentGap === 0 ? '#dcfce7' : currentGap > 0 ? '#fef3c7' : '#fee2e2',
              padding: '10px',
              borderRadius: '8px',
              border: `1px solid ${currentGap === 0 ? '#bbf7d0' : currentGap > 0 ? '#fde68a' : '#fecaca'}`
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                color: currentGap === 0 ? '#15803d' : currentGap > 0 ? '#b45309' : '#b91c1c',
                textTransform: 'uppercase'
              }}
            >
              Current Gap
            </span>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: currentGap === 0 ? '#16a34a' : currentGap > 0 ? '#d97706' : '#dc2626',
                marginTop: '2px'
              }}
            >
              {currentGap > 0 ? `+${currentGap}` : currentGap}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Reconciliation Action Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                Reconciliation Action <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={action}
                onChange={(e) => handleActionChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  outline: 'none'
                }}
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                {ACTION_OPTIONS.find((a) => a.value === action)?.description}
              </div>
            </div>

            {/* Reconciliation Qty */}
            {action !== 'SET_INITIAL_BALANCES' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                  Adjustment / Reconciliation Quantity (Units) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="e.g. 20"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                    New Physical Baseline
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={physicalBaseline}
                    onChange={(e) => setPhysicalBaseline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                    New Virtual Baseline
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={virtualBaseline}
                    onChange={(e) => setVirtualBaseline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Audit Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                Compliance & Audit Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Specify the regulatory, inward tax, or physical inventory inspection reason..."
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  color: '#334155',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: '600',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4338ca',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(67, 56, 202, 0.3)'
              }}
            >
              <ShieldCheck size={18} />
              {submitting ? 'Reconciling...' : 'Confirm Reconciliation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReconcileGapModal;
