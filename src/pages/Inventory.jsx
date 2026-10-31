import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import VerifyPhysicalStockModal from '../components/VerifyPhysicalStockModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  AlertOctagon, 
  ShoppingCart, 
  ArrowUpDown,
  RefreshCw,
  Box,
  MapPin,
  Check,
  ClipboardCheck,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

const Inventory = () => {
  const { hasPermission } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [allInventory, setAllInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filters
  const [activeTab, setActiveTab] = useState(searchParams.get('filter') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // Stock Adjustment Modal
  const [showForm, setShowForm] = useState(false);
  const [adjWarehouseId, setAdjWarehouseId] = useState('');
  const [adjProductId, setAdjProductId] = useState('');
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjMovementType, setAdjMovementType] = useState('ADJUSTMENT_IN');
  const [adjNotes, setAdjNotes] = useState('');
  const [submittingAdj, setSubmittingAdj] = useState(false);

  // PR Generation State
  const [generatingPrFor, setGeneratingPrFor] = useState(null);
  const [prSuccessMessage, setPrSuccessMessage] = useState('');

  // Physical Stock Audit Verification Modal State
  const [verifyAuditProduct, setVerifyAuditProduct] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedWarehouse) params.append('warehouse_id', selectedWarehouse);

      // Do NOT filter status on the API request so allInventory contains all items
      // allowing every tab pill to display its accurate, true count at all times!
      const [invRes, whRes, prodRes] = await Promise.all([
        api.get(`/admin/inventory?${params.toString()}`),
        api.get('/admin/warehouses').catch(() => ({ data: [] })),
        api.get('/admin/products').catch(() => ({ data: { data: [] } }))
      ]);

      const items = invRes.data?.data || [];
      setAllInventory(items);
      setWarehouses(whRes.data?.data || whRes.data || []);
      setProducts(prodRes.data?.data || prodRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Inventory fetch error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchInventory();
  }, [selectedWarehouse]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchInventory();
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingAdj(true);
      await api.post('/admin/inventory/adjust', {
        warehouse_id: adjWarehouseId,
        product_id: adjProductId,
        quantity: adjQuantity,
        movement_type: adjMovementType,
        notes: adjNotes
      });
      setAdjQuantity('');
      setAdjNotes('');
      setShowForm(false);
      setSubmittingAdj(false);
      fetchInventory();
    } catch (error) {
      console.error("Failed to adjust inventory", error);
      alert(error.response?.data?.message || "Failed to adjust inventory. Please verify inputs.");
      setSubmittingAdj(false);
    }
  };

  const canCreatePO = hasPermission('purchase_orders', 'create');

  const handleGeneratePurchaseRequest = async (item) => {
    try {
      setGeneratingPrFor(item.id);
      const endpoint = canCreatePO
        ? '/admin/purchase-orders/create-from-reorder'
        : '/purchase-request/create-from-reorder';

      const payload = {
        product_id: item.product_id || item.id,
        warehouse_id: item.warehouse_id,
        required_qty: item.reorder_qty || 10,
        notes: `Automated reorder from Inventory List. Current stock: ${item.current_stock}, Reorder level: ${item.reorder_level}`,
        ...(canCreatePO ? { direct_po: true } : {})
      };

      let res;
      try {
        res = await api.post(endpoint, payload);
      } catch (postErr) {
        // Fallback to /purchase-request/create-from-reorder if admin endpoint 404s
        if (postErr.response?.status === 404 && endpoint !== '/purchase-request/create-from-reorder') {
          res = await api.post('/purchase-request/create-from-reorder', payload);
        } else {
          throw postErr;
        }
      }

      if (res.data?.success) {
        const orderNum = res.data.data?.po_number || res.data.data?.pr_number || 'Order';
        const msg = `${canCreatePO ? 'Purchase Order' : 'Purchase Request'} ${orderNum} created for ${item.product_name}!`;
        setPrSuccessMessage(msg);
        showSuccess(msg, 'Order Generated');
        setTimeout(() => setPrSuccessMessage(''), 4000);
        fetchInventory();
      }
    } catch (err) {
      console.error("Failed to generate reorder:", err);
      if (err.response?.data?.audit_required) {
        const msg = err.response.data.message || 'Physical stock audit is required before issuing a Reorder / Purchase Request.';
        showWarning(msg, 'Stock Audit Required');
        setVerifyAuditProduct({
          ...item,
          audit_message: msg,
          blocked_reason: err.response.data.blocked_products?.[0]?.reason || msg
        });
        return;
      }
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to generate purchase request";
      showError(errMsg);
    } finally {
      setGeneratingPrFor(null);
    }
  };

  const handleVerifyAuditSuccess = ({ productId, verifiedQty }) => {
    setAllInventory(prev => prev.map(inv => {
      const match = (inv.product_id || inv.id) === productId;
      if (match) {
        return {
          ...inv,
          current_stock: verifiedQty,
          physical_stock: verifiedQty,
          audit_status: 'AUDITED',
          audit_required: false
        };
      }
      return inv;
    }));
    fetchInventory();
  };

  // Status counts for tabs - accurately computed from all inventory records
  const allCount = allInventory.length;
  const normalCount = allInventory.filter(i => (i.stock_status || '').toUpperCase() === 'NORMAL').length;
  const lowCount = allInventory.filter(i => (i.stock_status || '').toUpperCase() === 'LOW_STOCK').length;
  const criticalCount = allInventory.filter(i => (i.stock_status || '').toUpperCase() === 'CRITICAL_STOCK').length;
  const reorderCount = allInventory.filter(i => Boolean(i.reorder_required) || (i.stock_status || '').toUpperCase() === 'REORDER_REQUIRED' || (Number(i.reorder_level) > 0 && Number(i.current_stock) <= Number(i.reorder_level))).length;

  // Filtered list based on activeTab
  const filteredInventory = useMemo(() => {
    if (activeTab === 'normal') {
      return allInventory.filter(i => (i.stock_status || '').toUpperCase() === 'NORMAL');
    }
    if (activeTab === 'low') {
      return allInventory.filter(i => (i.stock_status || '').toUpperCase() === 'LOW_STOCK');
    }
    if (activeTab === 'critical') {
      return allInventory.filter(i => (i.stock_status || '').toUpperCase() === 'CRITICAL_STOCK');
    }
    if (activeTab === 'reorder') {
      return allInventory.filter(i => Boolean(i.reorder_required) || (i.stock_status || '').toUpperCase() === 'REORDER_REQUIRED' || (Number(i.reorder_level) > 0 && Number(i.current_stock) <= Number(i.reorder_level)));
    }
    return allInventory;
  }, [allInventory, activeTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Real-Time Stock & Reorders
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Monitor warehouse allocations, track stock velocity, and trigger automated purchase requests
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {hasPermission('inventory', 'adjust') && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600' }}
            >
              <Plus size={18} /> {showForm ? 'Cancel' : 'Adjust Stock'}
            </button>
          )}
          <button 
            onClick={fetchInventory}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
            title="Refresh Stock & Reorders"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* TOAST SUCCESS MESSAGE */}
      {prSuccessMessage && (
        <div style={{ padding: '12px 18px', borderRadius: '8px', backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#15803d', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <Check size={20} />
          <span>{prSuccessMessage}</span>
          <button 
            onClick={() => navigate('/purchases?tab=requests')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#15803d', textDecoration: 'underline', cursor: 'pointer', fontWeight: '700' }}
          >
            View in Purchase Requests →
          </button>
        </div>
      )}

      {/* ADJUST STOCK MODAL / FORM */}
      {showForm && (
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>Record Stock Adjustment</h2>
          <form onSubmit={handleAdjustSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Warehouse *</label>
              <select 
                className="form-control" 
                value={adjWarehouseId} 
                onChange={(e) => setAdjWarehouseId(e.target.value)} 
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="">-- Select Facility --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Product *</label>
              <select 
                className="form-control" 
                value={adjProductId} 
                onChange={(e) => setAdjProductId(e.target.value)} 
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="">-- Select Product --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Movement Type *</label>
              <select 
                className="form-control" 
                value={adjMovementType} 
                onChange={(e) => setAdjMovementType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
                <option value="OPENING_STOCK">Opening Stock (+)</option>
                <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
                <option value="DAMAGE">Damaged Units (-)</option>
                <option value="LOSS">Inventory Loss (-)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Quantity *</label>
              <input 
                type="number" 
                min="1" 
                step="1" 
                required 
                value={adjQuantity} 
                onChange={(e) => setAdjQuantity(e.target.value)}
                placeholder="e.g. 50"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Notes / Reason</label>
              <input 
                type="text" 
                value={adjNotes} 
                onChange={(e) => setAdjNotes(e.target.value)}
                placeholder="e.g. Physical inventory count discrepancy"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="submit" 
                disabled={submittingAdj}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontWeight: '600' }}
              >
                {submittingAdj ? 'Recording...' : 'Save Adjustment'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER TABS & SEARCH CONTROLS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all', label: 'All Inventory', count: allCount, color: '#3b82f6' },
            { id: 'reorder', label: 'Reorder Required', count: reorderCount, color: '#ef4444' },
            { id: 'critical', label: 'Critical Stock', count: criticalCount, color: '#b91c1c' },
            { id: 'low', label: 'Low Stock', count: lowCount, color: '#f59e0b' },
            { id: 'normal', label: 'Normal Stock', count: normalCount, color: '#10b981' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchParams({ filter: tab.id });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '999px',
                border: activeTab === tab.id ? `2px solid ${tab.color}` : '1px solid #cbd5e1',
                backgroundColor: activeTab === tab.id ? `${tab.color}15` : '#ffffff',
                color: activeTab === tab.id ? tab.color : '#475569',
                fontWeight: activeTab === tab.id ? '700' : '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: '999px', 
                fontSize: '0.75rem', 
                backgroundColor: activeTab === tab.id ? tab.color : '#e2e8f0', 
                color: activeTab === tab.id ? '#ffffff' : '#475569',
                fontWeight: '700'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Warehouse Filter Row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '260px', display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, SKU, or code..." 
                style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
            <button type="submit" style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
              Search
            </button>
          </form>

          <select 
            value={selectedWarehouse} 
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontWeight: '500' }}
          >
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {/* INVENTORY TABLE */}
      <div className="table-container" style={{ margin: 0, overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative' }}>
        <table>
          <thead>
            <tr>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', width: '60px', textAlign: 'center' }}>Sr. No.</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', textAlign: 'center' }}>Product Details</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', textAlign: 'center' }}>Warehouse & Location</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', textAlign: 'center' }}>Current Stock</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', textAlign: 'center' }}>Reorder Level</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', textAlign: 'center' }}>Safety Stock</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', textAlign: 'center' }}>Recommended Reorder</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', textAlign: 'center' }}>Status</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading inventory ledger...
                </td>
              </tr>
            ) : filteredInventory.length > 0 ? (
              filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, index) => {
                const isCritical = item.stock_status === 'CRITICAL_STOCK';
                const isLow = item.stock_status === 'LOW_STOCK';
                const isNormal = item.stock_status === 'NORMAL';

                return (
                  <tr key={item.id} style={{ backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.03)' : (isLow ? 'rgba(245, 158, 11, 0.03)' : 'transparent') }}>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    {/* Product Name & SKU */}
                    <td>
                      <div>
                        <strong 
                          onClick={() => navigate(`/products/${item.product_id}`)}
                          style={{ color: '#0f172a', cursor: 'pointer', fontSize: '0.95rem' }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#0f172a'}
                        >
                          {item.product_name}
                        </strong>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          SKU: {item.sku || '-'} | Code: {item.product_code || '-'}
                        </div>
                      </div>
                    </td>

                    {/* Warehouse & Rack/Shelf/Bin */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: '#334155' }}>
                        <MapPin size={14} color="#64748b" />
                        <span>{item.warehouse_name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {item.rack_number !== '-' ? `Rack: ${item.rack_number}` : ''} 
                        {item.shelf_number !== '-' ? ` | Shelf: ${item.shelf_number}` : ''}
                        {item.bin_location !== '-' ? ` | Bin: ${item.bin_location}` : ''}
                      </div>
                    </td>

                    {/* Current Available Stock */}
                    <td>
                      <span style={{ 
                        fontSize: '1.05rem', 
                        fontWeight: '800', 
                        color: isCritical ? '#b91c1c' : (isLow ? '#d97706' : '#15803d')
                      }}>
                        {item.current_stock}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '4px' }}>units</span>
                    </td>

                    {/* Reorder Level */}
                    <td>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{item.reorder_level}</span>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        ADS: {item.avg_daily_sales || 0}/day
                      </div>
                    </td>

                    {/* Safety Stock */}
                    <td>
                      <span style={{ color: '#475569', fontWeight: '500' }}>{item.safety_stock || 0}</span>
                    </td>

                    {/* Recommended Reorder Quantity */}
                    <td>
                      {item.reorder_required ? (
                        <span style={{ fontWeight: '700', color: '#4338ca', backgroundColor: '#e0e7ff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                          +{item.reorder_qty} units
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Adequate</span>
                      )}
                    </td>

                    {/* Stock Status Badge */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          backgroundColor: isCritical ? '#fee2e2' : (isLow ? '#fef3c7' : '#dcfce7'),
                          color: isCritical ? '#b91c1c' : (isLow ? '#d97706' : '#15803d'),
                        }}>
                          {isCritical && <AlertOctagon size={12} />}
                          {isLow && <AlertTriangle size={12} />}
                          {isNormal && <CheckCircle size={12} />}
                          {item.stock_status.replace('_', ' ')}
                        </span>
                        {item.audit_status === 'AUDITED' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.67rem',
                            fontWeight: '700',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0'
                          }}>
                            <CheckCircle2 size={11} /> AUDITED
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.67rem',
                            fontWeight: '700',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a'
                          }}>
                            <AlertTriangle size={11} /> PENDING AUDIT
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {item.reorder_required ? (
                          (item.audit_required || item.audit_status === 'PENDING_AUDIT' || !item.audit_status) ? (
                            <button
                              type="button"
                              onClick={() => setVerifyAuditProduct(item)}
                              title="Physical stock audit count is required before issuing a Reorder / Purchase Order"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                borderRadius: '6px',
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fcd34d',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(180, 83, 9, 0.08)'
                              }}
                            >
                              <ClipboardCheck size={14} color="#b45309" />
                              Audit Required
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGeneratePurchaseRequest(item)}
                              disabled={generatingPrFor === item.id}
                              className="btn btn-primary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                borderRadius: '6px',
                                backgroundColor: '#4338ca',
                                color: '#ffffff',
                                cursor: 'pointer'
                              }}
                            >
                              <ShoppingCart size={14} />
                              {generatingPrFor === item.id
                                ? 'Processing...'
                                : (canCreatePO ? 'Generate PO' : 'Generate PR')}
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => setVerifyAuditProduct(item)}
                            title="Verify physical shelf count"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 10px',
                              fontSize: '0.76rem',
                              fontWeight: '700',
                              borderRadius: '6px',
                              border: item.audit_status === 'AUDITED' ? '1px solid #cbd5e1' : '1px solid #10b981',
                              backgroundColor: item.audit_status === 'AUDITED' ? '#f8fafc' : '#ecfdf5',
                              color: item.audit_status === 'AUDITED' ? '#475569' : '#047857',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ClipboardCheck size={13} color={item.audit_status === 'AUDITED' ? '#64748b' : '#059669'} />
                            {item.audit_status === 'AUDITED' ? 'Verified' : 'Verify Stock'}
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/products/${item.product_id}`)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff',
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No inventory records match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={filteredInventory.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* VERIFY PHYSICAL STOCK MODAL */}
      <VerifyPhysicalStockModal
        isOpen={!!verifyAuditProduct}
        product={verifyAuditProduct}
        onClose={() => setVerifyAuditProduct(null)}
        onSuccess={handleVerifyAuditSuccess}
      />
    </div>
  );
};

export default Inventory;
