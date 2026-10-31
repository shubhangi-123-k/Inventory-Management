import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { Save, X, Users, ArrowLeft } from 'lucide-react';
import SuggestionInput from '../components/SuggestionInput';

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    mobile_number: '',
    alternative_mobile: '',
    email: '',
    customer_type: '',
    company_name: '',
    gstin: '',
    pan_number: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_country: '',
    billing_pincode: '',
    shipping_address: '',
    shipping_city: '',
    shipping_state: '',
    shipping_country: '',
    shipping_pincode: '',
    same_as_billing: false,
    credit_limit: '',
    payment_terms: '',
    currency: 'INR',
    price_list: '',
    status: 'Active'
  });

  useEffect(() => {
    if (isEdit) {
      fetchCustomer();
    } else {
      api.get('/admin/customers?limit=1000')
        .then(res => {
          const list = res.data?.data || res.data || [];
          setExistingCustomers(Array.isArray(list) ? list : []);
        })
        .catch(() => setExistingCustomers([]));
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/customers/${id}`);
      setFormData(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch customer", error);
      alert("Failed to load customer details");
      navigate('/customers');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSameAsBilling = (e) => {
    const checked = e.target.checked;
    setFormData(prev => ({
      ...prev,
      same_as_billing: checked,
      ...(checked && {
        shipping_address: prev.billing_address,
        shipping_city: prev.billing_city,
        shipping_state: prev.billing_state,
        shipping_country: prev.billing_country,
        shipping_pincode: prev.billing_pincode
      })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/admin/customers/${id}`, formData);
      } else {
        await api.post('/admin/customers', formData);
      }
      navigate('/customers');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save customer');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontFamily: 'system-ui, sans-serif' }}>
        Loading customer data...
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase'
  };

  const sectionHeaderStyle = {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#0f172a',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '10px',
    marginBottom: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Header Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/customers')}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                title="Back to Customers"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={24} color="#4338ca" />
                {isEdit ? 'Edit Customer Record' : 'Create New Customer'}
              </h1>
            </div>
            <p style={{ margin: '4px 0 0 34px', color: '#64748b', fontSize: '0.88rem' }}>
              Fill in client details, address, commercial credit limits, and contact information.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.88rem'
            }}
          >
            <X size={16} /> Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {/* Basic Info */}
          <div style={sectionHeaderStyle}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>1</span>
            Basic Contact Information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '32px' }}>
            <div>
              <label style={labelStyle}>Customer Name *</label>
              <SuggestionInput id="customer-name-input" value={formData.name || ''} onChange={(value) => setFormData(prev => ({ ...prev, name: value }))} suggestions={existingCustomers.map(customer => customer.name).filter(Boolean)} itemType="Customer" required placeholder="e.g. Acme Corporation or Jane Doe" inputStyle={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Contact Person</label>
              <input type="text" name="contact_person" value={formData.contact_person || ''} onChange={handleChange} placeholder="e.g. John Doe" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mobile Number *</label>
              <SuggestionInput id="customer-mobile-input" value={formData.mobile_number || ''} onChange={(value) => setFormData(prev => ({ ...prev, mobile_number: value }))} suggestions={existingCustomers.map(customer => customer.mobile_number).filter(Boolean)} itemType="Mobile Number" required placeholder="e.g. +91 9876543210" inputStyle={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Alternative Mobile</label>
              <input type="text" name="alternative_mobile" value={formData.alternative_mobile || ''} onChange={handleChange} placeholder="e.g. +91 9876543211" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Email Address</label>
              <SuggestionInput id="customer-email-input" type="email" value={formData.email || ''} onChange={(value) => setFormData(prev => ({ ...prev, email: value }))} suggestions={existingCustomers.map(customer => customer.email).filter(Boolean)} itemType="Email" placeholder="e.g. client@example.com" inputStyle={inputStyle} />
            </div>
          </div>

          {/* Business Info */}
          <div style={sectionHeaderStyle}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>2</span>
            Business & Tax Profile
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '32px' }}>
            <div>
              <label style={labelStyle}>Customer Type</label>
              <select name="customer_type" value={formData.customer_type || ''} onChange={handleChange} style={inputStyle}>
                <option value="">Select Type...</option>
                <option value="Individual">Individual</option>
                <option value="Business">Business</option>
                <option value="Distributor">Distributor</option>
                <option value="Dealer">Dealer</option>
                <option value="Retailer">Retailer</option>
                <option value="Wholesaler">Wholesaler</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Company / Trade Name</label>
              <input type="text" name="company_name" value={formData.company_name || ''} onChange={handleChange} placeholder="Registered Business Name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>GSTIN {formData.customer_type === 'Business' && '*'}</label>
              <SuggestionInput id="customer-gstin-input" value={formData.gstin || ''} onChange={(value) => setFormData(prev => ({ ...prev, gstin: value }))} suggestions={existingCustomers.map(customer => customer.gstin).filter(Boolean)} itemType="GSTIN" required={formData.customer_type === 'Business'} placeholder="22AAAAA0000A1Z5" inputStyle={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PAN Number</label>
              <input type="text" name="pan_number" value={formData.pan_number || ''} onChange={handleChange} placeholder="ABCDE1234F" style={inputStyle} />
            </div>
          </div>

          {/* Address Info */}
          <div style={sectionHeaderStyle}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>3</span>
            Billing & Shipping Address
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            {/* Billing */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '0.92rem', fontWeight: '700' }}>Billing Address</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" name="billing_address" placeholder="Street Address / Premises" value={formData.billing_address || ''} onChange={handleChange} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="text" name="billing_city" placeholder="City" value={formData.billing_city || ''} onChange={handleChange} style={inputStyle} />
                  <input type="text" name="billing_state" placeholder="State" value={formData.billing_state || ''} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="text" name="billing_country" placeholder="Country" value={formData.billing_country || ''} onChange={handleChange} style={inputStyle} />
                  <input type="text" name="billing_pincode" placeholder="Pincode / Postal" value={formData.billing_pincode || ''} onChange={handleChange} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.92rem', fontWeight: '700' }}>Shipping Address</h4>
                <label style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  <input type="checkbox" name="same_as_billing" checked={formData.same_as_billing} onChange={handleSameAsBilling} style={{ accentColor: '#4338ca' }} />
                  Same as Billing
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" name="shipping_address" placeholder="Delivery Address" value={formData.shipping_address || ''} onChange={handleChange} disabled={formData.same_as_billing} style={{ ...inputStyle, backgroundColor: formData.same_as_billing ? '#f8fafc' : 'white' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="text" name="shipping_city" placeholder="City" value={formData.shipping_city || ''} onChange={handleChange} disabled={formData.same_as_billing} style={{ ...inputStyle, backgroundColor: formData.same_as_billing ? '#f8fafc' : 'white' }} />
                  <input type="text" name="shipping_state" placeholder="State" value={formData.shipping_state || ''} onChange={handleChange} disabled={formData.same_as_billing} style={{ ...inputStyle, backgroundColor: formData.same_as_billing ? '#f8fafc' : 'white' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="text" name="shipping_country" placeholder="Country" value={formData.shipping_country || ''} onChange={handleChange} disabled={formData.same_as_billing} style={{ ...inputStyle, backgroundColor: formData.same_as_billing ? '#f8fafc' : 'white' }} />
                  <input type="text" name="shipping_pincode" placeholder="Pincode" value={formData.shipping_pincode || ''} onChange={handleChange} disabled={formData.same_as_billing} style={{ ...inputStyle, backgroundColor: formData.same_as_billing ? '#f8fafc' : 'white' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Commercial Info */}
          <div style={sectionHeaderStyle}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>4</span>
            Commercial Terms & Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '32px' }}>
            <div>
              <label style={labelStyle}>Credit Limit</label>
              <input type="number" step="0.01" min="0" name="credit_limit" placeholder="e.g. 50000" value={formData.credit_limit || ''} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payment Terms</label>
              <select name="payment_terms" value={formData.payment_terms || ''} onChange={handleChange} style={inputStyle}>
                <option value="">Select...</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Due on Receipt">Due on Receipt / Cash</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select name="currency" value={formData.currency || 'INR'} onChange={handleChange} style={inputStyle}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select name="status" value={formData.status || 'Active'} onChange={handleChange} style={inputStyle}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              style={{ padding: '10px 20px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                backgroundColor: '#4338ca',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)'
              }}
            >
              <Save size={18} /> {isEdit ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;
