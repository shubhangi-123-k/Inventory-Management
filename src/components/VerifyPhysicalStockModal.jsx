import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { 
  ClipboardCheck, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  Package,
  Layers,
  MapPin
} from 'lucide-react';

const VerifyPhysicalStockModal = ({
  isOpen,
  onClose,
  product,
  onSuccess
}) => {
  const { showSuccess, showError, showWarning } = useToast();

  const [verifiedQty, setVerifiedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (product) {
      const initialQty = product.physical_stock ?? product.current_stock ?? product.remaining_qty ?? 0;
      setVerifiedQty(String(initialQty));
      setNotes('');
      setErrorMsg('');
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const systemBookStock = Number(product.virtual_stock ?? product.current_stock ?? product.remaining_qty ?? 0);
  const floorStock = Number(product.physical_stock ?? systemBookStock);
  const stockGap = Number(product.stock_gap ?? (floorStock - systemBookStock));
  const currentSystemStock = systemBookStock;
  const productName = product.name || product.product_name || `Product #${product.id || product.product_id}`;
  const productSku = product.sku || product.code || product.product_code || '—';
  const warehouseName = product.warehouse_name || product.Warehouse?.name || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (verifiedQty === '' || isNaN(Number(verifiedQty)) || Number(verifiedQty) < 0) {
      setErrorMsg('Please enter a valid physical count (0 or higher).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const targetProductId = product.product_id || product.id;
      const payload = {
        product_id: parseInt(targetProductId),
        verified_physical_qty: Number(verifiedQty),
        notes: notes.trim()
      };

      if (product.warehouse_id) {
        payload.warehouse_id = parseInt(product.warehouse_id);
      }

      const res = await api.post('/admin/stock/verify-audit', payload);

      showSuccess(
        'Stock audit verified! Product is now cleared for Reorder/PO.',
        'Stock Audit Cleared'
      );

      if (onSuccess) {
        onSuccess({
          productId: targetProductId,
          verifiedQty: Number(verifiedQty),
          audit_status: 'AUDITED',
          apiResponse: res.data
        });
      }

      onClose();
    } catch (err) {
      console.error('Audit verification error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to verify physical stock count';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#f0fdf4',
            borderBottom: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #86efac'
              }}
            >
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#166534' }}>
                Verify Physical Stock Count
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '600' }}>
                Audit Clearance & PO Generation Unlock
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#166534',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Target Product Summary Card */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: '800', fontSize: '0.98rem', color: '#0f172a' }}>
                {productName}
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#e2e8f0',
                  color: '#334155'
                }}
              >
                SKU: {productSku}
              </span>
            </div>

            {warehouseName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#64748b' }}>
                <MapPin size={13} /> Facility: <strong style={{ color: '#334155' }}>{warehouseName}</strong>
              </div>
            )}

            {/* Stock Comparison Reference */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #e2e8f0'
              }}
            >
              <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>System Book Stock</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#4338ca', marginTop: '2px' }}>{systemBookStock}</div>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Last Floor Stock</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{floorStock}</div>
              </div>
              <div style={{ backgroundColor: stockGap !== 0 ? '#fef2f2' : '#f0fdf4', padding: '8px 10px', borderRadius: '8px', border: stockGap !== 0 ? '1px solid #fecaca' : '1px solid #bbf7d0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '700', color: stockGap !== 0 ? '#b91c1c' : '#15803d', textTransform: 'uppercase' }}>Stock Gap</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: stockGap !== 0 ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
                  {stockGap > 0 ? `+${stockGap}` : stockGap}
                </div>
              </div>
            </div>
          </div>

          {/* Verified Count Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: '700',
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              Verified Physical Count (Units) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="0"
                step="any"
                value={verifiedQty}
                onChange={(e) => setVerifiedQty(e.target.value)}
                placeholder="Enter physical floor count..."
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Enter the exact count verified physically on shelf / warehouse rack.
            </span>
          </div>

          {/* Auditor Notes Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: '700',
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              Auditor Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Physically counted on Rack B3; checked seal & packaging..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '10px',
              paddingTop: '8px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: '600',
                fontSize: '0.85rem',
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
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="spin-anim" /> Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Verify & Clear for Procurement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyPhysicalStockModal;
