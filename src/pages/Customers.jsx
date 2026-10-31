import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  Users, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Search, 
  RotateCcw, 
  Building2, 
  UserCheck, 
  CreditCard 
} from 'lucide-react';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useAuth } from '../context/AuthContext';

const Customers = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Pagination for 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterState, filterType, filterStatus]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return customers.slice(start, start + itemsPerPage);
  }, [customers, currentPage]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (filterState) queryParams.append('state', filterState);
      if (filterType) queryParams.append('customer_type', filterType);
      if (filterStatus) queryParams.append('status', filterStatus);
      
      const res = await api.get(`/admin/customers?${queryParams.toString()}`);
      setCustomers(res.data?.data || res.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch customers", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, filterState, filterType, filterStatus]);

  const handleToggleStatus = async (customer) => {
    const nextStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/admin/customers/${customer.id}`, { status: nextStatus });
      fetchCustomers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update customer status');
    }
  };

  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleConfirmDeleteCustomer = async (reason) => {
    if (!deletingCustomer) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/admin/customers/${deletingCustomer.id}`, {
        data: { reason }
      });
      alert("Customer record deleted successfully");
      setDeletingCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error("Delete customer error:", error);
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to delete customer");
    } finally {
      setDeleteLoading(false);
    }
  };

  // KPI Metrics Calculation
  const totalCount = customers.length;
  const activeCount = customers.filter(c => c.status === 'Active').length;
  const b2bCount = customers.filter(c => ['Business', 'Distributor', 'Dealer', 'Wholesaler'].includes(c.customer_type)).length;
  const creditAccountsCount = customers.filter(c => parseFloat(c.credit_limit || 0) > 0).length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Header Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={26} color="#4338ca" />
              Customer Master Directory
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Manage clients, retail buyers, distribution partners, credit terms, and contact records.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {hasPermission('customers', 'create') && (
              <button
                onClick={() => navigate('/customers/new')}
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
                <Plus size={18} /> Add Customer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Customers</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>{totalCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Active Accounts</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>{activeCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>B2B & Wholesale</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>{b2bCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Credit Active</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>{creditAccountsCount}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, company, phone, email, GSTIN..."
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
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
            <option value="">All Customer Types</option>
            <option value="Individual">Individual</option>
            <option value="Business">Business</option>
            <option value="Distributor">Distributor</option>
            <option value="Dealer">Dealer</option>
            <option value="Retailer">Retailer</option>
            <option value="Wholesaler">Wholesaler</option>
          </select>

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
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {(search || filterType || filterStatus) && (
            <button
              onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); }}
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

      {/* Customer Data Table Card */}
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
              <th style={{ width: '60px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Sr. No.</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Code</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Customer & Company</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Contact Info</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>GSTIN / Tax</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Type</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Location</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Credit Limit</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                  Loading customer records...
                </td>
              </tr>
            ) : paginatedCustomers.length > 0 ? (
              paginatedCustomers.map((customer, index) => (
                <tr key={customer.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500', whiteSpace: 'nowrap' }}>
                    {(currentPage - 1) * 10 + index + 1}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#4338ca', fontFamily: 'monospace', fontWeight: '700', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                    {customer.customer_id || `CUST${String(customer.id).padStart(4, '0')}`}
                  </td>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>
                      {customer.name}
                    </div>
                    {customer.company_name && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                        <Building2 size={13} color="#94a3b8" />
                        {customer.company_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>
                      {customer.mobile_number || '—'}
                    </div>
                    {customer.email && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        {customer.email}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                    {customer.gstin || customer.pan_number || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '3px 9px', borderRadius: '6px', fontWeight: '600', fontSize: '0.78rem' }}>
                      {customer.customer_type || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#334155', fontSize: '0.85rem', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div>{[customer.billing_city, customer.billing_state].filter(Boolean).join(', ') || customer.billing_state || '—'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.88rem', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                    {customer.credit_limit ? `${customer.currency || '₹'} ${parseFloat(customer.credit_limit).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div
                        onClick={() => handleToggleStatus(customer)}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: customer.status === 'Active' ? 'flex-end' : 'flex-start',
                          width: '38px',
                          height: '20px',
                          background: customer.status === 'Active' ? '#4338ca' : '#cbd5e1',
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
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: customer.status === 'Active' ? '#4338ca' : '#64748b' }}>
                        {customer.status || 'Active'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px'
                        }}
                        title="View Details"
                      >
                        <Eye size={17} />
                      </button>
                      {hasPermission('customers', 'edit') && (
                        <button
                          onClick={() => navigate(`/customers/${customer.id}/edit`)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#4338ca',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px'
                          }}
                          title="Edit Customer"
                        >
                          <Edit2 size={17} />
                        </button>
                      )}
                      {hasPermission('customers', 'delete') && (
                        <button
                          onClick={() => setDeletingCustomer(customer)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px'
                          }}
                          title="Delete Customer"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '16px' }}>
                      <Users size={28} />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                      No customers found
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '380px', marginBottom: '18px' }}>
                      {search || filterType || filterStatus 
                        ? 'No records match your filter criteria. Try clearing the filters.' 
                        : 'Get started by creating your first customer master record in the directory.'}
                    </div>
                    {search || filterType || filterStatus ? (
                      <button
                        onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); }}
                        style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/customers/new')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#4338ca', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)' }}
                      >
                        <Plus size={18} /> Add First Customer
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
          totalItems={customers.length}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </div>

      <DeleteConfirmationModal
        isOpen={!!deletingCustomer}
        title="Delete Customer Record"
        itemName={deletingCustomer ? `Customer "${deletingCustomer.name}"` : 'this customer'}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleConfirmDeleteCustomer}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default Customers;
