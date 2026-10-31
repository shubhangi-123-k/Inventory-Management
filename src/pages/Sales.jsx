import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  ShoppingCart, 
  Plus, 
  Eye, 
  Trash2,
  Search, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Sales = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  const fetchSalesOrders = async () => {
    if (!hasPermission('sales_orders', 'view')) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/admin/sales');
      setSalesOrders(res.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch sales orders", error);
      setLoading(false);
    }
  };

  const [deletingOrder, setDeletingOrder] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleConfirmDeleteOrder = async (reason) => {
    if (!deletingOrder) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/admin/sales/${deletingOrder.id}`, {
        data: { reason }
      }).catch(async () => {
        await api.put(`/admin/sales/${deletingOrder.id}/cancel`, { reason });
      });
      alert("Sales order cancelled/deleted successfully");
      setDeletingOrder(null);
      fetchSalesOrders();
    } catch (error) {
      console.error("Failed to delete sales order", error);
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to delete sales order");
    } finally {
      setDeleteLoading(false);
    }
  };

  const [convertingId, setConvertingId] = useState(null);

  const handleConvertChallan = async (order) => {
    try {
      setConvertingId(order.id);
      try {
        await api.post(`/admin/sales-orders/${order.id}/convert-to-tax-invoice`);
      } catch (err) {
        await api.post(`/admin/sales/${order.id}/convert-to-tax-invoice`);
      }
      showSuccess(`Order ${format8DigitId(order)} converted to official GST Tax Invoice! Virtual stock reconciled.`, 'Converted');
      fetchSalesOrders();
    } catch (err) {
      console.error('Failed to convert order:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to convert challan to tax invoice');
    } finally {
      setConvertingId(null);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const format8DigitId = (order) => {
    if (order.so_number && order.so_number.startsWith('SO') && order.so_number.length === 8) {
      return order.so_number;
    }
    if (order.so_number && !order.so_number.includes('-')) {
      return order.so_number;
    }
    return `SO${String(order.id).padStart(6, '0')}`;
  };

  const filteredOrders = salesOrders.filter((order) => {
    const searchLower = search.toLowerCase();
    const soNum = format8DigitId(order).toLowerCase();
    const custName = (order.customer?.name || order.customer_name || '').toLowerCase();
    const dateStr = (order.date || order.so_date || '').toLowerCase();

    const matchesSearch = !search || soNum.includes(searchLower) || custName.includes(searchLower) || dateStr.includes(searchLower);
    const matchesStatus = !filterStatus || order.status === filterStatus;
    const matchesPayment = !filterPayment || order.payment_status === filterPayment;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Pagination for 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterPayment]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  // KPI Calculations
  const totalRevenue = salesOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || o.total_sales || 0), 0);
  const totalOrders = salesOrders.length;
  const confirmedCount = salesOrders.filter(o => ['Confirmed', 'Shipped', 'Delivered'].includes(o.status)).length;
  const pendingPaymentCount = salesOrders.filter(o => o.payment_status === 'Pending').length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Header Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingCart size={26} color="#4338ca" />
              Sales Orders
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Create, fulfill, and track customer sales orders, invoices, and payment statuses.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {hasPermission('sales_orders', 'create') && (
              <button 
                onClick={() => navigate('/sales/new')} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
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
                <Plus size={18} /> New Sales Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Invoiced</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>${totalRevenue.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Orders</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>{totalOrders}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Fulfilled / Active</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>{confirmedCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Pending Payment</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>{pendingPaymentCount}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by 8-digit SO ID, Customer, Date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px 10px 38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.9rem',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '0.88rem',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Order Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Draft">Draft</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '0.88rem',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Payments</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>

          {(search || filterStatus || filterPayment) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterPayment(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                fontSize: '0.88rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <RotateCcw size={15} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Sales Orders Data Table Card */}
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
        <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '60px', textAlign: 'center' }}>Sr. No.</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>SO ID</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Order Date</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Customer Name</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Billing Mode</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Total Amount</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Payment Status</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>Order Status</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                  Loading sales orders...
                </td>
              </tr>
            ) : paginatedOrders.length > 0 ? (
              paginatedOrders.map((order, oIdx) => {
                const soIdFormatted = format8DigitId(order);
                const customerDisplay = order.customer?.name || order.Customer?.name || order.customer_name || 'Walk-in Customer';
                const isChallan = order.stock_effect_mode === 'PHYSICAL_ONLY';
                const isAdvance = order.stock_effect_mode === 'VIRTUAL_ONLY';

                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                      {(currentPage - 1) * itemsPerPage + oIdx + 1}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: '#4338ca', fontFamily: 'monospace', fontWeight: '700', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      {soIdFormatted}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                      {order.date || order.so_date || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.92rem' }}>
                        {customerDisplay}
                      </div>
                      {order.customer?.company_name && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                          {order.customer.company_name}
                        </div>
                      )}
                    </td>
                    {/* Billing Mode (Module 3) */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      {isChallan ? (
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 9px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a'
                        }}>
                          📋 Delivery Challan
                        </span>
                      ) : isAdvance ? (
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 9px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          backgroundColor: '#ede9fe',
                          color: '#6d28d9',
                          border: '1px solid #ddd6fe'
                        }}>
                          🏢 Advance Bill
                        </span>
                      ) : (
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 9px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0'
                        }}>
                          🧾 Tax Invoice
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                      ₹{parseFloat(order.total_amount || order.total_sales || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        padding: '3px 9px', 
                        borderRadius: '6px', 
                        fontSize: '0.78rem', 
                        fontWeight: '700',
                        backgroundColor: order.payment_status === 'Paid' ? '#dcfce7' : '#fef3c7',
                        color: order.payment_status === 'Paid' ? '#15803d' : '#d97706'
                      }}>
                        {order.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        padding: '3px 9px', 
                        borderRadius: '6px', 
                        fontSize: '0.78rem', 
                        fontWeight: '700',
                        backgroundColor: order.status === 'Cancelled' ? '#fee2e2' : order.status === 'Delivered' ? '#dcfce7' : '#e0e7ff',
                        color: order.status === 'Cancelled' ? '#b91c1c' : order.status === 'Delivered' ? '#15803d' : '#4338ca'
                      }}>
                        {order.status || 'Confirmed'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button 
                        onClick={() => navigate(`/sales/${order.id}`)} 
                        style={{ 
                          backgroundColor: '#f1f5f9', 
                          color: '#4338ca', 
                          border: '1px solid #cbd5e1', 
                          padding: '6px 14px', 
                          borderRadius: '6px', 
                          cursor: 'pointer', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          fontWeight: '600',
                          fontSize: '0.85rem'
                        }}
                      >
                        <Eye size={15} /> View
                      </button>

                      {/* Convert Delivery Challan Shortcut Button (Module 3.2) */}
                      {isChallan && (
                        <button
                          onClick={() => handleConvertChallan(order)}
                          disabled={convertingId === order.id}
                          title="Convert Delivery Challan to Official GST Tax Invoice"
                          style={{
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: convertingId === order.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            marginLeft: '8px',
                            boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)'
                          }}
                        >
                          <FileCheck2 size={14} />
                          {convertingId === order.id ? 'Converting...' : 'Convert to GST Bill'}
                        </button>
                      )}

                      {hasPermission('sales_orders', 'delete') && (
                        <button 
                          onClick={() => setDeletingOrder(order)} 
                          title="Delete / Cancel Sales Order"
                          style={{ 
                            backgroundColor: '#fee2e2', 
                            color: '#dc2626', 
                            border: '1px solid #fecaca', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            marginLeft: '8px'
                          }}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '16px' }}>
                      <ShoppingCart size={28} />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                      No sales orders found
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '380px', marginBottom: '18px' }}>
                      {search || filterStatus || filterPayment 
                        ? 'No orders match your filter criteria. Try clearing the filters.' 
                        : 'Get started by creating your first sales order.'}
                    </div>
                    {search || filterStatus || filterPayment ? (
                      <button
                        onClick={() => { setSearch(''); setFilterStatus(''); setFilterPayment(''); }}
                        style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/sales/new')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#4338ca', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)' }}
                      >
                        <Plus size={18} /> Create First Sales Order
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </div>

      <DeleteConfirmationModal
        isOpen={!!deletingOrder}
        title="Delete / Cancel Sales Order"
        itemName={deletingOrder ? `Sales Order "${format8DigitId(deletingOrder)}"` : 'this sales order'}
        onClose={() => setDeletingOrder(null)}
        onConfirm={handleConfirmDeleteOrder}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default Sales;
