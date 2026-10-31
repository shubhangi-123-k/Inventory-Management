import React, { useState, useEffect } from 'react';
import { Plus, Trash2, QrCode, Package, RefreshCw, Eye, Sparkles, Layers, Check, Copy, X, Upload } from 'lucide-react';
import QRCodeSVG from './QRCodeSVG';
import PackagingModal from './PackagingModal';
import BarcodeUploader from './BarcodeUploader';

/**
 * Computes the Cartesian product of an array of arrays.
 * e.g., [['Red', 'Blue'], ['Small', 'Large']] ->
 * [['Red', 'Small'], ['Red', 'Large'], ['Blue', 'Small'], ['Blue', 'Large']]
 */
function cartesianProduct(arrays) {
  if (!arrays || arrays.length === 0) return [];
  return arrays.reduce((acc, curr) => {
    return acc.flatMap(a => curr.map(b => [...a, b]));
  }, [[]]);
}

/**
 * Generates a clean URL-friendly or SKU-friendly slug
 */
function slugify(text) {
  return String(text || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const VariantMatrixBuilder = ({
  baseProductName = '',
  baseSku = '',
  basePrice = '',
  basePurchasePrice = '',
  baseMrp = '',
  baseOpeningStock = '',
  warehouses = [],
  defaultWarehouseId = '',
  currency = 'INR',
  attributes = [],
  onChangeAttributes,
  variants = [],
  onChangeVariants,
  costingMethod = 'FIFO',
  baseProductInfo = '',
  baseReorderLevel = '',
  baseReorderQty = '',
  baseSafetyStock = '',
  baseLeadTimeDays = ''
}) => {
  const [attrInputText, setAttrInputText] = useState({});
  const [selectedVariantForPackaging, setSelectedVariantForPackaging] = useState(null);
  const [copiedSku, setCopiedSku] = useState(null);
  const [previewQrVariant, setPreviewQrVariant] = useState(null);

  const currSymbol = currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));

  // Compute Cartesian product variants when attributes change
  useEffect(() => {
    if (!attributes || attributes.length === 0) return;

    const validAttrs = attributes.filter(a => a.name.trim() !== '' && Array.isArray(a.values) && a.values.length > 0);
    if (validAttrs.length === 0) {
      onChangeVariants([]);
      return;
    }

    const valueArrays = validAttrs.map(a => a.values);
    const combinations = cartesianProduct(valueArrays);

    const newVariants = combinations.map((combo) => {
      // Build attribute mapping: { Flavor: 'Elaichi', Volume: '200ml' }
      const attrMap = {};
      validAttrs.forEach((attr, idx) => {
        attrMap[attr.name] = combo[idx];
      });

      const comboName = combo.join(' - ');
      const fullVariantName = baseProductName ? `${baseProductName} (${comboName})` : comboName;
      const autoSku = `${baseSku ? slugify(baseSku) : 'PROD'}-${combo.map(slugify).join('-')}`;
      const autoBarcode = `${autoSku}-UNIT`;

      // Check if we already have an existing variant with this exact combination to preserve manual overrides & packaging
      const existing = variants.find(v => {
        if (!v.combination) return false;
        return Object.keys(attrMap).every(k => v.combination[k] === attrMap[k]);
      });

      if (existing) {
        return {
          ...existing,
          costing_method: existing.costing_method || costingMethod || 'FIFO',
          variant_name: existing.variant_name || fullVariantName,
          sku: existing.sku || autoSku,
          barcode: existing.barcode || autoBarcode,
          barcode_image_url: existing.barcode_image_url || '',
          purchase_price: existing.purchase_price !== undefined ? existing.purchase_price : basePurchasePrice,
          selling_price: existing.selling_price !== undefined ? existing.selling_price : basePrice,
          mrp: existing.mrp !== undefined ? existing.mrp : (baseMrp || basePrice),
          opening_stock: existing.opening_stock !== undefined ? existing.opening_stock : (baseOpeningStock || '0'),
          reorder_level: existing.reorder_level !== undefined ? existing.reorder_level : (baseReorderLevel || ''),
          reorder_qty: existing.reorder_qty !== undefined ? existing.reorder_qty : (baseReorderQty || ''),
          safety_stock: existing.safety_stock !== undefined ? existing.safety_stock : (baseSafetyStock || ''),
          lead_time_days: existing.lead_time_days !== undefined ? existing.lead_time_days : (baseLeadTimeDays || '7'),
          warehouse_id: existing.warehouse_id !== undefined ? existing.warehouse_id : (defaultWarehouseId || ''),
          product_info: existing.product_info !== undefined ? existing.product_info : (baseProductInfo || '')
        };
      }

      const initialSellingPrice = Math.max(0, parseFloat(basePrice) || 0).toFixed(2);
      const initialCostPrice = Math.max(0, parseFloat(basePurchasePrice) || 0).toFixed(2);
      const initialMrp = Math.max(0, parseFloat(baseMrp) || parseFloat(basePrice) || 0).toFixed(2);
      const initialStock = String(baseOpeningStock || '0');
      const initialWh = defaultWarehouseId || (warehouses[0]?.id ? String(warehouses[0].id) : '');

      return {
        id: `var-${Math.random().toString(36).substr(2, 9)}`,
        combination: attrMap,
        variant_name: fullVariantName,
        sku: autoSku,
        barcode: autoBarcode,
        barcode_image_url: '',
        product_info: baseProductInfo || '',
        price_extra: '0.00',
        purchase_price: initialCostPrice,
        costing_method: costingMethod || 'FIFO',
        selling_price: initialSellingPrice,
        mrp: initialMrp,
        opening_stock: initialStock,
        reorder_level: baseReorderLevel !== undefined && baseReorderLevel !== '' ? String(baseReorderLevel) : '0',
        reorder_qty: baseReorderQty !== undefined && baseReorderQty !== '' ? String(baseReorderQty) : '0',
        safety_stock: baseSafetyStock !== undefined && baseSafetyStock !== '' ? String(baseSafetyStock) : '0',
        lead_time_days: baseLeadTimeDays !== undefined && baseLeadTimeDays !== '' ? String(baseLeadTimeDays) : '7',
        warehouse_id: initialWh,
        stock: initialStock,
        packaging: [
          {
            id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            package_name: 'Pack of 24',
            quantity_per_pack: 24,
            quantity: 24,
            barcode: `${autoSku}-C24`,
            package_barcode: `${autoSku}-C24`,
            package_qr_payload: JSON.stringify({ type: 'PACKAGE', sku: autoSku, qty: 24 }),
            selling_price: Math.max(0, (parseFloat(basePrice) || 0) * 24 * 0.95).toFixed(2),
            notes: 'Outer master carton'
          }
        ]
      };
    });

    // Check if structure differs to avoid infinite update loop
    const isSame =
      variants.length === newVariants.length &&
      variants.every((v, i) => v.sku === newVariants[i]?.sku && v.variant_name === newVariants[i]?.variant_name);

    if (!isSame) {
      onChangeVariants(newVariants);
    }
  }, [attributes, baseProductName, baseSku, basePrice, basePurchasePrice, baseMrp, baseOpeningStock, defaultWarehouseId, costingMethod, baseProductInfo, baseReorderLevel, baseReorderQty, baseSafetyStock, baseLeadTimeDays]);

  // Handle adding an attribute (e.g. Flavor, Size)
  const handleAddAttribute = () => {
    const newAttrs = [...attributes, { name: '', values: [] }];
    onChangeAttributes(newAttrs);
  };

  const handleUpdateAttrName = (index, name) => {
    const updated = [...attributes];
    updated[index] = { ...updated[index], name };
    onChangeAttributes(updated);
  };

  const handleRemoveAttribute = (index) => {
    const updated = attributes.filter((_, i) => i !== index);
    onChangeAttributes(updated);
  };

  // Tag values handling
  const handleAddTagValue = (attrIndex, rawVal) => {
    const trimmed = (rawVal || '').trim();
    if (!trimmed) return;
    const current = attributes[attrIndex];
    if (current.values.includes(trimmed)) return;
    const updated = [...attributes];
    updated[attrIndex] = {
      ...current,
      values: [...current.values, trimmed]
    };
    onChangeAttributes(updated);
    setAttrInputText({ ...attrInputText, [attrIndex]: '' });
  };

  const handleRemoveTagValue = (attrIndex, valToRemove) => {
    const current = attributes[attrIndex];
    const updated = [...attributes];
    updated[attrIndex] = {
      ...current,
      values: current.values.filter(v => v !== valToRemove)
    };
    onChangeAttributes(updated);
  };

  // Update specific variant field (e.g., selling_price, sku)
  const handleUpdateVariantField = (varIdx, field, val) => {
    const updated = [...variants];
    updated[varIdx] = { ...updated[varIdx], [field]: val };
    onChangeVariants(updated);
  };

  // Re-generate Barcode / QR for a variant
  const handleRegenerateBarcode = (varIdx) => {
    const v = variants[varIdx];
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const newCode = `${v.sku || 'SKU'}-${randCode}`;
    handleUpdateVariantField(varIdx, 'barcode', newCode);
  };

  const handleDeleteVariant = (idx) => {
    onChangeVariants(variants.filter((_, i) => i !== idx));
  };

  // Save packaging configuration back into selected variant
  const handleSavePackaging = (packagingRules) => {
    if (!selectedVariantForPackaging) return;
    const idx = variants.findIndex(v => v.id === selectedVariantForPackaging.id);
    if (idx !== -1) {
      const updated = [...variants];
      updated[idx] = { ...updated[idx], packaging: packagingRules };
      onChangeVariants(updated);
    }
    setSelectedVariantForPackaging(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedSku(text);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const totalCombinations = (attributes || []).reduce((acc, a) => {
    const len = (a.values || []).length;
    return len > 0 ? (acc === 0 ? len : acc * len) : acc;
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* SECTION 1: ATTRIBUTES BUILDER */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '22px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} color="#4338ca" /> Variant Attributes & Values
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Define attributes like <strong>Flavor</strong>, <strong>Volume / Size</strong>, or <strong>Color</strong>. Cartesian product combinations will be auto-calculated.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddAttribute}
            style={{
              backgroundColor: '#4338ca',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> Add Attribute
          </button>
        </div>

        {/* Attribute Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {(attributes || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem' }}>No variant attributes added yet.</p>
              <button
                type="button"
                onClick={handleAddAttribute}
                style={{
                  backgroundColor: '#eef2ff',
                  color: '#4338ca',
                  border: '1px solid #c7d2fe',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={15} /> Add First Attribute
              </button>
            </div>
          ) : (
            (attributes || []).map((attr, attrIdx) => (
            <div
              key={attrIdx}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '220px 1fr 40px',
                gap: '16px',
                alignItems: 'flex-start'
              }}
            >
              {/* Attribute Name */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Attribute Name (e.g. Flavor)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flavor, Size, Volume"
                  value={attr.name || ''}
                  onChange={(e) => handleUpdateAttrName(attrIdx, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Tag input for values */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Attribute Values (Type value and press Enter or comma)
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    minHeight: '40px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {(attr.values || []).map((val, valIdx) => (
                    <span
                      key={valIdx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#ede9fe',
                        color: '#4338ca',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        border: '1px solid #c7d2fe'
                      }}
                    >
                      {val}
                      <button
                        type="button"
                        onClick={() => handleRemoveTagValue(attrIdx, val)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6366f1',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={attrInputText[attrIdx] || ''}
                    placeholder={(attr.values || []).length === 0 ? "Type e.g. Elaichi and press Enter" : "Add more..."}
                    onChange={(e) => setAttrInputText({ ...attrInputText, [attrIdx]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTagValue(attrIdx, attrInputText[attrIdx]);
                      }
                    }}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.85rem',
                      flex: 1,
                      minWidth: '130px',
                      padding: '4px'
                    }}
                  />
                  {(attrInputText[attrIdx] || '').trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddTagValue(attrIdx, attrInputText[attrIdx])}
                      style={{
                        backgroundColor: '#4338ca',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>

              {/* Remove attribute */}
              <div style={{ paddingTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(attrIdx)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Remove Attribute"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )))}
        </div>

        {/* Matrix Count summary */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
            Attributes: <strong>{(attributes || []).length}</strong> | Real-Time Cartesian Product:{' '}
            <span
              style={{
                backgroundColor: totalCombinations > 0 ? '#dcfce7' : '#f1f5f9',
                color: totalCombinations > 0 ? '#15803d' : '#64748b',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '700'
              }}
            >
              {totalCombinations} Variants
            </span>
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Each variant automatically receives its unique SKU & single-unit QR code.
          </span>
        </div>
      </div>

      {/* SECTION 2: EDITABLE VARIANTS MATRIX TABLE */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: '#0f172a' }}>
              Generated Variants Matrix ({variants.length} Combinations)
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Customize SKU, extra price, generate individual QR codes, and configure multi-pack packaging (e.g. Pack of 24).
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: '600', backgroundColor: '#e0e7ff', padding: '4px 10px', borderRadius: '999px' }}>
            Cartesian Product Live
          </span>
        </div>

        {variants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <Sparkles size={36} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
            <p style={{ margin: 0, fontWeight: '500' }}>Add at least one attribute with values above to generate the matrix.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '50px', textAlign: 'center' }}>Sr. No.</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '90px', textAlign: 'center' }}>QR / Barcode</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', minWidth: '160px', textAlign: 'center' }}>Variant Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '205px', textAlign: 'center' }}>SKU & Barcode</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '105px', textAlign: 'center' }}>Cost ({currSymbol})</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '105px', textAlign: 'center' }}>Sell ({currSymbol})</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '105px', textAlign: 'center' }}>MRP ({currSymbol})</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '95px', textAlign: 'center' }}>Stock</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '85px', textAlign: 'center' }} title="Reorder Level (Alert threshold)">ROL</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '85px', textAlign: 'center' }} title="Reorder Quantity (Replenishment lot)">ROQ</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '140px', textAlign: 'center' }}>Warehouse</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '150px', textAlign: 'center' }}>Multi-Pack Rules</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', color: '#ffffff', width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, idx) => (
                  <tr key={v.id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                    {/* Sr. No. */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                      {idx + 1}
                    </td>

                    {/* QR Code thumbnail & generator */}
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <div
                        onClick={() => setPreviewQrVariant(v)}
                        title={v.barcode_image_url ? "Uploaded Barcode Image (Click to edit or print label)" : "Auto-Generated QR Code (Click to upload barcode or print sticker)"}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px',
                          backgroundColor: v.barcode_image_url ? '#f0fdf4' : '#f8fafc',
                          borderRadius: '8px',
                          border: v.barcode_image_url ? '1px solid #86efac' : '1px solid #e2e8f0',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {v.barcode_image_url ? (
                          <img
                            src={v.barcode_image_url}
                            alt="Barcode"
                            style={{
                              width: '42px',
                              height: '38px',
                              objectFit: 'contain',
                              borderRadius: '4px',
                              backgroundColor: '#fff'
                            }}
                          />
                        ) : (
                          <QRCodeSVG value={v.barcode || v.sku} size={38} />
                        )}
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: '700',
                          color: v.barcode_image_url ? '#16a34a' : (v.barcode && v.barcode !== `${v.sku}-UNIT` ? '#2563eb' : '#6366f1'),
                          backgroundColor: v.barcode_image_url ? '#dcfce7' : (v.barcode && v.barcode !== `${v.sku}-UNIT` ? '#dbeafe' : '#ede9fe'),
                          padding: '1px 5px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          {v.barcode_image_url ? 'Uploaded' : (v.barcode && v.barcode !== `${v.sku}-UNIT` ? 'Custom' : 'Auto QR')}
                        </span>
                      </div>
                    </td>

                    {/* Variant Name */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="text"
                        value={v.variant_name || ''}
                        onChange={(e) => handleUpdateVariantField(idx, 'variant_name', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {v.combination &&
                          Object.entries(v.combination).map(([k, val]) => (
                            <span
                              key={k}
                              style={{
                                fontSize: '0.7rem',
                                color: '#475569',
                                backgroundColor: '#f1f5f9',
                                padding: '1px 5px',
                                borderRadius: '4px'
                              }}
                            >
                              <strong>{k}:</strong> {val}
                            </span>
                          ))}
                      </div>
                    </td>

                    {/* SKU & Barcode Number */}
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ position: 'relative', marginBottom: '4px' }}>
                        <input
                          type="text"
                          value={v.sku || ''}
                          onChange={(e) => {
                            const newSku = e.target.value;
                            handleUpdateVariantField(idx, 'sku', newSku);
                            // Only update auto barcode if user has not entered a custom barcode
                            if (!v.barcode || v.barcode === `${v.sku}-UNIT`) {
                              handleUpdateVariantField(idx, 'barcode', `${newSku}-UNIT`);
                            }
                          }}
                          placeholder="SKU"
                          title="Variant SKU"
                          style={{
                            width: '100%',
                            padding: '5px 24px 5px 6px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(v.sku)}
                          title="Copy SKU"
                          style={{
                            position: 'absolute',
                            right: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedSku === v.sku ? '#10b981' : '#94a3b8'
                          }}
                        >
                          {copiedSku === v.sku ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* Optional Supplier Barcode Input / Direct Upload Trigger */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="text"
                          placeholder={`Barcode (Default: ${v.sku ? `${v.sku}-UNIT` : 'Auto'})`}
                          value={v.barcode && v.barcode !== `${v.sku}-UNIT` ? v.barcode : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const finalVal = val.trim() ? val.trim() : `${v.sku}-UNIT`;
                            handleUpdateVariantField(idx, 'barcode', finalVal);
                          }}
                          title="Optional: Scan or type manufacturer's existing barcode (EAN-13, UPC). Leave blank to keep auto-generated QR code."
                          style={{
                            flex: 1,
                            padding: '3px 6px',
                            fontSize: '0.72rem',
                            fontFamily: 'monospace',
                            border: v.barcode && v.barcode !== `${v.sku}-UNIT` ? '1px solid #86efac' : '1px solid #cbd5e1',
                            borderRadius: '4px',
                            backgroundColor: v.barcode && v.barcode !== `${v.sku}-UNIT` ? '#f0fdf4' : '#ffffff',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewQrVariant(v)}
                          title="Upload barcode image or manage QR label"
                          style={{
                            border: 'none',
                            backgroundColor: v.barcode_image_url ? '#dcfce7' : '#ede9fe',
                            color: v.barcode_image_url ? '#15803d' : '#4f46e5',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Upload size={10} />
                          {v.barcode_image_url ? 'Img' : 'Upload'}
                        </button>
                      </div>
                    </td>

                    {/* Cost / Purchase Price */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={v.purchase_price !== undefined ? v.purchase_price : ''}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && parseFloat(val) < 0) return;
                          handleUpdateVariantField(idx, 'purchase_price', val);
                        }}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '5px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          outline: 'none'
                        }}
                      />
                    </td>

                    {/* Selling Price */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={v.selling_price !== undefined ? v.selling_price : ''}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && parseFloat(val) < 0) return;
                          handleUpdateVariantField(idx, 'selling_price', val);
                        }}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '5px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                      />
                    </td>

                    {/* MRP */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={v.mrp !== undefined ? v.mrp : ''}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && parseFloat(val) < 0) return;
                          handleUpdateVariantField(idx, 'mrp', val);
                        }}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '5px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          outline: 'none'
                        }}
                      />
                    </td>

                    {/* Opening Stock */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={v.opening_stock !== undefined ? v.opening_stock : (v.stock || '')}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && parseInt(val, 10) < 0) return;
                          handleUpdateVariantField(idx, 'opening_stock', val);
                          handleUpdateVariantField(idx, 'stock', val);
                        }}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '5px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                      />
                    </td>

                    {/* Reorder Level (ROL) */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={v.reorder_level !== undefined ? v.reorder_level : ''}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && parseInt(val, 10) < 0) return;
                          handleUpdateVariantField(idx, 'reorder_level', val);
                        }}
                        placeholder="0"
                        title="Reorder Level: Low-stock alert threshold"
                        style={{
                          width: '100%',
                          padding: '5px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          outline: 'none',
                          textAlign: 'center'
                        }}
                      />
                    </td>

                    {/* Reorder Qty (ROQ) */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={v.reorder_qty !== undefined ? v.reorder_qty : ''}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && parseInt(val, 10) < 0) return;
                          handleUpdateVariantField(idx, 'reorder_qty', val);
                        }}
                        placeholder="0"
                        title="Reorder Quantity: Recommended replenishment batch"
                        style={{
                          width: '100%',
                          padding: '5px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          outline: 'none',
                          textAlign: 'center'
                        }}
                      />
                    </td>

                    {/* Warehouse Dropdown */}
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        value={v.warehouse_id || ''}
                        onChange={(e) => handleUpdateVariantField(idx, 'warehouse_id', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '5px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          backgroundColor: '#fff',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Default Warehouse</option>
                        {warehouses.map((wh) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.name || wh.warehouse_name || wh.code || `Warehouse #${wh.id}`}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Multi-Pack Case Rules */}
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedVariantForPackaging(v)}
                        title="Configure Master Carton & Case Packaging rules"
                        style={{
                          backgroundColor: Array.isArray(v.packaging) && v.packaging.length > 0 ? '#ede9fe' : '#f1f5f9',
                          color: Array.isArray(v.packaging) && v.packaging.length > 0 ? '#4338ca' : '#475569',
                          border: '1px solid',
                          borderColor: Array.isArray(v.packaging) && v.packaging.length > 0 ? '#c7d2fe' : '#cbd5e1',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        <Package size={13} style={{ flexShrink: 0 }} />
                        {Array.isArray(v.packaging) && v.packaging.length > 0
                          ? (v.packaging[0]?.package_name
                              ? `${v.packaging[0].package_name} (${currSymbol}${v.packaging[0].selling_price || 0})`
                              : `${v.packaging.length} Pack(s)`)
                          : '+ Multi-Pack'}
                      </button>
                    </td>

                    {/* Actions: Refresh QR & Delete Row */}
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={() => handleRegenerateBarcode(idx)}
                          title="Re-generate Unit QR code"
                          style={{
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '5px 7px',
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          <RefreshCw size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(idx)}
                          title="Delete this variant combination"
                          style={{
                            backgroundColor: '#fee2e2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '5px 7px',
                            cursor: 'pointer',
                            color: '#dc2626'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Packaging / Multi-Pack Sub-Modal */}
      {selectedVariantForPackaging && (
        <PackagingModal
          isOpen={Boolean(selectedVariantForPackaging)}
          onClose={() => setSelectedVariantForPackaging(null)}
          variant={selectedVariantForPackaging}
          onSavePackaging={handleSavePackaging}
          currency={currency}
        />
      )}

      {/* QR Code & Barcode Modal */}
      {previewQrVariant && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px'
          }}
          onClick={() => setPreviewQrVariant(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Variant Barcode & QR Code
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {previewQrVariant.variant_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQrVariant(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Helper Mode Banner */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                Status: <strong style={{ color: previewQrVariant.barcode_image_url ? '#16a34a' : (previewQrVariant.barcode && previewQrVariant.barcode !== `${previewQrVariant.sku}-UNIT` ? '#2563eb' : '#6366f1') }}>
                  {previewQrVariant.barcode_image_url ? 'Uploaded Supplier Barcode Image' : (previewQrVariant.barcode && previewQrVariant.barcode !== `${previewQrVariant.sku}-UNIT` ? 'Custom Manufacturer Barcode' : 'Auto-Generated System QR Code')}
                </strong>
              </div>
              {(previewQrVariant.barcode_image_url || (previewQrVariant.barcode && previewQrVariant.barcode !== `${previewQrVariant.sku}-UNIT`)) && (
                <button
                  type="button"
                  onClick={() => {
                    const autoCode = `${previewQrVariant.sku}-UNIT`;
                    const varIdx = variants.findIndex(v => v.id === previewQrVariant.id || v.sku === previewQrVariant.sku);
                    if (varIdx !== -1) {
                      handleUpdateVariantField(varIdx, 'barcode', autoCode);
                      handleUpdateVariantField(varIdx, 'barcode_image_url', '');
                    }
                    setPreviewQrVariant(prev => ({ ...prev, barcode: autoCode, barcode_image_url: '' }));
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={11} /> Reset to Auto QR
                </button>
              )}
            </div>

            <BarcodeUploader
              barcodeValue={previewQrVariant.barcode || previewQrVariant.sku}
              barcodeImageUrl={previewQrVariant.barcode_image_url || ''}
              onBarcodeValueChange={(newCode) => {
                const varIdx = variants.findIndex(v => v.id === previewQrVariant.id || v.sku === previewQrVariant.sku);
                if (varIdx !== -1) {
                  handleUpdateVariantField(varIdx, 'barcode', newCode);
                }
                setPreviewQrVariant(prev => ({ ...prev, barcode: newCode }));
              }}
              onBarcodeImageChange={(newUrl) => {
                const varIdx = variants.findIndex(v => v.id === previewQrVariant.id || v.sku === previewQrVariant.sku);
                if (varIdx !== -1) {
                  handleUpdateVariantField(varIdx, 'barcode_image_url', newUrl);
                }
                setPreviewQrVariant(prev => ({ ...prev, barcode_image_url: newUrl }));
              }}
              label="Variant Barcode / QR Code"
              productName={previewQrVariant.variant_name}
              sku={previewQrVariant.sku}
              sellingPrice={previewQrVariant.selling_price || basePrice}
              mrp={previewQrVariant.mrp || baseMrp}
              currency={currency}
            />

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPreviewQrVariant(null)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#4338ca',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantMatrixBuilder;
