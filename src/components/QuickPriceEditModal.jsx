import React, { useState, useEffect } from 'react';
import { X, DollarSign, Check, AlertCircle, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import api from '../api/axios';

const QuickPriceEditModal = ({
  isOpen,
  onClose,
  variant,
  onSuccess,
  currency = 'INR'
}) => {
  if (!isOpen || !variant) return null;

  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (variant) {
      setPurchasePrice(variant.purchase_price !== undefined && variant.purchase_price !== null ? String(variant.purchase_price) : '');
      setSellingPrice(variant.selling_price !== undefined && variant.selling_price !== null ? String(variant.selling_price) : '');
      setMrp(variant.mrp !== undefined && variant.mrp !== null ? String(variant.mrp) : '');
      setError('');
      setSuccessMsg('');
    }
  }, [variant]);

  const currSymbol = currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));

  // Calculate live margin
  const cost = parseFloat(purchasePrice) || 0;
  const sell = parseFloat(sellingPrice) || 0;
  const marginAmt = sell - cost;
  const marginPct = cost > 0 ? ((marginAmt / cost) * 100).toFixed(1) : '0.0';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const pCost = parseFloat(purchasePrice) || 0;
    const pSell = parseFloat(sellingPrice) || 0;
    const pMrp = parseFloat(mrp) || 0;

    if (pCost < 0 || pSell < 0 || pMrp < 0) {
      setError('Prices cannot be negative numbers.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        purchase_price: pCost,
        selling_price: pSell,
        mrp: pMrp
      };

      const res = await api.put(`/admin/products/${variant.id}`, payload);
      const updated = res.data?.data || res.data || { ...variant, ...payload };
      
      setSuccessMsg('Price updated successfully!');
      if (onSuccess) {
        onSuccess(updated);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update variant price:', err);
      setError(err.response?.data?.message || 'Failed to update variant price.');
    } finally {
      setSaving(false);
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
        zIndex: 1200,
        padding: '16px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
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
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: '#ede9fe', padding: '6px', borderRadius: '8px', color: '#6366f1' }}>
                <DollarSign size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                Quick Price Edit
              </h3>
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{variant.name || variant.variant_name}</span>
              <span style={{ fontFamily: 'monospace', backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155' }}>
                {variant.sku}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid #fecaca' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid #a7f3d0' }}>
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Real-time Margin Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: marginAmt >= 0 ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${marginAmt >= 0 ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: '10px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color={marginAmt >= 0 ? '#16a34a' : '#dc2626'} />
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: marginAmt >= 0 ? '#166534' : '#991b1b' }}>
                Unit Profit Margin
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: marginAmt >= 0 ? '#15803d' : '#b91c1c' }}>
                {currSymbol} {marginAmt.toFixed(2)}
              </span>
              <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: marginAmt >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                ({marginPct}%)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Purchase / Cost Price */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cost / Purchase Price ({currSymbol})
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '600' }}>
                  {currSymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={purchasePrice}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && parseFloat(val) < 0) return;
                    setPurchasePrice(val);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Selling Price */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Selling Price ({currSymbol}) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '600' }}>
                  {currSymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={sellingPrice}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && parseFloat(val) < 0) return;
                    setSellingPrice(val);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
                    border: '1px solid #6366f1',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#4338ca',
                    backgroundColor: '#faf5ff',
                    outline: 'none'
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* MRP */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Maximum Retail Price (MRP) ({currSymbol})
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '600' }}>
                  {currSymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mrp}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && parseFloat(val) < 0) return;
                    setMrp(val);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '9px 16px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.88rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 20px',
                border: 'none',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Updating...' : 'Save Prices'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickPriceEditModal;
