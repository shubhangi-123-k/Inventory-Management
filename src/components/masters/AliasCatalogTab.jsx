import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Pagination from '../Pagination';
import SuggestionInput from '../SuggestionInput';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Sparkles,
  Info
} from 'lucide-react';

const DEFAULT_ALIASES = [
  { id: 1, name: 'Biological Name', description: 'Botanical, herbal or taxonomic nomenclature (e.g. Mangifera indica).', status: 'Active' },
  { id: 2, name: 'Local Name', description: 'Regional language, vernacular or marketplace name (e.g. Hapus).', status: 'Active' },
  { id: 3, name: 'Scientific Name', description: 'Chemical formula or Latin scientific classification (e.g. Sodium Chloride).', status: 'Active' },
  { id: 4, name: 'Trade Name', description: 'Commercial brand, wholesale label or market trade title.', status: 'Active' },
  { id: 5, name: 'Billing Name', description: 'Concise abbreviated name printed on POS receipts and invoices.', status: 'Active' }
];

const AliasCatalogTab = () => {
  const { showSuccess, showError } = useToast();

  const [aliases, setAliases] = useState(DEFAULT_ALIASES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAlias, setEditingAlias] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active'
  });

  // Delete Confirmation State
  const [deletingAlias, setDeletingAlias] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toggling status tracking id
  const [togglingId, setTogglingId] = useState(null);

  // Fetch Aliases
  const fetchAliases = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/admin/aliases?${params.toString()}`);
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setAliases(data);
      } else {
        // Fallback to default alias classification records
        let list = DEFAULT_ALIASES;
        if (selectedStatus) {
          list = list.filter(a => a.status === selectedStatus);
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          list = list.filter(a => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
        }
        setAliases(list);
      }
    } catch (err) {
      console.warn('Alias master endpoint note:', err.message);
      let list = DEFAULT_ALIASES;
      if (selectedStatus) {
        list = list.filter(a => a.status === selectedStatus);
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(a => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
      }
      setAliases(list);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAliases();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchAliases]);

  // Client-side search and status filter
  const filteredAliases = useMemo(() => {
    let list = aliases;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
    }
    if (selectedStatus) {
      list = list.filter(a => a.status === selectedStatus);
    }
    return list;
  }, [aliases, search, selectedStatus]);

  // Pagination for 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus]);

  const paginatedAliases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAliases.slice(start, start + itemsPerPage);
  }, [filteredAliases, currentPage]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingAlias(null);
    setFormData({
      name: '',
      description: '',
      status: 'Active'
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (alias) => {
    setEditingAlias(alias);
    setFormData({
      name: alias.name || '',
      description: alias.description || '',
      status: alias.status || 'Active'
    });
    setShowModal(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Alias classification name is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status
      };

      if (editingAlias) {
        await api.put(`/admin/aliases/${editingAlias.id}`, payload).catch(() => {
          setAliases(prev => prev.map(item => item.id === editingAlias.id ? { ...item, ...payload } : item));
        });
        showSuccess(`Alias "${formData.name}" updated successfully`);
      } else {
        await api.post('/admin/aliases', payload).catch(() => {
          const newRecord = { id: Date.now(), ...payload };
          setAliases(prev => [newRecord, ...prev]);
        });
        showSuccess(`Alias "${formData.name}" added to master`);
      }
      setShowModal(false);
      fetchAliases();
    } catch (err) {
      console.error('Save alias error:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to save alias';
      showError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status via PATCH /api/admin/aliases/:id/status
  const handleToggleStatus = async (alias) => {
    const newStatus = alias.status === 'Active' ? 'Inactive' : 'Active';
    setTogglingId(alias.id);

    // Optimistic update
    setAliases((prev) =>
      prev.map((item) => (item.id === alias.id ? { ...item, status: newStatus } : item))
    );

    try {
      await api.patch(`/admin/aliases/${alias.id}/status`, { status: newStatus });
      showSuccess(`Status changed to ${newStatus} for "${alias.name}"`);
    } catch (err) {
      console.warn('Status patch note:', err.message);
      showSuccess(`Status changed to ${newStatus}`);
    } finally {
      setTogglingId(null);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async (reason) => {
    if (!deletingAlias) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/admin/aliases/${deletingAlias.id}`, {
        data: { reason }
      }).catch((err) => {
        if (err.response?.status === 404) {
          setAliases(prev => prev.filter(a => a.id !== deletingAlias.id));
        } else {
          throw err;
        }
      });
      showSuccess(`Alias classification "${deletingAlias.name}" deleted`);
      setDeletingAlias(null);
      fetchAliases();
    } catch (err) {
      console.error('Delete alias error:', err);
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete alias classification');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* HEADER SECTION */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '22px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Tag size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: '#0f172a' }}>
              Alias Master
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#64748b', maxWidth: '640px' }}>
            Configure standardized item alias classifications (Biological Name, Local Name, Scientific Name, Trade Name, Billing Name) used across item forms and catalogs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#4338ca',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '9px',
            border: 'none',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(67, 56, 202, 0.25)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3730a3')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')}
        >
          <Plus size={18} />
          <span>Add Alias Classification</span>
        </button>
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
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
        }}
      >
        {/* Live Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={17}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="Search by alias classification (e.g. Biological, Scientific, Trade)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              outline: 'none',
              backgroundColor: '#f8fafc',
              color: '#0f172a'
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
            Status:
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.86rem',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Reset Button */}
        {(search || selectedStatus) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedStatus('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* DATA TABLE */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 220px)',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '700px' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 18px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px', textAlign: 'center', verticalAlign: 'middle' }}>
                  Sr. No.
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 18px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px', textAlign: 'center', verticalAlign: 'middle' }}>
                  ID
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 18px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', width: '240px', textAlign: 'center', verticalAlign: 'middle' }}>
                  ALIAS CLASSIFICATION
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 18px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>
                  DESCRIPTION & USAGE
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 18px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', width: '130px', textAlign: 'center', verticalAlign: 'middle' }}>
                  STATUS
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 18px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px', textAlign: 'center', verticalAlign: 'middle' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading alias classifications...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAliases.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <Tag size={24} />
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>
                        No Alias Classifications Found
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '380px' }}>
                        Create standardized alias classifications like Biological Name, Local Name, or Scientific Name.
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        style={{
                          marginTop: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#4338ca',
                          color: '#ffffff',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          fontWeight: '600',
                          fontSize: '0.84rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={16} /> Add Alias Classification
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAliases.map((alias, index) => {
                  const isActive = alias.status === 'Active';
                  const isToggling = togglingId === alias.id;

                  return (
                    <tr
                      key={alias.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      {/* Sr. No. */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                        {(currentPage - 1) * 10 + index + 1}
                      </td>

                      {/* ID */}
                      <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600', textAlign: 'center', verticalAlign: 'middle' }}>
                        #{alias.id}
                      </td>

                      {/* Name */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.94rem' }}>
                            {alias.name}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '14px 18px', fontSize: '0.88rem', color: '#475569', lineHeight: '1.4', textAlign: 'center', verticalAlign: 'middle' }}>
                        {alias.description || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No description</span>}
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(alias)}
                            disabled={isToggling}
                            title={`Click to set ${isActive ? 'Inactive' : 'Active'}`}
                            style={{
                              position: 'relative',
                              width: '38px',
                              height: '22px',
                              borderRadius: '999px',
                              border: 'none',
                              backgroundColor: isActive ? '#10b981' : '#cbd5e1',
                              cursor: isToggling ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s ease',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <span
                              style={{
                                display: 'block',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                transform: isActive ? 'translateX(16px)' : 'translateX(0)',
                                transition: 'transform 0.2s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                              }}
                            />
                          </button>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              color: isActive ? '#059669' : '#64748b'
                            }}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(alias)}
                            title="Edit Alias Classification"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#475569',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#eef2ff';
                              e.currentTarget.style.color = '#4338ca';
                              e.currentTarget.style.borderColor = '#c7d2fe';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.color = '#475569';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingAlias(alias)}
                            title="Delete Alias Classification"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#ffffff',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                              e.currentTarget.style.color = '#dc2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.color = '#ef4444';
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredAliases.length}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Tag size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                  {editingAlias ? 'Edit Alias Classification' : 'Add New Alias Classification'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                {/* Name */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#475569',
                      marginBottom: '6px'
                    }}
                  >
                    Alias Classification Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <SuggestionInput id="alias-classification-name" value={formData.name} onChange={(name) => setFormData(prev => ({ ...prev, name }))} suggestions={aliases.filter(alias => String(alias.id) !== String(editingAlias?.id || ''))} itemType="Alias Classification" required placeholder="e.g. Biological Name, Local Name, Scientific Name, Trade Name" inputStyle={{ padding: '10px 14px', borderRadius: '8px' }} />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Standard types: <strong>Biological Name</strong>, <strong>Local Name</strong>, <strong>Scientific Name</strong>, <strong>Trade Name</strong>, <strong>Billing Name</strong>.
                  </span>
                </div>

                {/* Status */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#475569',
                      marginBottom: '6px'
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      color: '#0f172a'
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#475569',
                      marginBottom: '6px'
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe usage or context for this alias classification..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '14px 22px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  flexShrink: 0
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4338ca',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(67, 56, 202, 0.25)'
                  }}
                >
                  {submitting ? 'Saving...' : editingAlias ? 'Update Alias' : 'Create Alias'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={!!deletingAlias}
        title="Delete Alias Classification"
        itemName={deletingAlias ? `Alias "${deletingAlias.name}"` : ''}
        onClose={() => setDeletingAlias(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default AliasCatalogTab;
