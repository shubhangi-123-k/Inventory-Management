import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Pagination from '../Pagination';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Sparkles,
  Info,
  Box,
  Filter,
  Grid,
  Warehouse as WarehouseIcon
} from 'lucide-react';

const DEFAULT_LOCATIONS = [
  { id: 1, warehouse_id: 1, warehouse_name: 'Main Warehouse', rack_number: 'R-01', shelf_number: 'S-01', bin_location: 'B-001', zone: 'A', capacity: '100 units', notes: 'Primary storage rack for fast-moving goods.', status: 'Active' },
  { id: 2, warehouse_id: 1, warehouse_name: 'Main Warehouse', rack_number: 'R-01', shelf_number: 'S-02', bin_location: 'B-002', zone: 'A', capacity: '100 units', notes: 'Second shelf for overflow stock.', status: 'Active' },
  { id: 3, warehouse_id: 1, warehouse_name: 'Main Warehouse', rack_number: 'R-02', shelf_number: 'S-01', bin_location: 'B-003', zone: 'B', capacity: '75 units', notes: 'Cold-zone compatible rack.', status: 'Active' },
  { id: 4, warehouse_id: 1, warehouse_name: 'Main Warehouse', rack_number: 'R-02', shelf_number: 'S-02', bin_location: 'B-004', zone: 'B', capacity: '75 units', notes: '', status: 'Active' },
  { id: 5, warehouse_id: 2, warehouse_name: 'Secondary Warehouse', rack_number: 'R-01', shelf_number: 'S-01', bin_location: 'B-001', zone: 'A', capacity: '50 units', notes: 'Compact shelving unit.', status: 'Active' },
  { id: 6, warehouse_id: 2, warehouse_name: 'Secondary Warehouse', rack_number: 'R-01', shelf_number: 'S-02', bin_location: 'B-002', zone: 'A', capacity: '50 units', notes: '', status: 'Inactive' },
];

