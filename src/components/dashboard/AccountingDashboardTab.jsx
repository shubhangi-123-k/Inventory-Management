import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShoppingCart,
  Building2,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ExternalLink,
  Layers,
  Banknote
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import Pagination from '../Pagination';

const AccountingDashboardTab = ({
  salesOrders = [],
  purchaseOrders = [],
  expenses = [],
  loading = false,
  onRefresh
}) => {
  const navigate = useNavigate();

  // Ledger Filter states
  const [activeLedger, setActiveLedger] = useState('receivables'); // 'receivables' | 'payables'
  const [searchLedger, setSearchLedger] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'Paid' | 'Pending' | 'Partial'

  // Pagination for ledgers
  const [arPage, setArPage] = useState(1);
  const [apPage, setApPage] = useState(1);
  const itemsPerPage = 8;

  // ── 1. FINANCIAL KPI CALCULATIONS ──
  const totalRevenue = useMemo(() => {
    return salesOrders.reduce((acc, order) => {
      const val = parseFloat(order.total_amount || order.total_sales || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [salesOrders]);

  const totalProcurement = useMemo(() => {
    return purchaseOrders.reduce((acc, po) => {
      const val = parseFloat(po.total_amount || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [purchaseOrders]);

  const grossProfit = totalRevenue - totalProcurement;
  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Accounts Receivable (AR): Unpaid/Pending amounts from sales
  const receivables = useMemo(() => {
    return salesOrders.reduce((acc, order) => {
      const status = (order.payment_status || '').toLowerCase();
      const val = parseFloat(order.total_amount || order.total_sales || 0);
      if (status === 'pending') {
        return acc + val;
      } else if (status === 'partial') {
        return acc + (val * 0.5); // Estimate 50% pending if partial
      }
      return acc;
    }, 0);
  }, [salesOrders]);

  // Accounts Payable (AP): Pending supplier amounts
  const payables = useMemo(() => {
    return purchaseOrders.reduce((acc, po) => {
      const total = parseFloat(po.total_amount || 0);
      const paid = parseFloat(po.total_paid || 0);
      const due = Math.max(0, total - paid);
      return acc + due;
    }, 0);
  }, [purchaseOrders]);

  // Realized Net Cash Inflow (Paid sales minus paid purchases)
  const realizedSales = useMemo(() => {
    return salesOrders.reduce((acc, order) => {
      const status = (order.payment_status || '').toLowerCase();
      const val = parseFloat(order.total_amount || order.total_sales || 0);
      if (status === 'paid') return acc + val;
      if (status === 'partial') return acc + (val * 0.5);
      return acc;
    }, 0);
  }, [salesOrders]);

  const realizedPurchases = useMemo(() => {
    return purchaseOrders.reduce((acc, po) => {
      const paid = parseFloat(po.total_paid || 0);
      return acc + (isNaN(paid) ? 0 : paid);
    }, 0);
  }, [purchaseOrders]);

  const netCashFlow = realizedSales - realizedPurchases;

  // ── 2. CHARTS DATA PREPARATION ──
  // Cash Flow Breakdown Bar Chart (Real monthly dynamic data)
  const cashFlowChartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        label: monthNames[d.getMonth()]
      });
    }

    return last6Months.map(({ year, monthIndex, label }) => {
      const monthSales = salesOrders.reduce((sum, order) => {
        const orderDateStr = order.so_date || order.date || order.created_at || order.createdAt;
        if (!orderDateStr) return sum;
        const od = new Date(orderDateStr);
        if (od.getFullYear() === year && od.getMonth() === monthIndex) {
          const val = parseFloat(order.total_amount || order.total_sales || 0);
          return sum + (isNaN(val) ? 0 : val);
        }
        return sum;
      }, 0);

      const monthPurchases = purchaseOrders.reduce((sum, po) => {
        const poDateStr = po.po_date || po.date || po.created_at || po.createdAt;
        if (!poDateStr) return sum;
        const pd = new Date(poDateStr);
        if (pd.getFullYear() === year && pd.getMonth() === monthIndex) {
          const val = parseFloat(po.total_amount || 0);
          return sum + (isNaN(val) ? 0 : val);
        }
        return sum;
      }, 0);

      return {
        month: label,
        Revenue: Math.round(monthSales),
        Purchases: Math.round(monthPurchases),
        NetProfit: Math.round(monthSales - monthPurchases)
      };
    });
  }, [salesOrders, purchaseOrders]);

  // Payment Status Pie Chart (Real live payment status counts)
  const paymentStatusData = useMemo(() => {
    const paidCount = salesOrders.filter(o => (o.payment_status || '').toLowerCase() === 'paid').length;
    const pendingCount = salesOrders.filter(o => (o.payment_status || '').toLowerCase() === 'pending').length;
    const partialCount = salesOrders.filter(o => (o.payment_status || '').toLowerCase() === 'partial').length;
    
    return [
      { name: 'Paid / Cleared', value: paidCount, color: '#10b981' },
      { name: 'Pending / Due', value: pendingCount, color: '#f59e0b' },
      { name: 'Partial Settled', value: partialCount, color: '#6366f1' }
    ].filter(item => item.value > 0);
  }, [salesOrders]);

  // ── 3. FILTERED LEDGERS DATA ──
  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter((order) => {
      const q = searchLedger.toLowerCase();
      const soNum = (order.so_number || `SO${order.id}`).toLowerCase();
      const cust = (order.customer?.name || order.customer_name || '').toLowerCase();
      const matchesSearch = !q || soNum.includes(q) || cust.includes(q);
      const matchesPmt = paymentFilter === 'all' || (order.payment_status || '').toLowerCase() === paymentFilter.toLowerCase();
      return matchesSearch && matchesPmt;
    });
  }, [salesOrders, searchLedger, paymentFilter]);

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = searchLedger.toLowerCase();
      const poNum = (po.po_number || po.po_id || `PO${po.id}`).toLowerCase();
      const supp = (po.supplier?.name || po.Supplier?.name || '').toLowerCase();
      const matchesSearch = !q || poNum.includes(q) || supp.includes(q);
      const matchesPmt = paymentFilter === 'all' || (po.pmt_status || '').toLowerCase() === paymentFilter.toLowerCase();
      return matchesSearch && matchesPmt;
    });
  }, [purchaseOrders, searchLedger, paymentFilter]);

  const paginatedAr = useMemo(() => {
    const start = (arPage - 1) * itemsPerPage;
    return filteredSalesOrders.slice(start, start + itemsPerPage);
  }, [filteredSalesOrders, arPage]);

  const paginatedAp = useMemo(() => {
    const start = (apPage - 1) * itemsPerPage;
    return filteredPurchaseOrders.slice(start, start + itemsPerPage);
  }, [filteredPurchaseOrders, apPage]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#0f172a' }}>

      {/* ── 1. ACCOUNTING EXECUTIVE HEADER ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.68rem',
                fontWeight: '700',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                border: '1px solid #bfdbfe'
              }}
            >
              <Banknote size={12} />
              FINANCIAL LEDGER & CASH FLOW
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              • Double-Entry Enterprise Reconciliation
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Accounting & Fiscal Overview
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.76rem' }}>
            Live tracking of gross billings, supplier payables, realized cash margins, and debtor settlements
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/sales/new')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '6px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={13} />
            <span>New Sales Invoice</span>
          </button>

          <button
            onClick={() => navigate('/purchases?action=new')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontWeight: '600',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ShoppingCart size={13} />
            <span>New Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* ── 2. SIX FINANCIAL KPI TILES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>

        {/* 1. Gross Sales Revenue */}
        <div
          className="dash-lift-card"
          onClick={() => navigate('/sales')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #10b981',
            borderRadius: '8px',
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>
              Gross Sales Revenue
            </span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div style={{ margin: '4px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
            <span>{salesOrders.length} Sales Invoices</span>
            <ArrowUpRight size={12} color="#10b981" />
          </div>
        </div>

        {/* 2. Procurement Spend */}
        <div
          className="dash-lift-card"
          onClick={() => navigate('/purchases')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '8px',
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' }}>
              Procurement (COGS)
            </span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={14} />
            </div>
          </div>
          <div style={{ margin: '4px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {formatCurrency(totalProcurement)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
            <span>{purchaseOrders.length} Purchase Orders</span>
            <ArrowUpRight size={12} color="#3b82f6" />
          </div>
        </div>

        {/* 3. Gross Profit & Margin */}
        <div
          className="dash-lift-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: `3px solid ${grossProfit >= 0 ? '#6366f1' : '#ef4444'}`,
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: grossProfit >= 0 ? '#4338ca' : '#b91c1c', textTransform: 'uppercase' }}>
              Gross Margin ({grossMarginPct}%)
            </span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={14} />
            </div>
          </div>
          <div style={{ margin: '4px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: grossProfit >= 0 ? '#0f172a' : '#b91c1c', lineHeight: 1 }}>
              {formatCurrency(grossProfit)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: grossProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
            <span>Net Operating Spread</span>
            <span>{grossProfit >= 0 ? '+Surplus' : '-Deficit'}</span>
          </div>
        </div>

        {/* 4. Accounts Receivable (AR) */}
        <div
          className="dash-lift-card"
          onClick={() => { setActiveLedger('receivables'); setPaymentFilter('Pending'); }}
          style={{
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderTop: '3px solid #f59e0b',
            borderRadius: '8px',
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>
              Accounts Receivable (AR)
            </span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={14} />
            </div>
          </div>
          <div style={{ margin: '4px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b45309', lineHeight: 1 }}>
              {formatCurrency(receivables)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#b45309', fontWeight: '600' }}>
            <span>Customer Pending Due</span>
            <ArrowUpRight size={12} color="#b45309" />
          </div>
        </div>

        {/* 5. Accounts Payable (AP) */}
        <div
          className="dash-lift-card"
          onClick={() => { setActiveLedger('payables'); setPaymentFilter('Pending'); }}
          style={{
            background: '#ffffff',
            border: '1px solid #fecaca',
            borderTop: '3px solid #ef4444',
            borderRadius: '8px',
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>
              Accounts Payable (AP)
            </span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={14} />
            </div>
          </div>
          <div style={{ margin: '4px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b91c1c', lineHeight: 1 }}>
              {formatCurrency(payables)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#b91c1c', fontWeight: '600' }}>
            <span>Supplier Bills Due</span>
            <ArrowUpRight size={12} color="#ef4444" />
          </div>
        </div>

        {/* 6. Net Realized Cash Flow */}
        <div
          className="dash-lift-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #0284c7',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>
              Realized Cash Spread
            </span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={14} />
            </div>
          </div>
          <div style={{ margin: '4px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {formatCurrency(netCashFlow)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#0284c7', fontWeight: '600' }}>
            <span>Collected vs Paid Out</span>
            <CheckCircle2 size={12} color="#0284c7" />
          </div>
        </div>

      </div>

      {/* ── 3. VISUAL FINANCIAL CHARTS (REVENUE VS PURCHASES & PAYMENT HEALTH) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>

        {/* Left Chart: Cash Inflow vs Outflow Trend */}
        <div
          className="dash-lift-subtle"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} color="#4f46e5" />
                Revenue vs Procurement Trends
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                Monthly sales billings compared against inventory purchase expenditures
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
              FY 2026-27
            </span>
          </div>

          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowChartData} margin={{ top: 6, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '0.78rem', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '6px' }} />
                <Bar dataKey="Revenue" name="Sales Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} minPointSize={12} />
                <Bar dataKey="Purchases" name="Purchases Spend" fill="#06b6d4" radius={[4, 4, 0, 0]} minPointSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Payment Collections Health Donut */}
        <div
          className="dash-lift-subtle"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={16} color="#10b981" />
                Payment Collection Health
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                Settlement distribution of customer invoice payment statuses
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#10b981', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
              Real-time
            </span>
          </div>

          {paymentStatusData.length === 0 ? (
            <div style={{
              height: '150px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '0.8rem',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px dashed #e2e8f0',
              margin: '6px 0'
            }}>
              <CreditCard size={24} style={{ marginBottom: '6px', opacity: 0.6 }} />
              <span>No customer invoice payments recorded yet</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} Invoices`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '0.78rem', border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend row */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                {paymentStatusData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#334155' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                    <span>{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── 4. FINANCIAL LEDGER TABLES (RECEIVABLES & PAYABLES WITH PAGINATION) ── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        {/* Ledger Navigation Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Tabs for Receivables vs Payables */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => { setActiveLedger('receivables'); setArPage(1); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                border: activeLedger === 'receivables' ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                backgroundColor: activeLedger === 'receivables' ? '#4f46e5' : '#ffffff',
                color: activeLedger === 'receivables' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              <FileText size={14} />
              <span>Accounts Receivable (Sales)</span>
              <span
                style={{
                  backgroundColor: activeLedger === 'receivables' ? '#6366f1' : '#e2e8f0',
                  color: activeLedger === 'receivables' ? '#ffffff' : '#475569',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '0.7rem'
                }}
              >
                {filteredSalesOrders.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveLedger('payables'); setApPage(1); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                border: activeLedger === 'payables' ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                backgroundColor: activeLedger === 'payables' ? '#4f46e5' : '#ffffff',
                color: activeLedger === 'payables' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              <ShoppingCart size={14} />
              <span>Accounts Payable (Purchases)</span>
              <span
                style={{
                  backgroundColor: activeLedger === 'payables' ? '#6366f1' : '#e2e8f0',
                  color: activeLedger === 'payables' ? '#ffffff' : '#475569',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '0.7rem'
                }}
              >
                {filteredPurchaseOrders.length}
              </span>
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchLedger}
                onChange={(e) => setSearchLedger(e.target.value)}
                placeholder="Search ledger..."
                style={{
                  padding: '6px 10px 6px 30px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  width: '180px'
                }}
              />
            </div>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
        </div>

        {/* ── Table View: Receivables (Sales Orders) ── */}
        {activeLedger === 'receivables' && (
          <div>
            <div className="table-container" style={{ margin: 0, maxHeight: '380px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
                    <th style={{ width: '60px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Sr. No.</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Invoice / SO ID</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Date</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Customer Name</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Bill Value</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Payment Status</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Order Status</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading receivables ledger...</td></tr>
                  ) : paginatedAr.length > 0 ? (
                    paginatedAr.map((order, index) => {
                      const soNum = order.so_number || `SO${String(order.id).padStart(6, '0')}`;
                      const custName = order.customer?.name || order.Customer?.name || order.customer_name || 'Walk-in Client';
                      const isPaid = (order.payment_status || '').toLowerCase() === 'paid';
                      return (
                        <tr key={order.id}>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                            {(arPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td style={{ fontWeight: '700', color: '#4f46e5', fontFamily: 'monospace', textAlign: 'center', verticalAlign: 'middle' }}>
                            {soNum}
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.82rem', textAlign: 'center', verticalAlign: 'middle' }}>
                            {order.date || order.so_date || '—'}
                          </td>
                          <td style={{ fontWeight: '600', color: '#0f172a', textAlign: 'center', verticalAlign: 'middle' }}>
                            {custName}
                          </td>
                          <td style={{ fontWeight: '700', color: '#0f172a', textAlign: 'center', verticalAlign: 'middle' }}>
                            {formatCurrency(order.total_amount || order.total_sales)}
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                backgroundColor: isPaid ? '#dcfce7' : '#fef3c7',
                                color: isPaid ? '#15803d' : '#b45309',
                                display: 'inline-block'
                              }}
                            >
                              {order.payment_status || 'Pending'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '500' }}>
                              {order.status || 'Confirmed'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <button
                              onClick={() => navigate(`/sales/${order.id}`)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#4f46e5',
                                fontWeight: '600',
                                fontSize: '0.78rem',
                                cursor: 'pointer'
                              }}
                            >
                              <span>View</span>
                              <ChevronRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No receivable invoices match the active filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={arPage}
              totalItems={filteredSalesOrders.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setArPage}
            />
          </div>
        )}

        {/* ── Table View: Payables (Purchase Orders) ── */}
        {activeLedger === 'payables' && (
          <div>
            <div className="table-container" style={{ margin: 0, maxHeight: '380px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
                    <th style={{ width: '60px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Sr. No.</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>PO Number</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Date</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Supplier / Vendor</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Total Bill</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Paid Amount</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Balance Due</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#2c3e50', color: '#ffffff' }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading payables ledger...</td></tr>
                  ) : paginatedAp.length > 0 ? (
                    paginatedAp.map((po, index) => {
                      const poNum = po.po_number || po.po_id || `PO${String(po.id).padStart(5, '0')}`;
                      const suppName = po.supplier?.name || po.Supplier?.name || 'Standard Vendor';
                      const total = parseFloat(po.total_amount || 0);
                      const paid = parseFloat(po.total_paid || 0);
                      const due = Math.max(0, total - paid);
                      const isPaid = (po.pmt_status || '').toLowerCase() === 'paid';

                      return (
                        <tr key={po.id}>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                            {(apPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td style={{ fontWeight: '700', color: '#2563eb', fontFamily: 'monospace', textAlign: 'center', verticalAlign: 'middle' }}>
                            {poNum}
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.82rem', textAlign: 'center', verticalAlign: 'middle' }}>
                            {po.date || '—'}
                          </td>
                          <td style={{ fontWeight: '600', color: '#0f172a', textAlign: 'center', verticalAlign: 'middle' }}>
                            {suppName}
                          </td>
                          <td style={{ fontWeight: '700', color: '#0f172a', textAlign: 'center', verticalAlign: 'middle' }}>
                            {formatCurrency(total)}
                          </td>
                          <td style={{ color: '#16a34a', fontWeight: '600', textAlign: 'center', verticalAlign: 'middle' }}>
                            {formatCurrency(paid)}
                          </td>
                          <td style={{ color: due > 0 ? '#b91c1c' : '#64748b', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>
                            {formatCurrency(due)}
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                backgroundColor: isPaid ? '#dcfce7' : '#fef2f2',
                                color: isPaid ? '#15803d' : '#b91c1c',
                                display: 'inline-block'
                              }}
                            >
                              {po.pmt_status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No payable bills match the current filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={apPage}
              totalItems={filteredPurchaseOrders.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setApPage}
            />
          </div>
        )}

      </div>

    </div>
  );
};

export default AccountingDashboardTab;
