import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { 
  Warehouse as WarehouseIcon, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Layers, 
  Box, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  Grid,
  Filter,
  CheckCircle2
} from 'lucide-react';
import Pagination from '../components/Pagination';
import SuggestionInput from '../components/SuggestionInput';

const Racking = () => {
  // Navigation Tabs: 'locations' (Master) vs 'allocations' (Product mapping)
  const [activeTab, setActiveTab] = useState('locations');

  // Core Data
  const [warehouses, setWarehouses] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Top Warehouse Filter (Applied across page)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Tab 1: Storage Locations Master Filters & Pagination
  const [locSearch, setLocSearch] = useState('');
  const [locRackFilter, setLocRackFilter] = useState('');
  const [locCurrentPage, setLocCurrentPage] = useState(1);
  const locItemsPerPage = 12;

  // Add / Edit Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [modalLocWarehouseId, setModalLocWarehouseId] = useState('');
  const [modalLocRack, setModalLocRack] = useState('');
  const [modalLocShelf, setModalLocShelf] = useState('');
  const [modalLocBin, setModalLocBin] = useState('');
  const [modalLocZone, setModalLocZone] = useState('');
  const [modalLocCapacity, setModalLocCapacity] = useState('');
  const [modalLocNotes, setModalLocNotes] = useState('');
  const [modalLocStatus, setModalLocStatus] = useState('Active');
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // Bulk Generator Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkWarehouseId, setBulkWarehouseId] = useState('');
  const [bulkRackName, setBulkRackName] = useState('');
  const [bulkShelfCount, setBulkShelfCount] = useState(4);
  const [bulkBinCount, setBulkBinCount] = useState(10);
  const [bulkShelfPrefix, setBulkShelfPrefix] = useState('Shelf ');
  const [bulkBinPrefix, setBulkBinPrefix] = useState('Bin ');
  const [bulkZone, setBulkZone] = useState('');
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // Delete Confirmation Modal State
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Tab 2: Product Allocation State
  const [allocProductId, setAllocProductId] = useState('');
  const [allocWarehouseId, setAllocWarehouseId] = useState('');
  const [allocRack, setAllocRack] = useState('');
  const [allocShelf, setAllocShelf] = useState('');
  const [allocBin, setAllocBin] = useState('');
  const [allocSearch, setAllocSearch] = useState('');
  const [allocCurrentPage, setAllocCurrentPage] = useState(1);
  const allocItemsPerPage = 10;
  const [isSubmittingAlloc, setIsSubmittingAlloc] = useState(false);

  // Add Warehouse Modal State
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [modalWhName, setModalWhName] = useState('');
  const [modalWhCode, setModalWhCode] = useState('');
  const [modalWhType, setModalWhType] = useState('Central Distribution Center');
  const [modalWhCity, setModalWhCity] = useState('');
  const [modalWhManagerName, setModalWhManagerName] = useState('');
  const [modalWhContactNumber, setModalWhContactNumber] = useState('');

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [whRes, locRes, prodRes] = await Promise.all([
        api.get('/admin/warehouses').catch(() => ({ data: [] })),
        api.get('/admin/storage-locations').catch(() => ({ data: [] })),
        api.get('/admin/products?limit=500').catch(() => ({ data: [] }))
      ]);

      const wData = whRes.data?.data || whRes.data?.warehouses || (Array.isArray(whRes.data) ? whRes.data : []);
      setWarehouses(wData);
      if (wData.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(String(wData[0].id));
      }

      const lData = locRes.data?.data || (Array.isArray(locRes.data) ? locRes.data : []);
      setStorageLocations(lData);

      const pData = prodRes.data?.data || prodRes.data?.products || (Array.isArray(prodRes.data) ? prodRes.data : []);
      setProducts(pData);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching racking data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 3500);
    }
  };

  // Filtered Locations based on Warehouse & Search
  const filteredLocations = useMemo(() => {
    return storageLocations.filter(loc => {
      const matchWh = !selectedWarehouseId || String(loc.warehouse_id) === String(selectedWarehouseId);
      const matchRack = !locRackFilter || loc.rack_number === locRackFilter;
      const q = locSearch.toLowerCase().trim();
      const matchSearch = !q ||
        (loc.rack_number || '').toLowerCase().includes(q) ||
        (loc.shelf_number || '').toLowerCase().includes(q) ||
        (loc.bin_location || '').toLowerCase().includes(q) ||
        (loc.code || '').toLowerCase().includes(q) ||
        (loc.zone || '').toLowerCase().includes(q);

      return matchWh && matchRack && matchSearch;
    });
  }, [storageLocations, selectedWarehouseId, locRackFilter, locSearch]);

  // Unique Racks for Filter Dropdown
  const warehouseRacks = useMemo(() => {
    const list = storageLocations
      .filter(l => !selectedWarehouseId || String(l.warehouse_id) === String(selectedWarehouseId))
      .map(l => (l.rack_number || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [storageLocations, selectedWarehouseId]);

  // Statistics for the selected warehouse
  const stats = useMemo(() => {
    const targetLocs = storageLocations.filter(
      l => !selectedWarehouseId || String(l.warehouse_id) === String(selectedWarehouseId)
    );
    const racks = new Set(targetLocs.map(l => l.rack_number).filter(Boolean));
    const shelves = new Set(targetLocs.map(l => `${l.rack_number}__${l.shelf_number}`).filter(Boolean));
    const bins = targetLocs.filter(l => l.bin_location).length;

    return {
      total: targetLocs.length,
      racks: racks.size,
      shelves: shelves.size,
      bins: bins
    };
  }, [storageLocations, selectedWarehouseId]);

  // Pagination for Master Locations Table
  const paginatedLocations = useMemo(() => {
    const start = (locCurrentPage - 1) * locItemsPerPage;
    return filteredLocations.slice(start, start + locItemsPerPage);
  }, [filteredLocations, locCurrentPage]);

  // Reset pagination on filter change
  useEffect(() => {
    setLocCurrentPage(1);
  }, [selectedWarehouseId, locRackFilter, locSearch]);

  // Open Modal to Add Location
  const handleOpenAddLocation = () => {
    setEditingLocation(null);
    setModalLocWarehouseId(selectedWarehouseId || (warehouses[0]?.id ? String(warehouses[0].id) : ''));
    setModalLocRack('');
    setModalLocShelf('');
    setModalLocBin('');
    setModalLocZone('');
    setModalLocCapacity('');
    setModalLocNotes('');
    setModalLocStatus('Active');
    setShowLocationModal(true);
  };

  // Open Modal to Edit Location
  const handleOpenEditLocation = (loc) => {
    setEditingLocation(loc);
    setModalLocWarehouseId(String(loc.warehouse_id));
    setModalLocRack(loc.rack_number || '');
    setModalLocShelf(loc.shelf_number || '');
    setModalLocBin(loc.bin_location || '');
    setModalLocZone(loc.zone || '');
    setModalLocCapacity(loc.capacity ? String(loc.capacity) : '');
    setModalLocNotes(loc.notes || '');
    setModalLocStatus(loc.status || 'Active');
    setShowLocationModal(true);
  };

  // Save Location (Create or Update)
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!modalLocWarehouseId || !modalLocRack.trim()) {
      showToast('Warehouse and Rack Number are required fields', true);
      return;
    }

    try {
      setIsSavingLocation(true);
      const payload = {
        warehouse_id: Number(modalLocWarehouseId),
        rack_number: modalLocRack.trim(),
        shelf_number: modalLocShelf.trim(),
        bin_location: modalLocBin.trim(),
        zone: modalLocZone.trim() || null,
        capacity: modalLocCapacity ? Number(modalLocCapacity) : null,
        notes: modalLocNotes.trim() || null,
        status: modalLocStatus
      };

      if (editingLocation) {
        const res = await api.put(`/admin/storage-locations/${editingLocation.id}`, payload);
        const updated = res.data?.data || payload;
        setStorageLocations(prev => prev.map(l => l.id === editingLocation.id ? { ...l, ...updated } : l));
        showToast('Storage location updated successfully!');
      } else {
        const res = await api.post('/admin/storage-locations', payload);
        const created = res.data?.data;
        if (created) {
          setStorageLocations(prev => [created, ...prev]);
        } else {
          fetchData();
        }
        showToast('Storage location created successfully!');
      }

      setShowLocationModal(false);
    } catch (err) {
      console.error('Failed to save location:', err);
      showToast(err.response?.data?.message || 'Failed to save location', true);
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Delete Location Handler with safety checks
  const handleDeleteLocationClick = (loc) => {
    setLocationToDelete(loc);
    setDeleteWarning('');
  };

  const confirmDeleteLocation = async (force = false) => {
    if (!locationToDelete) return;
    try {
      setIsDeleting(true);
      await api.delete(`/admin/storage-locations/${locationToDelete.id}${force ? '?force=true' : ''}`);
      setStorageLocations(prev => prev.filter(l => l.id !== locationToDelete.id));
      showToast('Storage location deleted successfully!');
      setLocationToDelete(null);
      setDeleteWarning('');
    } catch (err) {
      if (err.response?.data?.has_assigned_products) {
        setDeleteWarning(err.response.data.message);
      } else {
        showToast(err.response?.data?.message || 'Failed to delete location', true);
        setLocationToDelete(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Generation Handler
  const handleRunBulkGenerator = async (e) => {
    e.preventDefault();
    if (!bulkWarehouseId || !bulkRackName.trim()) {
      showToast('Warehouse and Rack Name are required for bulk generation', true);
      return;
    }

    try {
      setIsGeneratingBulk(true);
      const res = await api.post('/admin/storage-locations/bulk', {
        warehouse_id: Number(bulkWarehouseId),
        rack_name: bulkRackName.trim(),
        shelf_count: Number(bulkShelfCount) || 1,
        bin_count: Number(bulkBinCount) || 1,
        shelf_prefix: bulkShelfPrefix,
        bin_prefix: bulkBinPrefix,
        zone: bulkZone.trim() || null
      });

      showToast(res.data?.message || 'Bulk generation completed!');
      setShowBulkModal(false);
      setBulkRackName('');
      fetchData();
    } catch (err) {
      console.error('Bulk generation error:', err);
      showToast(err.response?.data?.message || 'Bulk generation failed', true);
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // ================= TAB 2: CASCADING ALLOCATION HELPERS =================
  const allocWhLocations = useMemo(() => {
    if (!allocWarehouseId) return [];
    return storageLocations.filter(l => String(l.warehouse_id) === String(allocWarehouseId));
  }, [storageLocations, allocWarehouseId]);

  const allocAvailableRacks = useMemo(() => {
    const list = allocWhLocations.map(l => (l.rack_number || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [allocWhLocations]);

  const allocAvailableShelves = useMemo(() => {
    if (!allocRack) return [];
    const list = allocWhLocations
      .filter(l => (l.rack_number || '').trim() === allocRack)
      .map(l => (l.shelf_number || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [allocWhLocations, allocRack]);

  const allocAvailableBins = useMemo(() => {
    if (!allocRack || !allocShelf) return [];
    const list = allocWhLocations
      .filter(l => (l.rack_number || '').trim() === allocRack && (l.shelf_number || '').trim() === allocShelf)
      .map(l => (l.bin_location || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [allocWhLocations, allocRack, allocShelf]);

  const handleProductSelect = (productId) => {
    setAllocProductId(productId);
    const prod = products.find(p => String(p.id) === String(productId));
    if (prod) {
      const wh = warehouses.find(w => w.name === prod.warehouse_location || w.id === prod.default_warehouse_id);
      setAllocWarehouseId(wh ? String(wh.id) : (warehouses[0]?.id ? String(warehouses[0].id) : ''));
      setAllocRack(prod.rack_number || '');
      setAllocShelf(prod.shelf_number || '');
      setAllocBin(prod.bin_location || '');
    } else {
      setAllocWarehouseId('');
      setAllocRack('');
      setAllocShelf('');
      setAllocBin('');
    }
  };

  const handleSubmitAllocation = async (e) => {
    e.preventDefault();
    if (!allocProductId) {
      showToast('Please select a product to allocate', true);
      return;
    }

    try {
      setIsSubmittingAlloc(true);
      const whObj = warehouses.find(w => String(w.id) === String(allocWarehouseId));
      await api.put(`/admin/products/${allocProductId}`, {
        default_warehouse_id: allocWarehouseId ? Number(allocWarehouseId) : null,
        warehouse_location: whObj ? whObj.name : null,
        rack_number: allocRack || null,
        shelf_number: allocShelf || null,
        bin_location: allocBin || null
      });

      setProducts(prev =>
        prev.map(p =>
          String(p.id) === String(allocProductId)
            ? {
                ...p,
                default_warehouse_id: allocWarehouseId,
                warehouse_location: whObj?.name,
                rack_number: allocRack,
                shelf_number: allocShelf,
                bin_location: allocBin
              }
            : p
        )
      );

      showToast('Product racking allocation successfully saved!');
    } catch (err) {
      console.error('Failed to save allocation:', err);
      showToast(err.response?.data?.message || 'Failed to save allocation', true);
    } finally {
      setIsSubmittingAlloc(false);
    }
  };

  return (
    <div style={{ padding: '8px 0 32px 0' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Rack & Bin Master
            </h1>
            <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '0.75rem', fontWeight: '700', padding: '4px 10px', borderRadius: '12px' }}>
              Storage Master
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Configure and manage physical storage coordinates (Racks, Shelves, Bins) for precision warehouse tracking.
          </p>
        </div>

        {/* Global Warehouse Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <WarehouseIcon size={16} color="#6366f1" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
            >
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.warehouse_code ? `(${w.warehouse_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchData}
            title="Refresh Data"
            style={{ padding: '9px 12px', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ALERT BANNERS */}
      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', fontSize: '0.9rem' }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', fontSize: '0.9rem' }}>
          <AlertCircle size={18} color="#dc2626" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Total Locations</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>{stats.total}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
            <Grid size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Unique Racks</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>{stats.racks}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1' }}>
            <Box size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Distinct Shelves</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>{stats.shelves}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Bins Registered</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>{stats.bins}</div>
          </div>
        </div>
      </div>

      {/* VIEW TABS SWITCHER */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('locations')}
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: '700',
            color: activeTab === 'locations' ? '#4338ca' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'locations' ? '3px solid #4338ca' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={18} /> Storage Coordinates Master
        </button>

        <button
          onClick={() => setActiveTab('allocations')}
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: '700',
            color: activeTab === 'allocations' ? '#4338ca' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'allocations' ? '3px solid #4338ca' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Box size={18} /> Product Stock Allocation
        </button>
      </div>

      {/* ================= TAB 1: MASTER LOCATIONS VIEW ================= */}
      {activeTab === 'locations' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          {/* Action Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search rack, shelf, bin or zone..."
                  value={locSearch}
                  onChange={(e) => setLocSearch(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              {/* Rack Filter */}
              <select
                value={locRackFilter}
                onChange={(e) => setLocRackFilter(e.target.value)}
                style={{ padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', color: '#1e293b', backgroundColor: '#f8fafc', outline: 'none' }}
              >
                <option value="">All Racks ({warehouseRacks.length})</option>
                {warehouseRacks.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setBulkWarehouseId(selectedWarehouseId || (warehouses[0]?.id ? String(warehouses[0].id) : ''));
                  setShowBulkModal(true);
                }}
                style={{ padding: '9px 16px', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={16} color="#6366f1" /> Bulk Generate
              </button>

              <button
                onClick={handleOpenAddLocation}
                style={{ padding: '9px 18px', backgroundColor: '#4338ca', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Add Storage Location
              </button>
            </div>
          </div>

          {/* Locations Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', width: '60px' }}>Sr.</th>
                  <th style={{ padding: '12px 16px' }}>Warehouse</th>
                  <th style={{ padding: '12px 16px' }}>Rack Number</th>
                  <th style={{ padding: '12px 16px' }}>Shelf Number</th>
                  <th style={{ padding: '12px 16px' }}>Bin Location</th>
                  <th style={{ padding: '12px 16px' }}>Coordinate Label</th>
                  <th style={{ padding: '12px 16px' }}>Zone</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      Loading storage coordinates...
                    </td>
                  </tr>
                ) : paginatedLocations.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{ color: '#94a3b8', marginBottom: '12px' }}><Layers size={40} /></div>
                      <div style={{ fontWeight: '700', color: '#334155', fontSize: '1rem' }}>No storage locations found</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                        Click <strong>"+ Add Storage Location"</strong> or <strong>"Bulk Generate"</strong> to register racks, shelves, and bins.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLocations.map((loc, idx) => {
                    const srNo = (locCurrentPage - 1) * locItemsPerPage + idx + 1;
                    const whName = loc.warehouse?.name || warehouses.find(w => w.id === loc.warehouse_id)?.name || `WH #${loc.warehouse_id}`;
                    return (
                      <tr key={loc.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: '500' }}>{srNo}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{whName}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '0.82rem' }}>
                            {loc.rack_number}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {loc.shelf_number ? (
                            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '0.82rem' }}>
                              {loc.shelf_number}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {loc.bin_location ? (
                            <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '0.82rem' }}>
                              {loc.bin_location}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontWeight: '500' }}>
                          {loc.code || [loc.rack_number, loc.shelf_number, loc.bin_location].filter(Boolean).join(' / ')}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{loc.zone || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: loc.status === 'Active' ? '#ecfdf5' : '#f1f5f9',
                            color: loc.status === 'Active' ? '#059669' : '#64748b'
                          }}>
                            {loc.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenEditLocation(loc)}
                              title="Edit"
                              style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#4338ca', cursor: 'pointer' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteLocationClick(loc)}
                              title="Delete"
                              style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#dc2626', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
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

          {/* Pagination */}
          {filteredLocations.length > locItemsPerPage && (
            <div style={{ marginTop: '20px' }}>
              <Pagination
                currentPage={locCurrentPage}
                totalItems={filteredLocations.length}
                itemsPerPage={locItemsPerPage}
                onPageChange={(page) => setLocCurrentPage(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: PRODUCT ALLOCATION VIEW ================= */}
      {activeTab === 'allocations' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          {/* Product Allocation Form with CASCADING DROPDOWNS */}
          <form onSubmit={handleSubmitAllocation} style={{ marginBottom: '28px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
              Assign Product to Storage Location
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.83rem', color: '#64748b' }}>
              Select a product and use the cascading dropdowns (Warehouse $\rightarrow$ Rack $\rightarrow$ Shelf $\rightarrow$ Bin) to set its default storage coordinates.
            </p>

            {/* Product Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                Select Product *
              </label>
              <select
                value={allocProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
              >
                <option value="">-- Choose a Product ({products.length} available) --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ''} {p.warehouse_location ? `[${p.warehouse_location} | ${p.rack_number || 'No Rack'} | ${p.shelf_number || 'No Shelf'}]` : '[Unallocated]'}
                  </option>
                ))}
              </select>
            </div>

            {/* 4 Cascading Dropdown Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              {/* 1. Warehouse */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  1. Storage Warehouse *
                </label>
                <select
                  value={allocWarehouseId}
                  onChange={(e) => {
                    setAllocWarehouseId(e.target.value);
                    setAllocRack('');
                    setAllocShelf('');
                    setAllocBin('');
                  }}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', fontSize: '0.88rem', outline: 'none' }}
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Rack (Cascading) */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  2. Rack Number
                </label>
                <select
                  disabled={!allocWarehouseId}
                  value={allocRack}
                  onChange={(e) => {
                    setAllocRack(e.target.value);
                    setAllocShelf('');
                    setAllocBin('');
                  }}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: allocWarehouseId ? '#ffffff' : '#f1f5f9', fontSize: '0.88rem', outline: 'none' }}
                >
                  <option value="">{allocWarehouseId ? '-- Select Rack --' : 'Select warehouse first'}</option>
                  {allocAvailableRacks.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* 3. Shelf (Cascading) */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  3. Shelf Number
                </label>
                <select
                  disabled={!allocRack}
                  value={allocShelf}
                  onChange={(e) => {
                    setAllocShelf(e.target.value);
                    setAllocBin('');
                  }}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: allocRack ? '#ffffff' : '#f1f5f9', fontSize: '0.88rem', outline: 'none' }}
                >
                  <option value="">{allocRack ? '-- Select Shelf --' : 'Select rack first'}</option>
                  {allocAvailableShelves.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* 4. Bin (Cascading) */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  4. Bin Location
                </label>
                <select
                  disabled={!allocShelf}
                  value={allocBin}
                  onChange={(e) => setAllocBin(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: allocShelf ? '#ffffff' : '#f1f5f9', fontSize: '0.88rem', outline: 'none' }}
                >
                  <option value="">{allocShelf ? '-- Select Bin --' : 'Select shelf first'}</option>
                  {allocAvailableBins.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="submit"
                disabled={isSubmittingAlloc}
                style={{ padding: '9px 22px', backgroundColor: '#4338ca', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}
              >
                {isSubmittingAlloc ? 'Saving Allocation...' : 'Save Product Allocation'}
              </button>
            </div>
          </form>

          {/* Products Stock Allocations Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Product</th>
                  <th style={{ padding: '12px 16px' }}>SKU</th>
                  <th style={{ padding: '12px 16px' }}>Warehouse</th>
                  <th style={{ padding: '12px 16px' }}>Rack</th>
                  <th style={{ padding: '12px 16px' }}>Shelf</th>
                  <th style={{ padding: '12px 16px' }}>Bin</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Quick Select</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 15).map(prod => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{prod.name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{prod.sku || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{prod.warehouse_location || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {prod.rack_number ? <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>{prod.rack_number}</span> : '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {prod.shelf_number ? <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>{prod.shelf_number}</span> : '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {prod.bin_location ? <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>{prod.bin_location}</span> : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleProductSelect(prod.id)}
                        style={{ padding: '5px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', color: '#4338ca', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Edit Location
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT STORAGE LOCATION ================= */}
      {showLocationModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '540px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    {editingLocation ? 'Edit Storage Location' : 'Add Storage Location'}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Define physical warehouse coordinates</span>
                </div>
              </div>
              <button onClick={() => setShowLocationModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} style={{ padding: '24px' }}>
              {/* Warehouse */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Warehouse *
                </label>
                <select
                  value={modalLocWarehouseId}
                  onChange={(e) => setModalLocWarehouseId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* 3 Coordinates: Rack, Shelf, Bin */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Rack *
                  </label>
                  <SuggestionInput id="location-rack-input" value={modalLocRack} onChange={setModalLocRack} suggestions={[...new Set(storageLocations.filter(loc => String(loc.warehouse_id) === String(modalLocWarehouseId) && String(loc.id) !== String(editingLocation?.id || '')).map(loc => loc.rack_number).filter(Boolean))]} itemType="Rack" placeholder="e.g. Rack A-12" required inputStyle={{ padding: '9px 12px', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Shelf
                  </label>
                  <SuggestionInput id="location-shelf-input" value={modalLocShelf} onChange={setModalLocShelf} suggestions={[...new Set(storageLocations.filter(loc => String(loc.warehouse_id) === String(modalLocWarehouseId) && loc.rack_number === modalLocRack && String(loc.id) !== String(editingLocation?.id || '')).map(loc => loc.shelf_number).filter(Boolean))]} itemType="Shelf" placeholder="e.g. Shelf 02" inputStyle={{ padding: '9px 12px', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Bin
                  </label>
                  <SuggestionInput id="location-bin-input" value={modalLocBin} onChange={setModalLocBin} suggestions={[...new Set(storageLocations.filter(loc => String(loc.warehouse_id) === String(modalLocWarehouseId) && loc.rack_number === modalLocRack && loc.shelf_number === modalLocShelf && String(loc.id) !== String(editingLocation?.id || '')).map(loc => loc.bin_location).filter(Boolean))]} itemType="Bin" placeholder="e.g. Bin B-05" inputStyle={{ padding: '9px 12px', borderRadius: '8px' }} />
                </div>
              </div>

              {/* Zone and Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Zone / Aisle (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fast Moving, Cold Storage"
                    value={modalLocZone}
                    onChange={(e) => setModalLocZone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={modalLocStatus}
                    onChange={(e) => setModalLocStatus(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Level 2, bottom shelf for heavy items"
                  value={modalLocNotes}
                  onChange={(e) => setModalLocNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  style={{ padding: '10px 18px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLocation}
                  style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', backgroundColor: '#4338ca', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                >
                  {isSavingLocation ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK GENERATOR ================= */}
      {showBulkModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    Bulk Generate Bins
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Generate an entire rack with multiple shelves and bins</span>
                </div>
              </div>
              <button onClick={() => setShowBulkModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRunBulkGenerator} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Target Warehouse *
                </label>
                <select
                  value={bulkWarehouseId}
                  onChange={(e) => setBulkWarehouseId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Rack Name / Prefix *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rack A-01 or R-12"
                  value={bulkRackName}
                  onChange={(e) => setBulkRackName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Number of Shelves (1 - 20)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={bulkShelfCount}
                    onChange={(e) => setBulkShelfCount(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Bins Per Shelf (1 - 30)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={bulkBinCount}
                    onChange={(e) => setBulkBinCount(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '22px', fontSize: '0.84rem', color: '#166534' }}>
                ⚡ This will generate <strong>{(Number(bulkShelfCount) || 0) * (Number(bulkBinCount) || 0)}</strong> unique storage locations (e.g. {bulkRackName || 'Rack A'} / Shelf 01 / Bin 01 to Bin {String(bulkBinCount).padStart(2, '0')}).
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{ padding: '10px 18px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingBulk}
                  style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                >
                  {isGeneratingBulk ? 'Generating...' : 'Generate Coordinates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {locationToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
              Delete Storage Location?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#64748b' }}>
              Are you sure you want to remove <strong>{locationToDelete.rack_number} {locationToDelete.shelf_number ? `/ ${locationToDelete.shelf_number}` : ''} {locationToDelete.bin_location ? `/ ${locationToDelete.bin_location}` : ''}</strong> from master data?
            </p>

            {deleteWarning && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 14px', borderRadius: '8px', marginBottom: '18px', color: '#991b1b', fontSize: '0.84rem' }}>
                ⚠️ {deleteWarning}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setLocationToDelete(null); setDeleteWarning(''); }}
                style={{ padding: '9px 18px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              {deleteWarning ? (
                <button
                  type="button"
                  onClick={() => confirmDeleteLocation(true)}
                  disabled={isDeleting}
                  style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#b91c1c', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                >
                  {isDeleting ? 'Deleting...' : 'Force Delete'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => confirmDeleteLocation(false)}
                  disabled={isDeleting}
                  style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Racking;
