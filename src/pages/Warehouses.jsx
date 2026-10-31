import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { Warehouse as WarehouseIcon, Search, Plus, Edit2, Trash2, Check, X, MapPin, Phone, User, ShieldCheck, Mail, Layers } from 'lucide-react';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import SuggestionInput from '../components/SuggestionInput';
import { useAuth } from '../context/AuthContext';

const Warehouses = () => {
  const { hasPermission } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State for Add / Edit Warehouse
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields matching Backend Schema with complete fields
  const [name, setName] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [warehouseType, setWarehouseType] = useState('Central Distribution Center');
  const [status, setStatus] = useState('Active');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [totalCapacity, setTotalCapacity] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/warehouses');
      const data = res.data?.data || res.data?.warehouses || (Array.isArray(res.data) ? res.data : []);
      setWarehouses(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setWarehouseCode('');
    setWarehouseType('Central Distribution Center');
    setStatus('Active');
    setAddressLine1('');
    setCity('');
    setState('');
    setCountry('India');
    setPincode('');
    setContactPerson('');
    setPhoneNumber('');
    setEmail('');
    setTotalCapacity('');
    setIsDefault(false);
    setShowModal(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (wh) => {
    setEditingId(wh.id);
    setName(wh.name || '');
    setWarehouseCode(wh.warehouse_code || wh.code || '');
    setWarehouseType(wh.warehouse_type || wh.type || 'Central Distribution Center');
    setStatus(wh.status || 'Active');
    setAddressLine1(wh.address_line_1 || wh.address || '');
    setCity(wh.city || '');
    setState(wh.state || '');
    setCountry(wh.country || 'India');
    setPincode(wh.pincode || '');
    setContactPerson(wh.contact_person || wh.manager_name || '');
    setPhoneNumber(wh.phone_number || wh.contact_number || '');
    setEmail(wh.email || '');
    setTotalCapacity(wh.total_capacity || wh.capacity || '');
    setIsDefault(Boolean(wh.is_default));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      warehouse_code: warehouseCode || null,
      code: warehouseCode || null,
      warehouse_type: warehouseType || 'Central Distribution Center',
      type: warehouseType || 'Central Distribution Center',
      status: status || 'Active',
      address_line_1: addressLine1 || null,
      address: addressLine1 || null,
      city: city || null,
      state: state || null,
      country: country || 'India',
      pincode: pincode || null,
      contact_person: contactPerson || null,
      manager_name: contactPerson || null,
      phone_number: phoneNumber || null,
      contact_number: phoneNumber || null,
      email: email || null,
      total_capacity: totalCapacity || null,
      capacity: totalCapacity || null,
      is_default: Boolean(isDefault)
    };

    try {
      if (editingId) {
        await api.put(`/admin/warehouses/${editingId}`, payload);
      } else {
        await api.post('/admin/warehouses', payload);
      }
      resetForm();
      fetchWarehouses();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      alert(error.response?.data?.message || 'Failed to save warehouse');
    }
  };

  const handleToggleStatus = async (wh) => {
    const newStatus = wh.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/admin/warehouses/${wh.id}`, { status: newStatus });
      fetchWarehouses();
    } catch (error) {
      alert('Failed to update warehouse status');
    }
  };

  const [deletingWarehouse, setDeletingWarehouse] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleConfirmDeleteWarehouse = async (reason) => {
    if (!deletingWarehouse) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/admin/warehouses/${deletingWarehouse.id}`, {
        data: { reason }
      });
      alert('Warehouse deleted successfully');
      setDeletingWarehouse(null);
      fetchWarehouses();
    } catch (err) {
      console.error('Delete warehouse error:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete warehouse');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredWarehouses = warehouses.filter((wh) => {
    const searchLower = search.toLowerCase();
    const nameMatch = (wh.name || '').toLowerCase().includes(searchLower);
    const codeMatch = (wh.warehouse_code || wh.code || '').toLowerCase().includes(searchLower);
    const cityMatch = (wh.city || '').toLowerCase().includes(searchLower);
    const managerMatch = (wh.contact_person || wh.manager_name || '').toLowerCase().includes(searchLower);
    return nameMatch || codeMatch || cityMatch || managerMatch;
  });

  // Pagination for 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedWarehouses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWarehouses.slice(start, start + itemsPerPage);
  }, [filteredWarehouses, currentPage]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Header Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <WarehouseIcon size={26} color="#4338ca" />
              Warehouse Locations
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Manage central godowns, distribution hubs, storage racks, and inventory managers.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search warehouse, code, city..."
                style={{
                  padding: '9px 16px 9px 38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '0.9rem',
                  width: '260px'
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {hasPermission('warehouses', 'create') && (
              <button
                onClick={handleOpenAdd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  backgroundColor: '#4338ca',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)'
                }}
              >
                <Plus size={18} /> Add Warehouse
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Warehouse Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '680px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <WarehouseIcon size={22} color="#4338ca" />
                {editingId ? 'Edit Warehouse' : 'Add New Warehouse'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <form onSubmit={handleSubmit}>
                {/* Name & Code */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Warehouse Name *
                    </label>
                    <SuggestionInput id="warehouse-name-input" value={name} onChange={setName} suggestions={warehouses.filter(warehouse => String(warehouse.id) !== String(editingId || ''))} itemType="Warehouse" placeholder="e.g. Main Central Hub" required inputStyle={{ padding: '10px 12px', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Warehouse Code
                    </label>
                    <SuggestionInput id="warehouse-code-input" value={warehouseCode} onChange={setWarehouseCode} suggestions={warehouses.filter(warehouse => String(warehouse.id) !== String(editingId || '')).map(warehouse => warehouse.warehouse_code || warehouse.code).filter(Boolean)} itemType="Warehouse Code" placeholder="e.g. WH-MUM-01" inputStyle={{ padding: '10px 12px', borderRadius: '8px' }} />
                  </div>
                </div>

                {/* Type & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Warehouse Type
                    </label>
                    <select
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#fff' }}
                      value={warehouseType}
                      onChange={(e) => setWarehouseType(e.target.value)}
                    >
                      <option value="Central Distribution Center">Central Distribution Center</option>
                      <option value="Regional Hub">Regional Hub</option>
                      <option value="Retail Outlet">Retail Outlet</option>
                      <option value="Cold Storage">Cold Storage</option>
                      <option value="Transit / Cross-dock">Transit / Cross-dock</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Status
                    </label>
                    <select
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#fff' }}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Street Address */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Address Line
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Plot / Street / Industrial Area..."
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                </div>

                {/* City, State, Country, Pincode */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. India"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 400001"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Manager, Phone, Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. warehouse@inventory.com"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Capacity & Default Facility Checkbox */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px', marginBottom: '22px', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Capacity (Sq Ft / Pallets)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50,000 sq ft or 1,200 pallets"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                      value={totalCapacity}
                      onChange={(e) => setTotalCapacity(e.target.value)}
                    />
                  </div>
                  <div style={{ paddingTop: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#4338ca' }}
                      />
                      Primary / Default Warehouse
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{ padding: '9px 18px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '9px 22px', border: 'none', backgroundColor: '#4338ca', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)' }}
                  >
                    {editingId ? 'Update Warehouse' : 'Save Warehouse'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div 
        className="table-container" 
        style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
          border: '1px solid #e2e8f0',
          width: '100%',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 220px)',
          position: 'relative'
        }}
      >
        <table style={{ width: '100%', minWidth: '1150px', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '60px', textAlign: 'center' }}>Sr. No.</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Code</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Warehouse Name</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Facility Type</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Location & Address</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Contact Person</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Capacity</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Status</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  Loading warehouses...
                </td>
              </tr>
            ) : paginatedWarehouses.length > 0 ? (
              paginatedWarehouses.map((wh, wIdx) => (
                <tr key={wh.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {(currentPage - 1) * itemsPerPage + wIdx + 1}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#4338ca', fontFamily: 'monospace', fontWeight: '700', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {wh.warehouse_code || wh.code || `WH${String(wh.id).padStart(4, '0')}`}
                  </td>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {wh.name}
                      {wh.is_default && (
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '0.78rem' }}>
                      {wh.warehouse_type || wh.type || 'Central Distribution Center'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#334155', fontSize: '0.85rem', minWidth: '220px' }}>
                    <div>{wh.address_line_1 || wh.address || 'N/A'}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      {[wh.city, wh.state, wh.pincode, wh.country].filter(Boolean).join(', ')}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#334155', minWidth: '180px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{wh.contact_person || wh.manager_name || '-'}</div>
                    {(wh.phone_number || wh.contact_number) && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        {wh.phone_number || wh.contact_number}
                      </div>
                    )}
                    {wh.email && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{wh.email}</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>
                    {wh.total_capacity || wh.capacity || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        onClick={() => handleToggleStatus(wh)}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: wh.status === 'Active' ? 'flex-end' : 'flex-start',
                          width: '38px',
                          height: '20px',
                          background: wh.status === 'Active' ? '#4338ca' : '#cbd5e1',
                          borderRadius: '10px',
                          padding: '2px',
                          transition: 'background 0.2s',
                          marginRight: '8px'
                        }}
                        title="Toggle Status"
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            background: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: wh.status === 'Active' ? '#4338ca' : '#64748b' }}>
                        {wh.status || 'Active'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {hasPermission('warehouses', 'edit') && (
                        <button
                          onClick={() => handleEdit(wh)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#4338ca',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px'
                          }}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {hasPermission('warehouses', 'delete') && (
                        <button
                          onClick={() => setDeletingWarehouse(wh)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px'
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No warehouses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredWarehouses.length}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </div>

      <DeleteConfirmationModal
        isOpen={!!deletingWarehouse}
        title="Delete Warehouse"
        itemName={deletingWarehouse ? `Warehouse "${deletingWarehouse.name}"` : 'this warehouse'}
        onClose={() => setDeletingWarehouse(null)}
        onConfirm={handleConfirmDeleteWarehouse}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default Warehouses;
