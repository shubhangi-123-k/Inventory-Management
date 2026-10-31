import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  Loader2,
  Barcode,
  Eye,
  Trash2,
  QrCode,
  Sparkles,
  Printer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Package
} from 'lucide-react';
import api from '../api/axios';
import QRCodeSVG from './QRCodeSVG';

const BarcodeUploader = ({
  barcodeValue = '',
  barcodeImageUrl = '',
  onBarcodeValueChange,
  onBarcodeImageChange,
  label = 'Barcode / UPC (Universal Product Code)',
  disabled = false,
  // Product details for QR generation & live label preview
  productName = '',
  sku = '',
  productCode = '',
  sellingPrice = '',
  mrp = '',
  currency = 'INR',
  hsnCode = '',
  batchNumber = '',
  expiryDate = '',
  bestBeforeDate = '',
  companyName = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showQrPreview, setShowQrPreview] = useState(false);

  const fileInputRef = useRef(null);
  const qrRef = useRef(null);

  const currSymbol = currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));

  // Handle uploading barcode image to cloud storage
  const handleUploadFile = async (file) => {
    if (!file) return;
    setErrorMsg('');

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPEG, WEBP, GIF, SVG)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'barcodes');

      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.url) {
        onBarcodeImageChange(res.data.url);
      }
    } catch (err) {
      console.error('Failed to upload barcode image:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to upload barcode image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    onBarcodeImageChange('');
  };

  // Structured QR Payload Calculation
  const effectiveCode = barcodeValue || sku || productCode || 'PRD-ITEM';
  const effectivePrice = sellingPrice || mrp || '0.00';
  const formattedPrice = !isNaN(parseFloat(effectivePrice)) ? parseFloat(effectivePrice).toFixed(2) : '0.00';

  const qrPayloadObj = {
    type: 'UNIT',
    code: effectiveCode,
    sku: sku || effectiveCode,
    name: productName || 'Product Item',
    price: formattedPrice,
    currency: currency || 'INR',
    qty: 1,
    ...(hsnCode ? { hsn: hsnCode } : {}),
    ...(batchNumber ? { batch: batchNumber } : {}),
    ...(expiryDate ? { exp: expiryDate } : {}),
    ...(bestBeforeDate ? { best_before: bestBeforeDate } : {})
  };

  const qrPayloadString = JSON.stringify(qrPayloadObj, null, 2);

  // Auto-generate code when user clicks "Generate Product QR Code"
  const handleGenerateQR = () => {
    if (!barcodeValue) {
      const generated = sku || productCode || ('PRD-' + Math.random().toString(36).substring(2, 8).toUpperCase());
      if (onBarcodeValueChange) {
        onBarcodeValueChange(generated);
      }
    }
    setShowQrPreview(true);
  };

  const handleRegenerateCode = () => {
    const generated = 'PRD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    if (onBarcodeValueChange) {
      onBarcodeValueChange(generated);
    }
  };

  // Print Thermal Label Card
  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank', 'width=650,height=700');
    if (!printWindow) return;

    const qrSvgElement = qrRef.current ? qrRef.current.querySelector('svg') : null;
    const qrSvgHtml = qrSvgElement ? qrSvgElement.outerHTML : '';
    const itemTitle = productName || 'Product Item';
    const displayCode = barcodeValue || sku || productCode || 'PRD-ITEM';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product QR Label - ${itemTitle}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; }
              @page { size: auto; margin: 8mm; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 20px;
              display: flex;
              justify-content: center;
              background-color: #f8fafc;
            }
            .label-card {
              background: #fff;
              border: 2px dashed #0f172a;
              border-radius: 12px;
              padding: 20px;
              max-width: 320px;
              width: 100%;
              text-align: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .brand-header {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 4px;
            }
            .header-tag {
              display: inline-block;
              background: #e0e7ff;
              color: #3730a3;
              font-weight: 700;
              font-size: 11px;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              padding: 4px 12px;
              border-radius: 999px;
              margin-bottom: 10px;
            }
            .product-name {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 4px 0;
              line-height: 1.3;
            }
            .sku {
              font-family: monospace;
              font-size: 11px;
              font-weight: 700;
              color: #475569;
              margin-bottom: 12px;
            }
            .qr-wrapper {
              margin: 10px auto;
              padding: 8px;
              display: inline-block;
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
            }
            .qr-wrapper svg {
              display: block;
              width: 140px;
              height: 140px;
            }
            .barcode-line {
              font-family: monospace;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.05em;
              color: #1e293b;
              margin-top: 6px;
            }
            .price-tag {
              font-size: 17px;
              font-weight: 800;
              color: #16a34a;
              margin-top: 8px;
            }
            .hsn-line {
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
              margin-top: 4px;
            }
            .footer-meta {
              font-size: 9px;
              color: #94a3b8;
              margin-top: 10px;
              border-top: 1px solid #f1f5f9;
              padding-top: 6px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            ${companyName ? `<div class="brand-header">${companyName}</div>` : ''}
            <div class="header-tag">📦 SINGLE UNIT QR</div>
            <div class="product-name">${itemTitle}</div>
            <div class="sku">SKU: ${sku || displayCode}</div>
            <div class="qr-wrapper">
              ${qrSvgHtml}
            </div>
            <div class="barcode-line">${displayCode}</div>
            <div class="price-tag">${currSymbol} ${formattedPrice}</div>
            ${hsnCode ? `<div class="hsn-line">HSN: ${hsnCode}</div>` : ''}
            ${expiryDate ? `<div class="hsn-line">EXP: ${expiryDate}</div>` : ''}
            ${bestBeforeDate ? `<div class="hsn-line">Best Before: ${bestBeforeDate}</div>` : ''}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadFile(e.target.files[0]);
          }
        }}
        disabled={disabled}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
        <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
          {label}
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {barcodeImageUrl && (
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '999px', border: '1px solid #a7f3d0' }}>
              📷 Image Attached
            </span>
          )}
          {showQrPreview && (
            <span style={{ fontSize: '0.7rem', color: '#4338ca', fontWeight: '700', backgroundColor: '#e0e7ff', padding: '2px 8px', borderRadius: '999px', border: '1px solid #c7d2fe' }}>
              ✨ QR Code Active
            </span>
          )}
        </div>
      </div>

      {/* Barcode Number Input & Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
            <Barcode size={18} />
          </div>
          <input
            type="text"
            placeholder="e.g. 8901030384591 or auto-generated code"
            value={barcodeValue || ''}
            onChange={(e) => onBarcodeValueChange(e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: disabled ? '#f1f5f9' : '#f8fafc',
              color: '#1e293b',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Upload Barcode Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            backgroundColor: '#4338ca',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)',
            whiteSpace: 'nowrap'
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload size={16} /> Upload Barcode
            </>
          )}
        </button>

        {/* Generate / Toggle Product QR Code Button */}
        <button
          type="button"
          onClick={() => {
            if (!showQrPreview) {
              handleGenerateQR();
            } else {
              setShowQrPreview(false);
            }
          }}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            backgroundColor: showQrPreview ? '#312e81' : '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
            whiteSpace: 'nowrap'
          }}
        >
          <QrCode size={16} />
          {showQrPreview ? 'Hide QR Code' : 'Generate Product QR'}
        </button>
      </div>

      {errorMsg && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', marginBottom: '8px' }}>
          {errorMsg}
        </div>
      )}

      {/* Suggestion banner if no barcode image uploaded and QR not active */}
      {!barcodeImageUrl && !showQrPreview && (
        <div
          style={{
            marginTop: '8px',
            marginBottom: '8px',
            padding: '10px 14px',
            backgroundColor: '#f0fdf4',
            border: '1px dashed #86efac',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '0.82rem' }}>
            <Sparkles size={16} color="#15803d" />
            <span>
              No manufacturer barcode image uploaded? Click <strong>Generate Product QR</strong> to create an internal scannable QR code.
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerateQR}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              backgroundColor: '#15803d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: disabled ? 'not-allowed' : 'pointer'
            }}
          >
            <QrCode size={14} /> Generate QR Now
          </button>
        </div>
      )}

      {/* Barcode Image Preview Thumbnail (if uploaded) */}
      {barcodeImageUrl && (
        <div
          style={{
            marginTop: '8px',
            marginBottom: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px'
          }}
        >
          <div
            onClick={() => setShowPreviewModal(true)}
            style={{
              position: 'relative',
              width: '64px',
              height: '36px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Click to zoom barcode"
          >
            <img
              src={barcodeImageUrl}
              alt="Barcode"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1e293b' }}>
              Barcode Image Attached
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Stored in cloud storage
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              style={{
                background: '#ede9fe',
                border: 'none',
                color: '#4338ca',
                borderRadius: '6px',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.75rem',
                gap: '4px'
              }}
              title="View full barcode"
            >
              <Eye size={14} /> View
            </button>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  background: '#fee2e2',
                  border: 'none',
                  color: '#ef4444',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  gap: '4px'
                }}
                title="Remove barcode image"
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GENERATED PRODUCT QR CODE PREVIEW & PRODUCT INFO CARD                     */}
      {/* ========================================================================= */}
      {showQrPreview && (
        <div
          style={{
            marginTop: '12px',
            backgroundColor: '#ffffff',
            border: '1.5px solid #c7d2fe',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e0e7ff',
              paddingBottom: '10px',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4338ca'
                }}
              >
                <QrCode size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#1e1b4b' }}>
                  Product QR Code (Single Unit)
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: '600' }}>
                  Standard scannable 2D code for warehouse & POS billing
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRegenerateCode}
                title="Generate a new unique identifier code"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} /> Regenerate Code
              </button>

              <button
                type="button"
                onClick={handlePrintQR}
                title="Print thermal label"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  backgroundColor: '#4338ca',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)'
                }}
              >
                <Printer size={13} /> Print Label
              </button>

              <button
                type="button"
                onClick={() => setShowQrPreview(false)}
                title="Close QR preview"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body: Left QR Code Box, Right Product Info Overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '18px',
              alignItems: 'start'
            }}
          >
            {/* Left QR Code Rendering */}
            <div style={{ textAlign: 'center' }}>
              <div
                ref={qrRef}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  display: 'inline-block',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}
              >
                <QRCodeSVG value={qrPayloadString} size={120} />
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#334155',
                  marginTop: '6px'
                }}
              >
                {effectiveCode}
              </div>
            </div>

            {/* Right: Breakdown of Product Info Included in this QR */}
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '8px'
                }}
              >
                Product Information Included in QR:
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '8px',
                  marginBottom: '10px'
                }}
              >
                {/* 1. Item Name */}
                <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Product Name</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {productName || 'Pending Name'}
                  </div>
                </div>

                {/* 2. Identifier / SKU */}
                <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Lookup Key / SKU</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4338ca', fontFamily: 'monospace' }}>
                    {sku || effectiveCode}
                  </div>
                </div>

                {/* 3. Selling Price */}
                <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Retail Price</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#16a34a' }}>
                    {currSymbol} {formattedPrice}
                  </div>
                </div>

                {/* 4. Unit Type */}
                <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Pack Multiplier</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                    1 Single Unit
                  </div>
                </div>

                {/* 5. HSN Code */}
                {hsnCode && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>HSN / Tax Code</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                      {hsnCode}
                    </div>
                  </div>
                )}

                {/* 6. Batch Number */}
                {batchNumber && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Batch / Lot</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                      {batchNumber}
                    </div>
                  </div>
                )}

                {/* 7. Expiry Date */}
                {expiryDate && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Expiry (EXP)</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                      {expiryDate}
                    </div>
                  </div>
                )}

                {/* 8. Best Before Date */}
                {bestBeforeDate && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Best Before</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                      {bestBeforeDate}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Modal for Barcode Preview */}
      {showPreviewModal && (
        <div
          onClick={() => setShowPreviewModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              textAlign: 'center'
            }}
          >
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>
              Barcode / UPC Preview
            </h4>
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <img
                src={barcodeImageUrl}
                alt="Barcode Preview"
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            </div>
            {barcodeValue && (
              <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '0.95rem', fontWeight: '600', color: '#334155' }}>
                Code: {barcodeValue}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeUploader;