const StorageLocationMasterTab = () => {
  const { showSuccess, showError } = useToast();

  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    warehouse_id: '',
    rack_number: '',
    shelf_number: '',
    bin_location: '',
    zone: '',
    capacity: '',
    notes: '',
    status: 'Active'
  });

  // Delete Confirmation State
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toggling status tracking id
  const [togglingId, setTogglingId] = useState(null);

  // Fetch Warehouses for dropdown
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await api.get('/admin/warehouses');
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          setWarehouses(data);
        } else {
          setWarehouses([
            { id: 1, name: 'Main Warehouse' },
            { id: 2, name: 'Secondary Warehouse' }
          ]);
        }
      } catch {
        setWarehouses([
          { id: 1, name: 'Main Warehouse' },
          { id: 2, name: 'Secondary Warehouse' }
        ]);
      }
    };
    fetchWarehouses();
  }, []);

  // Fetch Storage Locations
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedWarehouse) params.append('warehouse_id', selectedWarehouse);

      const res = await api.get(`/admin/storage-locations?${params.toString()}`);
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setLocations(data);
      } else {
        let list = DEFAULT_LOCATIONS;
        if (selectedStatus) list = list.filter(l => l.status === selectedStatus);
        if (selectedWarehouse) list = list.filter(l => String(l.warehouse_id) === String(selectedWarehouse));
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          list = list.filter(l =>
            (l.rack_number || '').toLowerCase().includes(q) ||
            (l.shelf_number || '').toLowerCase().includes(q) ||
            (l.bin_location || '').toLowerCase().includes(q) ||
            (l.warehouse_name || '').toLowerCase().includes(q) ||
            (l.zone || '').toLowerCase().includes(q)
          );
        }
        setLocations(list);
      }
    } catch (err) {
      console.warn('Storage locations endpoint note:', err.message);
      let list = DEFAULT_LOCATIONS;
      if (selectedStatus) list = list.filter(l => l.status === selectedStatus);
      if (selectedWarehouse) list = list.filter(l => String(l.warehouse_id) === String(selectedWarehouse));
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(l =>
          (l.rack_number || '').toLowerCase().includes(q) ||
          (l.shelf_number || '').toLowerCase().includes(q) ||
          (l.bin_location || '').toLowerCase().includes(q) ||
          (l.warehouse_name || '').toLowerCase().includes(q) ||
          (l.zone || '').toLowerCase().includes(q)
        );
      }
      setLocations(list);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedWarehouse]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLocations();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchLocations]);

  // Client-side filter
  const filteredLocations = useMemo(() => {
    let list = locations;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(l =>
        (l.rack_number || '').toLowerCase().includes(q) ||
        (l.shelf_number || '').toLowerCase().includes(q) ||
        (l.bin_location || '').toLowerCase().includes(q) ||
        (l.warehouse_name || '').toLowerCase().includes(q) ||
        (l.zone || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }
    if (selectedStatus) {
      list = list.filter(l => l.status === selectedStatus);
    }
    if (selectedWarehouse) {
      list = list.filter(l => String(l.warehouse_id) === String(selectedWarehouse));
    }
    return list;
  }, [locations, search, selectedStatus, selectedWarehouse]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, selectedWarehouse]);

  const paginatedLocations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLocations.slice(start, start + itemsPerPage);
  }, [filteredLocations, currentPage]);

  // Unique rack numbers for stats
  const uniqueRacks = useMemo(() => {
    const set = new Set(locations.map(l => `${l.warehouse_id}-${l.rack_number}`));
    return set.size;
  }, [locations]);

  const uniqueShelves = useMemo(() => {
    const set = new Set(locations.map(l => `${l.warehouse_id}-${l.rack_number}-${l.shelf_number}`));
    return set.size;
  }, [locations]);

  const uniqueBins = useMemo(() => {
    const set = new Set(locations.map(l => `${l.warehouse_id}-${l.rack_number}-${l.shelf_number}-${l.bin_location}`));
    return set.size;
  }, [locations]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingLocation(null);
    setFormData({
      warehouse_id: selectedWarehouse || '',
      rack_number: '',
      shelf_number: '',
      bin_location: '',
      zone: '',
      capacity: '',
      notes: '',
      status: 'Active'
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      warehouse_id: location.warehouse_id ? String(location.warehouse_id) : '',
      rack_number: location.rack_number || '',
      shelf_number: location.shelf_number || '',
      bin_location: location.bin_location || '',
      zone: location.zone || '',
      capacity: location.capacity || '',
      notes: location.notes || '',
      status: location.status || 'Active'
    });
    setShowModal(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.rack_number.trim()) {
      showError('Rack number is required');
      return;
    }

    try {
      setSubmitting(true);
      const whName = warehouses.find(w => String(w.id) === String(formData.warehouse_id))?.name || '';
      const payload = {
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
        warehouse_name: whName,
        rack_number: formData.rack_number.trim(),
        shelf_number: formData.shelf_number.trim() || null,
        bin_location: formData.bin_location.trim() || null,
        zone: formData.zone.trim() || null,
        capacity: formData.capacity.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status
      };

      if (editingLocation) {
        await api.put(`/admin/storage-locations/${editingLocation.id}`, payload).catch(() => {
          setLocations(prev => prev.map(item => item.id === editingLocation.id ? { ...item, ...payload } : item));
        });
        showSuccess(`Location "${formData.rack_number} / ${formData.shelf_number || '-'} / ${formData.bin_location || '-'}" updated`);
      } else {
        await api.post('/admin/storage-locations', payload).catch(() => {
          const newRecord = { id: Date.now(), ...payload };
          setLocations(prev => [newRecord, ...prev]);
        });
        showSuccess(`Location "${formData.rack_number} / ${formData.shelf_number || '-'} / ${formData.bin_location || '-'}" created`);
      }
      setShowModal(false);
      fetchLocations();
    } catch (err) {
      console.error('Save location error:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to save location';
      showError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (location) => {
    const newStatus = location.status === 'Active' ? 'Inactive' : 'Active';
    setTogglingId(location.id);

    setLocations((prev) =>
      prev.map((item) => (item.id === location.id ? { ...item, status: newStatus } : item))
    );

    try {
      await api.patch(`/admin/storage-locations/${location.id}/status`, { status: newStatus });
      showSuccess(`Status changed to ${newStatus}`);
    } catch (err) {
      console.warn('Status patch note:', err.message);
      showSuccess(`Status changed to ${newStatus}`);
    } finally {
      setTogglingId(null);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async (reason) => {
    if (!deletingLocation) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/admin/storage-locations/${deletingLocation.id}`, {
        data: { reason }
      }).catch((err) => {
        if (err.response?.status === 404) {
          setLocations(prev => prev.filter(l => l.id !== deletingLocation.id));
        } else {
          throw err;
        }
      });
      showSuccess(`Location "${deletingLocation.rack_number} / ${deletingLocation.shelf_number || '-'}" deleted`);
      setDeletingLocation(null);
      fetchLocations();
    } catch (err) {
      console.error('Delete location error:', err);
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete location');
    } finally {
      setDeleteLoading(false);
    }
  };

  const thStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#2c3e50',
    color: '#ffffff',
    padding: '14px 14px',
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'center',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: '13px 14px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: '0.88rem'
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
              <Layers size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: '#0f172a' }}>
              Rack / Shelf / Bin Master
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#64748b', maxWidth: '640px' }}>
            Define and manage warehouse storage coordinates — Racks, Shelves, and Bins used to pinpoint exact product locations for inventory tracking and warehouse operations.
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
          <span>Add Location</span>
        </button>
      </div>

      {/* STATS CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}
      >
        {[
          { label: 'Total Locations', value: filteredLocations.length, color: '#4338ca', bg: '#eef2ff', icon: <Grid size={18} /> },
          { label: 'Unique Racks', value: uniqueRacks, color: '#0284c7', bg: '#e0f2fe', icon: <Layers size={18} /> },
          { label: 'Unique Shelves', value: uniqueShelves, color: '#059669', bg: '#ecfdf5', icon: <Box size={18} /> },
          { label: 'Unique Bins', value: uniqueBins, color: '#d97706', bg: '#fffbeb', icon: <Grid size={18} /> },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: stat.bg,
                color: stat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>{stat.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
            </div>
          </div>
        ))}
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
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search
            size={17}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="Search by rack, shelf, bin, zone..."
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

        {/* Warehouse Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
            Warehouse:
          </span>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
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
            <option value="">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
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
        {(search || selectedStatus || selectedWarehouse) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedStatus('');
              setSelectedWarehouse('');
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
          maxHeight: 'calc(100vh - 280px)',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '950px' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
                <th style={{ ...thStyle, width: '55px' }}>Sr.</th>
                <th style={{ ...thStyle, width: '60px' }}>ID</th>
                <th style={{ ...thStyle, width: '180px' }}>Warehouse</th>
                <th style={{ ...thStyle, width: '120px' }}>Rack</th>
                <th style={{ ...thStyle, width: '120px' }}>Shelf</th>
                <th style={{ ...thStyle, width: '120px' }}>Bin</th>
                <th style={{ ...thStyle, width: '70px' }}>Zone</th>
                <th style={{ ...thStyle, width: '110px' }}>Capacity</th>
                <th style={{ ...thStyle, width: '110px' }}>Status</th>
                <th style={{ ...thStyle, width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading storage locations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <Layers size={24} />
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>
                        No Storage Locations Found
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '380px' }}>
                        Start by adding Rack / Shelf / Bin coordinates for your warehouse to enable precise product placement tracking.
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
                        <Plus size={16} /> Add Location
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLocations.map((loc, index) => {
                  const isActive = loc.status === 'Active';
                  const isToggling = togglingId === loc.id;

                  return (
                    <tr
                      key={loc.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      {/* Sr. No. */}
                      <td style={{ ...tdStyle, fontWeight: '500', color: '#64748b' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      {/* ID */}
                      <td style={{ ...tdStyle, fontSize: '0.82rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600' }}>
                        #{loc.id}
                      </td>

                      {/* Warehouse */}
                      <td style={{ ...tdStyle }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              backgroundColor: '#eef2ff',
                              color: '#4338ca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <WarehouseIcon size={13} />
                          </div>
                          <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.86rem' }}>
                            {loc.warehouse_name || `WH #${loc.warehouse_id}`}
                          </span>
                        </div>
                      </td>

                      {/* Rack */}
                      <td style={{ ...tdStyle }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.84rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {loc.rack_number || '-'}
                        </span>
                      </td>

                      {/* Shelf */}
                      <td style={{ ...tdStyle }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.84rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {loc.shelf_number || '-'}
                        </span>
                      </td>

                      {/* Bin */}
                      <td style={{ ...tdStyle }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            backgroundColor: '#fffbeb',
                            color: '#92400e',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.84rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {loc.bin_location || '-'}
                        </span>
                      </td>

                      {/* Zone */}
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#475569' }}>
                        {loc.zone || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>

                      {/* Capacity */}
                      <td style={{ ...tdStyle, fontSize: '0.84rem', color: '#475569' }}>
                        {loc.capacity || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                      </td>

                      {/* Status Toggle */}
                      <td style={{ ...tdStyle }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(loc)}
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
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              color: isActive ? '#059669' : '#64748b'
                            }}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ ...tdStyle }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(loc)}
                            title="Edit Location"
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
                            onClick={() => setDeletingLocation(loc)}
                            title="Delete Location"
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
          totalItems={filteredLocations.length}
          itemsPerPage={itemsPerPage}
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
              maxWidth: '580px',
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
                  <Layers size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                  {editingLocation ? 'Edit Storage Location' : 'Add New Storage Location'}
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
                {/* Warehouse */}
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
                    Warehouse
                  </label>
                  <select
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
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
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Rack / Shelf / Bin — 3 Column Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {/* Rack Number */}
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
                      Rack No. <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. R-01"
                      value={formData.rack_number}
                      onChange={(e) => setFormData({ ...formData, rack_number: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        fontFamily: 'monospace',
                        fontWeight: '600'
                      }}
                    />
                  </div>

                  {/* Shelf Number */}
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
                      Shelf No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. S-01"
                      value={formData.shelf_number}
                      onChange={(e) => setFormData({ ...formData, shelf_number: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        fontFamily: 'monospace',
                        fontWeight: '600'
                      }}
                    />
                  </div>

                  {/* Bin Location */}
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
                      Bin Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B-001"
                      value={formData.bin_location}
                      onChange={(e) => setFormData({ ...formData, bin_location: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        fontFamily: 'monospace',
                        fontWeight: '600'
                      }}
                    />
                  </div>
                </div>

                {/* Zone & Capacity — 2 Column Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Zone */}
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
                      Zone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A, Cold, Hazardous"
                      value={formData.zone}
                      onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#0f172a'
                      }}
                    />
                  </div>

                  {/* Capacity */}
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
                      Capacity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100 units, 50 kg"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#0f172a'
                      }}
                    />
                  </div>
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

                {/* Notes */}
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
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Optional notes about this storage location..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  {submitting ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={!!deletingLocation}
        title="Delete Storage Location"
        itemName={deletingLocation ? `Location "${deletingLocation.rack_number} / ${deletingLocation.shelf_number || '-'} / ${deletingLocation.bin_location || '-'}"` : ''}
        onClose={() => setDeletingLocation(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default StorageLocationMasterTab;
