import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import VisualDiffModal from '../components/VisualDiffModal';
import Pagination from '../components/Pagination';
import {
  ListTodo,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  Loader2,
  X
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

const MyApprovals = () => {
  const { showError } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Selected for Inspect Modal
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequestData, setSelectedRequestData] = useState(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Sub-Admin's submissions
  const fetchMySubmissions = useCallback(async () => {
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
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      // Fetch user's own change requests
      let res;
      try {
        res = await api.get(`/approval-requests/my-requests?${params.toString()}`);
      } catch (err) {
        // Fallback to /admin/approval-requests/my-requests if needed
        res = await api.get(`/admin/approval-requests/my-requests?${params.toString()}`);
      }

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
      console.error('Failed to load submissions:', err);
      showError('Failed to load your submitted change requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, moduleFilter, debouncedSearch, showError]);

  useEffect(() => {
    fetchMySubmissions();
  }, [fetchMySubmissions]);

  // Listen to global approval updates
  useEffect(() => {
    const handleStatsUpdate = () => {
      fetchMySubmissions();
    };
    window.addEventListener('approval:stats_updated', handleStatsUpdate);
    window.addEventListener('approval:pending', handleStatsUpdate);
    return () => {
      window.removeEventListener('approval:stats_updated', handleStatsUpdate);
      window.removeEventListener('approval:pending', handleStatsUpdate);
    };
  }, [fetchMySubmissions]);

  // Count summaries
  const counts = requests.reduce(
    (acc, r) => {
      const st = (r.status || 'PENDING').toUpperCase();
      if (st === 'PENDING') acc.pending++;
      else if (st === 'APPROVED') acc.approved++;
      else if (st === 'REJECTED') acc.rejected++;
      acc.total++;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0, total: 0 }
  );

  const handleOpenInspect = (req) => {
    setSelectedRequestId(req.id);
    setSelectedRequestData(req);
    setIsDiffModalOpen(true);
  };

  return (
    <div style={{ padding: '0 0 24px 0', maxWidth: '1440px', margin: '0 auto' }}>
      {/* HEADER */}
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
            <ListTodo size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', color: '#0f172a' }}>
              My Submissions
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: '#64748b' }}>
              Track the status of your staged database mutations and review Super Admin decisions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            fetchMySubmissions();
          }}
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
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* METRIC CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Total Submitted */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setCurrentPage(1);
          }}
          style={{
            backgroundColor: '#eff6ff',
            border: statusFilter === 'ALL' ? '2px solid #3b82f6' : '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '16px 20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1d4ed8' }}>Total Submitted</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e40af', marginTop: '4px' }}>
            {totalCount || requests.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#3b82f6', marginTop: '2px' }}>
            All change requests
          </div>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => {
            setStatusFilter('PENDING');
            setCurrentPage(1);
          }}
          style={{
            backgroundColor: '#fffbeb',
            border: statusFilter === 'PENDING' ? '2px solid #f59e0b' : '1px solid #fde68a',
            borderRadius: '12px',
            padding: '16px 20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#b45309' }}>Pending Review</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#92400e', marginTop: '4px' }}>
            {counts.pending}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '2px' }}>
            Awaiting Super Admin decision
          </div>
        </div>

        {/* Approved */}
        <div
          onClick={() => {
            setStatusFilter('APPROVED');
            setCurrentPage(1);
          }}
          style={{
            backgroundColor: '#f0fdf4',
            border: statusFilter === 'APPROVED' ? '2px solid #16a34a' : '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '16px 20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#15803d' }}>Approved</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#166534', marginTop: '4px' }}>
            {counts.approved}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '2px' }}>
            Committed into live database
          </div>
        </div>

        {/* Rejected */}
        <div
          onClick={() => {
            setStatusFilter('REJECTED');
            setCurrentPage(1);
          }}
          style={{
            backgroundColor: '#fef2f2',
            border: statusFilter === 'REJECTED' ? '2px solid #dc2626' : '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px 20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#b91c1c' }}>Rejected</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#991b1b', marginTop: '4px' }}>
            {counts.rejected}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#b91c1c', marginTop: '2px' }}>
            Rejected with comments
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Status Pills */}
        <div style={{ display: 'inline-flex', padding: '3px', backgroundColor: '#f1f5f9', borderRadius: '8px', gap: '3px' }}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: active ? '700' : '600',
                  border: 'none',
                  backgroundColor: active ? '#ffffff' : 'transparent',
                  color: active ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Module Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
          <div style={{ position: 'relative', minWidth: '220px', maxWidth: '340px', width: '100%' }}>
            <Search
              size={15}
              color="#94a3b8"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 30px 8px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              color: '#334155',
              backgroundColor: '#ffffff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {MODULES_LIST.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
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
            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>Loading your submissions...</div>
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
              <ListTodo size={28} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>
              No Submissions Found
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '420px' }}>
              Whenever you create, edit, or delete any record, it will appear here pending Super Admin approval.
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
                    Module & Action
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Target Record
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Submitted At
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    My Justification
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Status & Feedback
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
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, idx) => {
                  const reqModule = (req.module || 'PRODUCTS').toUpperCase();
                  const reqAction = (req.action || 'UPDATE').toUpperCase();
                  const reqStatus = (req.status || 'PENDING').toUpperCase();
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
                    `Record #${req.entity_id || 'N/A'}`;

                  return (
                    <tr
                      key={req.id || idx}
                      style={{
                        borderBottom: idx < requests.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.12s ease',
                      }}
                    >
                      {/* 0. Sr. No. */}
                      <td style={{ padding: '14px 10px', verticalAlign: 'middle', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '0.82rem' }}>
                        {idx + 1}
                      </td>

                      {/* ID */}
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

                      {/* Module & Action */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: modColor.bg,
                              color: modColor.text,
                              border: `1px solid ${modColor.border}`,
                            }}
                          >
                            {modColor.label}
                          </span>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
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
                            }}
                          >
                            {reqAction}
                          </span>
                        </div>
                      </td>

                      {/* Target */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', maxWidth: '240px' }}>
                        <div
                          style={{
                            fontWeight: '700',
                            fontSize: '0.86rem',
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={targetName}
                        >
                          {targetName}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                          {getRelativeTime(req.createdAt || req.created_at)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {req.createdAt || req.created_at ? new Date(req.createdAt || req.created_at).toLocaleDateString() : '-'}
                        </div>
                      </td>

                      {/* Justification */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', maxWidth: '200px' }}>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#475569',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={req.reason || req.justification || 'No reason specified'}
                        >
                          {req.reason || req.justification || <span style={{ color: '#94a3b8' }}>None</span>}
                        </div>
                      </td>

                      {/* Status & Feedback */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', maxWidth: '240px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              width: 'fit-content',
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
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  backgroundColor: '#d97706',
                                  animation: 'pulse 1.5s infinite',
                                }}
                              />
                            )}
                            {reqStatus === 'APPROVED' && <CheckCircle2 size={11} />}
                            {reqStatus === 'REJECTED' && <XCircle size={11} />}
                            <span>{reqStatus}</span>
                          </span>

                          {/* Rejection reason or reviewer feedback callout */}
                          {(req.review_notes || req.rejection_reason || req.notes) && (
                            <div
                              style={{
                                fontSize: '0.74rem',
                                color: reqStatus === 'REJECTED' ? '#b91c1c' : '#15803d',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={req.review_notes || req.rejection_reason || req.notes}
                            >
                              <strong>Note:</strong> {req.review_notes || req.rejection_reason || req.notes}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenInspect(req)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#94a3b8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
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

      {/* INSPECT SUBMISSION MODAL */}
      <VisualDiffModal
        isOpen={isDiffModalOpen}
        requestId={selectedRequestId}
        requestData={selectedRequestData}
        onClose={() => setIsDiffModalOpen(false)}
        canApprove={false}
      />
    </div>
  );
};

export default MyApprovals;
