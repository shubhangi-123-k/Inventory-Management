import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Edit2, CreditCard, MapPin, Building2, Phone, Mail, FileText, ShoppingBag } from 'lucide-react';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await api.get(`/admin/customers/${id}`);
        setCustomer(res.data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch customer", error);
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontFamily: 'system-ui, sans-serif' }}>
        Loading customer profile...
      </div>
    );
  }
  if (!customer) {
    return (
      <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontFamily: 'system-ui, sans-serif' }}>
        Customer record not found.
      </div>
    );
  }

  const totalOrders = customer.SalesOrders ? customer.SalesOrders.length : 0;
  const totalSales = customer.SalesOrders ? customer.SalesOrders.reduce((sum, order) => sum + parseFloat(order.total_sales || 0), 0) : 0;
  const pendingAmount = customer.SalesOrders ? customer.SalesOrders.reduce((sum, order) => sum + parseFloat(order.so_balance || 0), 0) : 0;
  const lastOrderDate = customer.SalesOrders && customer.SalesOrders.length > 0 
    ? new Date(Math.max(...customer.SalesOrders.map(o => new Date(o.date || o.created_date)))).toLocaleDateString() 
    : 'N/A';

  const cardStyle = {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
  };

  const sectionTitleStyle = {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => navigate('/customers')}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
              title="Back to Customers"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>
                  {customer.name}
                </h1>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '700', 
                  backgroundColor: customer.status === 'Active' ? '#dcfce7' : '#fee2e2', 
                  color: customer.status === 'Active' ? '#15803d' : '#b91c1c', 
                  padding: '3px 10px', 
                  borderRadius: '999px' 
                }}>
                  {customer.status || 'Active'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '3px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#4338ca' }}>
                  {customer.customer_id || `CUST${String(customer.id).padStart(4, '0')}`}
                </span>
                <span>•</span>
                <span>Type: <strong style={{ color: '#0f172a' }}>{customer.customer_type || 'General'}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
            style={{
              backgroundColor: '#4338ca',
              color: 'white',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)'
            }}
          >
            <Edit2 size={16} /> Edit Customer
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
          {/* Main Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={cardStyle}>
                <h3 style={sectionTitleStyle}><Building2 size={18} color="#4338ca" /> Business & Tax</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                  <div><span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Company / Firm</span><strong>{customer.company_name || '—'}</strong></div>
                  <div><span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>GSTIN</span><span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{customer.gstin || '—'}</span></div>
                  <div><span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>PAN Number</span><span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{customer.pan_number || '—'}</span></div>
                </div>
              </div>
              
              <div style={cardStyle}>
                <h3 style={sectionTitleStyle}><Phone size={18} color="#4338ca" /> Contact Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                  <div><span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Contact Person</span><strong>{customer.contact_person || '—'}</strong></div>
                  <div><span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Primary Mobile</span><strong>{customer.mobile_number || '—'}</strong></div>
                  <div><span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Email</span><span>{customer.email || '—'}</span></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={cardStyle}>
                <h3 style={sectionTitleStyle}><MapPin size={18} color="#4338ca" /> Billing Address</h3>
                {customer.billing_address ? (
                  <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.6' }}>
                    <div>{customer.billing_address}</div>
                    <div>{[customer.billing_city, customer.billing_state].filter(Boolean).join(', ')}</div>
                    <div>{[customer.billing_country, customer.billing_pincode].filter(Boolean).join(' - ')}</div>
                  </div>
                ) : <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>No billing address specified</span>}
              </div>
              
              <div style={cardStyle}>
                <h3 style={sectionTitleStyle}><MapPin size={18} color="#4338ca" /> Shipping Address</h3>
                {customer.shipping_address ? (
                  <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.6' }}>
                    <div>{customer.shipping_address}</div>
                    <div>{[customer.shipping_city, customer.shipping_state].filter(Boolean).join(', ')}</div>
                    <div>{[customer.shipping_country, customer.shipping_pincode].filter(Boolean).join(' - ')}</div>
                  </div>
                ) : <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Same as billing address</span>}
              </div>
            </div>
          </div>

          {/* Sidebar Insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}><CreditCard size={18} color="#4338ca" /> Commercial Terms</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Credit Limit</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#0f172a' }}>
                    {customer.credit_limit ? `${customer.currency || '₹'} ${parseFloat(customer.credit_limit).toLocaleString()}` : 'None'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Payment Terms</span>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{customer.payment_terms || 'Standard'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Currency</span>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{customer.currency || 'INR'}</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} color="#818cf8" />
                Sales Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Orders</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#ffffff' }}>{totalOrders}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Invoiced Sales</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#ffffff' }}>${totalSales.toFixed(2)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>Pending Balance</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: pendingAmount > 0 ? '#f87171' : '#34d399' }}>${pendingAmount.toFixed(2)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>Last Order Placed</span>
                  <div style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '0.9rem' }}>{lastOrderDate}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
