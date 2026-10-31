import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  AlertTriangle, 
  X, 
  ExternalLink, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  RefreshCw,
  Scale,
  ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StockAuditGateModal = ({
  isOpen,
  onClose,
  data,
  onBypassSubmit,
  onVerifyProduct
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [bypassExpanded, setBypassExpanded] = useState(false);
  const [bypassReason, setBypassReason] = useState('');
  const [bypassSubmitting, setBypassSubmitting] = useState(false);
  const [bypassError, setBypassError] = useState('');

  if (!isOpen || !data) return null;

  const blockedProducts = data.blockedProducts || [];
  const message = data.message || 
    'Physical stock count audit is required before issuing this Purchase Order. Please verify shelf counts or resolve discrepancies in the Stock Gap Manager.';

  const handleBypass = async (e) => {
    e.preventDefault();
    if (!bypassReason.trim()) {
      setBypassError('Bypass reason is mandatory for audit trail compliance.');
      return;
    }
    setBypassError('');
    try {
      setBypassSubmitting(true);
      await onBypassSubmit(bypassReason.trim());
      onClose();
    } catch (err) {
      console.error('Emergency bypass failed:', err);
      setBypassError(err.response?.data?.message || err.message || 'Failed to submit emergency bypass.');
    } finally {
      setBypassSubmitting(false);
    }
  };

  const handleGoToGapManager = () => {
    onClose();
    navigate('/inventory/gap-analysis');
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
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #fee2e2',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#fff1f2',
            borderBottom: '1px solid #fecdd3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#ffe4e6',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #fecdd3'
              }}
            >
              <ShieldAlert size={26} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#9f1239' }}>
                Pre-Procurement Stock Audit Required
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#be123c', fontWeight: '600' }}>
                Procurement Gate Blocked • Physical Audit Clearance Mandatory
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9f1239',
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

        {/* Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Explanation Alert */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '0.88rem',
              color: '#92400e',
              lineHeight: 1.5
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
            <div>
              <strong>Action Needed: </strong>
              {message}
            </div>
          </div>

          {/* Blocked Products Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Blocked Line Items ({blockedProducts.length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Discrepancy must be verified or reconciled
              </span>
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
                maxHeight: '220px',
                overflowY: 'auto'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Product</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>SKU</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>Physical</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>Virtual</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>Stock Gap</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Reason / Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Audit Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                        Products pending audit verification.
                      </td>
                    </tr>
                  ) : (
                    blockedProducts.map((prod, idx) => {
                      const phys = parseFloat(prod.physical_stock ?? prod.physical_qty ?? 0);
                      const virt = parseFloat(prod.virtual_stock ?? prod.virtual_qty ?? 0);
                      const gap = parseFloat(prod.stock_gap ?? (phys - virt));
                      const hasGap = phys !== virt || gap !== 0;

                      return (
                        <tr
                          key={prod.id || prod.product_id || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: hasGap ? '#fff1f2' : '#ffffff'
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>
                            {prod.name || prod.product_name || `Product #${prod.product_id || prod.id}`}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {prod.sku || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#0369a1' }}>
                            {phys}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#6d28d9' }}>
                            {virt}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                backgroundColor: hasGap ? '#fee2e2' : '#dcfce7',
                                color: hasGap ? '#dc2626' : '#15803d'
                              }}
                            >
                              {gap > 0 ? `+${gap}` : gap}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#b91c1c', fontWeight: '600', fontSize: '0.78rem' }}>
                            {prod.reason || prod.audit_status || 'PENDING_AUDIT'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (onVerifyProduct) {
                                  onVerifyProduct(prod);
                                } else {
                                  handleGoToGapManager();
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #10b981',
                                fontWeight: '700',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <ClipboardCheck size={12} /> Verify Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Emergency Bypass Accordion (Super Admin Only) */}
          {isSuperAdmin && (
            <div
              style={{
                border: '1px solid #e0e7ff',
                borderRadius: '10px',
                backgroundColor: '#f8faff',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              <button
                type="button"
                onClick={() => setBypassExpanded(!bypassExpanded)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#e0e7ff',
                      color: '#4338ca',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Lock size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#312e81' }}>
                      Emergency Bypass (Requires Authorization)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6366f1' }}>
                      Super Admin privilege • Overrides audit gate with permanent log entry
                    </div>
                  </div>
                </div>
                {bypassExpanded ? <ChevronUp size={18} color="#4338ca" /> : <ChevronDown size={18} color="#4338ca" />}
              </button>

              {bypassExpanded && (
                <div style={{ padding: '14px 16px', borderTop: '1px solid #e0e7ff' }}>
                  <form onSubmit={handleBypass}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Bypass Justification / Reason *
                    </label>
                    <textarea
                      value={bypassReason}
                      onChange={(e) => setBypassReason(e.target.value)}
                      placeholder="e.g., Urgent VIP customer order; count verified verbally by floor supervisor..."
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

                    {bypassError && (
                      <div style={{ marginTop: '8px', color: '#dc2626', fontSize: '0.78rem', fontWeight: '600' }}>
                        {bypassError}
                      </div>
                    )}

                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={bypassSubmitting || !bypassReason.trim()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: bypassReason.trim() ? '#4338ca' : '#94a3b8',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          cursor: bypassReason.trim() && !bypassSubmitting ? 'pointer' : 'not-allowed',
                          boxShadow: bypassReason.trim() ? '0 2px 6px rgba(67, 56, 202, 0.35)' : 'none'
                        }}
                      >
                        {bypassSubmitting ? (
                          <>
                            <RefreshCw size={14} className="spin-anim" /> Authorizing Emergency PO...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} /> Confirm Emergency PO Creation
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
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
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
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
            type="button"
            onClick={handleGoToGapManager}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.3)'
            }}
          >
            <Scale size={16} /> Resolve in Stock Gap Manager <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockAuditGateModal;
