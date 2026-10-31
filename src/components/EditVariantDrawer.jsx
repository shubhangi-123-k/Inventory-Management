import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader2, Package, Layers, ExternalLink, Trash2, Plus, QrCode } from 'lucide-react';
import api from '../api/axios';
import QRCodeSVG from './QRCodeSVG';
import BarcodeUploader from './BarcodeUploader';

const EditVariantDrawer = ({
  isOpen,
  onClose,
  variant,
  onSuccess,
  currency = 'INR',
  onOpenDetails
}) => {
  if (!isOpen || !variant) return null;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeImageUrl, setBarcodeImageUrl] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [status, setStatus] = useState('Active');
  const [attributes, setAttributes] = useState([]);
  const [packagings, setPackagings] = useState([]);
  const [productInfo, setProductInfo] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [reorderQty, setReorderQty] = useState('');
  const [safetyStock, setSafetyStock] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currSymbol = currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));

  useEffect(() => {
    if (variant) {
      setName(variant.name || variant.variant_name || '');
      setSku(variant.sku || '');
      setBarcode(variant.gtin_ean_upc || variant.barcode || '');
      setBarcodeImageUrl(variant.barcode_image_url || '');
      setPurchasePrice(variant.purchase_price !== undefined ? String(variant.purchase_price) : '');
      setSellingPrice(variant.selling_price !== undefined ? String(variant.selling_price) : '');
      setMrp(variant.mrp !== undefined ? String(variant.mrp) : '');
      setStatus(variant.status || 'Active');
      setProductInfo(variant.product_info || '');
      setReorderLevel(variant.reorder_level !== undefined && variant.reorder_level !== null ? String(variant.reorder_level) : '');
      setReorderQty(variant.reorder_qty !== undefined && variant.reorder_qty !== null ? String(variant.reorder_qty) : '');
      setSafetyStock(variant.safety_stock !== undefined && variant.safety_stock !== null ? String(variant.safety_stock) : '');
      setLeadTimeDays(variant.lead_time_days !== undefined && variant.lead_time_days !== null ? String(variant.lead_time_days) : '7');

      // Attributes
      const attrObj = variant.variant_attributes || variant.combination || {};
      setAttributes(Object.entries(attrObj).map(([key, value]) => ({ key, value: String(value) })));

      // Packagings
      const pkgs = Array.isArray(variant.packagings) && variant.packagings.length > 0
        ? variant.packagings
        : (Array.isArray(variant.packaging) ? variant.packaging : []);
      setPackagings(pkgs.map(p => ({
        id: p.id,
        package_name: p.package_name || 'Pack of 24',
        quantity: p.quantity || p.quantity_per_pack || 24,
        package_barcode: p.package_barcode || p.barcode || `${variant.sku}-C${p.quantity || 24}`,
        selling_price: p.selling_price || ''
      })));

      setError('');
    }
  }, [variant]);

  const handleAddPackaging = () => {
    const nextQty = (packagings.length + 1) * 12;
    setPackagings([
      ...packagings,
      {
        package_name: `Pack of ${nextQty}`,
        quantity: nextQty,
        package_barcode: `${sku || 'SKU'}-C${nextQty}`,
        selling_price: sellingPrice ? (parseFloat(sellingPrice) * nextQty * 0.95).toFixed(2) : ''
      }
    ]);
  };

  const handleUpdatePackaging = (index, field, val) => {
    const updated = [...packagings];
    updated[index][field] = val;
    setPackagings(updated);
  };

  const handleRemovePackaging = (index) => {
    setPackagings(packagings.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const pCost = parseFloat(purchasePrice) || 0;
    const pSell = parseFloat(sellingPrice) || 0;
    const pMrp = parseFloat(mrp) || pSell;

    if (pCost < 0 || pSell < 0 || pMrp < 0) {
      setError('Prices cannot be negative numbers.');
      return;
    }

    // Reconstruct attributes object
    const attrObj = {};
    attributes.forEach(a => {
      if (a.key.trim() && a.value.trim()) {
        attrObj[a.key.trim()] = a.value.trim();
      }
    });

    const payload = {
      product_name: name,
      name,
      sku: sku.trim(),
      gtin_ean_upc: barcode.trim(),
      barcode: barcode.trim(),
      barcode_image_url: barcodeImageUrl || null,
      purchase_price: pCost,
      costing_method: variant.costing_method || 'FIFO',
      selling_price: pSell,
      mrp: pMrp,
      product_info: productInfo || null,
      status,
      reorder_level: reorderLevel !== '' ? Math.max(0, parseInt(reorderLevel, 10)) : 0,
      reorder_qty: reorderQty !== '' ? Math.max(0, parseInt(reorderQty, 10)) : 0,
      safety_stock: safetyStock !== '' ? Math.max(0, parseInt(safetyStock, 10)) : 0,
      lead_time_days: leadTimeDays !== '' ? Math.max(1, parseInt(leadTimeDays, 10)) : 7,
      variant_attributes: attrObj,
      packagings: packagings.map(p => ({
        id: p.id,
        package_name: p.package_name,
        quantity: parseInt(p.quantity, 10) || 24,
        package_barcode: p.package_barcode,
        package_qr_payload: JSON.stringify({ type: "PACKAGE", sku, qty: parseInt(p.quantity, 10) || 24 }),
        selling_price: parseFloat(p.selling_price) || 0
      }))
    };

    try {
      setSaving(true);
      const res = await api.put(`/admin/products/${variant.id}`, payload);
      const updated = res.data?.data || res.data || { ...variant, ...payload };
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update variant:', err);
      setError(err.response?.data?.message || 'Failed to update variant details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1200
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawerSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#ede9fe', padding: '8px', borderRadius: '10px', color: '#6366f1' }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                Variant Details & Configuration
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                ID: {variant.id} | SKU: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{variant.sku}</span>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onOpenDetails && (
              <button
                type="button"
                onClick={() => onOpenDetails(variant)}
                title="Open Complete Product Page"
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                <ExternalLink size={13} /> Full Page
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '18px', border: '1px solid #fecaca' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Status */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Variant Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              SKU *
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'monospace', fontWeight: '600', outline: 'none' }}
            />
          </div>

          <BarcodeUploader
            barcodeValue={barcode}
            barcodeImageUrl={barcodeImageUrl}
            onBarcodeValueChange={setBarcode}
            onBarcodeImageChange={setBarcodeImageUrl}
            label="Variant Barcode / QR Code"
            productName={name}
            sku={sku}
            sellingPrice={sellingPrice}
            mrp={mrp}
            currency={currency}
          />

          {/* Product Information */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Product Information
              </label>
              {!productInfo && (
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No detailed information provided
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={productInfo}
              onChange={(e) => setProductInfo(e.target.value)}
              placeholder="Enter detailed specifications, descriptions, or product notes..."
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.88rem',
                outline: 'none',
                minHeight: '75px',
                resize: 'vertical',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                Cost ({currSymbol})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && parseFloat(val) < 0) return;
                  setPurchasePrice(val);
                }}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '600', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                Selling ({currSymbol}) *
              </label>
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
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #6366f1', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '700', color: '#4338ca', backgroundColor: '#faf5ff', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                MRP ({currSymbol})
              </label>
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
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '600', outline: 'none' }}
              />
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', backgroundColor: '#ffffff' }}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Reorder Thresholds */}
          <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '18px' }}>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={15} color="#16a34a" /> Variant Reorder & Supply Chain Settings
              </span>
              <span style={{ fontSize: '0.72rem', color: '#15803d' }}>
                Configure individual replenishment thresholds for this variant SKU
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#166534', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Reorder Level (ROL)
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault(); }}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#166534', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Reorder Qty (ROQ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderQty}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault(); }}
                  onChange={(e) => setReorderQty(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#166534', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Safety Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={safetyStock}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault(); }}
                  onChange={(e) => setSafetyStock(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#166534', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={leadTimeDays}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault(); }}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  placeholder="7"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#ffffff', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Variant Attributes
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {attributes.map((attr, aIdx) => (
                <div key={aIdx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={attr.key}
                    onChange={(e) => {
                      const updated = [...attributes];
                      updated[aIdx].key = e.target.value;
                      setAttributes(updated);
                    }}
                    placeholder="Key"
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#f8fafc', fontWeight: '600' }}
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => {
                      const updated = [...attributes];
                      updated[aIdx].value = e.target.value;
                      setAttributes(updated);
                    }}
                    placeholder="Value"
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Packagings */}
          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={15} color="#6366f1" /> Multi-Pack Packaging Rules
              </span>
              <button
                type="button"
                onClick={handleAddPackaging}
                style={{ background: 'none', border: '1px dashed #6366f1', color: '#4338ca', borderRadius: '4px', padding: '2px 8px', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
              >
                + Add Pack
              </button>
            </div>

            {packagings.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Single unit packaging only.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {packagings.map((pkg, pIdx) => (
                  <div key={pIdx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 28px', gap: '6px', alignItems: 'center', backgroundColor: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <input
                      type="text"
                      value={pkg.package_name}
                      onChange={(e) => handleUpdatePackaging(pIdx, 'package_name', e.target.value)}
                      style={{ padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.78rem' }}
                    />
                    <input
                      type="number"
                      min="1"
                      value={pkg.quantity}
                      onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                      onChange={(e) => handleUpdatePackaging(pIdx, 'quantity', e.target.value)}
                      style={{ padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.78rem' }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Pack Price"
                      value={pkg.selling_price}
                      onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                      onChange={(e) => handleUpdatePackaging(pIdx, 'selling_price', e.target.value)}
                      style={{ padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.78rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePackaging(pIdx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '8px 16px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px',
                border: 'none',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVariantDrawer;
