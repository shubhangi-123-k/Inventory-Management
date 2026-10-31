import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, Trash2, Edit2, Search, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import AddOccasionModal from '../components/AddOccasionModal';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const Occasions = () => {
  const [occasions, setOccasions] = useState([]);
  const [types, setTypes] = useState(['Festival', 'Season', 'Event', 'Other']);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOccasion, setEditingOccasion] = useState(null);
  const [deletingOccasion, setDeletingOccasion] = useState(null);
  const [deleteOccasionLoading, setDeleteOccasionLoading] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  // Edit State Form
  const [editOccasionType, setEditOccasionType] = useState('Festival');
  const [editOccasionName, setEditOccasionName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editSaving, setEditSaving] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // 1. Fetch Types from API: GET /admin/occasions/types
  const fetchTypes = async () => {
    try {
      const res = await api.get('/admin/occasions/types');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        const cleaned = data.map(item => (typeof item === 'object' && item !== null ? (item.type || item.name || String(item)) : String(item)));
        if (cleaned.length > 0) setTypes(cleaned);
      }
    } catch (err) {
      console.warn('Failed to fetch occasion types:', err);
    }
  };

  // 2. Fetch Occasions with Query Filters: GET /admin/occasions?occasion_type=...&status=...&search=...
  const fetchOccasions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType !== 'ALL') params.occasion_type = filterType;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/admin/occasions', { params });
      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res.data?.data)) {
        list = res.data.data;
      } else if (Array.isArray(res.data?.occasions)) {
        list = res.data.occasions;
      } else if (Array.isArray(res.data?.rows)) {
        list = res.data.rows;
      }
      setOccasions(list);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch occasions:', err);
      setOccasions([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    const delayDebounceFn = setTimeout(() => {
      fetchOccasions();
    }, 250);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterType, filterStatus]);

  // 3. Open Edit Form using: GET /admin/occasions/:id
  const handleOpenEdit = async (occ) => {
    try {
      // First populate with available row data
      setEditingOccasion(occ);
      setEditOccasionType(occ.occasion_type || (types[0] || 'Festival'));
      setEditOccasionName(occ.occasion_name || '');
      setEditDescription(occ.description || '');
      setEditStartDate(occ.start_date ? occ.start_date.split('T')[0] : '');
      setEditEndDate(occ.end_date ? occ.end_date.split('T')[0] : '');
      setEditStatus(occ.status || 'Active');
      setEditErrorMsg('');

      // Fetch fresh details by ID: GET /admin/occasions/:id
      const res = await api.get(`/admin/occasions/${occ.id}`);
      const fresh = res.data?.data || res.data;
      if (fresh) {
        setEditOccasionType(fresh.occasion_type || (types[0] || 'Festival'));
        setEditOccasionName(fresh.occasion_name || '');
        setEditDescription(fresh.description || '');
        setEditStartDate(fresh.start_date ? fresh.start_date.split('T')[0] : '');
        setEditEndDate(fresh.end_date ? fresh.end_date.split('T')[0] : '');
        setEditStatus(fresh.status || 'Active');
      }
    } catch (err) {
      console.warn('Failed to fetch occasion detail by id:', err);
    }
  };

  const handleCloseEdit = () => {
    setEditingOccasion(null);
    setEditErrorMsg('');
  };

  // 4. Update Occasion API: PUT /admin/occasions/:id
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditErrorMsg('');

    if (!editOccasionName.trim()) {
      setEditErrorMsg('Occasion Name is required');
      return;
    }

    if (editStartDate && editEndDate) {
      if (new Date(editStartDate) > new Date(editEndDate)) {
        setEditErrorMsg('Start Date must be before or equal to End Date');
        return;
      }
    }

    setEditSaving(true);
    try {
      await api.put(`/admin/occasions/${editingOccasion.id}`, {
        occasion_type: editOccasionType.trim(),
        occasion_name: editOccasionName.trim(),
        description: editDescription ? editDescription.trim() : null,
        start_date: editStartDate || null,
        end_date: editEndDate || null,
        status: editStatus,
      });

      fetchOccasions();
      handleCloseEdit();
    } catch (err) {
      console.error('Failed to update occasion:', err);
      setEditErrorMsg(err.response?.data?.message || 'Failed to update occasion');
    } finally {
      setEditSaving(false);
    }
  };

  // 5. Delete Occasion API: DELETE /admin/occasions/:id
  const handleConfirmDeleteOccasion = async (reason) => {
    if (!deletingOccasion) return;
    try {
      setDeleteOccasionLoading(true);
      await api.delete(`/admin/occasions/${deletingOccasion.id}`, {
        data: { reason }
      });
      setDeletingOccasion(null);
      fetchOccasions();
    } catch (err) {
      console.error('Failed to delete occasion:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete occasion');
    } finally {
      setDeleteOccasionLoading(false);
    }
  };

  // 6. Toggle Status API: PUT /admin/occasions/:id (or PATCH /admin/occasions/:id/status)
  const handleToggleStatus = async (occ) => {
    const nextStatus = occ.status === 'Active' ? 'Inactive' : 'Active';
    setTogglingStatusId(occ.id);

    // Optimistically update local UI state
    setOccasions((prev) =>
      prev.map((item) => (item.id === occ.id ? { ...item, status: nextStatus } : item))
    );

    try {
      await api.put(`/admin/occasions/${occ.id}`, {
        occasion_type: occ.occasion_type,
        occasion_name: occ.occasion_name,
        description: occ.description || null,
        start_date: occ.start_date ? String(occ.start_date).split('T')[0] : null,
        end_date: occ.end_date ? String(occ.end_date).split('T')[0] : null,
        status: nextStatus,
      });
      fetchOccasions();
    } catch (err) {
      console.warn('PUT failed, trying PATCH status endpoint:', err);
      try {
        await api.patch(`/admin/occasions/${occ.id}/status`, { status: nextStatus });
        fetchOccasions();
      } catch (patchErr) {
        console.error('Failed to toggle status:', patchErr);
        // Revert on failure
        setOccasions((prev) =>
          prev.map((item) => (item.id === occ.id ? { ...item, status: occ.status } : item))
        );
        alert(patchErr.response?.data?.message || err.response?.data?.message || 'Failed to update occasion status');
      }
    } finally {
      setTogglingStatusId(null);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Occasions Master</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Manage festivals, seasons, and marketing events
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '7px', backgroundColor: '#4338ca', color: '#fff', border: 'none', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <Plus size={15} />
          <span>Add Occasion</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search occasions by name, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 42px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.95rem', backgroundColor: '#fff' }}
          />
        </div>

        {/* Occasion Types Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {['ALL', ...types].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: filterType === type ? '1px solid #4338ca' : '1px solid #cbd5e1',
                backgroundColor: filterType === type ? '#ede9fe' : '#fff',
                color: filterType === type ? '#4338ca' : '#475569',
                fontWeight: filterType === type ? '600' : '500',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#fff',
            color: '#334155',
            fontSize: '0.85rem',
            fontWeight: '600',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="ALL">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Occasions Table */}
      <div className="table-container" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ width: '60px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Sr. No.</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Occasion Type</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Occasion Name</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Description</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Start Date</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>End Date</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Status</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  Loading occasions...
                </td>
              </tr>
            ) : occasions.length > 0 ? (
              occasions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((occ, idx) => (
                <tr key={occ.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        backgroundColor:
                          occ.occasion_type === 'Festival'
                            ? '#fef3c7'
                            : occ.occasion_type === 'Season'
                            ? '#dbeafe'
                            : occ.occasion_type === 'Event'
                            ? '#e0e7ff'
                            : '#f1f5f9',
                        color:
                          occ.occasion_type === 'Festival'
                            ? '#92400e'
                            : occ.occasion_type === 'Season'
                            ? '#1e40af'
                            : occ.occasion_type === 'Event'
                            ? '#3730a3'
                            : '#475569',
                      }}
                    >
                      {occ.occasion_type || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a', textAlign: 'center', verticalAlign: 'middle' }}>
                    {occ.occasion_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.88rem', maxWidth: '300px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {occ.description || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.88rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    {occ.start_date ? String(occ.start_date).split('T')[0] : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.88rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    {occ.end_date ? String(occ.end_date).split('T')[0] : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div
                        onClick={() => !togglingStatusId && handleToggleStatus(occ)}
                        style={{
                          cursor: togglingStatusId === occ.id ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: occ.status === 'Active' ? 'flex-end' : 'flex-start',
                          width: '38px',
                          height: '20px',
                          background: occ.status === 'Active' ? '#4338ca' : '#cbd5e1',
                          borderRadius: '10px',
                          padding: '2px',
                          transition: 'background 0.2s, justify-content 0.2s',
                          marginRight: '8px',
                          opacity: togglingStatusId === occ.id ? 0.6 : 1,
                        }}
                        title={`Click to set ${occ.status === 'Active' ? 'Inactive' : 'Active'}`}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            background: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            transition: 'transform 0.2s'
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: occ.status === 'Active' ? '#4338ca' : '#64748b'
                        }}
                      >
                        {occ.status || 'Active'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleOpenEdit(occ)}
                        style={{ border: 'none', background: '#f1f5f9', color: '#4338ca', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        title="Edit Occasion"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingOccasion(occ)}
                        style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        title="Delete Occasion"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  No occasions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={occasions.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* Add Modal: POST /admin/occasions */}
      <AddOccasionModal
        isOpen={showAddModal}
        availableTypes={types}
        onClose={() => setShowAddModal(false)}
        onOccasionAdded={() => {
          fetchOccasions();
          setShowAddModal(false);
        }}
      />

      {/* Edit Occasion Modal: PUT /admin/occasions/:id */}
      {editingOccasion && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '520px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* Header */}
            <div style={{ padding: '24px 28px 16px 28px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
              <button
                type="button"
                onClick={handleCloseEdit}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: '#ede9fe', padding: '8px', borderRadius: '10px', color: '#4338ca' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Edit Occasion</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Update occasion information</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="custom-modal-scroll" style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
              {editErrorMsg && (
                <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {editErrorMsg}
                </div>
              )}

              <form onSubmit={handleEditSubmit}>
                {/* Occasion Type */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Occasion Type *
                  </label>
                  <select
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                    value={editOccasionType}
                    onChange={(e) => setEditOccasionType(e.target.value)}
                  >
                    {types.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Occasion Name */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Occasion Name *
                  </label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                    value={editOccasionName}
                    onChange={(e) => setEditOccasionName(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', minHeight: '65px', resize: 'vertical', fontSize: '0.9rem' }}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>

                {/* Dates: Start Date & End Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Status */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    style={{ padding: '9px 18px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    style={{
                      padding: '9px 24px',
                      border: 'none',
                      backgroundColor: '#4338ca',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: editSaving ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.3)',
                    }}
                  >
                    {editSaving ? 'Updating...' : 'Update Occasion'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!deletingOccasion}
        title="Delete Occasion"
        itemName={deletingOccasion ? `Occasion "${deletingOccasion.name}"` : ''}
        onClose={() => setDeletingOccasion(null)}
        onConfirm={handleConfirmDeleteOccasion}
        isLoading={deleteOccasionLoading}
      />
    </div>
  );
};

export default Occasions;
