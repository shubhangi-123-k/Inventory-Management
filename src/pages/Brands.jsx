import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { Plus, Trash2, Edit2, Search, Users, Phone, Mail, X } from 'lucide-react';
import SuggestionInput from '../components/SuggestionInput';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ProductSchemesManager from '../components/ProductSchemesManager';

const Brands = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [deletingBrand, setDeletingBrand] = useState(null);
  const [deleteBrandLoading, setDeleteBrandLoading] = useState(false);
  
  // Form / Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [scheme, setScheme] = useState('');
  const [offer, setOffer] = useState('');
  const [margin, setMargin] = useState('');
  const [authorizedDistributor, setAuthorizedDistributor] = useState('');
  const [officers, setOfficers] = useState([
    { name: '', designation: '', phone: '', email: '', is_primary: true }
  ]);
  const [schemes, setSchemes] = useState({
    product_pe_product: '',
    discount_on_product: '',
    product_target_scheme: '',
    discount_on_bill_amount: '',
    quarterly_discount_on_turnover: '',
    yearly_discount_on_turnover: '',
    seasonal_scheme_name: '',
    seasonal_period_start: '',
    seasonal_period_end: '',
    seasonal_applicability: 'All Products',
    seasonal_frequency: 'Yearly'
  });
  const [status, setStatus] = useState('Active');

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/brands');
      setBrands(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Brands fetch error", error);
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/admin/companies');
      setCompanies(response.data.data || []);
    } catch (error) {
      console.error("Companies fetch error", error);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchCompanies();
  }, []);

  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParams]);

  const brandSuggestions = useMemo(() => {
    const set = new Set();
    brands.forEach(b => {
      if (b.name && b.name.trim()) set.add(b.name.trim());
    });
    return Array.from(set);
  }, [brands]);

  const companySuggestions = useMemo(() => {
    const set = new Set();
    companies.forEach(c => {
      const n = typeof c === 'string' ? c : c?.name;
      if (n && n.trim()) set.add(n.trim());
    });
    brands.forEach(b => {
      if (b.company_name && b.company_name.trim()) set.add(b.company_name.trim());
    });
    return Array.from(set);
  }, [companies, brands]);

  const resetForm = () => {
    setEditingBrandId(null);
    setName('');
    setCompanyName('');
    setDescription('');
    setScheme('');
    setOffer('');
    setMargin('');
    setAuthorizedDistributor('');
    setOfficers([
      { name: '', designation: '', phone: '', email: '', is_primary: true }
    ]);
    setSchemes({
      product_pe_product: '',
      discount_on_product: '',
      product_target_scheme: '',
      discount_on_bill_amount: '',
      quarterly_discount_on_turnover: '',
      yearly_discount_on_turnover: '',
      seasonal_scheme_name: '',
      seasonal_period_start: '',
      seasonal_period_end: '',
      seasonal_applicability: 'All Products',
      seasonal_frequency: 'Yearly'
    });
    setStatus('Active');
    setShowForm(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowForm(true);
  };

  // Add new blank officer row
  const handleAddOfficer = () => {
    setOfficers(prev => [
      ...prev,
      { name: '', designation: '', phone: '', email: '', is_primary: false }
    ]);
  };

  // Remove an officer row
  const handleRemoveOfficer = (index) => {
    if (officers.length <= 1) return;
    setOfficers(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (!updated.some(o => o.is_primary) && updated.length > 0) {
        updated[0].is_primary = true;
      }
      return updated;
    });
  };

  // Update officer field
  const handleOfficerChange = (index, field, value) => {
    setOfficers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Set single primary contact
  const handleSetPrimary = (index) => {
    setOfficers(prev =>
      prev.map((off, i) => ({
        ...off,
        is_primary: i === index
      }))
    );
  };

  const handleEdit = (brand) => {
    setEditingBrandId(brand.id);
    setName(brand.name || '');
    setCompanyName(brand.company_name || '');
    setDescription(brand.description || '');
    setScheme(brand.scheme || '');
    setOffer(brand.offer || '');
    setMargin(brand.margin || '');
    setAuthorizedDistributor(brand.authorized_distributor || '');

    setSchemes({
      product_pe_product: brand.product_pe_product || brand.schemes?.product_pe_product || brand.schemes_data?.product_pe_product || '',
      discount_on_product: brand.discount_on_product || brand.schemes?.discount_on_product || brand.schemes_data?.discount_on_product || '',
      product_target_scheme: brand.product_target_scheme || brand.schemes?.product_target_scheme || brand.schemes_data?.product_target_scheme || '',
      discount_on_bill_amount: brand.discount_on_bill_amount || brand.schemes?.discount_on_bill_amount || brand.schemes_data?.discount_on_bill_amount || '',
      quarterly_discount_on_turnover: brand.quarterly_discount_on_turnover || brand.schemes?.quarterly_discount_on_turnover || brand.schemes_data?.quarterly_discount_on_turnover || '',
      yearly_discount_on_turnover: brand.yearly_discount_on_turnover || brand.schemes?.yearly_discount_on_turnover || brand.schemes_data?.yearly_discount_on_turnover || '',
      seasonal_scheme_name: brand.seasonal_scheme_name || brand.schemes?.seasonal_scheme_name || brand.schemes_data?.seasonal_scheme_name || '',
      seasonal_period_start: brand.seasonal_period_start || brand.schemes?.seasonal_period_start || brand.schemes_data?.seasonal_period_start || '',
      seasonal_period_end: brand.seasonal_period_end || brand.schemes?.seasonal_period_end || brand.schemes_data?.seasonal_period_end || '',
      seasonal_applicability: brand.seasonal_applicability || brand.schemes?.seasonal_applicability || brand.schemes_data?.seasonal_applicability || 'All Products',
      seasonal_frequency: brand.seasonal_frequency || brand.schemes?.seasonal_frequency || brand.schemes_data?.seasonal_frequency || 'Yearly'
    });

    // Parse officers with graceful fallback for legacy records
    if (Array.isArray(brand.officers) && brand.officers.length > 0) {
      setOfficers(brand.officers.map((o, idx) => ({
        name: o.name || '',
        designation: o.designation || '',
        phone: o.phone || '',
        email: o.email || '',
        is_primary: o.is_primary !== undefined ? Boolean(o.is_primary) : idx === 0
      })));
    } else if (Array.isArray(brand.company_officers) && brand.company_officers.length > 0) {
      setOfficers(brand.company_officers.map((o, idx) => {
        if (typeof o === 'object' && o !== null) {
          return {
            name: o.name || '',
            designation: o.designation || '',
            phone: o.phone || '',
            email: o.email || '',
            is_primary: o.is_primary !== undefined ? Boolean(o.is_primary) : idx === 0
          };
        }
        return {
          name: String(o),
          designation: 'Primary Officer',
          phone: '',
          email: '',
          is_primary: idx === 0
        };
      }));
    } else if (brand.company_officer_name) {
      const splitOfficers = String(brand.company_officer_name).split(',').map(s => s.trim()).filter(Boolean);
      if (splitOfficers.length > 0) {
        setOfficers(splitOfficers.map((oName, idx) => ({
          name: oName,
          designation: 'Primary Officer',
          phone: '',
          email: '',
          is_primary: idx === 0
        })));
      } else {
        setOfficers([{ name: '', designation: '', phone: '', email: '', is_primary: true }]);
      }
    } else {
      setOfficers([{ name: '', designation: '', phone: '', email: '', is_primary: true }]);
    }

    setStatus(brand.status || 'Active');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cleanedOfficers = officers.filter(o => o.name && o.name.trim() !== '');
      const officerLabels = cleanedOfficers.map(o => `${o.name}${o.designation ? ` (${o.designation})` : ''}`);

      // Auto-compute human-readable summary strings for scheme & offer
      const activeSchemesList = [];
      if (schemes.product_pe_product) activeSchemesList.push(`BOGO: ${schemes.product_pe_product}`);
      if (schemes.discount_on_product) activeSchemesList.push(`Disc: ${schemes.discount_on_product}`);
      if (schemes.quarterly_discount_on_turnover) activeSchemesList.push(`Qtr: ${schemes.quarterly_discount_on_turnover}`);
      if (schemes.yearly_discount_on_turnover) activeSchemesList.push(`Yr: ${schemes.yearly_discount_on_turnover}`);
      const computedScheme = activeSchemesList.join(' | ') || scheme;

      const activeOffersList = [];
      if (schemes.discount_on_bill_amount) activeOffersList.push(`Bill: ${schemes.discount_on_bill_amount}`);
      if (schemes.product_target_scheme) activeOffersList.push(`Target: ${schemes.product_target_scheme}`);
      if (schemes.seasonal_scheme_name) activeOffersList.push(`Season: ${schemes.seasonal_scheme_name}`);
      const computedOffer = activeOffersList.join(' | ') || offer;

      const payload = {
        name,
        company_name: companyName,
        description,
        scheme: computedScheme,
        offer: computedOffer,
        margin,
        authorized_distributor: authorizedDistributor,
        officers: cleanedOfficers,
        company_officers: officerLabels,
        company_officer_name: officerLabels.join(', '),
        status,
        // Detailed Schemes & Turnover Targets (100% matched with Products & Companies)
        product_pe_product: schemes.product_pe_product || null,
        discount_on_product: schemes.discount_on_product || null,
        product_target_scheme: schemes.product_target_scheme || null,
        discount_on_bill_amount: schemes.discount_on_bill_amount || null,
        quarterly_discount_on_turnover: schemes.quarterly_discount_on_turnover || null,
        yearly_discount_on_turnover: schemes.yearly_discount_on_turnover || null,
        seasonal_scheme_name: schemes.seasonal_scheme_name || null,
        seasonal_period_start: schemes.seasonal_period_start || null,
        seasonal_period_end: schemes.seasonal_period_end || null,
        seasonal_applicability: schemes.seasonal_applicability || 'All Products',
        seasonal_frequency: schemes.seasonal_frequency || 'Yearly',
        schemes_data: schemes
      };

      if (editingBrandId) {
        await api.put(`/admin/brands/${editingBrandId}`, payload);
      } else {
        await api.post('/admin/brands', payload);
      }
      resetForm();
      fetchBrands();
    } catch (error) {
      console.error("Failed to save brand", error);
      alert("Failed to save brand");
    }
  };

  const handleToggleStatus = async (brand) => {
    try {
      const newStatus = brand.status === 'Active' ? 'Inactive' : 'Active';
      await api.patch(`/admin/brands/${brand.id}/status`, { status: newStatus });
      fetchBrands();
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status");
    }
  };

  const handleConfirmDeleteBrand = async (reason) => {
    if (!deletingBrand) return;
    try {
      setDeleteBrandLoading(true);
      await api.delete(`/admin/brands/${deletingBrand.id}`, {
        data: { reason }
      });
      setDeletingBrand(null);
      fetchBrands();
    } catch (err) {
      console.error("Failed to delete brand:", err);
      alert(err.response?.data?.error || "Failed to delete brand");
    } finally {
      setDeleteBrandLoading(false);
    }
  };

  const filteredBrands = brands.filter((brand) => {
    const q = searchTerm.toLowerCase();
    const allOfficers = Array.isArray(brand.officers) ? brand.officers : [];
    const officerMatch = allOfficers.some(o =>
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.designation && o.designation.toLowerCase().includes(q)) ||
      (o.phone && o.phone.toLowerCase().includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q))
    );
    return (
      (brand.name && brand.name.toLowerCase().includes(q)) ||
      (brand.company_name && brand.company_name.toLowerCase().includes(q)) ||
      (brand.authorized_distributor && brand.authorized_distributor.toLowerCase().includes(q)) ||
      (brand.company_officer_name && brand.company_officer_name.toLowerCase().includes(q)) ||
      (brand.scheme && brand.scheme.toLowerCase().includes(q)) ||
      (brand.offer && brand.offer.toLowerCase().includes(q)) ||
      officerMatch
    );
  });

  // Pagination for 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBrands.slice(start, start + itemsPerPage);
  }, [filteredBrands, currentPage]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a' }}>Brands</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Manage product brands, distributor partnerships, margins & commercial schemes</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search brands, distributor, scheme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>
          <button className="btn btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleOpenAdd}>
            <Plus size={18} /> Add Brand
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '14px', width: '980px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <button type="button" onClick={resetForm} style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a', fontSize: '1.25rem', fontWeight: '700' }}>
              {editingBrandId ? 'Edit Brand' : 'Create New Brand'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Brand Name *</label>
                  <SuggestionInput
                    id="brand-name-input"
                    value={name}
                    onChange={setName}
                    suggestions={brandSuggestions}
                    placeholder="e.g. Nike, Apple, Samsung"
                    itemType="Brand"
                    required
                    onRedirect={(match) => { const brand = brands.find(item => item.name?.toLowerCase() === match.toLowerCase()); if (brand) navigate(`/brands?id=${brand.id}&search=${encodeURIComponent(match)}`); }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Company Name</label>
                  <SuggestionInput
                    id="company-name-input"
                    value={companyName}
                    onChange={setCompanyName}
                    suggestions={companySuggestions}
                    placeholder="e.g. Acme Corp"
                    itemType="Company"
                    allowDropdownToggle={true}
                  />
                </div>
              </div>

              {/* SCHEMES & TURNOVER TARGETS (MATCHES PRODUCT SCHEMES ENGINE) */}
              <div style={{ marginTop: '8px', marginBottom: '20px' }}>
                <ProductSchemesManager
                  title="Brand Schemes & Turnover Targets"
                  subtitle="Configure default trade schemes and turnover targets. When this brand is chosen for an element/product, these schemes will automatically match and apply."
                  badgeText="Auto-Sync with Products"
                  section1Title="1. Product Item Schemes"
                  section2Title="2. Bill Wise & Turnover Rebates"
                  product={schemes}
                  onChange={(field, value) => setSchemes(prev => ({ ...prev, [field]: value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Margin (%)</label>
                  <input
                    type="text"
                    placeholder="e.g. 15% or 22.5%"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Authorized Distributor</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Global Distributors Ltd."
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                    value={authorizedDistributor}
                    onChange={(e) => setAuthorizedDistributor(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Status</label>
                <select
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#fff' }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* OFFICERS & CONTACT PERSONS REPEATER */}
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="#4338ca" />
                    <label style={{ margin: 0, color: '#0f172a', fontSize: '0.92rem', fontWeight: '700' }}>
                      Officers & Contact Persons
                    </label>
                  </div>
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#ede9fe', color: '#4338ca', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                    {officers.filter(o => o.name && o.name.trim()).length} officer(s)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {officers.map((off, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid',
                        borderColor: off.is_primary ? '#c7d2fe' : '#e2e8f0',
                        borderRadius: '10px',
                        padding: '12px',
                        boxShadow: off.is_primary ? '0 2px 8px rgba(99, 102, 241, 0.08)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', color: off.is_primary ? '#4338ca' : '#64748b' }}>
                          <input
                            type="radio"
                            name="brand_primary_officer"
                            checked={off.is_primary}
                            onChange={() => handleSetPrimary(index)}
                            title="Mark as Primary Contact"
                          />
                          {off.is_primary ? '★ Primary Contact' : 'Set as Primary'}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveOfficer(index)}
                          disabled={officers.length === 1}
                          style={{
                            backgroundColor: officers.length === 1 ? '#f1f5f9' : '#fee2e2',
                            color: officers.length === 1 ? '#94a3b8' : '#ef4444',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: officers.length === 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                          title="Remove Officer"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                        <div>
                          <input
                            type="text"
                            placeholder="Officer Name *"
                            value={off.name}
                            onChange={e => handleOfficerChange(index, 'name', e.target.value)}
                            required={index === 0}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              outline: 'none',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Role (e.g. Sales Head)"
                            value={off.designation}
                            onChange={e => handleOfficerChange(index, 'designation', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              outline: 'none',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div>
                          <input
                            type="tel"
                            placeholder="Mobile Number"
                            value={off.phone}
                            onChange={e => handleOfficerChange(index, 'phone', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              outline: 'none',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div>
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={off.email}
                            onChange={e => handleOfficerChange(index, 'email', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              outline: 'none',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddOfficer}
                  style={{
                    marginTop: '12px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px dashed #cbd5e1',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}
                >
                  <Plus size={15} /> + Add Another Officer
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Description</label>
                <textarea
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', minHeight: '65px', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                  placeholder="Optional brand notes, terms or policies..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" onClick={resetForm} style={{ padding: '9px 18px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '9px 18px', border: 'none', backgroundColor: '#4338ca', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  {editingBrandId ? 'Update Brand' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '950px' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px', textAlign: 'center' }}>Sr. No.</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>BRAND ID</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>BRAND NAME</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>COMPANY</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>SCHEME / OFFER</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>MARGIN</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>DISTRIBUTOR & OFFICER</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>STATUS</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading brands...</td></tr>
            ) : paginatedBrands.length > 0 ? (
              paginatedBrands.map((brand, bIdx) => (
                <tr key={brand.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '0.85rem' }}>
                    {(currentPage - 1) * itemsPerPage + bIdx + 1}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600', textAlign: 'center' }}>
                    {'BRN' + String(brand.id).padStart(5, '0')}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{brand.name}</div>
                    {brand.description && <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{brand.description}</div>}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#334155', fontWeight: '500', fontSize: '0.9rem' }}>
                    {brand.company_name || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                    {brand.scheme ? (
                      <div style={{ color: '#0369a1', fontWeight: '600', marginBottom: brand.offer ? '2px' : 0 }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Scheme: </span>{brand.scheme}
                      </div>
                    ) : null}
                    {brand.offer ? (
                      <div style={{ color: '#b45309', fontWeight: '600' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Offer: </span>{brand.offer}
                      </div>
                    ) : null}
                    {!brand.scheme && !brand.offer && <span style={{ color: '#94a3b8' }}>-</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                    {brand.margin ? (
                      <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem' }}>
                        {brand.margin.includes('%') ? brand.margin : `${brand.margin}%`}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', position: 'relative' }}>
                    {brand.authorized_distributor && (
                      <div style={{ color: '#0f172a', fontWeight: '600', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Dist: </span>{brand.authorized_distributor}
                      </div>
                    )}
                    {(() => {
                      const allOfficers = Array.isArray(brand.officers) && brand.officers.length > 0
                        ? brand.officers
                        : (Array.isArray(brand.company_officers) && brand.company_officers.length > 0
                          ? brand.company_officers.map(co => typeof co === 'object' ? co : { name: String(co), designation: 'Officer' })
                          : (brand.company_officer_name ? [{ name: brand.company_officer_name, designation: 'Officer' }] : []));
                      const primary = allOfficers.find(o => o.is_primary) || allOfficers[0];

                      if (!primary && !brand.authorized_distributor) {
                        return <span style={{ color: '#94a3b8' }}>-</span>;
                      }
                      if (!primary) return null;

                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>
                              {primary.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              ({primary.designation || 'Officer'})
                            </span>
                            {primary.is_primary && (
                              <span style={{ fontSize: '0.65rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                PRIMARY
                              </span>
                            )}
                          </div>

                          {primary.phone && (
                            <div style={{ marginTop: '3px' }}>
                              <a
                                href={`tel:${primary.phone}`}
                                style={{ color: '#4338ca', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                              >
                                <Phone size={11} /> {primary.phone}
                              </a>
                            </div>
                          )}

                          {primary.email && (
                            <div style={{ marginTop: '2px' }}>
                              <a
                                href={`mailto:${primary.email}`}
                                style={{ color: '#64748b', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Mail size={11} /> {primary.email}
                              </a>
                            </div>
                          )}

                          {allOfficers.length > 1 && (
                            <div style={{ marginTop: '6px', position: 'relative' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenPopoverId(openPopoverId === `brand-${brand.id}` ? null : `brand-${brand.id}`);
                                }}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '999px',
                                  padding: '2px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  color: '#475569',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Users size={12} color="#6366f1" /> +{allOfficers.length - 1} more
                              </button>

                              {/* Interactive Popover */}
                              {openPopoverId === `brand-${brand.id}` && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    marginTop: '6px',
                                    zIndex: 90,
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                                    padding: '12px',
                                    minWidth: '260px',
                                    maxWidth: '320px'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>All Contact Officers ({allOfficers.length})</span>
                                    <button
                                      type="button"
                                      onClick={() => setOpenPopoverId(null)}
                                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {allOfficers.map((off, oIdx) => (
                                      <div key={oIdx} style={{ fontSize: '0.78rem', padding: '6px 8px', borderRadius: '6px', backgroundColor: off.is_primary ? '#f5f3ff' : '#f8fafc', border: off.is_primary ? '1px solid #ddd6fe' : '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <strong style={{ color: '#0f172a' }}>{off.name}</strong>
                                          {off.is_primary && (
                                            <span style={{ fontSize: '0.65rem', color: '#4338ca', fontWeight: '700' }}>PRIMARY</span>
                                          )}
                                        </div>
                                        {off.designation && <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{off.designation}</div>}
                                        {off.phone && (
                                          <div style={{ marginTop: '2px' }}>
                                            <a href={`tel:${off.phone}`} style={{ color: '#4338ca', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                              <Phone size={10} /> {off.phone}
                                            </a>
                                          </div>
                                        )}
                                        {off.email && (
                                          <div style={{ marginTop: '2px' }}>
                                            <a href={`mailto:${off.email}`} style={{ color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                              <Mail size={10} /> {off.email}
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        onClick={() => handleToggleStatus(brand)}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: brand.status === 'Active' ? 'flex-end' : 'flex-start',
                          width: '38px',
                          height: '20px',
                          background: brand.status === 'Active' ? '#4338ca' : '#cbd5e1',
                          borderRadius: '10px',
                          padding: '2px',
                          transition: 'background 0.2s',
                          marginRight: '8px'
                        }}
                        title="Toggle Status"
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          background: '#fff',
                          borderRadius: '50%',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: brand.status === 'Active' ? '#4338ca' : '#94a3b8' }}>
                        {brand.status || 'Active'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEdit(brand)}
                        title="Edit Brand"
                        style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingBrand(brand)}
                        title="Delete Brand"
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No brands found.</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredBrands.length}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </div>

      <DeleteConfirmationModal
        isOpen={!!deletingBrand}
        title="Delete Brand"
        itemName={deletingBrand ? `Brand "${deletingBrand.name}"` : ''}
        onClose={() => setDeletingBrand(null)}
        onConfirm={handleConfirmDeleteBrand}
        isLoading={deleteBrandLoading}
      />
    </div>
  );
};

export default Brands;

