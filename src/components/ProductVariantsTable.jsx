import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Printer, QrCode, Eye, Layers, Package, Building2, ExternalLink, ArrowUpDown } from 'lucide-react';
import QRCodeSVG from './QRCodeSVG';
import Pagination from './Pagination';
import { useAuth } from '../context/AuthContext';

const ProductVariantsTable = ({
  variants = [],
  loading = false,
  onQuickPriceEdit,
  onPrintQR,
  onEditFull,
  onToggleStatus,
  updatingIds = new Set(),
  parentMap = {},
  currency = 'INR'
}) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [hoveredWarehouseId, setHoveredWarehouseId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedVariants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return variants.slice(start, start + itemsPerPage);
  }, [variants, currentPage]);

  const currSymbol = currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));

  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div className="animate-spin" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', marginBottom: '12px' }} />
        <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>Loading Product Variants Master...</div>
      </div>
    );
  }

  if (!variants || variants.length === 0) {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <Layers size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#0f172a' }}>No Product Variants Found</h4>
        <p style={{ margin: 0, fontSize: '0.85rem' }}>Create variants using the <strong>"+ Add Variant"</strong> button or via a product template's Variants Matrix.</p>
      </div>
    );
  }

  return (
    <div className="table-container" style={{ borderRadius: '12px', border: '1px solid #eaecf0', backgroundColor: '#ffffff', overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative', boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'center', fontSize: '0.88rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', width: '60px', textAlign: 'center' }}>
              Sr. No.
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', width: '70px', textAlign: 'center' }}>
              QR
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <span>SKU & Barcode</span>
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <span>Variant Name & Attributes</span>
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <span>Parent Template</span>
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', minWidth: '190px', textAlign: 'center' }}>
              <span>Pricing (Cost / Sell / MRP)</span>
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <span>Stock On Hand</span>
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <span>Reorder (ROL / ROQ)</span>
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <span>Packagings</span>
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <span>Status</span>
            </th>
            <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', textAlign: 'center', minWidth: '180px' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedVariants.map((variant, vIdx) => {
            const variantId = variant.id || variant._id;
            const parentId = variant.parent_product_id || variant.template_id || variant.parent_id;
            const parentObj = parentMap[parentId] || variant.template || variant.parent_product || variant.ParentProduct;
            const parentName = parentObj?.name || parentObj?.product_name || (parentId ? `Template #${parentId}` : 'Master Template');

            // Attributes
            const attrObj = variant.variant_attributes || variant.combination || {};

            // Calculate total stock from warehouse allocations
            const whAllocations = Array.isArray(variant.warehouse_allocations) && variant.warehouse_allocations.length > 0
              ? variant.warehouse_allocations
              : [];
            
            const totalStock = whAllocations.length > 0
              ? whAllocations.reduce((sum, wa) => sum + (parseInt(wa.current_stock ?? wa.opening_stock ?? wa.quantity, 10) || 0), 0)
              : (variant.current_stock ?? variant.opening_stock ?? variant.purchase_quantity ?? variant.stock ?? 0);

            // Packagings
            const packagings = Array.isArray(variant.packagings) && variant.packagings.length > 0
              ? variant.packagings
              : (Array.isArray(variant.packaging) ? variant.packaging : []);

            const unitBarcode = variant.gtin_ean_upc || variant.barcode || `${variant.sku}-UNIT`;
            const isHovered = hoveredWarehouseId === variantId;

            return (
              <tr
                key={variantId || vIdx}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: vIdx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                  transition: 'background-color 0.15s'
                }}
              >
                {/* 0. Sr. No. */}
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                  {(currentPage - 1) * itemsPerPage + vIdx + 1}
                </td>

                {/* 1. Unit QR Thumbnail */}
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div
                    onClick={() => onPrintQR && onPrintQR(variant)}
                    title="Click to print unit or carton QR label"
                    style={{
                      cursor: 'pointer',
                      display: 'inline-block',
                      padding: '4px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'transform 0.15s'
                    }}
                  >
                    <QRCodeSVG value={unitBarcode} size={36} />
                  </div>
                </td>

                {/* 2. SKU / Barcode */}
                <td style={{ padding: '12px 16px' }}>
                  <div
                    className="saas-code-link"
                    style={{ cursor: 'pointer', fontFamily: 'monospace' }}
                    onClick={() => navigate(`/products/${variantId}`)}
                    title="Click to view details"
                  >
                    {variant.sku || '-'}
                  </div>
                  {unitBarcode && (
                    <div style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                      {unitBarcode}
                    </div>
                  )}
                </td>

                {/* 3. Variant Name & Attributes */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem' }}>
                      {variant.name || variant.variant_name}
                    </span>
                    {(variant.costing_method || parentObj?.costing_method) && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor:
                            (variant.costing_method || parentObj?.costing_method) === 'AVCO' ? '#e0f2fe' :
                            (variant.costing_method || parentObj?.costing_method) === 'BATCH' ? '#fef3c7' :
                            (variant.costing_method || parentObj?.costing_method) === 'FIFO' ? '#dcfce7' : '#f1f5f9',
                          color:
                            (variant.costing_method || parentObj?.costing_method) === 'AVCO' ? '#0369a1' :
                            (variant.costing_method || parentObj?.costing_method) === 'BATCH' ? '#b45309' :
                            (variant.costing_method || parentObj?.costing_method) === 'FIFO' ? '#15803d' : '#64748b',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontWeight: '700',
                          border: `1px solid ${
                            (variant.costing_method || parentObj?.costing_method) === 'AVCO' ? '#bae6fd' :
                            (variant.costing_method || parentObj?.costing_method) === 'BATCH' ? '#fde68a' :
                            (variant.costing_method || parentObj?.costing_method) === 'FIFO' ? '#bbf7d0' : '#e2e8f0'
                          }`
                        }}
                      >
                        {(variant.costing_method || parentObj?.costing_method) === 'AVCO' ? 'AVCO' :
                         (variant.costing_method || parentObj?.costing_method) === 'BATCH' ? 'Batch' :
                         (variant.costing_method || parentObj?.costing_method) === 'FIFO' ? 'FIFO' : 'None'}
                      </span>
                    )}
                  </div>
                  {Object.keys(attrObj).length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {Object.entries(attrObj).map(([k, val]) => (
                        <span
                          key={k}
                          style={{
                            fontSize: '0.72rem',
                            backgroundColor: '#ede9fe',
                            color: '#4338ca',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: '600',
                            border: '1px solid #ddd6fe'
                          }}
                        >
                          <strong>{k}:</strong> {val}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                      Standard specification
                    </div>
                  )}
                </td>

                {/* 4. Parent Template Link */}
                <td style={{ padding: '12px 16px' }}>
                  {parentId ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/products/${parentId}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: '#6366f1',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        textAlign: 'left'
                      }}
                      title="Open Parent Product Template Details"
                    >
                      <span>{parentName}</span>
                      <ExternalLink size={13} />
                    </button>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Master Product</span>
                  )}
                </td>

                {/* 5. Pricing (Cost / Sell / MRP) + Quick Edit Button */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
                      <span style={{ color: '#64748b' }}>
                        Cost: <strong style={{ color: '#334155' }}>{currSymbol}{parseFloat(variant.purchase_price || 0).toFixed(2)}</strong>
                      </span>
                      <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.88rem' }}>
                        Sell: {currSymbol}{parseFloat(variant.selling_price || 0).toFixed(2)}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        MRP: <strong style={{ color: '#334155' }}>{currSymbol}{parseFloat(variant.mrp || variant.selling_price || 0).toFixed(2)}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onQuickPriceEdit && onQuickPriceEdit(variant)}
                      title="Quick Edit Price"
                      style={{
                        backgroundColor: '#f5f3ff',
                        border: '1px solid #c7d2fe',
                        borderRadius: '6px',
                        color: '#4338ca',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </td>

                {/* 6. Stock On Hand + Warehouse popover */}
                <td style={{ padding: '12px 16px', position: 'relative' }}>
                  <div
                    onMouseEnter={() => setHoveredWarehouseId(variantId)}
                    onMouseLeave={() => setHoveredWarehouseId(null)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: whAllocations.length > 0 ? 'help' : 'default' }}
                  >
                    <span
                      style={{
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        color: totalStock > 0 ? '#15803d' : '#dc2626',
                        backgroundColor: totalStock > 0 ? '#dcfce7' : '#fee2e2',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      {totalStock} units
                    </span>
                    {whAllocations.length > 0 && (
                      <Building2 size={14} color="#6366f1" />
                    )}
                  </div>

                  {/* Warehouse popover breakdown */}
                  {isHovered && whAllocations.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '16px',
                        zIndex: 100,
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        minWidth: '200px',
                        pointerEvents: 'none'
                      }}
                    >
                      <div style={{ fontWeight: '700', marginBottom: '6px', borderBottom: '1px solid #334155', paddingBottom: '4px', color: '#93c5fd' }}>
                        🏢 Stock per Warehouse
                      </div>
                      {whAllocations.map((wa, wai) => (
                        <div key={wai} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                          <span>{wa.warehouse?.name || `Warehouse #${wa.warehouse_id}`}:</span>
                          <span style={{ fontWeight: '700', color: '#86efac' }}>
                            {wa.current_stock ?? wa.opening_stock ?? wa.quantity ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                {/* 6B. Reorder Thresholds & Health Indicator */}
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {(() => {
                    const rol = variant.reorder_level !== undefined && variant.reorder_level !== null
                      ? variant.reorder_level
                      : (parentObj?.reorder_level ?? 0);
                    const roq = variant.reorder_qty !== undefined && variant.reorder_qty !== null
                      ? variant.reorder_qty
                      : (parentObj?.reorder_qty ?? 0);
                    const hasCustomRol = variant.reorder_level !== undefined && variant.reorder_level !== null;
                    const isLowStock = rol > 0 && totalStock <= rol;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                          <span title="Reorder Level (Alert threshold)" style={{ fontWeight: '700', color: '#1e293b' }}>
                            ROL: {rol}
                          </span>
                          <span style={{ color: '#94a3b8' }}>|</span>
                          <span title="Reorder Quantity (Batch size)" style={{ color: '#475569' }}>
                            ROQ: {roq}
                          </span>
                        </div>

                        {rol > 0 ? (
                          isLowStock ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              border: '1px solid #fecaca'
                            }}>
                              🚨 Below ROL
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              border: '1px solid #bbf7d0'
                            }}>
                              ✓ Healthy
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No ROL set
                          </span>
                        )}

                        {hasCustomRol && (
                          <span style={{ fontSize: '0.65rem', color: '#6366f1', backgroundColor: '#ede9fe', padding: '1px 5px', borderRadius: '4px' }}>
                            Variant ROL
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>

                {/* 7. Packagings */}
                <td style={{ padding: '12px 16px' }}>
                  {packagings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {packagings.map((pkg, pki) => {
                        const q = pkg.quantity || pkg.quantity_per_pack || 24;
                        return (
                          <span
                            key={pki}
                            style={{
                              fontSize: '0.72rem',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Package size={12} color="#6366f1" />
                            <strong>{pkg.package_name || `Pack of ${q}`}</strong>
                            {pkg.selling_price && (
                              <span style={{ color: '#16a34a', fontWeight: '700' }}>
                                ({currSymbol}{parseFloat(pkg.selling_price).toFixed(2)})
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Single unit only
                    </span>
                  )}
                </td>

                {/* 8. Status */}
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {hasPermission('products', 'edit') ? (() => {
                    const isActive = (variant.status || 'Active').toLowerCase() === 'active';
                    const isUpdating = updatingIds.has(variantId);
                    return (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${variant.name || variant.variant_name || 'variant'}`}
                          disabled={isUpdating}
                          onClick={() => onToggleStatus?.(variant)}
                          title={`Click to ${isActive ? 'deactivate' : 'activate'} this variant`}
                          style={{ position: 'relative', width: '38px', height: '22px', borderRadius: '9999px', backgroundColor: isActive ? '#10b981' : '#cbd5e1', border: 'none', cursor: isUpdating ? 'wait' : 'pointer', opacity: isUpdating ? 0.65 : 1, padding: '2px', transition: 'background-color 0.2s ease, box-shadow 0.2s ease', display: 'inline-flex', alignItems: 'center', boxShadow: isActive ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none' }}
                        >
                          <span style={{ display: 'block', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: isActive ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                        </button>
                        <span style={{ minWidth: '48px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: isActive ? '#059669' : '#64748b' }}>
                          {variant.status || 'Active'}
                        </span>
                      </div>
                    );
                  })() : (
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: variant.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: variant.status === 'Active' ? '#059669' : '#dc2626' }}>
                      {variant.status || 'Active'}
                    </span>
                  )}
                </td>

                {/* 9. Actions */}
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {/* View Details / Navigate */}
                    <button
                      type="button"
                      className="saas-action-btn variant-action-view"
                      onClick={() => navigate(`/products/${variantId}`)}
                      title="View Details"
                    >
                      <Eye size={15} />
                    </button>

                    {/* Quick Price Edit */}
                    <button
                      type="button"
                      className="saas-action-btn variant-action-price"
                      onClick={() => onQuickPriceEdit && onQuickPriceEdit(variant)}
                      title="Quick Price Edit"
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* Print QR (Unit & Packaging) */}
                    <button
                      type="button"
                      className="saas-action-btn variant-action-print"
                      onClick={() => onPrintQR && onPrintQR(variant)}
                      title="Print Unit or Carton QR Label"
                    >
                      <Printer size={14} />
                    </button>

                    {/* Edit Full Details */}
                    {hasPermission('products', 'edit') && (
                      <button
                        type="button"
                        className="saas-action-btn variant-action-config"
                        onClick={() => onEditFull && onEditFull(variant)}
                        title="Edit Full Variant Configuration"
                      >
                        <Layers size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination
        currentPage={currentPage}
        totalItems={variants.length}
        itemsPerPage={10}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default ProductVariantsTable;
