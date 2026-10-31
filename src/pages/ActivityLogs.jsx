import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import { 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  User, 
  Clock, 
  Eye, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  LogIn, 
  Boxes, 
  Layers, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [metrics, setMetrics] = useState({
    totalActivities: 0,
    todayActivities: 0,
    totalCreations: 0,
    totalUpdates: 0,
    totalDeletes: 0
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity_type', entityFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await api.get(`/admin/activity-logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, actionFilter, entityFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleClearFilters = () => {
    setSearch('');
    setActionFilter('');
    setEntityFilter('');
    setStartDate('');
    setEndDate('');
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return {
          bg: '#ecfdf5',
          color: '#059669',
          border: '#a7f3d0',
          icon: <PlusCircle size={14} />,
          label: 'Create'
        };
      case 'UPDATE':
        return {
          bg: '#fffbeb',
          color: '#d97706',
          border: '#fde68a',
          icon: <Edit3 size={14} />,
          label: 'Update'
        };
      case 'DELETE':
        return {
          bg: '#fef2f2',
          color: '#dc2626',
          border: '#fecaca',
          icon: <Trash2 size={14} />,
          label: 'Delete'
        };
      case 'STOCK_ADJUSTMENT':
        return {
          bg: '#eff6ff',
          color: '#2563eb',
          border: '#bfdbfe',
          icon: <Boxes size={14} />,
          label: 'Stock Adjustment'
        };
      case 'STATUS_CHANGE':
        return {
          bg: '#faf5ff',
          color: '#9333ea',
          border: '#e9d5ff',
          icon: <Layers size={14} />,
          label: 'Status Change'
        };
      case 'LOGIN':
        return {
          bg: '#f0fdf4',
          color: '#16a34a',
          border: '#bbf7d0',
          icon: <LogIn size={14} />,
          label: 'Sign In'
        };
      default:
        return {
          bg: '#f8fafc',
          color: '#475569',
          border: '#e2e8f0',
          icon: <Activity size={14} />,
          label: action
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr) => {
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

  // Format field names into clean title case labels
  const formatFieldName = (key = '') => {
    if (!key) return '';
    const friendlyMap = {
      variant_attributes: 'Variant Attributes',
      group_id: 'Group ID',
      company_id: 'Company ID',
      brand_id: 'Brand ID',
      default_warehouse_id: 'Default Warehouse ID',
      default_warehouse: 'Default Warehouse',
      warehouse_allocations: 'Warehouse Allocations',
      min_stock_level: 'Min Stock Level',
      max_stock_level: 'Max Stock Level',
      reorder_quantity: 'Reorder Quantity',
      reorder_level: 'Reorder Level',
      selling_price: 'Selling Price',
      cost_price: 'Cost Price',
      mrp: 'MRP',
      sku: 'SKU',
      product_code: 'Product Code',
      barcode: 'Barcode',
      hsn_code: 'HSN Code',
      tax_rate: 'Tax Rate (%)',
      is_active: 'Status',
      status: 'Status',
      opening_stock: 'Opening Stock',
      current_stock: 'Current Stock',
      safety_stock: 'Safety Stock',
      lead_time_days: 'Lead Time (Days)',
      auto_reorder: 'Auto Reorder'
    };

    if (friendlyMap[key]) return friendlyMap[key];

    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Helper to format generic objects into concise human-readable text
  const formatObjectToSummaryText = (obj) => {
    if (!obj || typeof obj !== 'object') return String(obj);
    const ignoredFields = ['createdAt', 'updatedAt', 'id', 'parent_id', 'product_id'];
    const entries = Object.entries(obj).filter(
      ([k, v]) => !ignoredFields.includes(k) && v !== null && v !== undefined && v !== ''
    );
    if (entries.length === 0) {
      return obj.id ? `#${obj.id}` : '—';
    }
    return entries
      .map(([k, v]) => `${formatFieldName(k)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' | ');
  };

  // Helper to format values into clean plain text for the diff view (NO raw JSON brackets)
  const formatDiffValue = (val, key = '') => {
    if (val === null || val === undefined || val === '') {
      return <span style={{ color: '#94a3b8' }}>—</span>;
    }

    if (typeof val === 'boolean') {
      return (
        <span style={{ fontWeight: 600, color: val ? '#16a34a' : '#64748b' }}>
          {val ? 'Yes' : 'No'}
        </span>
      );
    }

    if (typeof val === 'number') {
      return <span>{val}</span>;
    }

    // Attempt to parse stringified JSON if stored as JSON string
    let parsedVal = val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          parsedVal = JSON.parse(trimmed);
        } catch (e) {
          parsedVal = val;
        }
      }
    }

    if (parsedVal !== val && typeof parsedVal === 'object') {
      return formatDiffValue(parsedVal, key);
    }

    if (typeof val === 'string') {
      return <span>{val}</span>;
    }

    // Array Handling
    if (Array.isArray(val)) {
      if (val.length === 0) {
        return <span style={{ color: '#94a3b8' }}>None</span>;
      }

      // 1. Variant attributes array: [{ name: "Flavor", values: ["Elaichi", "Chocolate"] }]
      const isVariantAttr = val.every(
        (item) => item && typeof item === 'object' && 'name' in item && 'values' in item
      );
      if (isVariantAttr) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {val.map((item, idx) => (
              <div key={idx} style={{ fontSize: '0.84rem', lineHeight: '1.4' }}>
                <strong style={{ color: '#1e293b' }}>{item.name}:</strong>{' '}
                <span style={{ color: '#334155' }}>
                  {Array.isArray(item.values) ? item.values.join(', ') : String(item.values)}
                </span>
              </div>
            ))}
          </div>
        );
      }

      // 2. Array of primitives (e.g. strings or numbers)
      if (val.every((item) => typeof item === 'string' || typeof item === 'number')) {
        return <span>{val.join(', ')}</span>;
      }

      // 3. Array of objects with name (e.g. occasions, categories, tags)
      if (val.every((item) => item && typeof item === 'object' && item.name)) {
        return <span>{val.map((item) => item.name).join(', ')}</span>;
      }

      // 4. Warehouse allocations array
      if (key === 'warehouse_allocations' || val.some((item) => item && (item.warehouse || item.warehouse_id))) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {val.map((alloc, idx) => {
              const whName = alloc.warehouse?.name || `Warehouse #${alloc.warehouse_id || idx + 1}`;
              const details = [];
              if (alloc.current_stock !== undefined && alloc.current_stock !== null) {
                details.push(`Stock: ${alloc.current_stock}`);
              }
              if (alloc.opening_stock_unit_cost) {
                details.push(`Cost: ₹${alloc.opening_stock_unit_cost}`);
              }
              if (alloc.is_primary) {
                details.push('Primary');
              }
              return (
                <div key={idx} style={{ fontSize: '0.84rem' }}>
                  <strong style={{ color: '#1e293b' }}>{whName}</strong>
                  {details.length > 0 && <span style={{ color: '#64748b' }}> ({details.join(', ')})</span>}
                </div>
              );
            })}
          </div>
        );
      }

      // 5. Product attributes bridge table: [{ attribute: { name: 'Color' }, attribute_value: 'Red' }]
      if (key === 'attributes' || val.some((item) => item && (item.attribute || item.attribute_id))) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {val.map((attr, idx) => {
              const attrName = attr.attribute?.name || attr.name || `Attribute #${attr.attribute_id || idx + 1}`;
              const attrVal = attr.attribute_value || attr.value || attr.option?.value || '—';
              return (
                <div key={idx} style={{ fontSize: '0.84rem' }}>
                  <strong style={{ color: '#1e293b' }}>{attrName}:</strong>{' '}
                  <span style={{ color: '#334155' }}>{attrVal}</span>
                </div>
              );
            })}
          </div>
        );
      }

      // Generic array fallback
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {val.map((item, idx) => (
            <span key={idx}>
              {typeof item === 'object' ? formatObjectToSummaryText(item) : String(item)}
            </span>
          ))}
        </div>
      );
    }

    // Object Handling
    if (typeof val === 'object') {
      if (Object.keys(val).length === 0) {
        return <span style={{ color: '#94a3b8' }}>None</span>;
      }

      // Object with a readable name (e.g. Group, Warehouse, Brand, Company)
      if (val.name) {
        const code = val.warehouse_code || val.group_code || val.code;
        return (
          <span>
            <strong style={{ color: '#1e293b' }}>{val.name}</strong>
            {code ? <span style={{ color: '#64748b' }}> ({code})</span> : ''}
          </span>
        );
      }

      return <span>{formatObjectToSummaryText(val)}</span>;
    }

    return <span>{String(val)}</span>;
  };

  // Backward-compatible alias for any cached or external invocations
  const renderDiffValue = formatDiffValue;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
              <Activity size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
                Employee Activity Logs
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                Complete audit trail of all employee changes, stock adjustments, and administrative operations.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#334155',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
          onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#ffffff'; }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── KPI STATS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '18px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Operations</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{metrics.totalActivities.toLocaleString()}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Recorded across all modules</div>
        </div>

        <div style={{ padding: '18px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#2563eb', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Activities</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e3a8a', marginTop: '6px' }}>{metrics.todayActivities.toLocaleString()}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Since 12:00 AM today</div>
        </div>

        <div style={{ padding: '18px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#059669', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Creations</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#065f46', marginTop: '6px' }}>{metrics.totalCreations.toLocaleString()}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Products, groups, orders added</div>
        </div>

        <div style={{ padding: '18px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Modifications</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#92400e', marginTop: '6px' }}>{metrics.totalUpdates.toLocaleString()}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Edits & field value updates</div>
        </div>

        <div style={{ padding: '18px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deletions / Deactivations</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#991b1b', marginTop: '6px' }}>{metrics.totalDeletes.toLocaleString()}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Removed or disabled items</div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: '1 1 240px', minWidth: '220px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search employee, product, summary, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.88rem',
              outline: 'none',
              backgroundColor: '#f8fafc'
            }}
          />
        </div>

        {/* Action Filter */}
        <div style={{ minWidth: '150px' }}>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.88rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
            <option value="STATUS_CHANGE">Status Change</option>
            <option value="LOGIN">User Sign In</option>
          </select>
        </div>

        {/* Entity Filter */}
        <div style={{ minWidth: '150px' }}>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.88rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">All Modules</option>
            <option value="PRODUCT">Products / Elements</option>
            <option value="GROUP">Groups & Sub-Groups</option>
            <option value="COMPANY">Companies</option>
            <option value="BRAND">Brands</option>
            <option value="WAREHOUSE">Warehouses</option>
            <option value="SALES_ORDER">Sales Orders</option>
            <option value="PURCHASE_ORDER">Purchase Orders</option>
            <option value="AUTH">Authentication / Logins</option>
          </select>
        </div>

        {/* Start Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        {/* End Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        {(search || actionFilter || entityFilter || startDate || endDate) && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: '9px 14px',
              backgroundColor: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── LOGS TABLE ── */}
      <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', borderBottom: '1px solid #1a252f', color: '#ffffff' }}>
              <th style={{ width: '60px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Sr. No.</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Timestamp</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Employee</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Action</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Entity / Target</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Summary Description</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Details</th>
            </tr>
          </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading activity logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                      <Activity size={36} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                      <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px' }}>No Activity Recorded</div>
                      <div style={{ fontSize: '0.82rem' }}>No activity matching your selected filters was found in the database.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const badge = getActionBadge(log.action);
                  const hasChanges = (log.old_values && Object.keys(log.old_values).length > 0) || 
                                     (log.new_values && Object.keys(log.new_values).length > 0);

                  return (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Sr. No. */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                        {index + 1}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{formatRelativeTime(log.createdAt)}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{formatDate(log.createdAt)}</div>
                      </td>

                      {/* Employee */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: log.user_role === 'SUPER_ADMIN' ? '#4338ca' : '#0284c7',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              flexShrink: 0
                            }}
                          >
                            {(log.user_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{log.user_name || 'System / Auto'}</div>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: log.user_role === 'SUPER_ADMIN' ? '#e0e7ff' : '#e0f2fe',
                                color: log.user_role === 'SUPER_ADMIN' ? '#4338ca' : '#0369a1',
                                fontWeight: '600'
                              }}
                            >
                              {log.user_role || 'ADMIN'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`
                          }}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Entity / Target */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {log.entity_type}
                          </span>
                          {log.entity_id && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>#{log.entity_id}</span>
                          )}
                        </div>
                        {log.entity_name && (
                          <div style={{ fontWeight: '600', color: '#1e293b', marginTop: '2px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px auto 0' }} title={log.entity_name}>
                            {log.entity_name}
                          </div>
                        )}
                      </td>

                      {/* Summary */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ color: '#334155', maxWidth: '420px', lineHeight: '1.4', margin: '0 auto' }}>
                          {log.summary}
                        </div>
                        {(log.action === 'DELETE' || log.reason) && (
                          <div style={{ marginTop: '6px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                fontSize: '0.74rem',
                                border: '1px solid #e2e8f0',
                                fontWeight: '500'
                              }}
                            >
                              <strong style={{ color: '#0f172a' }}>Reason:</strong> {log.reason || 'Audit deletion record'}
                            </span>
                          </div>
                        )}
                        {log.ip_address && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                            IP: {log.ip_address}
                          </div>
                        )}
                      </td>

                      {/* Details Button */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        {hasChanges ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              color: '#2563eb',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                          >
                            <Eye size={13} />
                            <span>View Changes</span>
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ── */}
        <Pagination 
          currentPage={pagination.page}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={(p) => fetchLogs(p)}
        />

      {/* ── VIEW CHANGES DIFF MODAL ── */}
      {selectedLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', position: 'relative' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: '700', fontSize: '0.75rem' }}>
                    {selectedLog.action}
                  </span>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.1rem' }}>
                    Activity Change Details (Log #{selectedLog.id})
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  Recorded on {formatDate(selectedLog.createdAt)} by <strong>{selectedLog.user_name}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Summary Banner */}
              <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: (selectedLog.reason || selectedLog.action === 'DELETE') ? '12px' : '20px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Summary</div>
                <div style={{ fontSize: '0.92rem', color: '#0f172a', marginTop: '4px', fontWeight: '600' }}>{selectedLog.summary}</div>
              </div>

              {/* Deletion Reason Banner */}
              {(selectedLog.reason || selectedLog.action === 'DELETE') && (
                <div style={{ padding: '14px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trash2 size={13} color="#dc2626" />
                    Audit Deletion Reason
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#7f1d1d', marginTop: '4px', fontWeight: '600' }}>
                    {selectedLog.reason || 'No deletion reason recorded.'}
                  </div>
                </div>
              )}

              {/* Diff Comparison Table */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>
                Field Modifications (Old vs New)
              </h4>

              {(() => {
                const oldVals = selectedLog.old_values || {};
                const newVals = selectedLog.new_values || {};

                const isValueEmpty = (v) => {
                  if (v === null || v === undefined || v === '') return true;
                  if (Array.isArray(v) && v.length === 0) return true;
                  if (typeof v === 'object' && Object.keys(v).length === 0) return true;
                  return false;
                };

                const IGNORED_KEYS = new Set(['createdAt', 'updatedAt', 'deletedAt']);

                const allKeys = Array.from(
                  new Set([...Object.keys(oldVals), ...Object.keys(newVals)])
                ).filter((key) => {
                  if (IGNORED_KEYS.has(key)) return false;
                  const oldV = oldVals[key];
                  const newV = newVals[key];

                  // Both empty (e.g. null and [], null and {}, or null and "")
                  if (isValueEmpty(oldV) && isValueEmpty(newV)) return false;

                  // If both serialized values are identical
                  if (JSON.stringify(oldV) === JSON.stringify(newV)) return false;

                  return true;
                });

                if (allKeys.length === 0) {
                  return (
                    <div style={{ color: '#64748b', fontSize: '0.88rem', padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      No specific field changes recorded for this activity.
                    </div>
                  );
                }

                return (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '10px 14px', width: '60px', textAlign: 'center', fontWeight: '700' }}>Sr. No.</th>
                          <th style={{ padding: '10px 14px', width: '25%', textAlign: 'center', fontWeight: '700' }}>Field</th>
                          <th style={{ padding: '10px 14px', width: '35%', textAlign: 'center', fontWeight: '700', color: '#dc2626' }}>Previous Value</th>
                          <th style={{ padding: '10px 14px', width: '35%', textAlign: 'center', fontWeight: '700', color: '#16a34a' }}>New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allKeys.map((key, kIdx) => {
                          const oldV = oldVals[key];
                          const newV = newVals[key];
                          const isDifferent = JSON.stringify(oldV) !== JSON.stringify(newV);

                          return (
                            <tr key={key} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isDifferent ? '#ffffff' : '#fcfcfc' }}>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                                {kIdx + 1}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>
                                {formatFieldName(key)}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', backgroundColor: isDifferent ? '#fef2f2' : 'transparent', color: '#991b1b', wordBreak: 'break-word', lineHeight: '1.4' }}>
                                {formatDiffValue(oldV, key)}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', backgroundColor: isDifferent ? '#f0fdf4' : 'transparent', color: '#166534', wordBreak: 'break-word', lineHeight: '1.4' }}>
                                {formatDiffValue(newV, key)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '9px 20px',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
