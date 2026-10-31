import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import StockViewSwitcher from '../components/StockViewSwitcher';
import ReconcileGapModal from '../components/ReconcileGapModal';
import VerifyPhysicalStockModal from '../components/VerifyPhysicalStockModal';
import Pagination from '../components/Pagination';
import { useStockView, STOCK_VIEWS } from '../context/StockViewContext';
import {
  Scale,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Building2,
  Package,
  IndianRupee,
  ShieldCheck,
  RotateCcw,
  ClipboardCheck
} from 'lucide-react';

const GapAnalysis = () => {
  const { showError } = useToast();
  const { stockView, setStockView } = useStockView();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    products: [],
    kpis: {
      total_physical: 0,
      total_virtual: 0,
      net_gap: 0,
      net_valuation: 0,
      compliance_score: 100
    }
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, BALANCED, EXCESS_PHYSICAL, EXCESS_VIRTUAL
  const [alertsOnly, setAlertsOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Reconciliation Modal state
  const [reconcileProduct, setReconcileProduct] = useState(null);

  // Physical Stock Audit Verification Modal State
  const [verifyAuditProduct, setVerifyAuditProduct] = useState(null);

  const fetchGapAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await api.get('/admin/stock/gap-analysis');
      } catch (err) {
        console.warn('Dedicated gap-analysis endpoint not responding, falling back to products list:', err);
        // Fallback: fetch products and compute live gaps
        const prodRes = await api.get('/admin/products');
        const prodList = prodRes.data?.data || prodRes.data || [];
        const mappedProducts = prodList.map((p) => {
          const physical = parseFloat(p.physical_stock ?? p.remaining_qty ?? 0);
          const virtual = parseFloat(p.virtual_stock ?? p.remaining_qty ?? 0);
          const gap = physical - virtual;
          const unitCost = parseFloat(p.purchase_price ?? p.unit_price ?? p.cost_price ?? 0);
          const valuation = gap * unitCost;
          const threshold = parseFloat(p.gap_threshold ?? 10);
          const isAlert = Math.abs(gap) >= threshold && gap !== 0;

          return {
            id: p.id,
            code: p.code || p.product_code || `P-${p.id}`,
            name: p.name || p.product_name,
            sku: p.sku || '—',
            category: p.category_name || p.group_name || p.Group?.name || 'General',
            unit_cost: unitCost,
            physical_stock: physical,
            virtual_stock: virtual,
            stock_gap: gap,
            gap_valuation: valuation,
            is_alert: isAlert,
            threshold
          };
        });

        const totalPhys = mappedProducts.reduce((acc, it) => acc + it.physical_stock, 0);
        const totalVirt = mappedProducts.reduce((acc, it) => acc + it.virtual_stock, 0);
        const netGap = totalPhys - totalVirt;
        const netVal = mappedProducts.reduce((acc, it) => acc + it.gap_valuation, 0);
        const balancedCount = mappedProducts.filter((p) => p.stock_gap === 0).length;
        const compScore = mappedProducts.length > 0 ? ((balancedCount / mappedProducts.length) * 100).toFixed(1) : 100;

        setData({
          products: mappedProducts,
          kpis: {
            total_physical: totalPhys,
            total_virtual: totalVirt,
            net_gap: netGap,
            net_valuation: netVal,
            compliance_score: parseFloat(compScore)
          }
        });
        setLoading(false);
        return;
      }

      if (res.data) {
        const payload = res.data.data || res.data;
        const rawProducts = Array.isArray(payload) ? payload : (payload.products || payload.items || []);
        const formatted = rawProducts.map((p) => {
          const phys = parseFloat(p.physical_stock ?? p.remaining_qty ?? 0);
          const virt = parseFloat(p.virtual_stock ?? p.remaining_qty ?? 0);
          const gap = parseFloat(p.stock_gap ?? (phys - virt));
          const cost = parseFloat(p.unit_cost ?? p.purchase_price ?? 0);
          const val = parseFloat(p.gap_valuation ?? (gap * cost));
          const isAlert = Boolean(p.is_alert || (Math.abs(gap) >= (p.threshold || 10) && gap !== 0));

          return {
            ...p,
            id: p.id || p.product_id,
            code: p.code || p.product_code || `PRD-${p.id}`,
            name: p.name || p.product_name,
            sku: p.sku || '—',
            category: p.category || p.category_name || 'General',
            unit_cost: cost,
            physical_stock: phys,
            virtual_stock: virt,
            stock_gap: gap,
            gap_valuation: val,
            is_alert: isAlert
          };
        });

        const kpis = payload.kpis || {
          total_physical: formatted.reduce((a, b) => a + b.physical_stock, 0),
          total_virtual: formatted.reduce((a, b) => a + b.virtual_stock, 0),
          net_gap: formatted.reduce((a, b) => a + b.stock_gap, 0),
          net_valuation: formatted.reduce((a, b) => a + b.gap_valuation, 0),
          compliance_score: formatted.length > 0
            ? ((formatted.filter((x) => x.stock_gap === 0).length / formatted.length) * 100).toFixed(1)
            : 100
        };

        setData({
          products: formatted,
          kpis: {
            total_physical: parseFloat(kpis.total_physical || 0),
            total_virtual: parseFloat(kpis.total_virtual || 0),
            net_gap: parseFloat(kpis.net_gap || 0),
            net_valuation: parseFloat(kpis.net_valuation || 0),
            compliance_score: parseFloat(kpis.compliance_score || 100)
          }
        });
      }
    } catch (err) {
      console.error('Failed to load gap analysis:', err);
      showError('Failed to load stock gap analysis report.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchGapAnalysis();
  }, [fetchGapAnalysis]);

  // Filtering
  const filteredProducts = useMemo(() => {
    return (data.products || []).filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q);

      let matchStatus = true;
      if (statusFilter === 'BALANCED') matchStatus = item.stock_gap === 0;
      else if (statusFilter === 'EXCESS_PHYSICAL') matchStatus = item.stock_gap > 0;
      else if (statusFilter === 'EXCESS_VIRTUAL') matchStatus = item.stock_gap < 0;

      const matchAlerts = !alertsOnly || item.is_alert;

      return matchSearch && matchStatus && matchAlerts;
    });
  }, [data.products, search, statusFilter, alertsOnly]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header Bar */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div
                style={{
                  backgroundColor: '#ede9fe',
                  color: '#4338ca',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Scale size={24} />
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Stock Gap & Live Reconciliation Analysis
              </h1>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
              Live audit comparison between warehouse Physical Ground Stock vs Government / GST Virtual Books.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <StockViewSwitcher compact={false} />
            <button
              type="button"
              onClick={fetchGapAnalysis}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Top KPI Cards (5 metrics) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Total Physical Stock */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #0284c7'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>
              Total Physical Stock
            </span>
            <Package size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {data.kpis.total_physical.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>units</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            Floor stock counted in warehouses
          </div>
        </div>

        {/* Total Virtual Stock */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #7c3aed'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6d28d9', textTransform: 'uppercase' }}>
              Total Virtual Stock
            </span>
            <Building2 size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {data.kpis.total_virtual.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>units</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            Official GST tax portal balance
          </div>
        </div>

        {/* Net Stock Gap */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: `4px solid ${data.kpis.net_gap === 0 ? '#10b981' : data.kpis.net_gap > 0 ? '#f59e0b' : '#ef4444'}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
              Net Stock Gap
            </span>
            <Scale size={18} color={data.kpis.net_gap === 0 ? '#10b981' : data.kpis.net_gap > 0 ? '#f59e0b' : '#ef4444'} />
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: '800',
              color: data.kpis.net_gap === 0 ? '#10b981' : data.kpis.net_gap > 0 ? '#d97706' : '#dc2626',
              marginTop: '6px'
            }}
          >
            {data.kpis.net_gap > 0 ? `+${data.kpis.net_gap.toLocaleString()}` : data.kpis.net_gap.toLocaleString()}{' '}
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>units</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {data.kpis.net_gap === 0 ? '100% Tax Compliant' : data.kpis.net_gap > 0 ? 'Ground excess inventory' : 'Govt excess books'}
          </div>
        </div>

        {/* Net Gap Valuation */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #f97316'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase' }}>
              Net Gap Valuation
            </span>
            <IndianRupee size={18} color="#f97316" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            ₹{Math.abs(data.kpis.net_valuation).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            Monetary discrepancy at unit cost
          </div>
        </div>

        {/* Compliance Health Score */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: `4px solid ${data.kpis.compliance_score >= 90 ? '#10b981' : data.kpis.compliance_score >= 70 ? '#f59e0b' : '#ef4444'}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
              Compliance Health
            </span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: '800',
              color: data.kpis.compliance_score >= 90 ? '#15803d' : data.kpis.compliance_score >= 70 ? '#d97706' : '#dc2626',
              marginTop: '6px'
            }}
          >
            {data.kpis.compliance_score}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            Balanced product ratio
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Product Name, Code, SKU..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: '600',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Gap Statuses</option>
            <option value="BALANCED">Balanced Only (Gap = 0)</option>
            <option value="EXCESS_PHYSICAL">Excess Physical (Floor &gt; Govt)</option>
            <option value="EXCESS_VIRTUAL">Excess Virtual (Govt &gt; Floor)</option>
          </select>

          {/* Alerts Only Toggle */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              border: alertsOnly ? '1px solid #fecaca' : '1px solid #e2e8f0',
              backgroundColor: alertsOnly ? '#fef2f2' : '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: alertsOnly ? '#dc2626' : '#475569'
            }}
          >
            <input
              type="checkbox"
              checked={alertsOnly}
              onChange={(e) => {
                setAlertsOnly(e.target.checked);
                setCurrentPage(1);
              }}
              style={{ cursor: 'pointer', accentColor: '#dc2626' }}
            />
            <span>⚠️ Alerts Only (Gap &ge; Threshold)</span>
          </label>
        </div>

        {(search || statusFilter !== 'ALL' || alertsOnly) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setAlertsOnly(false);
              setCurrentPage(1);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#64748b',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} /> Reset Filters
          </button>
        )}
      </div>

      {/* Main Gap Table */}
      <div
        className="table-container"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 360px)',
          position: 'relative'
        }}
      >
        <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', width: '60px', textAlign: 'center' }}>
                Sr. No.
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'left' }}>
                Product Code & Name
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                SKU & Category
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Unit Cost (₹)
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Physical Stock
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Virtual Stock
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Stock Gap
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Gap Valuation (₹)
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                Status Badge
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', minWidth: '210px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={24} className="spin-anim" style={{ margin: '0 auto 8px', display: 'block', color: '#4338ca' }} />
                  Loading gap analysis data...
                </td>
              </tr>
            ) : paginatedProducts.length > 0 ? (
              paginatedProducts.map((p, idx) => {
                const srNo = (currentPage - 1) * itemsPerPage + idx + 1;
                const isBalanced = p.stock_gap === 0;
                const isExcessPhys = p.stock_gap > 0;
                const isExcessVirt = p.stock_gap < 0;

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: p.is_alert ? '#fffbeb' : '#ffffff',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    {/* Sr. No. */}
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '0.88rem' }}>
                      {srNo}
                    </td>

                    {/* Product Code & Name */}
                    <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {p.is_alert && (
                          <span
                            title={`Alert: Discrepancy ${p.stock_gap} units exceeds threshold (${p.threshold || 10})`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#d97706',
                              animation: 'pulse 2s infinite'
                            }}
                          >
                            <AlertTriangle size={16} />
                          </span>
                        )}
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                            {p.code}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SKU & Category */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.85rem' }}>
                        {p.sku}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {p.category}
                      </div>
                    </td>

                    {/* Unit Cost */}
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#0f172a', fontSize: '0.88rem' }}>
                      ₹{parseFloat(p.unit_cost || 0).toFixed(2)}
                    </td>

                    {/* Physical Stock Badge */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd'
                        }}
                      >
                        <Package size={13} />
                        {p.physical_stock}
                      </span>
                    </td>

                    {/* Virtual Stock Badge */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          backgroundColor: '#f3e8ff',
                          color: '#6d28d9',
                          border: '1px solid #ddd6fe'
                        }}
                      >
                        <Building2 size={13} />
                        {p.virtual_stock}
                      </span>
                    </td>

                    {/* Stock Gap */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.92rem',
                          fontWeight: '800',
                          color: isBalanced ? '#16a34a' : isExcessPhys ? '#d97706' : '#dc2626'
                        }}
                      >
                        {isBalanced ? (
                          '0'
                        ) : isExcessPhys ? (
                          <>
                            <TrendingUp size={15} /> +{p.stock_gap}
                          </>
                        ) : (
                          <>
                            <TrendingDown size={15} /> {p.stock_gap}
                          </>
                        )}
                      </span>
                    </td>

                    {/* Gap Valuation */}
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: isBalanced ? '#64748b' : '#0f172a', fontSize: '0.88rem' }}>
                      ₹{Math.abs(p.gap_valuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {isBalanced ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0'
                          }}
                        >
                          <CheckCircle2 size={13} /> Balanced
                        </span>
                      ) : isExcessPhys ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a'
                          }}
                        >
                          +{p.stock_gap} Ground Excess
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca'
                          }}
                        >
                          {p.stock_gap} Govt Excess
                        </span>
                      )}
                    </td>

                    {/* Action Buttons: Verify Stock & Reconcile Gap */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setVerifyAuditProduct(p)}
                          title="Verify physical stock count to clear audit gate"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: p.audit_status === 'AUDITED' ? '1px solid #cbd5e1' : '1px solid #10b981',
                            backgroundColor: p.audit_status === 'AUDITED' ? '#f8fafc' : '#ecfdf5',
                            color: p.audit_status === 'AUDITED' ? '#475569' : '#047857',
                            fontWeight: '700',
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <ClipboardCheck size={13} color={p.audit_status === 'AUDITED' ? '#64748b' : '#059669'} />
                          {p.audit_status === 'AUDITED' ? 'Audited' : 'Verify Stock'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setReconcileProduct(p)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: isBalanced ? '1px solid #cbd5e1' : '1px solid #6366f1',
                            backgroundColor: isBalanced ? '#f8fafc' : '#4338ca',
                            color: isBalanced ? '#475569' : '#ffffff',
                            fontWeight: '700',
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            boxShadow: isBalanced ? 'none' : '0 1px 3px rgba(67, 56, 202, 0.25)',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Scale size={13} />
                          Reconcile
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                  No stock gap records found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && filteredProducts.length > itemsPerPage && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Reconcile Gap Modal */}
      {reconcileProduct && (
        <ReconcileGapModal
          product={reconcileProduct}
          isOpen={!!reconcileProduct}
          onClose={() => setReconcileProduct(null)}
          onSuccess={fetchGapAnalysis}
        />
      )}

      {/* Verify Physical Stock Modal */}
      {verifyAuditProduct && (
        <VerifyPhysicalStockModal
          product={verifyAuditProduct}
          isOpen={!!verifyAuditProduct}
          onClose={() => setVerifyAuditProduct(null)}
          onSuccess={fetchGapAnalysis}
        />
      )}
    </div>
  );
};

export default GapAnalysis;
