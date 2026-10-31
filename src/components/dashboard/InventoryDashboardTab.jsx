import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  Warehouse,
  CheckCircle2,
  RefreshCw,
  Truck,
  Flame,
  Activity,
  Banknote,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  ArrowUpRight,
  ChevronRight,
  SlidersHorizontal,
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

const InventoryDashboardTab = ({
  stats,
  barChartMode,
  setBarChartMode,
  pieChartMode,
  setPieChartMode
}) => {
  const navigate = useNavigate();

  const totalProducts = stats?.totalProducts || 0;
  const criticalCount = stats?.criticalStockProducts || 0;
  const belowReorderCount = stats?.productsBelowReorder || 0;
  const lowCount = stats?.lowStockProducts || 0;
  const pendingPRs = stats?.pendingPurchaseRequests || 0;
  const pendingInbound = stats?.pendingInboundOrders || 0;

  // Pie chart datasets
  const healthyCount = Math.max(0, totalProducts - belowReorderCount - criticalCount);
  const stockHealthPieData = [
    { name: 'Optimal Buffer', value: healthyCount, color: '#10b981', code: 'HEALTHY' },
    { name: 'Below Reorder', value: belowReorderCount, color: '#f59e0b', code: 'REORDER' },
    { name: 'Critical Stock', value: criticalCount, color: '#ef4444', code: 'CRITICAL' },
  ].filter(item => item.value > 0);

  const warehousePalette = ['#2563eb', '#0284c7', '#0d9488', '#6366f1', '#8b5cf6', '#d97706', '#ec4899'];
  const warehousePieData = (stats?.warehouseWiseLowStock || [])
    .map((w, idx) => ({
      name: w.warehouse || `Facility ${idx + 1}`,
      value: Number(w.low_stock_count || 0),
      color: warehousePalette[idx % warehousePalette.length],
      code: 'WAREHOUSE'
    }))
    .filter(item => item.value > 0);

  const activePieData = pieChartMode === 'health'
    ? (stockHealthPieData.length > 0 ? stockHealthPieData : (totalProducts > 0 ? [{ name: 'Catalog Active', value: totalProducts, color: '#2563eb', code: 'HEALTHY' }] : []))
    : warehousePieData;

  // Bar chart datasets
  let barChartData = [];
  if (barChartMode === 'velocity') {
    barChartData = (stats?.fastMovingProducts || []).map(p => ({
      name: p.name && p.name.length > 22 ? p.name.slice(0, 20) + '…' : (p.name || 'Item'),
      fullName: p.name,
      sold: Number(p.total_sold_30_days || 0),
      stock: Number(p.current_stock || 0),
      revenue: Number(p.revenue || 0),
      avgDailySales: p.avg_daily_sales || 0
    }));
  } else if (barChartMode === 'reorder') {
    barChartData = (stats?.topLowStockProducts || []).map(p => ({
      name: p.name && p.name.length > 22 ? p.name.slice(0, 20) + '…' : (p.name || 'Item'),
      fullName: p.name,
      stock: Number(p.current_stock || 0),
      reorderLevel: Number(p.reorder_level || 0),
      reorderQty: Number(p.reorder_qty || 0),
      warehouse: p.warehouse_name || 'N/A'
    }));
  } else if (barChartMode === 'warehouse') {
    barChartData = (stats?.warehouseWiseLowStock || []).map(w => ({
      name: w.warehouse && w.warehouse.length > 22 ? w.warehouse.slice(0, 20) + '…' : (w.warehouse || 'Facility'),
      fullName: w.warehouse,
      lowStockCount: Number(w.low_stock_count || 0)
    }));
  }

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getActionBadgeStyle = (action) => {
    switch (action) {
      case 'CREATE':
        return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'CREATE' };
      case 'UPDATE':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'UPDATE' };
      case 'DELETE':
        return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'DELETE' };
      case 'STOCK_ADJUSTMENT':
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'ADJUST' };
      case 'STATUS_CHANGE':
        return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', label: 'STATUS' };
      default:
        return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: action || 'EVENT' };
    }
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
          border: '1px solid #1e293b',
          fontSize: '0.8rem',
          minWidth: '220px',
          zIndex: 9999
        }}>
          <div style={{ fontWeight: '700', color: '#ffffff', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
            {data.fullName || label}
          </div>
          {payload.map((entry, index) => {
            const dotColor = entry.dataKey === 'sold'
              ? '#3b82f6'
              : entry.dataKey === 'stock'
                ? (barChartMode === 'reorder' ? '#ef4444' : '#10b981')
                : entry.dataKey === 'reorderLevel'
                  ? '#f59e0b'
                  : '#8b5cf6';
            return (
              <div key={`item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }} />
                  {entry.name}:
                </span>
                <strong style={{ color: '#ffffff', fontWeight: '700' }}>
                  {entry.value?.toLocaleString('en-IN')} units
                </strong>
              </div>
            );
          })}
          {data.revenue !== undefined && barChartMode === 'velocity' && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #334155', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>Sales Revenue:</span>
              <strong style={{ color: '#34d399', fontWeight: '700' }}>
                ₹{Number(data.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          )}
          {data.avgDailySales !== undefined && barChartMode === 'velocity' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              <span>Demand Rate:</span>
              <strong style={{ color: '#38bdf8' }}>~{data.avgDailySales} / day</strong>
            </div>
          )}
          {data.stock !== undefined && data.sold !== undefined && barChartMode === 'velocity' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              <span>Shelf Cover:</span>
              <strong style={{ color: '#fbbf24' }}>
                {data.sold > 0 ? `~${Math.round(data.stock / (data.sold / 30))} days` : 'Adequate'}
              </strong>
            </div>
          )}
          {data.warehouse && (
            <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#cbd5e1' }}>
              Facility: <strong>{data.warehouse}</strong>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = activePieData.reduce((acc, curr) => acc + curr.value, 0) || 1;
      const pct = ((data.value / total) * 100).toFixed(1);
      return (
        <div style={{
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
          border: '1px solid #1e293b',
          fontSize: '0.8rem',
          minWidth: '180px',
          zIndex: 9999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: data.payload.color || data.color }} />
            <strong style={{ color: '#ffffff' }}>{data.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>Inventory Count:</span>
            <strong style={{ color: '#ffffff' }}>{data.value} items</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
            <span>Share of Total:</span>
            <strong style={{ color: '#60a5fa' }}>{pct}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── 6 COMPACT ENTERPRISE KPI TILES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '8px' }}>

        {/* Total Active Catalog */}
        <div
          className="dash-lift-card"
          onClick={() => navigate('/products')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #2563eb',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Active Elements
            </span>
            <div style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={13} />
            </div>
          </div>
          <div style={{ margin: '2px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {stats?.totalProducts || 0}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#64748b' }}>
            <span>Catalog items</span>
            <ArrowUpRight size={11} color="#94a3b8" />
          </div>
        </div>

        {/* Total Stock Asset Valuation */}
        <div
          className="dash-lift-card"
          onClick={() => navigate('/inventory')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #059669',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>
              Asset Valuation
            </span>
            <div style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={13} />
            </div>
          </div>
          <div style={{ margin: '2px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {stats?.totalInventoryValuation || '₹0.00'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#059669', fontWeight: '600' }}>
            <span>Warehouse capital</span>
            <ArrowUpRight size={11} color="#059669" />
          </div>
        </div>

        {/* Total Sales Revenue */}
        <div
          className="dash-lift-card"
          onClick={() => navigate('/sales')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #4f46e5',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase' }}>
              Confirmed Revenue
            </span>
            <div style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={13} />
            </div>
          </div>
          <div style={{ margin: '2px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {stats?.revenue || '₹0.00'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#4f46e5', fontWeight: '600' }}>
            <span>Processed SOs</span>
            <ArrowUpRight size={11} color="#4f46e5" />
          </div>
        </div>

        {/* Below Reorder Level */}
        <div
          className="dash-lift-card"
          onClick={() => navigate('/inventory?filter=reorder')}
          style={{
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderTop: '3px solid #d97706',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>
              Below Reorder
            </span>
            <div style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={13} />
            </div>
          </div>
          <div style={{ margin: '2px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b45309', lineHeight: 1 }}>
              {belowReorderCount}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#b45309', fontWeight: '600' }}>
            <span>Breached safety buffer</span>
            <ArrowUpRight size={11} color="#b45309" />
          </div>
        </div>

        {/* Critical Stock */}
        <div
          className="dash-lift-card"
          onClick={() => navigate('/inventory?filter=critical')}
          style={{
            background: '#ffffff',
            border: '1px solid #fecaca',
            borderTop: '3px solid #dc2626',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>
              Critical Stock
            </span>
            <div style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertOctagon size={13} />
            </div>
          </div>
          <div style={{ margin: '2px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#dc2626', lineHeight: 1 }}>
              {criticalCount}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#dc2626', fontWeight: '600' }}>
            <span>Depleted stock risk</span>
            <ArrowUpRight size={11} color="#dc2626" />
          </div>
        </div>

        {/* Inbound Pipeline */}
        <div
          className="dash-lift-card"
          onClick={() => navigate('/purchases')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #7c3aed',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#6d28d9', textTransform: 'uppercase' }}>
              Inbound Pipeline
            </span>
            <div style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={13} />
            </div>
          </div>
          <div style={{ margin: '2px 0' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#6d28d9', lineHeight: 1 }}>
              {pendingInbound} <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>POs</span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#6d28d9', fontWeight: '600' }}>
            <span>+{pendingPRs} requests pending</span>
            <ArrowUpRight size={11} color="#7c3aed" />
          </div>
        </div>

      </div>

      {/* ── INTERACTIVE VISUALIZATIONS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>

        {/* Chart 1: Sales Velocity vs Stock Position */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={15} color="#2563eb" />
                <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Sales Velocity vs Stock Position
                </h3>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Top moving items comparing 30-day velocity against current shelf stock</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setBarChartMode('velocity')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: barChartMode === 'velocity' ? '#ffffff' : 'transparent',
                  color: barChartMode === 'velocity' ? '#0f172a' : '#64748b',
                  boxShadow: barChartMode === 'velocity' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Demand Velocity
              </button>
              <button
                onClick={() => setBarChartMode('reorder')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: barChartMode === 'reorder' ? '#ffffff' : 'transparent',
                  color: barChartMode === 'reorder' ? '#0f172a' : '#64748b',
                  boxShadow: barChartMode === 'reorder' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Safety Buffers
              </button>
              <button
                onClick={() => setBarChartMode('warehouse')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: barChartMode === 'warehouse' ? '#ffffff' : 'transparent',
                  color: barChartMode === 'warehouse' ? '#0f172a' : '#64748b',
                  boxShadow: barChartMode === 'warehouse' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Facilities
              </button>
            </div>
          </div>

          {/* Visual Legend / Scale Explanation */}
          {barChartMode === 'velocity' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              marginBottom: '8px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #f1f5f9',
              fontSize: '0.7rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: '700' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#059669', display: 'inline-block' }} />
                  Current Stock (Units)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', fontWeight: '700' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#2563eb', display: 'inline-block' }} />
                  30d Sales Velocity (Units)
                </span>
              </div>
              <span style={{ color: '#64748b', fontSize: '0.66rem', fontWeight: '600' }}>
                Double Bar View
              </span>
            </div>
          )}

          {barChartMode === 'reorder' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '6px 10px',
              marginBottom: '8px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              border: '1px solid #fee2e2',
              fontSize: '0.7rem'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: '700' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#dc2626', display: 'inline-block' }} />
                Current Stock (Units)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: '700' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#d97706', display: 'inline-block' }} />
                Reorder Threshold
              </span>
            </div>
          )}

          {barChartData.length === 0 ? (
            <div style={{
              height: '160px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '0.8rem',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px dashed #e2e8f0'
            }}>
              <Package size={24} style={{ marginBottom: '6px', opacity: 0.6 }} />
              <span>No data available for this view</span>
            </div>
          ) : (
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={barChartData}
                  margin={{
                    top: 6,
                    right: 8,
                    left: -18,
                    bottom: 0
                  }}
                >
                  <defs>
                    <linearGradient id="stockBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="velocityBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="reorderBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                  />

                  {/* Primary Left Y Axis (Units) */}
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tick={{
                      fontSize: 11,
                      fill: '#64748b',
                      fontWeight: 'normal'
                    }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'auto']}
                  />

                  <Tooltip content={<CustomBarTooltip />} />

                  {barChartMode === 'velocity' && (
                    <>
                      <Bar
                        yAxisId="left"
                        dataKey="stock"
                        name="Current Stock"
                        fill="url(#stockBarGrad)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                        minPointSize={12}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="sold"
                        name="30d Sales Velocity"
                        fill="url(#velocityBarGrad)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                        minPointSize={12}
                      />
                    </>
                  )}

                  {barChartMode === 'reorder' && (
                    <>
                      <Bar
                        yAxisId="left"
                        dataKey="stock"
                        name="Current Stock"
                        fill="url(#reorderBarGrad)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                        minPointSize={12}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="reorderLevel"
                        name="Reorder Point"
                        fill="#d97706"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                        minPointSize={12}
                      />
                    </>
                  )}

                  {barChartMode === 'warehouse' && (
                    <Bar
                      yAxisId="left"
                      dataKey="lowStockCount"
                      name="Breached Items"
                      fill="#7c3aed"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                      minPointSize={12}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Inventory Health Distribution */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PieChartIcon size={15} color="#059669" />
                <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Inventory Health Distribution
                </h3>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Optimal buffer vs breached thresholds across entire catalog</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setPieChartMode('health')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: pieChartMode === 'health' ? '#ffffff' : 'transparent',
                  color: pieChartMode === 'health' ? '#0f172a' : '#64748b',
                  boxShadow: pieChartMode === 'health' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Health Status
              </button>
              <button
                onClick={() => setPieChartMode('warehouse')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: pieChartMode === 'warehouse' ? '#ffffff' : 'transparent',
                  color: pieChartMode === 'warehouse' ? '#0f172a' : '#64748b',
                  boxShadow: pieChartMode === 'warehouse' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                By Facility
              </button>
            </div>
          </div>

          {activePieData.length === 0 ? (
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
              <PieChartIcon size={24} style={{ marginBottom: '6px', opacity: 0.6 }} />
              <span>No stock distribution data</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {activePieData.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                {activePieData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#334155' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                    <span>{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── ROW 1: IMMEDIATE REORDER & FAST-MOVING ELEMENTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>

        {/* Immediate Reorder Queue */}
        <div
          className="dash-lift-subtle"
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} color="#dc2626" />
              <div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Immediate Reorder Priority Queue
                </h3>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Items farthest below minimum authorized threshold</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/inventory?filter=reorder')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              Full Ledger <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stats?.topLowStockProducts && stats.topLowStockProducts.length > 0 ? (
              stats.topLowStockProducts.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="dash-lift-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Shelf Stock: <strong style={{ color: '#dc2626' }}>{item.current_stock}</strong> / Reorder Point: <strong>{item.reorder_level}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/purchases?action=new&product=${item.id}`)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Order +{item.reorder_qty || 20}
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.76rem' }}>
                All inventory buffers are operating within optimal safety zones.
              </div>
            )}
          </div>
        </div>

        {/* High Velocity Elements */}
        <div
          className="dash-lift-subtle"
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={15} color="#ea580c" />
              <div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  High-Velocity Demand Elements
                </h3>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Highest 30-day unit sales run-rate and revenue contributions</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/sales')}
              style={{ background: 'none', border: 'none', color: '#ea580c', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              Sales Orders <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stats?.fastMovingProducts && stats.fastMovingProducts.length > 0 ? (
              stats.fastMovingProducts.slice(0, 4).map((p, idx) => (
                <div
                  key={p.id}
                  className="dash-lift-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fff7ed',
                    border: '1px solid #ffedd5'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c2410c' }}>#{idx + 1}</span>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#7c2d12' }}>
                        In Stock: <strong>{p.current_stock}</strong> • ~{p.avg_daily_sales || 0}/day
                      </div>
                    </div>
                  </div>
                  <span style={{ fontWeight: '800', color: '#ea580c', fontSize: '0.82rem' }}>
                    {p.total_sold_30_days} sold
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.76rem' }}>
                Sales order activity will automatically generate run-rate telemetry here.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── ROW 2: WAREHOUSE FACILITY ALLOCATION & RECENT AUDIT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>

        {/* Warehouse Distribution */}
        <div
          className="dash-lift-subtle"
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Warehouse size={15} color="#2563eb" />
              <div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Facility Distribution Nodes
                </h3>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Operational nodes and inventory storage allocation</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/warehouses')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              All Facilities <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats?.warehouseUtilization && stats.warehouseUtilization.length > 0 ? (
              stats.warehouseUtilization.map((wh) => (
                <div key={wh.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <strong style={{ color: '#0f172a' }}>{wh.name}</strong>
                    <span style={{ color: '#2563eb', fontWeight: '700' }}>{wh.total_stock} units</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.round((wh.total_stock / 1000) * 100))}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: '4px' }} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.76rem' }}>
                Warehouse facility data synced.
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Audit Log */}
        <div
          className="dash-lift-subtle"
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={15} color="#059669" />
              <div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Real-Time Audit Trail
                </h3>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Live operational inventory event telemetry</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/activity-logs')}
              style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              Full Log <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.slice(0, 4).map((act) => {
                const badge = getActionBadgeStyle(act.action);
                return (
                  <div
                    key={act.id}
                    className="dash-lift-item"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontSize: '0.62rem',
                        fontWeight: '700',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.label}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: '600' }}>{act.summary}</div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>By {act.user_name}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatTimeAgo(act.createdAt)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.76rem' }}>
                Operational event logs will appear here in real time.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default InventoryDashboardTab;
