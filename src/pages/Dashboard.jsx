import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Banknote,
  FileSpreadsheet,
  Receipt,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  ShoppingCart
} from 'lucide-react';
import InventoryDashboardTab from '../components/dashboard/InventoryDashboardTab';
import AccountingDashboardTab from '../components/dashboard/AccountingDashboardTab';
import ReportingTaxesDashboardTab from '../components/dashboard/ReportingTaxesDashboardTab';

const Dashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Active Dashboard Mode: 'inventory' | 'accounting' | 'reporting_taxes'
  const [activeTab, setActiveTab] = useState('inventory');

  // Shared Data States
  const [stats, setStats] = useState(null);
  const [salesOrders, setSalesOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Inventory tab sub-modes
  const [barChartMode, setBarChartMode] = useState('velocity'); // 'velocity' | 'reorder' | 'warehouse'
  const [pieChartMode, setPieChartMode] = useState('health'); // 'health' | 'warehouse'

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const canViewSales = hasPermission('sales_orders', 'view');
      const canViewPurchases = hasPermission('purchase_orders', 'view');

      const [dashRes, salesRes, purchasesRes] = await Promise.allSettled([
        api.get('/admin/dashboard'),
        canViewSales ? api.get('/admin/sales') : Promise.resolve({ data: [] }),
        canViewPurchases ? api.get('/admin/purchases') : Promise.resolve({ data: [] })
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
        setStats(dashRes.value.data.data);
      }
      if (salesRes.status === 'fulfilled') {
        const salesData = salesRes.value.data?.data || salesRes.value.data;
        if (Array.isArray(salesData)) {
          setSalesOrders(salesData);
        }
      }
      if (purchasesRes.status === 'fulfilled') {
        const purchasesData = purchasesRes.value.data?.data || purchasesRes.value.data;
        if (Array.isArray(purchasesData)) {
          setPurchaseOrders(purchasesData);
        }
      }

      setLastRefreshed(new Date());
      setLoading(false);
    } catch (error) {
      console.error("Dashboard data sync error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (stats?.fastMovingProducts && stats.fastMovingProducts.length === 0 && stats?.topLowStockProducts && stats.topLowStockProducts.length > 0) {
      setBarChartMode('reorder');
    }
  }, [stats]);

  const totalSalesRevenue = useMemo(() => {
    if (stats?.revenue && stats.revenue !== '₹0.00' && stats.revenue !== '₹0') return stats.revenue;
    const sum = salesOrders.reduce((acc, order) => {
      const val = parseFloat(order.total_amount || order.total_sales || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    return '₹' + sum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [stats?.revenue, salesOrders]);

  if (loading && !stats) {
    return (
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '60px 24px'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          border: '1px solid #bfdbfe'
        }}>
          <RefreshCw size={22} className="animate-spin" color="#2563eb" />
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
          Loading Enterprise Intelligence
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>
          Syncing inventory valuation, financial ledgers, and tax compliance data...
        </p>
      </div>
    );
  }

  const belowReorderCount = stats?.productsBelowReorder || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#0f172a', paddingBottom: '24px' }}>

      {/* ── CARD HOVER ANIMATIONS ── */}
      <style>{`
        .dash-lift-card {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease !important;
          will-change: transform, box-shadow;
        }
        .dash-lift-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 10px 22px -4px rgba(15, 23, 42, 0.1), 0 4px 8px -2px rgba(15, 23, 42, 0.04) !important;
        }
        .dash-lift-subtle {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease !important;
          will-change: transform, box-shadow;
        }
        .dash-lift-subtle:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 18px -4px rgba(15, 23, 42, 0.08) !important;
        }
        .dash-lift-item {
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease !important;
        }
        .dash-lift-item:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 10px -2px rgba(15, 23, 42, 0.08) !important;
        }
      `}</style>

      {/* ── TOP CONTROL BAR ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '1px 7px',
              borderRadius: '5px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#334155', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                ENTERPRISE SUITE LIVE
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              • Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Executive Enterprise Intelligence
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.74rem', fontWeight: '400' }}>
            Unified dashboard across inventory stock velocity, financial ledgers, and statutory tax compliance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/inventory?filter=reorder')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontWeight: '700',
              fontSize: '0.75rem',
              borderRadius: '6px',
              backgroundColor: belowReorderCount > 0 ? '#fef2f2' : '#f8fafc',
              color: belowReorderCount > 0 ? '#b91c1c' : '#475569',
              border: belowReorderCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <AlertTriangle size={13} color={belowReorderCount > 0 ? '#dc2626' : '#94a3b8'} />
            <span>Reorder Queue</span>
            <span style={{
              backgroundColor: belowReorderCount > 0 ? '#dc2626' : '#cbd5e1',
              color: '#ffffff',
              padding: '0 6px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: '800'
            }}>
              {belowReorderCount}
            </span>
          </button>

          <button
            onClick={fetchDashboardData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              color: '#334155',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              transition: 'all 0.15s ease'
            }}
            title="Refresh All Dashboards"
          >
            <RefreshCw size={12} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── 3 PRIMARY DASHBOARD SEPARATE TABS (INDEPENDENT STANDALONE CARDS) ── */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'stretch'
        }}
      >
        {/* Tab 1: Inventory Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className="dash-lift-subtle"
          style={{
            flex: '1 1 260px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: activeTab === 'inventory' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'inventory' ? '#eff6ff' : '#ffffff',
            color: activeTab === 'inventory' ? '#1d4ed8' : '#334155',
            cursor: 'pointer',
            boxShadow: activeTab === 'inventory'
              ? '0 4px 12px rgba(37, 99, 235, 0.12)'
              : '0 1px 3px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.18s ease',
            outline: 'none'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'inventory' ? '#dbeafe' : '#f1f5f9',
              color: activeTab === 'inventory' ? '#2563eb' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Package size={19} />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: '0.92rem', fontWeight: '800', lineHeight: 1.2, color: activeTab === 'inventory' ? '#1d4ed8' : '#0f172a' }}>
              Inventory Intelligence
            </div>
            <div style={{ fontSize: '0.72rem', color: activeTab === 'inventory' ? '#3b82f6' : '#64748b', marginTop: '2px' }}>
              Stock, Valuation & Logistics
            </div>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: '700',
              backgroundColor: activeTab === 'inventory' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'inventory' ? '#ffffff' : '#64748b',
              border: activeTab === 'inventory' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            {stats?.totalProducts || 0} items
          </span>
        </button>

        {/* Tab 2: Accounting Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('accounting')}
          className="dash-lift-subtle"
          style={{
            flex: '1 1 260px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: activeTab === 'accounting' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'accounting' ? '#eef2ff' : '#ffffff',
            color: activeTab === 'accounting' ? '#4338ca' : '#334155',
            cursor: 'pointer',
            boxShadow: activeTab === 'accounting'
              ? '0 4px 12px rgba(79, 70, 229, 0.12)'
              : '0 1px 3px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.18s ease',
            outline: 'none'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'accounting' ? '#e0e7ff' : '#f1f5f9',
              color: activeTab === 'accounting' ? '#4f46e5' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Banknote size={19} />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: '0.92rem', fontWeight: '800', lineHeight: 1.2, color: activeTab === 'accounting' ? '#4338ca' : '#0f172a' }}>
              Accounting & Financials
            </div>
            <div style={{ fontSize: '0.72rem', color: activeTab === 'accounting' ? '#6366f1' : '#64748b', marginTop: '2px' }}>
              Cash Flow, AR / AP Ledgers
            </div>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: '700',
              backgroundColor: activeTab === 'accounting' ? '#4f46e5' : '#f1f5f9',
              color: activeTab === 'accounting' ? '#ffffff' : '#64748b',
              border: activeTab === 'accounting' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            {totalSalesRevenue}
          </span>
        </button>

        {/* Tab 3: Reporting & Taxes Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('reporting_taxes')}
          className="dash-lift-subtle"
          style={{
            flex: '1 1 260px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: activeTab === 'reporting_taxes' ? '2px solid #059669' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'reporting_taxes' ? '#ecfdf5' : '#ffffff',
            color: activeTab === 'reporting_taxes' ? '#047857' : '#334155',
            cursor: 'pointer',
            boxShadow: activeTab === 'reporting_taxes'
              ? '0 4px 12px rgba(5, 150, 105, 0.12)'
              : '0 1px 3px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.18s ease',
            outline: 'none'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'reporting_taxes' ? '#d1fae5' : '#f1f5f9',
              color: activeTab === 'reporting_taxes' ? '#059669' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Receipt size={19} />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: '0.92rem', fontWeight: '800', lineHeight: 1.2, color: activeTab === 'reporting_taxes' ? '#047857' : '#0f172a' }}>
              Reporting & Taxes (GST)
            </div>
            <div style={{ fontSize: '0.72rem', color: activeTab === 'reporting_taxes' ? '#10b981' : '#64748b', marginTop: '2px' }}>
              Output Tax, ITC, GSTR-1 & 2B
            </div>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: '700',
              backgroundColor: activeTab === 'reporting_taxes' ? '#059669' : '#f1f5f9',
              color: activeTab === 'reporting_taxes' ? '#ffffff' : '#64748b',
              border: activeTab === 'reporting_taxes' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            Audit Ready
          </span>
        </button>
      </div>

      {/* ── ACTIVE TAB CONTENT ── */}
      {activeTab === 'inventory' && (
        <InventoryDashboardTab
          stats={stats}
          barChartMode={barChartMode}
          setBarChartMode={setBarChartMode}
          pieChartMode={pieChartMode}
          setPieChartMode={setPieChartMode}
        />
      )}

      {activeTab === 'accounting' && (
        <AccountingDashboardTab
          salesOrders={salesOrders}
          purchaseOrders={purchaseOrders}
          loading={loading}
          onRefresh={fetchDashboardData}
        />
      )}

      {activeTab === 'reporting_taxes' && (
        <ReportingTaxesDashboardTab
          salesOrders={salesOrders}
          purchaseOrders={purchaseOrders}
          loading={loading}
          onRefresh={fetchDashboardData}
        />
      )}

    </div>
  );
};

export default Dashboard;
