import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  FileCheck2,
  Package,
  Layers,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building2,
  Truck
} from 'lucide-react';

const safeNumber = (val, fallback = 0) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
};

const formatCurrency = (val) => {
  return safeNumber(val).toFixed(2);
};

const VarianceSummary = ({ poId: propPoId, onBack }) => {
  const { id: paramId } = useParams();
  const id = propPoId || paramId;
  const navigate = useNavigate();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState(null);

  const fetchVarianceAudit = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await api.get(`/admin/purchases/${id}/variance-summary`);
      } catch (err) {
        console.warn('Dedicated /variance-summary failed, computing from PO details fallback:', err);
        // Fallback: fetch single PO and calculate audit breakdown
        const poRes = await api.get(`/admin/purchases/${id}`);
        const po = poRes.data?.data || poRes.data?.purchase || poRes.data;

        if (!po) throw new Error('Purchase order data not found');

        const items = po.items || po.details || po.PurchaseOrderDetails || [];
        const rawOrderedTotal = items.reduce((sum, it) => sum + (parseFloat(it.qty || it.ordered_qty || 0) * parseFloat(it.price || it.unit_price || 0)), 0);
        const invoicedItemsTotal = items.reduce((sum, it) => sum + (parseFloat(it.received_qty ?? it.qty ?? 0) * parseFloat(it.invoiced_price ?? it.price ?? 0)), 0);
        const freight = parseFloat(po.freight_charges || 0);
        const other = parseFloat(po.other_charges || 0);
        const gstRate = parseFloat(po.gst_rate || 0);
        const gstAmt = ((invoicedItemsTotal + freight + other) * gstRate) / 100;
        const finalInvoiced = invoicedItemsTotal + freight + other + gstAmt;
        const netVar = finalInvoiced - (rawOrderedTotal * (1 + gstRate / 100));

        const contractedQty = items.reduce((sum, it) => sum + parseFloat(it.qty || it.ordered_qty || 0), 0);
        const receivedQty = items.reduce((sum, it) => sum + parseFloat(it.received_qty || 0), 0);
        const shortageQty = items.reduce((sum, it) => sum + parseFloat(it.shortage_qty || 0), 0);
        const rejectedQty = items.reduce((sum, it) => sum + parseFloat(it.rejected_qty || 0), 0);
        const substitutedQty = items.reduce((sum, it) => sum + (it.is_substituted ? parseFloat(it.substitute_qty || it.received_qty || 0) : 0), 0);
        const pendingQty = Math.max(0, contractedQty - receivedQty - shortageQty);
        const fulfillmentRate = contractedQty > 0 ? ((receivedQty / contractedQty) * 100).toFixed(1) : '100.0';

        setAuditData({
          po_number: po.po_number || po.po_id || `#${po.id}`,
          date: po.date || po.created_at,
          vendor_name: po.supplier_name || po.Supplier?.name || po.vendor_name || 'Vendor',
          warehouse_name: po.warehouse_name || po.Warehouse?.name || 'Warehouse',
          quantitative: {
            contracted_qty: contractedQty,
            physical_received_qty: receivedQty,
            virtual_pending_qty: pendingQty,
            shortage_qty: shortageQty,
            rejected_qty: rejectedQty,
            substituted_qty: substitutedQty,
            fulfillment_rate: parseFloat(fulfillmentRate)
          },
          financial: {
            contracted_total: rawOrderedTotal,
            invoiced_total: finalInvoiced,
            price_variance: invoicedItemsTotal - rawOrderedTotal,
            freight_charges: freight,
            other_charges: other,
            tax_amount: gstAmt,
            net_variance: netVar,
            paid_amount: parseFloat(po.total_paid || 0),
            balance_due: Math.max(0, finalInvoiced - parseFloat(po.total_paid || 0))
          },
          items: items.map((it, idx) => {
            const ordQty = parseFloat(it.qty || it.ordered_qty || 0);
            const recQty = parseFloat(it.received_qty || 0);
            const ordPrice = parseFloat(it.price || it.unit_price || 0);
            const invPrice = parseFloat(it.invoiced_price ?? ordPrice);
            const diffPrice = invPrice - ordPrice;
            const lineMonetaryDiscrepancy = (recQty * invPrice) - (ordQty * ordPrice);

            return {
              id: it.id || idx + 1,
              original_product_name: it.name || it.Product?.name || `Product #${it.product_id || idx + 1}`,
              original_sku: it.sku || it.Product?.sku || '—',
              ordered_qty: ordQty,
              received_qty: recQty,
              ordered_price: ordPrice,
              invoiced_price: invPrice,
              price_variance: diffPrice,
              monetary_discrepancy: lineMonetaryDiscrepancy,
              is_substituted: Boolean(it.is_substituted),
              substitute_product_name: it.substitute_product_name || it.SubstituteProduct?.name || null,
              substitute_qty: parseFloat(it.substitute_qty || 0),
              substitute_price: parseFloat(it.substitute_price || 0),
              shortage_qty: parseFloat(it.shortage_qty || 0)
            };
          })
        });
        setLoading(false);
        return;
      }

      if (res.data) {
        const raw = res.data.data || res.data;
        const sanitizedItems = (raw.items || []).map((it, idx) => {
          const ordQty = safeNumber(it.ordered_qty ?? it.qty);
          const recQty = safeNumber(it.received_qty);
          const ordPrice = safeNumber(it.ordered_price ?? it.price ?? it.unit_price);
          const invPrice = safeNumber(it.invoiced_price ?? ordPrice);
          const diffPrice = safeNumber(it.price_variance ?? (invPrice - ordPrice));
          const lineMonetary = safeNumber(it.monetary_discrepancy ?? ((recQty * invPrice) - (ordQty * ordPrice)));

          return {
            ...it,
            id: it.id || idx + 1,
            original_product_name: it.original_product_name || it.name || it.Product?.name || `Product #${idx + 1}`,
            original_sku: it.original_sku || it.sku || it.Product?.sku || '—',
            ordered_qty: ordQty,
            received_qty: recQty,
            shortage_qty: safeNumber(it.shortage_qty),
            ordered_price: ordPrice,
            invoiced_price: invPrice,
            price_variance: diffPrice,
            monetary_discrepancy: lineMonetary
          };
        });

        setAuditData({
          ...raw,
          financial: {
            ...raw.financial,
            contracted_total: safeNumber(raw.financial?.contracted_total),
            invoiced_total: safeNumber(raw.financial?.invoiced_total),
            freight_charges: safeNumber(raw.financial?.freight_charges),
            other_charges: safeNumber(raw.financial?.other_charges),
            tax_amount: safeNumber(raw.financial?.tax_amount),
            paid_amount: safeNumber(raw.financial?.paid_amount),
            balance_due: safeNumber(raw.financial?.balance_due),
            net_variance: safeNumber(raw.financial?.net_variance)
          },
          items: sanitizedItems
        });
      }
    } catch (err) {
      console.error('Failed to fetch variance summary:', err);
      showError('Failed to load PO variance audit report.');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    if (id) fetchVarianceAudit();
  }, [id, fetchVarianceAudit]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    if (onBack) onBack();
    else navigate(`/purchases/${id}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" color="#4338ca" />
        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155' }}>
          Generating Quantitative & Financial Variance Audit Report #{id}...
        </div>
      </div>
    );
  }

  if (!auditData) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>Audit Report Unavailable</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Variance audit data could not be computed for PO #{id}.
        </p>
        <button
          onClick={handleGoBack}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#4338ca', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
        >
          Return to Purchase Order
        </button>
      </div>
    );
  }

  const quant = auditData.quantitative || {};
  const fin = auditData.financial || {};
  const items = auditData.items || [];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={handleGoBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                cursor: 'pointer'
              }}
              title="Return to Purchase Order"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: '800'
                  }}
                >
                  AUDIT SUMMARY
                </span>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  PO Variance Audit: {auditData.po_number || `#${id}`}
                </h1>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                Vendor: <strong>{auditData.vendor_name || 'Vendor'}</strong> | Destination:{' '}
                <strong>{auditData.warehouse_name || 'Main Godown'}</strong> | Date: {auditData.date || '—'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={16} /> Print Audit
            </button>
            <button
              type="button"
              onClick={fetchVarianceAudit}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4338ca',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(67, 56, 202, 0.25)'
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin-anim' : ''} /> Refresh Audit
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Reconciliation Cards: Quantitative & Financial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1: Quantitative Reconciliation */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Quantitative Reconciliation
                </h3>
              </div>
              <span
                style={{
                  backgroundColor: quant.fulfillment_rate >= 100 ? '#dcfce7' : '#fef3c7',
                  color: quant.fulfillment_rate >= 100 ? '#15803d' : '#b45309',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: '800'
                }}
              >
                Fulfillment: {quant.fulfillment_rate || 0}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Contracted Qty</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{quant.contracted_qty || 0}</div>
              </div>

              <div style={{ backgroundColor: '#e0f2fe', padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>Physical Received</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>{quant.physical_received_qty || 0}</div>
              </div>

              <div style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>Virtual Pending</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#d97706', marginTop: '2px' }}>{quant.virtual_pending_qty || 0}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ backgroundColor: '#fee2e2', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>Shortages / Missing</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#dc2626', marginTop: '2px' }}>{quant.shortage_qty || 0}</div>
              </div>

              <div style={{ backgroundColor: '#fdf2f8', padding: '10px', borderRadius: '8px', border: '1px solid #fbcfe8', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9d174d', textTransform: 'uppercase' }}>Rejections Out</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#be185d', marginTop: '2px' }}>{quant.rejected_qty || 0}</div>
              </div>

              <div style={{ backgroundColor: '#ede9fe', padding: '10px', borderRadius: '8px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6d28d9', textTransform: 'uppercase' }}>Substituted Qty</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>{quant.substituted_qty || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Financial Reconciliation */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IndianRupee size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Financial Reconciliation
                </h3>
              </div>
              <span
                style={{
                  backgroundColor: Math.abs(fin.net_variance || 0) < 0.01 ? '#dcfce7' : fin.net_variance > 0 ? '#fee2e2' : '#f0fdf4',
                  color: Math.abs(fin.net_variance || 0) < 0.01 ? '#15803d' : fin.net_variance > 0 ? '#b91c1c' : '#15803d',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: '800'
                }}
              >
                Net Variance: {fin.net_variance >= 0 ? `+₹${parseFloat(fin.net_variance || 0).toFixed(2)}` : `-₹${Math.abs(fin.net_variance || 0).toFixed(2)}`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>PO Contracted Total</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>₹{parseFloat(fin.contracted_total || 0).toFixed(2)}</div>
              </div>

              <div style={{ backgroundColor: '#ede9fe', padding: '10px', borderRadius: '8px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6d28d9', textTransform: 'uppercase' }}>Final Invoiced Total</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>₹{parseFloat(fin.invoiced_total || 0).toFixed(2)}</div>
              </div>

              <div style={{ backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Freight & Incidental</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#334155', marginTop: '2px' }}>₹{(parseFloat(fin.freight_charges || 0) + parseFloat(fin.other_charges || 0)).toFixed(2)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>Total GST Tax Amount</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>₹{parseFloat(fin.tax_amount || 0).toFixed(2)}</div>
              </div>

              <div style={{ backgroundColor: '#dcfce7', padding: '10px', borderRadius: '8px', border: '1px solid #86efac', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Total Paid Amount</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>₹{parseFloat(fin.paid_amount || 0).toFixed(2)}</div>
              </div>

              <div style={{ backgroundColor: '#fff1f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecdd3', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9f1239', textTransform: 'uppercase' }}>Outstanding Balance</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#e11d48', marginTop: '2px' }}>₹{parseFloat(fin.balance_due || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Item Breakdown Audit Table */}
      <div
        className="table-container"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              Item-by-Item Quantitative & Price Variance Trail
            </h3>
            <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
              Comparison of original contracted items vs actual received/substituted goods and unit rate discrepancies.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4338ca', backgroundColor: '#e0e7ff', padding: '4px 12px', borderRadius: '999px' }}>
            {items.length} Line Items Audited
          </span>
        </div>

        <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', width: '55px', textAlign: 'center' }}>
                Sr. No.
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'left' }}>
                Contracted vs Received Product
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Ordered Qty
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Received Qty
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Shortage Qty
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                PO Unit Rate (₹)
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Invoiced Rate (₹)
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Unit Price Variance
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '12px 14px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Monetary Discrepancy (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const ordPrice = parseFloat(it.ordered_price ?? it.price ?? it.unit_price ?? 0);
              const invPrice = parseFloat(it.invoiced_price ?? ordPrice);
              const priceVar = parseFloat(it.price_variance ?? (invPrice - ordPrice) ?? 0);
              const monDisc = parseFloat(it.monetary_discrepancy ?? 0);
              const hasPriceVariance = Math.abs(priceVar) > 0.001;
              const hasQtyMismatch = (it.ordered_qty || 0) !== (it.received_qty || 0);

              return (
                <tr
                  key={it.id || idx}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: it.is_substituted ? '#fdf4ff' : idx % 2 === 0 ? '#ffffff' : '#fafafa'
                  }}
                >
                  {/* Sr. No. */}
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '0.85rem' }}>
                    {idx + 1}
                  </td>

                  {/* Contracted vs Received Product */}
                  <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                      {it.original_product_name || it.name || it.Product?.name || `Product #${idx + 1}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      SKU: {it.original_sku || it.sku || it.Product?.sku || '—'}
                    </div>

                    {it.is_substituted && (
                      <div
                        style={{
                          marginTop: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#fae8ff',
                          color: '#86198f',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                      >
                        <Layers size={13} />
                        Substituted with: {it.substitute_product_name || `Product ID ${it.substitute_product_id}`} (Qty: {it.substitute_qty} @ ₹{parseFloat(it.substitute_price || 0).toFixed(2)})
                      </div>
                    )}
                  </td>

                  {/* Ordered Qty */}
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#334155', fontSize: '0.88rem' }}>
                    {it.ordered_qty ?? it.qty ?? 0}
                  </td>

                  {/* Received Qty */}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        backgroundColor: hasQtyMismatch ? '#fef3c7' : '#dcfce7',
                        color: hasQtyMismatch ? '#b45309' : '#15803d'
                      }}
                    >
                      {it.received_qty ?? 0}
                    </span>
                  </td>

                  {/* Shortage Qty */}
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: (it.shortage_qty || 0) > 0 ? '#dc2626' : '#64748b', fontSize: '0.88rem' }}>
                    {it.shortage_qty || 0}
                  </td>

                  {/* PO Unit Rate */}
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#334155', fontSize: '0.88rem' }}>
                    ₹{ordPrice.toFixed(2)}
                  </td>

                  {/* Invoiced Rate */}
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.88rem' }}>
                    ₹{invPrice.toFixed(2)}
                  </td>

                  {/* Unit Price Variance */}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {hasPriceVariance ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          backgroundColor: priceVar > 0 ? '#fee2e2' : '#dcfce7',
                          color: priceVar > 0 ? '#b91c1c' : '#15803d'
                        }}
                      >
                        {priceVar > 0 ? `+₹${priceVar.toFixed(2)} Revised` : `-₹${Math.abs(priceVar).toFixed(2)} Discount`}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Exact Rate</span>
                    )}
                  </td>

                  {/* Monetary Discrepancy */}
                  <td
                    style={{
                      padding: '12px 14px',
                      textAlign: 'center',
                      fontWeight: '800',
                      fontSize: '0.88rem',
                      color: Math.abs(monDisc) < 0.01 ? '#15803d' : monDisc > 0 ? '#dc2626' : '#15803d'
                    }}
                  >
                    {monDisc >= 0 ? `+₹${monDisc.toFixed(2)}` : `-₹${Math.abs(monDisc).toFixed(2)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VarianceSummary;
