import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import VisualDiffModal from '../components/VisualDiffModal';
import Pagination from '../components/Pagination';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  Search,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const MODULES_LIST = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'PRODUCTS', label: 'Products / Elements' },
  { value: 'WAREHOUSES', label: 'Warehouses' },
  { value: 'CUSTOMERS', label: 'Customers' },
  { value: 'COMPANIES', label: 'Companies' },
  { value: 'BRANDS', label: 'Brands' },
  { value: 'GROUPS', label: 'Categories / Groups' },
  { value: 'EXPENSES', label: 'Expenses' },
  { value: 'PRODUCT_TYPES', label: 'Product Types' },
  { value: 'ALIASES', label: 'Aliases' },
  { value: 'OCCASIONS', label: 'Occasions' },
  { value: 'OFFICERS', label: 'Officers' },
  { value: 'PURCHASE_ORDERS', label: 'Purchase Orders' },
  { value: 'SALES_ORDERS', label: 'Sales Orders' },
];

const MODULE_COLORS = {
  PRODUCTS: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', label: 'Products' },
  PRODUCT_TYPES: { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc', label: 'Product Types' },
  WAREHOUSES: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Warehouses' },
  CUSTOMERS: { bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe', label: 'Customers' },
  COMPANIES: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Companies' },
  BRANDS: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Brands' },
  GROUPS: { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff', label: 'Groups' },
  EXPENSES: { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3', label: 'Expenses' },
  ALIASES: { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4', label: 'Aliases' },
  OCCASIONS: { bg: '#fdf4ff', text: '#c026d3', border: '#f5d0fe', label: 'Occasions' },
  PURCHASE_ORDERS: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Purchases' },
  SALES_ORDERS: { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', label: 'Sales Orders' },
};

const getRelativeTime = (dateString) => {
  if (!dateString) return 'recently';
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return past.toLocaleDateString();
};

const ApprovalQueue = () => {
  const { showSuccess, showError } = useToast();

  // Metrics State
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  // Table & Filter State
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 12;

  // Visual Diff Modal State
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequestData, setSelectedRequestData] = useState(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // Quick Action Modals
  const [quickApproveTarget, setQuickApproveTarget] = useState(null);
  const [quickRejectTarget, setQuickRejectTarget] = useState(null);
  const [quickRejectReason, setQuickRejectReason] = useState('');
  const [quickRejectError, setQuickRejectError] = useState('');
  const [actionExecuting, setActionExecuting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    try {
      // Use the same list endpoint and filters as the table so each tab count
      // reflects the requests that can actually appear in that filtered view.
      const baseParams = new URLSearchParams({ page: '1', limit: '1' });
      if (moduleFilter !== 'ALL') baseParams.set('module', moduleFilter);
      if (actionFilter !== 'ALL') baseParams.set('action', actionFilter);
      if (debouncedSearch.trim()) baseParams.set('search', debouncedSearch.trim());

      const getCount = async (status, applyCurrentFilters = true) => {
        const params = applyCurrentFilters
          ? new URLSearchParams(baseParams)
          : new URLSearchParams({ page: '1', limit: '1' });
        if (status !== 'ALL') params.set('status', status);
        const res = await api.get(`/admin/approval-requests?${params.toString()}`);
        const data = res.data || {};
        const list = data.requests || data.data || [];
        return Number(data.pagination?.total ?? data.totalCount ?? data.total ?? data.count ?? list.length) || 0;
      };

      const [pending, approved, rejected] = await Promise.all([
        getCount('PENDING'),
        getCount('APPROVED'),
        getCount('REJECTED'),
      ]);
      // All Requests is the combined total of the three request outcomes,
      // using the same module/action/search filters as the status tabs.
      setStats({ pending, approved, rejected, total: pending + approved + rejected });
    } catch (err) {
      console.warn('Failed to fetch approval stats:', err);
    }
  }, [moduleFilter, actionFilter, debouncedSearch]);

  // Fetch Approval Requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('limit', String(itemsPerPage));

      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (moduleFilter !== 'ALL') {
        params.append('module', moduleFilter);
      }
      if (actionFilter !== 'ALL') {
        params.append('action', actionFilter);
      }
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      const res = await api.get(`/admin/approval-requests?${params.toString()}`);
      if (res.data?.success) {
        const list = res.data.requests || res.data.data || [];
        setRequests(list);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.total || list.length);
        } else {
          setTotalPages(1);
          setTotalCount(list.length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch approval requests:', err);
      showError('Failed to load approval requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, moduleFilter, actionFilter, debouncedSearch, showError]);

  // Initial and reactive fetch
  useEffect(() => {
    fetchStats();
    fetchRequests();
  }, [fetchStats, fetchRequests]);

  // Listen to global approval updates
  useEffect(() => {
    const handleStatsUpdate = () => {
      fetchStats();
      fetchRequests();
    };
    window.addEventListener('approval:stats_updated', handleStatsUpdate);
    return () => window.removeEventListener('approval:stats_updated', handleStatsUpdate);
  }, [fetchStats, fetchRequests]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchRequests();
  };

  const handleStatusFilterChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
    if (nextStatus === 'ALL') {
      setModuleFilter('ALL');
      setActionFilter('ALL');
      setSearchTerm('');
      setDebouncedSearch('');
    }
  };

  // Open Visual Diff Modal
  const handleOpenDiff = (req) => {
    setSelectedRequestId(req.id);
    setSelectedRequestData(req);
    setIsDiffModalOpen(true);
  };

  // Quick Approve execution
  const handleQuickApproveConfirm = async () => {
    if (!quickApproveTarget) return;
    try {
      setActionExecuting(true);
      await api.post(`/admin/approval-requests/${quickApproveTarget.id}/approve`, {
        notes: 'Quick-approved from Approval Inbox',
        review_notes: 'Quick-approved from Approval Inbox',
      });
      showSuccess(`Request #CR-${String(quickApproveTarget.id).padStart(4, '0')} approved!`);
      setQuickApproveTarget(null);
      fetchStats();
      fetchRequests();
      window.dispatchEvent(new CustomEvent('approval:stats_updated'));
    } catch (err) {
      console.error('Quick approve failed:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to approve request');
    } finally {
      setActionExecuting(false);
    }
  };

  // Quick Reject execution
  const handleQuickRejectConfirm = async () => {
    if (!quickRejectTarget) return;
    const trimmed = quickRejectReason.trim();
    if (!trimmed || trimmed.length < 5) {
      setQuickRejectError('Rejection reason must be at least 5 characters.');
      return;
    }

    try {
      setActionExecuting(true);
      await api.post(`/admin/approval-requests/${quickRejectTarget.id}/reject`, {
        review_notes: trimmed,
        notes: trimmed,
        rejection_reason: trimmed,
        reason: trimmed,
        reviewer_notes: trimmed,
      });
      showSuccess(`Request #CR-${String(quickRejectTarget.id).padStart(4, '0')} rejected.`);
      setQuickRejectTarget(null);
      setQuickRejectReason('');
      setQuickRejectError('');
      fetchStats();
      fetchRequests();
      window.dispatchEvent(new CustomEvent('approval:stats_updated'));
    } catch (err) {
      console.error('Quick reject failed:', err);
      setQuickRejectError(err.response?.data?.message || err.response?.data?.error || 'Failed to reject request');
    } finally {
      setActionExecuting(false);
    }
  };

  return (
    <div style={{ padding: '0 0 24px 0', maxWidth: '1440px', margin: '0 auto' }}>
      {/* PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardCheck size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', color: '#0f172a' }}>
                Approval Queue
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: '#64748b' }}>
                Maker-Checker Review: Review, inspect visual diffs, and approve staged mutations
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={loading || refreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '9px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: loading || refreshing ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 1. METRIC SUMMARY CARDS */}
      <div className="approval-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 210px))', gap: '16px', marginBottom: '16px' }}>
        <div className={`approval-kpi-card approval-kpi-pending${statusFilter === 'PENDING' ? ' is-active' : ''}`} role="button" tabIndex={0} aria-pressed={statusFilter === 'PENDING'} title="Awaiting Super Admin review and diff" onClick={() => handleStatusFilterChange('PENDING')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStatusFilterChange('PENDING'); } }}>
          <div className="approval-kpi-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}><Clock size={18} /></div>
          <div className="approval-kpi-content"><div className="approval-kpi-label" style={{ color: '#b45309' }}>Pending Approvals</div><div className="approval-kpi-value" style={{ color: '#92400e' }}>{stats.pending}</div></div>
        </div>
        <div className={`approval-kpi-card approval-kpi-approved${statusFilter === 'APPROVED' ? ' is-active' : ''}`} role="button" tabIndex={0} aria-pressed={statusFilter === 'APPROVED'} title="Applied into active database" onClick={() => handleStatusFilterChange('APPROVED')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStatusFilterChange('APPROVED'); } }}>
          <div className="approval-kpi-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}><CheckCircle2 size={18} /></div>
          <div className="approval-kpi-content"><div className="approval-kpi-label" style={{ color: '#15803d' }}>Approved</div><div className="approval-kpi-value" style={{ color: '#166534' }}>{stats.approved}</div></div>
        </div>
        <div className={`approval-kpi-card approval-kpi-rejected${statusFilter === 'REJECTED' ? ' is-active' : ''}`} role="button" tabIndex={0} aria-pressed={statusFilter === 'REJECTED'} title="Blocked mutations with reason" onClick={() => handleStatusFilterChange('REJECTED')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStatusFilterChange('REJECTED'); } }}>
          <div className="approval-kpi-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}><XCircle size={18} /></div>
          <div className="approval-kpi-content"><div className="approval-kpi-label" style={{ color: '#b91c1c' }}>Rejected</div><div className="approval-kpi-value" style={{ color: '#991b1b' }}>{stats.rejected}</div></div>
        </div>
        <div className={`approval-kpi-card approval-kpi-total${statusFilter === 'ALL' ? ' is-active' : ''}`} role="button" tabIndex={0} aria-pressed={statusFilter === 'ALL'} title="Complete Maker-Checker history" onClick={() => handleStatusFilterChange('ALL')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStatusFilterChange('ALL'); } }}>
          <div className="approval-kpi-icon" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}><Layers size={18} /></div>
          <div className="approval-kpi-content"><div className="approval-kpi-label" style={{ color: '#1d4ed8' }}>Total Tracked</div><div className="approval-kpi-value" style={{ color: '#1e40af' }}>{stats.total}</div></div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER BAR */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Top Row: Status Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Status Tabs */}
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              gap: '4px',
            }}
          >
            {[
              { id: 'ALL', label: 'All Requests', count: stats.total },
              { id: 'PENDING', label: 'Pending', count: stats.pending },
              { id: 'APPROVED', label: 'Approved', count: stats.approved },
              { id: 'REJECTED', label: 'Rejected', count: stats.rejected },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusFilterChange(tab.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '7px',
                    fontSize: '0.84rem',
                    fontWeight: active ? '700' : '600',
                    border: 'none',
                    backgroundColor: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        backgroundColor: active ? '#e2e8f0' : '#e2e8f0',
                        color: active ? '#0f172a' : '#64748b',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Showing <strong>{requests.length}</strong> of <strong>{totalCount}</strong> requests
          </div>
        </div>

        {/* Bottom Row: Filters & Live Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Live Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by entity name, requester, or justification reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 36px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Module Filter Dropdown */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#334155',
                backgroundColor: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {MODULES_LIST.map((mod) => (
                <option key={mod.value} value={mod.value}>
                  {mod.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter Dropdown */}
          <div style={{ minWidth: '140px' }}>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#334155',
                backgroundColor: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. DATA TABLE LAYOUT */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#64748b',
            }}
          >
            <Loader2 size={32} className="animate-spin" color="#6366f1" />
            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              Loading change requests from queue...
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div
            style={{
              padding: '64px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
              }}
            >
              <ClipboardCheck size={28} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>
              No Change Requests Found
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '420px' }}>
              {statusFilter === 'PENDING'
                ? 'All clear! There are currently no pending mutations awaiting Super Admin approval.'
                : 'No requests matched the current search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
                  <th style={{ width: '70px', padding: '12px 10px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Sr. No.
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Request ID
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Module
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Action
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Target / Entity Name
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Submitted By
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Justification
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Status
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#ffffff',
                      backgroundColor: '#2c3e50',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, index) => {
                  const reqModule = (req.module || 'PRODUCTS').toUpperCase();
                  const reqAction = (req.action || 'UPDATE').toUpperCase();
                  const reqStatus = (req.status || 'PENDING').toUpperCase();
                  const isPending = reqStatus === 'PENDING';
                  const modColor = MODULE_COLORS[reqModule] || {
                    bg: '#f1f5f9',
                    text: '#475569',
                    border: '#cbd5e1',
                    label: reqModule,
                  };

                  const formattedId = req.id ? `#CR-${String(req.id).padStart(4, '0')}` : '#CR-????';
                  const targetName =
                    req.entity_name ||
                    req.target_name ||
                    req.data?.name ||
                    req.target_data?.name ||
                    (req.entity_id ? `Record #${req.entity_id}` : 'Unnamed Record');

                  const requester = req.requested_by || req.requester || req.user || {};
                  const requesterName = requester.name || req.requester_name || 'Sub-Admin';
                  const requesterRole = (requester.role || req.requester_role || 'ADMIN').toUpperCase();
                  const timeLabel = getRelativeTime(req.createdAt || req.created_at);

                  return (
                    <tr
                      key={req.id || index}
                      style={{
                        borderBottom: index < requests.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbfcfe')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* 0. Sr. No. */}
                      <td style={{ padding: '14px 10px', verticalAlign: 'middle', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '0.82rem' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      {/* 1. Request ID */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            fontSize: '0.84rem',
                            color: '#1e293b',
                            backgroundColor: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            display: 'inline-block',
                          }}
                        >
                          {formattedId}
                        </span>
                      </td>

                      {/* 2. Module */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            backgroundColor: modColor.bg,
                            color: modColor.text,
                            border: `1px solid ${modColor.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {modColor.label}
                        </span>
                      </td>

                      {/* 3. Action */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: '800',
                            backgroundColor:
                              reqAction === 'CREATE'
                                ? '#ecfdf5'
                                : reqAction === 'UPDATE'
                                ? '#eff6ff'
                                : '#fef2f2',
                            color:
                              reqAction === 'CREATE'
                                ? '#059669'
                                : reqAction === 'UPDATE'
                                ? '#2563eb'
                                : '#dc2626',
                            border: `1px solid ${
                              reqAction === 'CREATE'
                                ? '#a7f3d0'
                                : reqAction === 'UPDATE'
                                ? '#bfdbfe'
                                : '#fecaca'
                            }`,
                          }}
                        >
                          {reqAction === 'CREATE' && <Plus size={12} />}
                          {reqAction === 'UPDATE' && <Edit3 size={12} />}
                          {reqAction === 'DELETE' && <Trash2 size={12} />}
                          <span>{reqAction}</span>
                        </span>
                      </td>

                      {/* 4. Entity / Target Name */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', maxWidth: '240px' }}>
                        <div
                          style={{
                            fontWeight: '700',
                            fontSize: '0.88rem',
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={targetName}
                        >
                          {targetName}
                        </div>
                        {req.entity_id && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            Record #{req.entity_id}
                          </div>
                        )}
                      </td>

                      {/* 5. Submitted By */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.84rem', color: '#334155' }}>
                            {requesterName}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              color: '#6366f1',
                              backgroundColor: '#eef2ff',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {requesterRole}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{timeLabel}</div>
                      </td>

                      {/* 6. Justification / Reason */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', maxWidth: '220px' }}>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            color: '#475569',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'help',
                          }}
                          title={req.reason || req.justification || 'No reason provided'}
                        >
                          {req.reason || req.justification || <span style={{ color: '#94a3b8' }}>None</span>}
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            backgroundColor:
                              reqStatus === 'PENDING'
                                ? '#fffbeb'
                                : reqStatus === 'APPROVED'
                                ? '#f0fdf4'
                                : '#fef2f2',
                            color:
                              reqStatus === 'PENDING'
                                ? '#b45309'
                                : reqStatus === 'APPROVED'
                                ? '#15803d'
                                : '#b91c1c',
                            border: `1px solid ${
                              reqStatus === 'PENDING'
                                ? '#fde68a'
                                : reqStatus === 'APPROVED'
                                ? '#86efac'
                                : '#fca5a5'
                            }`,
                          }}
                        >
                          {reqStatus === 'PENDING' && (
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#d97706',
                                animation: 'pulse 1.5s infinite',
                              }}
                            />
                          )}
                          {reqStatus === 'APPROVED' && <CheckCircle2 size={12} />}
                          {reqStatus === 'REJECTED' && <XCircle size={12} />}
                          <span>{reqStatus}</span>
                        </span>
                      </td>

                      {/* 8. Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {/* Review & Diff Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDiff(req)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
                              borderRadius: '7px',
                              border: 'none',
                              backgroundColor: '#6366f1',
                              color: '#ffffff',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(99, 102, 241, 0.3)',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
                          >
                            <Eye size={13} />
                            <span>Review & Diff</span>
                          </button>

                          {/* Quick Actions (only for PENDING requests) */}
                          {isPending && (
                            <>
                              {/* Quick Approve */}
                              <button
                                type="button"
                                title="Quick Approve"
                                onClick={() => setQuickApproveTarget(req)}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #bbf7d0',
                                  backgroundColor: '#f0fdf4',
                                  color: '#16a34a',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#16a34a';
                                  e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                                  e.currentTarget.style.color = '#16a34a';
                                }}
                              >
                                <Check size={14} />
                              </button>

                              {/* Quick Reject */}
                              <button
                                type="button"
                                title="Quick Reject"
                                onClick={() => {
                                  setQuickRejectTarget(req);
                                  setQuickRejectReason('');
                                  setQuickRejectError('');
                                }}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#dc2626';
                                  e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fef2f2';
                                  e.currentTarget.style.color = '#dc2626';
                                }}
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {/* VISUAL DIFF & REVIEW MODAL */}
      <VisualDiffModal
        isOpen={isDiffModalOpen}
        requestId={selectedRequestId}
        requestData={selectedRequestData}
        onClose={() => setIsDiffModalOpen(false)}
        onDecisionComplete={() => {
          fetchStats();
          fetchRequests();
        }}
        canApprove={true}
      />

      {/* QUICK APPROVE CONFIRMATION MODAL */}
      {quickApproveTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 99995,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              animation: 'scaleIn 0.18s ease-out',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#f0fdf4',
                borderBottom: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={22} color="#16a34a" />
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#166534' }}>
                Confirm Quick Approval
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#334155', lineHeight: '1.45' }}>
                Are you sure you want to approve request{' '}
                <strong>#CR-{String(quickApproveTarget.id).padStart(4, '0')}</strong>?
              </p>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.82rem',
                  color: '#475569',
                }}
              >
                <div>
                  <strong>Target:</strong>{' '}
                  {quickApproveTarget.entity_name || quickApproveTarget.data?.name || 'Item'}
                </div>
                <div>
                  <strong>Action:</strong> {quickApproveTarget.action} ({quickApproveTarget.module})
                </div>
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: '0.78rem', color: '#16a34a', fontWeight: '600' }}>
                This will immediately apply the change to the live database.
              </p>
            </div>

            <div
              style={{
                padding: '12px 20px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setQuickApproveTarget(null)}
                disabled={actionExecuting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleQuickApproveConfirm}
                disabled={actionExecuting}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  cursor: actionExecuting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {actionExecuting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Confirm Approve</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK REJECT PROMPT MODAL */}
      {quickRejectTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 99995,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              animation: 'scaleIn 0.18s ease-out',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                borderBottom: '1px solid #fee2e2',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle size={22} color="#dc2626" />
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#991b1b' }}>
                Reject Request #CR-{String(quickRejectTarget.id).padStart(4, '0')}
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#334155', lineHeight: '1.4' }}>
                Please specify the reason for rejecting this request:
              </p>

              <label
                htmlFor="quick-rejection-reason"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '6px',
                }}
              >
                Rejection Reason (at least 5 characters) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                id="quick-rejection-reason"
                rows={3}
                autoFocus
                value={quickRejectReason}
                onChange={(e) => {
                  setQuickRejectReason(e.target.value);
                  if (quickRejectError && e.target.value.trim().length >= 5) setQuickRejectError('');
                }}
                placeholder="e.g., Inconsistent pricing, duplicate SKU, missing compliance certificates..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: quickRejectError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />

              {quickRejectError && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#dc2626',
                    fontWeight: '600',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>{quickRejectError}</span>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '12px 20px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setQuickRejectTarget(null)}
                disabled={actionExecuting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleQuickRejectConfirm}
                disabled={actionExecuting || quickRejectReason.trim().length < 5}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  cursor: quickRejectReason.trim().length < 5 ? 'not-allowed' : 'pointer',
                  opacity: quickRejectReason.trim().length < 5 ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {actionExecuting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
