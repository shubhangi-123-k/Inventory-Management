import React, { useState, useRef } from 'react';
import { Package, Plus, Trash2, X, QrCode, Printer, Box, Check, Copy, Upload, Loader2, Eye, Image as ImageIcon } from 'lucide-react';
import QRCodeSVG from './QRCodeSVG';
import api from '../api/axios';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const PackagingModal = ({
  isOpen,
  onClose,
  variant,
  onSavePackaging,
  currency = 'INR'
}) => {
  if (!isOpen || !variant) return null;

  const [packagingList, setPackagingList] = useState(
    Array.isArray(variant.packagings || variant.packaging) && (variant.packagings || variant.packaging).length > 0
      ? [...(variant.packagings || variant.packaging)].map(p => ({
          id: p.id || `pkg-${Date.now()}`,
          package_name: p.package_name || 'Pack of 24',
          quantity_per_pack: p.quantity_per_pack || p.quantity || 24,
          quantity: p.quantity || p.quantity_per_pack || 24,
          barcode: p.package_barcode || p.barcode || `${variant.sku || 'SKU'}-PKG24`,
          package_barcode: p.package_barcode || p.barcode || `${variant.sku || 'SKU'}-PKG24`,
          package_qr_payload: p.package_qr_payload || JSON.stringify({ type: 'PACKAGE', sku: variant.sku, qty: p.quantity || p.quantity_per_pack || 24 }),
          selling_price: p.selling_price || (variant.selling_price ? (parseFloat(variant.selling_price) * 24 * 0.95).toFixed(2) : ''),
          notes: p.notes || '',
          uploaded_qr_image: p.uploaded_qr_image || p.qr_image_url || ''
        }))
      : [
          {
            id: 'pkg-1',
            package_name: 'Pack of 24',
            quantity_per_pack: 24,
            quantity: 24,
            barcode: `${variant.sku || 'SKU'}-C24`,
            package_barcode: `${variant.sku || 'SKU'}-C24`,
            package_qr_payload: JSON.stringify({ type: 'PACKAGE', sku: variant.sku || 'SKU', qty: 24 }),
            selling_price: variant.selling_price ? (parseFloat(variant.selling_price) * 24 * 0.95).toFixed(2) : '',
            notes: 'Standard shipping carton / outer case',
            uploaded_qr_image: ''
          }
        ]
  );

  const [activePreviewPkg, setActivePreviewPkg] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRefs = useRef({});

  const handleAddPackaging = () => {
    const nextNum = (packagingList.length + 1) * 12;
    const barcodeVal = `${variant.sku || 'SKU'}-C${nextNum}`;
    const newPkg = {
      id: `pkg-${Date.now()}`,
      package_name: `Pack of ${nextNum}`,
      quantity_per_pack: nextNum,
      quantity: nextNum,
      barcode: barcodeVal,
      package_barcode: barcodeVal,
      package_qr_payload: JSON.stringify({ type: 'PACKAGE', sku: variant.sku || 'SKU', qty: nextNum }),
      selling_price: variant.selling_price ? (parseFloat(variant.selling_price) * nextNum * 0.95).toFixed(2) : '',
      notes: '',
      uploaded_qr_image: ''
    };
    setPackagingList([...packagingList, newPkg]);
  };

  const handleUpdateField = (index, field, value) => {
    const updated = [...packagingList];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity_per_pack' || field === 'quantity') {
      const q = parseInt(value, 10) || 1;
      updated[index].quantity = q;
      updated[index].quantity_per_pack = q;
      updated[index].package_qr_payload = JSON.stringify({ type: 'PACKAGE', sku: variant.sku, qty: q });
    }
    // Auto-update barcode slug if package name changes and barcode wasn't manually customized
    if (field === 'package_name' && !updated[index].customBarcode) {
      const slug = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const code = `${variant.sku || 'SKU'}-${slug}`;
      updated[index].barcode = code;
      updated[index].package_barcode = code;
    }
    if (field === 'barcode' || field === 'package_barcode') {
      updated[index].barcode = value;
      updated[index].package_barcode = value;
    }
    setPackagingList(updated);
  };

  // Upload barcode/QR image for a specific packaging row
  const handleUploadQrImage = async (index, file) => {
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError(`Row ${index + 1}: Please select a valid image file (PNG, JPEG, WEBP, GIF, SVG)`);
      return;
    }

    setUploadingIdx(index);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'packaging-qr');

      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.url) {
        const updated = [...packagingList];
        updated[index] = { ...updated[index], uploaded_qr_image: res.data.url };
        setPackagingList(updated);
      }
    } catch (err) {
      console.error('Failed to upload QR/barcode image:', err);
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload barcode/QR image');
    } finally {
      setUploadingIdx(null);
      if (fileInputRefs.current[index]) fileInputRefs.current[index].value = '';
    }
  };

  const handleRemoveQrImage = (index) => {
    const updated = [...packagingList];
    updated[index] = { ...updated[index], uploaded_qr_image: '' };
    setPackagingList(updated);
  };

  const [deletingPkg, setDeletingPkg] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleRemove = (index) => {
    const target = packagingList[index];
    if (target && target.id && !String(target.id).startsWith('pkg-')) {
      setDeletingPkg({ index, item: target });
    } else {
      setPackagingList(packagingList.filter((_, i) => i !== index));
    }
  };

  const handleConfirmDeletePkg = async (reason) => {
    if (!deletingPkg) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/admin/packagings/${deletingPkg.item.id}`, {
        data: { reason }
      }).catch(err => {
        console.warn("Backend packaging deletion fallback:", err);
      });
      setPackagingList(packagingList.filter((_, i) => i !== deletingPkg.index));
      setDeletingPkg(null);
    } catch (err) {
      console.error("Failed to delete packaging:", err);
      alert(err.response?.data?.message || err.response?.data?.error || "Failed to delete packaging");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSave = () => {
    onSavePackaging(packagingList);
    onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const printLabel = (pkg) => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) return;
    const qrSection = pkg.uploaded_qr_image
      ? `<div style="display:flex;justify-content:center;margin:12px 0;">
           <img src="${pkg.uploaded_qr_image}" alt="Carton QR" style="width:150px;height:150px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;" />
         </div>`
      : `<div style="display:flex;justify-content:center;margin:12px 0;">
           <svg width="150" height="150" viewBox="0 0 150 150">
             <rect width="150" height="150" fill="#f8fafc" rx="8" />
             <text x="75" y="70" text-anchor="middle" font-size="12" fill="#475569">CARTON QR</text>
             <text x="75" y="90" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e293b">${pkg.barcode}</text>
           </svg>
         </div>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Carton QR Label - ${pkg.package_name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; text-align: center; }
            .label-box { border: 2px dashed #0f172a; padding: 24px; border-radius: 12px; max-width: 380px; margin: 0 auto; }
            .title { font-size: 1.25rem; font-weight: 800; margin-bottom: 4px; color: #0f172a; }
            .sub { font-size: 0.9rem; color: #64748b; margin-bottom: 16px; }
            .badge { display: inline-block; background: #e0e7ff; color: #4338ca; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
            .barcode-val { font-family: monospace; font-size: 1rem; font-weight: 700; letter-spacing: 0.1em; color: #0f172a; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="title">${variant.variant_name || 'Product Variant'}</div>
            <div class="sub">Variant SKU: ${variant.sku || '-'}</div>
            <div class="badge">${pkg.package_name} (Contains ${pkg.quantity_per_pack} Units)</div>
            ${qrSection}
            <div class="barcode-val">${pkg.barcode}</div>
            <div style="margin-top:12px;font-size:0.8rem;color:#64748b;">Distinct Outer Case / Multi-Pack QR</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '880px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5'
              }}
            >
              <Box size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
                Multi-Pack Packaging Rules
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                For Variant: <strong style={{ color: '#4338ca' }}>{variant.variant_name || variant.sku}</strong> (Single Unit QR: <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{variant.barcode || variant.sku}</code>)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#eef2ff',
              borderRadius: '10px',
              border: '1px solid #c7d2fe',
              marginBottom: '20px',
              fontSize: '0.85rem',
              color: '#3730a3',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Package size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>Distinct Carton/Case QR Codes:</strong> Each multi-pack packaging (e.g. <em>Pack of 24</em>) receives a dedicated carton barcode/QR label distinct from the individual unit bottle. Warehouse scanners instantly identify the case level rather than scanning 24 single units.
            </div>
          </div>

          {/* Global upload error message */}
          {uploadError && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '0.82rem',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <X size={14} style={{ flexShrink: 0 }} />
              {uploadError}
              <button
                type="button"
                onClick={() => setUploadError(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {packagingList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
              <Box size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <p style={{ margin: '0 0 12px 0', color: '#64748b', fontWeight: '500' }}>No multi-pack packaging configurations yet.</p>
              <button
                type="button"
                onClick={handleAddPackaging}
                style={{
                  backgroundColor: '#4338ca',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> Add First Pack (e.g. Pack of 24)
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {packagingList.map((pkg, idx) => (
                <div
                  key={pkg.id || idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 140px auto',
                    gap: '18px',
                    alignItems: 'center'
                  }}
                >
                  {/* Carton QR Code Preview / Uploaded Image */}
                  <div style={{ textAlign: 'center' }}>
                    {/* Hidden file input for this row */}
                    <input
                      ref={(el) => { fileInputRefs.current[idx] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadQrImage(idx, e.target.files[0]);
                        }
                      }}
                    />

                    {pkg.uploaded_qr_image ? (
                      /* Show uploaded image */
                      <div style={{ position: 'relative' }}>
                        <div
                          style={{
                            padding: '4px',
                            background: '#f0fdf4',
                            border: '2px solid #86efac',
                            borderRadius: '8px',
                            display: 'inline-block',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => setPreviewImage(pkg.uploaded_qr_image)}
                          title="Click to preview uploaded barcode/QR"
                        >
                          <img
                            src={pkg.uploaded_qr_image}
                            alt="Uploaded QR"
                            style={{
                              width: '90px',
                              height: '90px',
                              objectFit: 'contain',
                              borderRadius: '6px',
                              display: 'block'
                            }}
                          />
                          {/* Small eye icon overlay */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '6px',
                              right: '6px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Eye size={11} color="#16a34a" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (fileInputRefs.current[idx]) fileInputRefs.current[idx].click();
                            }}
                            title="Replace image"
                            style={{
                              background: '#e0e7ff',
                              border: 'none',
                              color: '#4338ca',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              fontSize: '0.62rem',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <Upload size={9} /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQrImage(idx)}
                            title="Remove uploaded image"
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#ef4444',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              fontSize: '0.62rem',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <Trash2 size={9} /> Remove
                          </button>
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#16a34a', marginTop: '2px', textTransform: 'uppercase' }}>
                          ✓ Uploaded
                        </div>
                      </div>
                    ) : (
                      /* Show auto-generated QR */
                      <div>
                        <div
                          style={{
                            padding: '6px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            display: 'inline-block',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                        >
                          <QRCodeSVG value={pkg.barcode || `PKG-${idx + 1}`} size={90} title="Carton QR Code" />
                        </div>
                        {/* Upload button below auto-generated QR */}
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRefs.current[idx]) fileInputRefs.current[idx].click();
                          }}
                          disabled={uploadingIdx === idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            margin: '6px auto 0',
                            padding: '4px 10px',
                            backgroundColor: uploadingIdx === idx ? '#e2e8f0' : '#f0f9ff',
                            color: uploadingIdx === idx ? '#94a3b8' : '#0284c7',
                            border: '1px dashed #7dd3fc',
                            borderRadius: '6px',
                            cursor: uploadingIdx === idx ? 'not-allowed' : 'pointer',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                          }}
                          title="Upload your own barcode or QR code image"
                        >
                          {uploadingIdx === idx ? (
                            <>
                              <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...
                            </>
                          ) : (
                            <>
                              <Upload size={10} /> Upload QR
                            </>
                          )}
                        </button>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#4338ca', marginTop: '2px', textTransform: 'uppercase' }}>
                          Carton QR
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.2fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Package Name *
                      </label>
                      <input
                        type="text"
                        value={pkg.package_name || ''}
                        onChange={(e) => handleUpdateField(idx, 'package_name', e.target.value)}
                        placeholder="e.g. Pack of 24"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Units Per Pack *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.quantity_per_pack || ''}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && parseInt(val, 10) < 1) return;
                          handleUpdateField(idx, 'quantity_per_pack', val === '' ? '' : Math.max(1, parseInt(val, 10) || 1));
                        }}
                        placeholder="24"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Carton Barcode / QR *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={pkg.barcode || ''}
                          onChange={(e) => {
                            handleUpdateField(idx, 'customBarcode', true);
                            handleUpdateField(idx, 'barcode', e.target.value);
                          }}
                          placeholder="e.g. SKU-PKG24"
                          style={{
                            width: '100%',
                            padding: '8px 30px 8px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pkg.barcode)}
                          title="Copy Barcode"
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedCode === pkg.barcode ? '#10b981' : '#64748b'
                          }}
                        >
                          {copiedCode === pkg.barcode ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pack Price */}
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Pack Price ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pkg.selling_price || ''}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== '' && parseFloat(val) < 0) return;
                        handleUpdateField(idx, 'selling_price', val);
                      }}
                      onBlur={(e) => {
                        if (parseFloat(e.target.value) < 0) {
                          handleUpdateField(idx, 'selling_price', '0.00');
                        }
                      }}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        outline: 'none'
                      }}
                    />
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                      {pkg.quantity_per_pack ? `≈ ${currency} ${((Math.max(0, parseFloat(pkg.selling_price) || 0)) / (pkg.quantity_per_pack || 1)).toFixed(2)}/unit` : ''}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => printLabel(pkg)}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}
                    >
                      <Printer size={14} /> Print
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}

              <div>
                <button
                  type="button"
                  onClick={handleAddPackaging}
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#4338ca',
                    border: '1px dashed #c7d2fe',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.88rem',
                    fontWeight: '600'
                  }}
                >
                  <Plus size={16} /> Add Another Packaging Rule
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '9px 24px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#4338ca',
              color: '#ffffff',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Check size={16} /> Save Packaging Rules ({packagingList.length})
          </button>
        </div>
      </div>

      {/* Uploaded Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
            cursor: 'pointer'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '500px',
              maxHeight: '500px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                zIndex: 1
              }}
            >
              <X size={16} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#4338ca',
                backgroundColor: '#e0e7ff',
                padding: '4px 12px',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}>
                Uploaded Barcode / QR Code
              </span>
            </div>
            <img
              src={previewImage}
              alt="Barcode/QR Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'block',
                margin: '0 auto'
              }}
            />
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!deletingPkg}
        title="Delete Packaging Configuration"
        itemName={deletingPkg?.item?.package_name ? `Packaging "${deletingPkg.item.package_name}"` : 'this packaging'}
        onClose={() => setDeletingPkg(null)}
        onConfirm={handleConfirmDeletePkg}
        isLoading={deleteLoading}
      />

      {/* Inline keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PackagingModal;
