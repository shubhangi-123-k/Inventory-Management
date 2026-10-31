import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, Layers, Sparkles, AlertCircle, Loader2, Check, Warehouse } from 'lucide-react';
import api from '../api/axios';
import BarcodeUploader from './BarcodeUploader';

const AddVariantModal = ({
  isOpen,
  onClose,
  onSuccess,
  templates = [],
  warehouses = [],
  currency = 'INR'
}) => {
  if (!isOpen) return null;

  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateList, setTemplateList] = useState(templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form states
  const [attributes, setAttributes] = useState([]);
  const [sku, setSku] = useState('');
  const [isManualSku, setIsManualSku] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [barcodeImageUrl, setBarcodeImageUrl] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || '');
  const [openingStock, setOpeningStock] = useState('0');
  const [productInfo, setProductInfo] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [reorderQty, setReorderQty] = useState('');
  const [safetyStock, setSafetyStock] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');

  // Packagings
  const [packagings, setPackagings] = useState([
    { package_name: 'Pack of 24', quantity: 24, package_barcode: '', selling_price: '' }
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currSymbol = currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));

  // Load templates if not provided or empty
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        let res;
        try {
          res = await api.get('/admin/products?templates_only=true');
        } catch (e) {
          if (e.response?.status === 500) {
            res = await api.get('/admin/products');
          } else {
            throw e;
          }
        }
        const data = res.data?.data || res.data || [];
        const filtered = Array.isArray(data) ? data.filter(p => !p.parent_product_id) : [];
        setTemplateList(filtered);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (!templates || templates.length === 0) {
      fetchTemplates();
    } else {
      setTemplateList(templates);
    }
  }, [templates]);

  // When selected template changes, pre-fill defaults
  const handleSelectTemplate = (tempId) => {
    setSelectedTemplateId(tempId);
    const tmpl = templateList.find(t => String(t.id) === String(tempId));
    setSelectedTemplate(tmpl || null);

    if (tmpl) {
      setPurchasePrice(tmpl.purchase_price ? String(tmpl.purchase_price) : '');
      setSellingPrice(tmpl.selling_price ? String(tmpl.selling_price) : '');
      setMrp(tmpl.mrp ? String(tmpl.mrp) : (tmpl.selling_price ? String(tmpl.selling_price) : ''));
      if (tmpl.default_warehouse_id) {
        setSelectedWarehouseId(tmpl.default_warehouse_id);
      }
      setProductInfo(tmpl.product_info || '');
      setReorderLevel(tmpl.reorder_level !== undefined && tmpl.reorder_level !== null ? String(tmpl.reorder_level) : '');
      setReorderQty(tmpl.reorder_qty !== undefined && tmpl.reorder_qty !== null ? String(tmpl.reorder_qty) : '');
      setSafetyStock(tmpl.safety_stock !== undefined && tmpl.safety_stock !== null ? String(tmpl.safety_stock) : '');
      setLeadTimeDays(tmpl.lead_time_days !== undefined && tmpl.lead_time_days !== null ? String(tmpl.lead_time_days) : '7');

      // Variant attributes are added explicitly by the user in this form.
      setAttributes([]);
    }
  };

  // Helper slugify
  const slugify = (text) =>
    (text || '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

  // Auto-generate SKU when attributes or template change (if not manually overridden)
  useEffect(() => {
    if (!isManualSku && selectedTemplate) {
      const baseSku = selectedTemplate.sku || `PROD${selectedTemplate.id}`;
      const attrSlugs = attributes
        .filter(a => a.value.trim() !== '')
        .map(a => slugify(a.value))
        .filter(Boolean);

      const generated = attrSlugs.length > 0
        ? `${baseSku}-${attrSlugs.join('-')}`
        : `${baseSku}-VAR`;

      setSku(generated);
      setBarcode(`${generated}-UNIT`);

      // Update packagings barcode default
      setPackagings(prev => prev.map(p => ({
        ...p,
        package_barcode: `${generated}-C${p.quantity || 24}`
      })));
    }
  }, [selectedTemplate, attributes, isManualSku]);

  // Attributes manipulation
  const handleAddAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const handleUpdateAttribute = (index, field, val) => {
    const updated = [...attributes];
    updated[index][field] = val;
    setAttributes(updated);
  };

  const handleRemoveAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  // Packaging manipulation
  const handleAddPackaging = () => {
    const nextQty = (packagings.length + 1) * 12;
    const baseS = sku || 'SKU';
    setPackagings([
      ...packagings,
      {
        package_name: `Pack of ${nextQty}`,
        quantity: nextQty,
        package_barcode: `${baseS}-C${nextQty}`,
        selling_price: sellingPrice ? (parseFloat(sellingPrice) * nextQty * 0.95).toFixed(2) : ''
      }
    ]);
  };

  const handleUpdatePackaging = (index, field, val) => {
    const updated = [...packagings];
    updated[index][field] = val;
    if (field === 'quantity') {
      const q = Math.max(1, parseInt(val, 10) || 1);
      updated[index].quantity = q;
      if (!updated[index].customBarcode) {
        updated[index].package_barcode = `${sku || 'SKU'}-C${q}`;
      }
      if (sellingPrice && !updated[index].customPrice) {
        updated[index].selling_price = (parseFloat(sellingPrice) * q * 0.95).toFixed(2);
      }
    }
    setPackagings(updated);
  };

  const handleRemovePackaging = (index) => {
    setPackagings(packagings.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedTemplateId) {
      setError('Please select a parent product template.');
      return;
    }

    const validAttrs = attributes.filter(a => a.key.trim() !== '' && a.value.trim() !== '');
    if (validAttrs.length === 0) {
      setError('Please specify at least one variant attribute (e.g. Flavor: Elaichi).');
      return;
    }

    if (!sku.trim()) {
      setError('Variant SKU is required.');
      return;
    }

    const pCost = parseFloat(purchasePrice) || 0;
    const pSell = parseFloat(sellingPrice) || 0;
    const pMrp = parseFloat(mrp) || pSell;
    const pStock = Math.max(0, parseInt(openingStock, 10) || 0);

    if (pCost < 0 || pSell < 0 || pMrp < 0) {
      setError('Prices cannot be negative numbers.');
      return;
    }

    // Build attribute object: { Flavor: "Badam", Volume: "200ml" }
    const attrObject = {};
    validAttrs.forEach(a => {
      attrObject[a.key.trim()] = a.value.trim();
    });

    const attrSummary = Object.values(attrObject).join(' - ');
    const templateName = selectedTemplate?.name || selectedTemplate?.product_name || 'Product';
    const fullVariantName = `${templateName} - ${attrSummary}`;

    // Clean packagings
    const validPackagings = packagings.map(p => {
      const q = Math.max(1, parseInt(p.quantity, 10) || 24);
      const bcode = p.package_barcode || `${sku}-C${q}`;
      return {
        package_name: p.package_name || `Pack of ${q}`,
        quantity: q,
        package_barcode: bcode,
        package_qr_payload: JSON.stringify({ type: "PACKAGE", sku, qty: q }),
        selling_price: Math.max(0, parseFloat(p.selling_price) || (pSell * q * 0.95))
      };
    });

    const payload = {
      parent_product_id: parseInt(selectedTemplateId, 10),
      product_name: fullVariantName,
      name: fullVariantName,
      sku: sku.trim(),
      gtin_ean_upc: barcode.trim() || `${sku.trim()}-UNIT`,
      barcode: barcode.trim() || `${sku.trim()}-UNIT`,
      barcode_image_url: barcodeImageUrl || null,
      product_info: productInfo || selectedTemplate?.product_info || null,
      variant_attributes: attrObject,
      purchase_price: pCost,
      costing_method: selectedTemplate?.costing_method || 'FIFO',
      selling_price: pSell,
      mrp: pMrp,
      warehouse_id: selectedWarehouseId ? parseInt(selectedWarehouseId, 10) : null,
      default_warehouse_id: selectedWarehouseId ? parseInt(selectedWarehouseId, 10) : null,
      opening_stock: pStock,
      purchase_quantity: pStock,
      has_variants: false,
      status: 'Active',
      reorder_level: reorderLevel !== '' ? Math.max(0, parseInt(reorderLevel, 10)) : (selectedTemplate?.reorder_level || 0),
      reorder_qty: reorderQty !== '' ? Math.max(0, parseInt(reorderQty, 10)) : (selectedTemplate?.reorder_qty || 0),
      safety_stock: safetyStock !== '' ? Math.max(0, parseInt(safetyStock, 10)) : (selectedTemplate?.safety_stock || 0),
      lead_time_days: leadTimeDays !== '' ? Math.max(0, parseInt(leadTimeDays, 10)) : (selectedTemplate?.lead_time_days || 7),
      auto_reorder: selectedTemplate?.auto_reorder ?? false,
      reorder_strategy: selectedTemplate?.reorder_strategy || 'MIN_MAX',
      warehouse_allocations: selectedWarehouseId ? [{
        warehouse_id: parseInt(selectedWarehouseId, 10),
        is_primary: true,
        opening_stock: pStock,
        current_stock: pStock
      }] : [],
      packagings: validPackagings
    };

    try {
      setSaving(true);
      await api.post('/admin/products', payload);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Failed to create variant:', err);
      setError(err.response?.data?.message || 'Failed to create variant. Please verify inputs.');
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
        padding: '20px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          minWidth: 0,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
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
              <Layers size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>
                Create Product Variant
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Add an individual SKU variant under a parent product template.
              </p>
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
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, minWidth: 0, padding: '24px', boxSizing: 'border-box' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', border: '1px solid #fecaca' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Parent Template */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Parent Product Template *
            </label>
            <select
              required
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.92rem',
                fontWeight: '600',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">-- Choose Parent Product Template --</option>
              {templateList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name || t.product_name} {t.sku ? `(${t.sku})` : ''} - ID: {t.id}
                </option>
              ))}
            </select>

            {selectedTemplate && (
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#4338ca', backgroundColor: '#ede9fe', padding: '6px 12px', borderRadius: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>Base SKU: <strong>{selectedTemplate.sku || 'None'}</strong></span>
                <span>Base Price: <strong>{currSymbol} {parseFloat(selectedTemplate.selling_price || 0).toFixed(2)}</strong></span>
                <span>Type: <strong>{selectedTemplate.item_type || 'Finished Good'}</strong></span>
              </div>
            )}
          </div>

          {/* Section 2: Variant Attributes */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Variant Attributes (e.g. Flavor, Volume, Color) *
              </label>
              <button
                type="button"
                onClick={handleAddAttribute}
                style={{
                  background: 'none',
                  border: '1px dashed #6366f1',
                  color: '#4338ca',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} /> Add Attribute
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attributes.map((attr, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Attribute Key (e.g. Flavor)"
                    value={attr.key}
                    onChange={(e) => handleUpdateAttribute(idx, 'key', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Elaichi, 200ml)"
                    value={attr.value}
                    onChange={(e) => handleUpdateAttribute(idx, 'value', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(idx)}
                    disabled={attributes.length === 1}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '6px',
                      height: '36px',
                      cursor: attributes.length === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: attributes.length === 1 ? 0.5 : 1
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: SKU & Unit Barcode / QR Code */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Variant SKU *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => {
                  setIsManualSku(true);
                  setSku(e.target.value);
                  if (!barcode || barcode.endsWith('-UNIT')) {
                    setBarcode(`${e.target.value}-UNIT`);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  fontWeight: '600',
                  outline: 'none'
                }}
                placeholder="e.g. AMUL-KOOL-ELA-200"
              />
            </div>

            <BarcodeUploader
              barcodeValue={barcode}
              barcodeImageUrl={barcodeImageUrl}
              onBarcodeValueChange={setBarcode}
              onBarcodeImageChange={setBarcodeImageUrl}
              label="Variant Barcode / QR Code"
              productName={selectedTemplate ? `${selectedTemplate.name || selectedTemplate.product_name || 'Product'} (${attributes.map(a => a.value).filter(Boolean).join(' - ')})` : ''}
              sku={sku}
              sellingPrice={sellingPrice}
              mrp={mrp}
              currency={currency}
            />
          </div>

          {/* Section: Product Information / Details */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Product Information
            </label>
            <textarea
              rows={3}
              value={productInfo}
              onChange={(e) => setProductInfo(e.target.value)}
              placeholder="Enter detailed specifications, descriptions, or product notes..."
              style={{
                width: '100%',
                padding: '10px 14px',
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

          {/* Section 4: Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cost Price ({currSymbol})
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
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
                placeholder="0.00"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Selling Price ({currSymbol}) *
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
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #6366f1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: '#4338ca',
                  backgroundColor: '#faf5ff',
                  outline: 'none'
                }}
                placeholder="0.00"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Section 5: Warehouse & Initial Stock */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Default Warehouse
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="">-- No Specific Warehouse --</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.warehouse_code || 'WH'})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Opening Stock (Units)
              </label>
              <input
                type="number"
                min="0"
                value={openingStock}
                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && parseInt(val, 10) < 0) return;
                  setOpeningStock(val);
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
                placeholder="0"
              />
            </div>
          </div>

          {/* Section 5B: Variant Reorder & Supply Chain Settings */}
          <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="#16a34a" /> Reorder & Procurement Thresholds
              </span>
              <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                Define individual replenishment rules for this variant (defaults to parent template if blank)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
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
                  placeholder={selectedTemplate?.reorder_level !== undefined ? `Tmpl: ${selectedTemplate.reorder_level}` : '0'}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#ffffff', outline: 'none' }}
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
                  placeholder={selectedTemplate?.reorder_qty !== undefined ? `Tmpl: ${selectedTemplate.reorder_qty}` : '0'}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#ffffff', outline: 'none' }}
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
                  placeholder={selectedTemplate?.safety_stock !== undefined ? `Tmpl: ${selectedTemplate.safety_stock}` : '0'}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#ffffff', outline: 'none' }}
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
                  placeholder={selectedTemplate?.lead_time_days !== undefined ? `Tmpl: ${selectedTemplate.lead_time_days}` : '7'}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#ffffff', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Section 6: Multi-Pack Packaging Rules */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} color="#6366f1" /> Multi-Pack Packaging Rules (Optional)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Generate carton barcodes for cases (e.g. Pack of 24)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddPackaging}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#4338ca',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} /> Add Carton Pack
              </button>
            </div>

            {packagings.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
                Single unit packaging only. Click above to add carton rules.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {packagings.map((pkg, pIdx) => (
                  <div key={pIdx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.2fr 0.9fr 32px', gap: '8px', alignItems: 'center', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <input
                      type="text"
                      placeholder="e.g. Pack of 24"
                      value={pkg.package_name}
                      onChange={(e) => handleUpdatePackaging(pIdx, 'package_name', e.target.value)}
                      style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty (24)"
                      value={pkg.quantity}
                      onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                      onChange={(e) => handleUpdatePackaging(pIdx, 'quantity', e.target.value)}
                      style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}
                    />
                    <input
                      type="text"
                      placeholder="Carton Barcode"
                      value={pkg.package_barcode}
                      onChange={(e) => {
                        handleUpdatePackaging(pIdx, 'customBarcode', true);
                        handleUpdatePackaging(pIdx, 'package_barcode', e.target.value);
                      }}
                      style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace', outline: 'none' }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Pack Price"
                      value={pkg.selling_price}
                      onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                      onChange={(e) => {
                        handleUpdatePackaging(pIdx, 'customPrice', true);
                        handleUpdatePackaging(pIdx, 'selling_price', e.target.value);
                      }}
                      style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePackaging(pIdx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '10px 18px',
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
                padding: '10px 24px',
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
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {saving ? 'Creating Variant...' : 'Create Variant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVariantModal;
