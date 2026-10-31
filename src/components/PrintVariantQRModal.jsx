import React, { useState } from 'react';
import { X, Printer, QrCode, Package, Layers, Copy, Check } from 'lucide-react';
import QRCodeSVG from './QRCodeSVG';

const PrintVariantQRModal = ({
  isOpen,
  onClose,
  variant,
  currency = 'INR'
}) => {
  if (!isOpen || !variant) return null;

  const [activeTab, setActiveTab] = useState('unit'); // 'unit' or 'packaging'
  const [selectedPkgIndex, setSelectedPkgIndex] = useState(0);
  const [copiedText, setCopiedText] = useState(null);

  const packagings = Array.isArray(variant.packagings) && variant.packagings.length > 0
    ? variant.packagings
    : (Array.isArray(variant.packaging) ? variant.packaging : []);

  const currSymbol = currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));

  // Payloads
  const unitPayload = JSON.stringify({
    type: "UNIT",
    sku: variant.sku,
    qty: 1
  });

  const selectedPkg = packagings[selectedPkgIndex] || packagings[0];
  const pkgQty = selectedPkg ? (selectedPkg.quantity || selectedPkg.quantity_per_pack || 24) : 24;
  const pkgPayload = selectedPkg?.package_qr_payload || JSON.stringify({
    type: "PACKAGE",
    sku: variant.sku,
    qty: pkgQty
  });

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handlePrint = (mode) => {
    const printWindow = window.open('', '_blank', 'width=650,height=700');
    if (!printWindow) return;

    const isUnit = mode === 'unit';
    const title = isUnit ? 'Single Unit QR Label' : `Carton QR Label - ${selectedPkg?.package_name || 'Packaging'}`;
    const qrVal = isUnit ? unitPayload : pkgPayload;
    const barcodeVal = isUnit ? (variant.gtin_ean_upc || variant.barcode || variant.sku) : (selectedPkg?.package_barcode || selectedPkg?.barcode || `${variant.sku}-C${pkgQty}`);
    const priceVal = isUnit ? (variant.selling_price || '0.00') : (selectedPkg?.selling_price || '0.00');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; }
              @page { size: auto; margin: 10mm; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 30px;
              display: flex;
              justify-content: center;
              background-color: #f8fafc;
            }
            .label-card {
              background: #fff;
              border: 2px dashed #0f172a;
              border-radius: 14px;
              padding: 24px;
              max-width: 360px;
              width: 100%;
              text-align: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .header-tag {
              display: inline-block;
              background: ${isUnit ? '#e0e7ff' : '#ede9fe'};
              color: ${isUnit ? '#3730a3' : '#4338ca'};
              font-weight: 700;
              font-size: 11px;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              padding: 4px 12px;
              border-radius: 999px;
              margin-bottom: 12px;
            }
            .product-name {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 6px 0;
            }
            .sku {
              font-family: monospace;
              font-size: 12px;
              font-weight: 700;
              color: #475569;
              margin-bottom: 16px;
            }
            .qr-wrapper {
              margin: 16px auto;
              padding: 8px;
              display: inline-block;
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
            }
            .barcode-line {
              font-family: monospace;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.05em;
              color: #1e293b;
              margin-top: 8px;
            }
            .price-tag {
              font-size: 18px;
              font-weight: 800;
              color: #16a34a;
              margin-top: 10px;
            }
            .footer-meta {
              font-size: 10px;
              color: #94a3b8;
              margin-top: 14px;
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header-tag">${isUnit ? '📦 SINGLE UNIT QR' : `📦 CARTON QR (${pkgQty} UNITS)`}</div>
            <div class="product-name">${variant.name || variant.variant_name}</div>
            <div class="sku">SKU: ${variant.sku}</div>
            <div class="qr-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 25 25">
                <rect width="100%" height="100%" fill="#ffffff" />
                <path d="M2 2h7v7H2zM3 3h5v5H3zM4 4h3v3H4zM16 2h7v7h-7zM17 3h5v5h-5zM18 4h3v3h-3zM2 16h7v7H2zM3 17h5v5H3zM4 18h3v3H4zM11 2h2v4h-2zM14 2h1v2h-1zM11 8h3v2h-3zM15 7h2v3h-2zM18 10h2v2h-2zM11 11h2v3h-2zM2 11h2v3H2zM6 11h3v2H6zM11 15h1v4h-1zM13 14h2v2h-2zM13 18h3v2h-3zM15 15h2v2h-2zM18 14h3v3h-3zM22 13h1v3h-1zM20 18h3v3h-3zM17 21h2v2h-2zM13 22h3v1h-3zM10 21h2v2h-2z" fill="#0f172a"/>
              </svg>
            </div>
            <div class="barcode-line">${barcodeVal}</div>
            <div class="price-tag">${currSymbol} ${parseFloat(priceVal).toFixed(2)}</div>
            <div class="footer-meta">Payload: ${qrVal.replace(/"/g, '&quot;')}</div>
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
          maxWidth: '540px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#ede9fe', padding: '8px', borderRadius: '10px', color: '#6366f1' }}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Print QR Labels
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {variant.name || variant.variant_name} ({variant.sku})
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
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switchers */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('unit')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'unit' ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === 'unit' ? '#4338ca' : '#64748b',
              fontWeight: activeTab === 'unit' ? '700' : '500',
              cursor: 'pointer',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={15} />
            (a) Unit QR Label
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packaging')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'packaging' ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === 'packaging' ? '#4338ca' : '#64748b',
              fontWeight: activeTab === 'packaging' ? '700' : '500',
              cursor: 'pointer',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Package size={15} />
            (b) Packaging / Carton QR ({packagings.length})
          </button>
        </div>

        {/* Content area */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'unit' ? (
            /* UNIT QR PREVIEW */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  maxWidth: '300px',
                  margin: '0 auto 16px'
                }}
              >
                <span style={{ fontSize: '0.72rem', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                  SINGLE UNIT LABEL
                </span>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a', marginTop: '8px' }}>
                  {variant.name || variant.variant_name}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b', margin: '4px 0 12px' }}>
                  SKU: {variant.sku}
                </div>

                <div style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'inline-block' }}>
                  <QRCodeSVG value={unitPayload} size={130} />
                </div>

                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginTop: '8px' }}>
                  {variant.gtin_ean_upc || variant.barcode || variant.sku}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                  {currSymbol} {parseFloat(variant.selling_price || 0).toFixed(2)}
                </div>
              </div>

              {/* Payload code block */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '380px', margin: '0 auto 16px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>QR Payload</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4338ca', wordBreak: 'break-all' }}>{unitPayload}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(unitPayload)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedText === unitPayload ? '#10b981' : '#94a3b8', padding: '4px' }}
                >
                  {copiedText === unitPayload ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handlePrint('unit')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                }}
              >
                <Printer size={16} /> Print Unit QR Label
              </button>
            </div>
          ) : (
            /* PACKAGING QR PREVIEW */
            <div>
              {packagings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                  <Package size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontWeight: '600' }}>No Packaging Rules Configured for this Variant.</p>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                    Single-unit scanning applies. To print carton labels, add multi-pack packaging (e.g. Pack of 24).
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  {/* Packaging selector pills if multiple */}
                  {packagings.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                      {packagings.map((pkg, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setSelectedPkgIndex(pIdx)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '999px',
                            border: '1px solid',
                            borderColor: selectedPkgIndex === pIdx ? '#6366f1' : '#cbd5e1',
                            backgroundColor: selectedPkgIndex === pIdx ? '#ede9fe' : '#ffffff',
                            color: selectedPkgIndex === pIdx ? '#4338ca' : '#475569',
                            fontWeight: '600',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          {pkg.package_name || `Pack of ${pkg.quantity || 24}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Carton Label Preview */}
                  <div
                    style={{
                      border: '2px dashed #818cf8',
                      borderRadius: '12px',
                      padding: '20px',
                      backgroundColor: '#ffffff',
                      maxWidth: '320px',
                      margin: '0 auto 16px'
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', backgroundColor: '#ede9fe', color: '#4338ca', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      CARTON / CASE QR ({pkgQty} UNITS)
                    </span>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a', marginTop: '8px' }}>
                      {selectedPkg?.package_name || `Pack of ${pkgQty}`}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                      {variant.name || variant.variant_name}
                    </div>

                    <div style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'inline-block', margin: '12px 0 8px' }}>
                      <QRCodeSVG value={pkgPayload} size={130} />
                    </div>

                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: '700', color: '#4338ca' }}>
                      {selectedPkg?.package_barcode || selectedPkg?.barcode || `${variant.sku}-C${pkgQty}`}
                    </div>
                    {selectedPkg?.selling_price && (
                      <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                        {currSymbol} {parseFloat(selectedPkg.selling_price).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Payload display */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '380px', margin: '0 auto 16px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Carton QR Payload</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4338ca', wordBreak: 'break-all' }}>{pkgPayload}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(pkgPayload)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedText === pkgPayload ? '#10b981' : '#94a3b8', padding: '4px' }}
                    >
                      {copiedText === pkgPayload ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePrint('packaging')}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                    }}
                  >
                    <Printer size={16} /> Print Carton QR Label
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintVariantQRModal;
