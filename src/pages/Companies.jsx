import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { Plus, Trash2, Edit2, Search, Users, Phone, Mail, X, Eye, FileText, Video, Play, ExternalLink, Download, Upload, Image as ImageIcon, Sparkles, Building2, CheckCircle2, Film, Gift, Tag, TrendingUp, Calendar, Percent } from 'lucide-react';
import PhotoUploader from '../components/PhotoUploader';
import BrochureUploader from '../components/BrochureUploader';
import ProductSchemesManager from '../components/ProductSchemesManager';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import SuggestionInput from '../components/SuggestionInput';
import { extractCompanyMedia, parseMediaArray } from '../utils/mediaUtils';

const Companies = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState(null);

  // Form / Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheme, setScheme] = useState('');
  const [offer, setOffer] = useState('');
  const [margin, setMargin] = useState('');
  const [authorizedDistributor, setAuthorizedDistributor] = useState('');
  const [officers, setOfficers] = useState([
    { name: '', designation: '', phone: '', email: '', is_primary: true }
  ]);
  const officerSuggestionRecords = useMemo(() => companies.flatMap(company => {
    let companyOfficers = Array.isArray(company.officers) ? company.officers : [];
    if (companyOfficers.length === 0 && Array.isArray(company.company_officers)) {
      companyOfficers = company.company_officers;
    }
    if (companyOfficers.length === 0 && (company.company_officer_name || company.contact_person || company.phone || company.email)) {
      companyOfficers = [{
        name: company.company_officer_name || company.contact_person || '',
        designation: company.designation || '',
        phone: company.phone || '',
        email: company.email || '',
      }];
    }
    return companyOfficers.map(officer => ({
      company,
      name: typeof officer === 'string' ? officer : (officer.name || officer.officer_name || ''),
      designation: typeof officer === 'string' ? '' : (officer.designation || officer.role || ''),
      phone: typeof officer === 'string' ? '' : (officer.phone || officer.mobile_number || ''),
      email: typeof officer === 'string' ? '' : (officer.email || ''),
    }));
  }), [companies]);
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
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [companyImages, setCompanyImages] = useState([]);
  const [brochureUrl, setBrochureUrl] = useState('');
  const [brochureName, setBrochureName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [status, setStatus] = useState('Active');

  // View Details & Media Preview Modals
  const [viewingCompany, setViewingCompany] = useState(null);
  const [viewingCompanyLoading, setViewingCompanyLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null); // { type: 'video' | 'gallery', url, images, title }

  const logoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/companies');
      const rawList = response.data?.data || response.data || [];
      const normalized = Array.isArray(rawList) ? rawList.map(extractCompanyMedia) : [];
      setCompanies(normalized);
      setLoading(false);
    } catch (error) {
      console.error("Companies fetch error", error);
      setLoading(false);
    }
  };

  const redirectToOfficerCompany = (field, value) => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    const record = officerSuggestionRecords.find(officer =>
      String(officer[field] || '').trim().toLowerCase() === normalizedValue
    );
    if (record?.company?.id) {
      navigate(`/companies?id=${record.company.id}&search=${encodeURIComponent(record.company.name || value)}`);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    const idParam = searchParams.get('id');
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    if (idParam && companies.length > 0) {
      const found = companies.find(c => c.id.toString() === idParam.toString());
      if (found) {
        setViewingCompany(found);
      }
    }
  }, [searchParams, companies]);

  const resetForm = () => {
    setEditingCompanyId(null);
    setName('');
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
    setImageUrl('');
    setCompanyImages([]);
    setBrochureUrl('');
    setBrochureName('');
    setVideoUrl('');
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

  const [deletingOfficer, setDeletingOfficer] = useState(null);
  const [deleteOfficerLoading, setDeleteOfficerLoading] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [deleteCompanyLoading, setDeleteCompanyLoading] = useState(false);

  // Remove an officer row
  const handleRemoveOfficer = (index) => {
    if (officers.length <= 1) return;
    const off = officers[index];
    if (off && off.id) {
      setDeletingOfficer({ index, officer: off });
    } else {
      setOfficers(prev => {
        const updated = prev.filter((_, i) => i !== index);
        if (!updated.some(o => o.is_primary) && updated.length > 0) {
          updated[0].is_primary = true;
        }
        return updated;
      });
    }
  };

  const handleConfirmDeleteOfficer = async (reason) => {
    if (!deletingOfficer) return;
    try {
      setDeleteOfficerLoading(true);
      if (deletingOfficer.officer?.id) {
        await api.delete(`/admin/officers/${deletingOfficer.officer.id}`, {
          data: { reason }
        }).catch(err => {
          console.warn("Backend officer delete fallback:", err);
        });
      }
      setOfficers(prev => {
        const updated = prev.filter((_, i) => i !== deletingOfficer.index);
        if (!updated.some(o => o.is_primary) && updated.length > 0) {
          updated[0].is_primary = true;
        }
        return updated;
      });
      setDeletingOfficer(null);
    } catch (err) {
      console.error("Failed to delete officer:", err);
      alert(err.response?.data?.message || err.response?.data?.error || "Failed to delete officer");
    } finally {
      setDeleteOfficerLoading(false);
    }
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

  // Upload Single Company Logo / Primary Image
  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP, SVG)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target.result);
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'companies');
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 8000
      });
      if (res.data?.url) {
        setImageUrl(res.data.url);
      }
    } catch (err) {
      console.warn('Backend logo upload fallback to local preview:', err);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Upload Company Video (MP4 / WebM max 50MB)
  const handleVideoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, WebM, MOV)');
      return;
    }
    const MAX_50MB = 50 * 1024 * 1024;
    if (file.size > MAX_50MB) {
      alert(`Video size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 50 MB limit.`);
      return;
    }

    setUploadingVideo(true);
    setVideoUploadProgress(0);

    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('folder', 'companies');

      const res = await api.post('/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setVideoUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        }
      });
      if (res.data?.url) {
        setVideoUrl(res.data.url);
      }
    } catch (err) {
      console.warn('Backend video upload fallback to local preview:', err);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // Embed URL helper for YouTube / Vimeo videos
  const getEmbedVideoUrl = (url) => {
    if (!url) return null;
    const ytMatch = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = String(url).match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
    return null;
  };

  const populateForm = (rawComp) => {
    const comp = extractCompanyMedia(rawComp);
    setEditingCompanyId(comp.id);
    setName(comp.name || comp.company_name || '');
    setDescription(comp.description || '');
    setScheme(comp.scheme || '');
    setOffer(comp.offer || '');
    setMargin(comp.margin || '');
    setAuthorizedDistributor(comp.authorized_distributor || '');
    setOfficers(comp.officers && comp.officers.length > 0 ? comp.officers : [{ name: '', designation: '', phone: '', email: '', is_primary: true }]);
    
    // Set schemes matching Product Schemes Engine
    setSchemes({
      product_pe_product: comp.product_pe_product || comp.schemes?.product_pe_product || '',
      discount_on_product: comp.discount_on_product || comp.schemes?.discount_on_product || '',
      product_target_scheme: comp.product_target_scheme || comp.schemes?.product_target_scheme || '',
      discount_on_bill_amount: comp.discount_on_bill_amount || comp.schemes?.discount_on_bill_amount || '',
      quarterly_discount_on_turnover: comp.quarterly_discount_on_turnover || comp.schemes?.quarterly_discount_on_turnover || '',
      yearly_discount_on_turnover: comp.yearly_discount_on_turnover || comp.schemes?.yearly_discount_on_turnover || '',
      seasonal_scheme_name: comp.seasonal_scheme_name || comp.schemes?.seasonal_scheme_name || '',
      seasonal_period_start: comp.seasonal_period_start || comp.schemes?.seasonal_period_start || '',
      seasonal_period_end: comp.seasonal_period_end || comp.schemes?.seasonal_period_end || '',
      seasonal_applicability: comp.seasonal_applicability || comp.schemes?.seasonal_applicability || 'All Products',
      seasonal_frequency: comp.seasonal_frequency || comp.schemes?.seasonal_frequency || 'Yearly'
    });

    setImageUrl(comp.logoUrl || comp.image_url || '');
    setCompanyImages(comp.images || []);
    setBrochureUrl(comp.brochureUrl || comp.brochure_url || '');
    setBrochureName(comp.brochureName || comp.brochure_name || '');
    setVideoUrl(comp.videoUrl || comp.video_url || '');
    setStatus(comp.status || 'Active');
  };

  const handleEdit = async (comp) => {
    populateForm(comp);
    setShowForm(true);

    // Call GET /admin/companies/:id to get the complete, authoritative record
    if (comp?.id) {
      try {
        const res = await api.get(`/admin/companies/${comp.id}`);
        const fresh = res.data?.data || res.data;
        if (fresh) {
          populateForm({ ...comp, ...fresh });
        }
      } catch (err) {
        console.warn("Could not fetch full company by ID on edit:", err);
      }
    }
  };

  const handleViewCompany = async (comp) => {
    if (!comp) return;
    const initialNormalized = extractCompanyMedia(comp);
    setViewingCompany(initialNormalized);

    // Fetch authoritative full company details by ID: GET /admin/companies/:id
    if (comp.id) {
      try {
        setViewingCompanyLoading(true);
        const res = await api.get(`/admin/companies/${comp.id}`);
        const fresh = res.data?.data || res.data;
        if (fresh) {
          const merged = extractCompanyMedia({ ...comp, ...fresh });
          setViewingCompany(merged);
        }
      } catch (err) {
        console.warn("Could not fetch full company details by ID:", err);
      } finally {
        setViewingCompanyLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cleanedOfficers = officers.filter(o => o.name && o.name.trim() !== '');
      const primaryOfficer = cleanedOfficers.find(o => o.is_primary) || cleanedOfficers[0];
      const officerLabels = cleanedOfficers.map(o => `${o.name}${o.designation ? ` (${o.designation})` : ''}`);

      const primaryImage = imageUrl || (companyImages.length > 0 ? companyImages[0] : null);

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
        company_name: name,
        name,
        email: primaryOfficer?.email || null,
        phone: primaryOfficer?.phone || null,
        image_url: primaryImage,
        image: primaryImage,
        company_image: primaryImage,
        brochure_url: brochureUrl || null,
        brochure_name: brochureName || (brochureUrl ? `${name}_Brochure.pdf` : null),
        company_brochure_url: brochureUrl || null,
        images: companyImages,
        company_images: companyImages,
        video_url: videoUrl || null,
        video: videoUrl || null,
        officers: cleanedOfficers,
        company_officers: officerLabels,
        company_officer_name: officerLabels.join(', '),
        description,
        scheme: computedScheme,
        offer: computedOffer,
        margin,
        authorized_distributor: authorizedDistributor,
        status,
        // Detailed Schemes & Turnover Targets (100% matched with Products schemes)
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

      if (editingCompanyId) {
        await api.put(`/admin/companies/${editingCompanyId}`, payload);
      } else {
        await api.post('/admin/companies', payload);
      }
      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error("Failed to save company", error);
      alert("Failed to save company");
    }
  };

  const handleConfirmDeleteCompany = async (reason) => {
    if (!deletingCompany) return;
    try {
      setDeleteCompanyLoading(true);
      await api.delete(`/admin/companies/${deletingCompany.id}`, {
        data: { reason }
      });
      setDeletingCompany(null);
      fetchCompanies();
    } catch (err) {
      console.error("Failed to delete company:", err);
      alert(err.response?.data?.error || "Failed to delete company");
    } finally {
      setDeleteCompanyLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/admin/companies/${id}`, { status: newStatus });
      fetchCompanies();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const q = searchTerm.toLowerCase();
    const allOfficers = Array.isArray(c.officers) ? c.officers : [];
    const officerMatch = allOfficers.some(o =>
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.designation && o.designation.toLowerCase().includes(q)) ||
      (o.phone && o.phone.toLowerCase().includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q))
    );
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.authorized_distributor && c.authorized_distributor.toLowerCase().includes(q)) ||
      (c.company_officer_name && c.company_officer_name.toLowerCase().includes(q)) ||
      (c.scheme && c.scheme.toLowerCase().includes(q)) ||
      (c.offer && c.offer.toLowerCase().includes(q)) ||
      officerMatch
    );
  });

  // Pagination for 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, currentPage]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a' }}>Companies</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Manage supplier companies, authorized distributor tie-ups, margins & schemes</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search companies, distributor, scheme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>
          <button className="btn btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleOpenAdd}>
            <Plus size={18} /> Add Company
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '14px', width: '980px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <button type="button" onClick={resetForm} style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a', fontSize: '1.25rem', fontWeight: '700' }}>
              {editingCompanyId ? 'Edit Company' : 'Create New Company'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Company Name</label>
                  <SuggestionInput id="company-name-input" value={name} onChange={setName} suggestions={companies.filter(company => String(company.id) !== String(editingCompanyId || ''))} itemType="Company" placeholder="e.g. Acme Corporation" onRedirect={(match) => { const company = companies.find(item => item.name?.toLowerCase() === match.toLowerCase()); if (company) navigate(`/companies?id=${company.id}&search=${encodeURIComponent(match)}`); }} inputStyle={{ padding: '10px 14px', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Status</label>
                  <select
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#fff' }}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Margin (%)</label>
                  <input
                    type="text"
                    placeholder="e.g. 18% or 20%"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Authorized Distributor</label>
                  <input
                    type="text"
                    placeholder="e.g. Primus Wholesale Agency"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                    value={authorizedDistributor}
                    onChange={(e) => setAuthorizedDistributor(e.target.value)}
                  />
                </div>
              </div>

              {/* SCHEMES & TURNOVER TARGETS (MATCHES PRODUCT SCHEMES ENGINE) */}
              <div style={{ marginTop: '16px', marginBottom: '20px' }}>
                <ProductSchemesManager
                  title="Company Schemes & Turnover Targets"
                  subtitle="Configure default trade schemes and turnover targets. When this company is chosen for an element/product, these schemes will automatically match and apply."
                  badgeText="Auto-Sync with Products"
                  section1Title="1. Product Item Schemes"
                  section2Title="2. Bill Wise & Turnover Rebates"
                  product={schemes}
                  onChange={(field, value) => setSchemes(prev => ({ ...prev, [field]: value }))}
                />
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
                            name="company_primary_officer"
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
                          <SuggestionInput
                            id={`company-officer-name-${index}`}
                            value={off.name}
                            onChange={value => handleOfficerChange(index, 'name', value)}
                            suggestions={officerSuggestionRecords.map(officer => officer.name).filter(Boolean)}
                            itemType="Officer Name"
                            placeholder="Officer Name"
                            onRedirect={value => redirectToOfficerCompany('name', value)}
                            inputStyle={{ padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                          />
                        </div>
                        <div>
                          <SuggestionInput
                            id={`company-officer-role-${index}`}
                            value={off.designation}
                            onChange={value => handleOfficerChange(index, 'designation', value)}
                            suggestions={officerSuggestionRecords.map(officer => officer.designation).filter(Boolean)}
                            itemType="Role"
                            placeholder="Role (e.g. Sales Head)"
                            onRedirect={value => redirectToOfficerCompany('designation', value)}
                            inputStyle={{ padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                          />
                        </div>
                        <div>
                          <SuggestionInput
                            id={`company-officer-phone-${index}`}
                            type="tel"
                            value={off.phone}
                            onChange={value => handleOfficerChange(index, 'phone', value)}
                            suggestions={officerSuggestionRecords.map(officer => officer.phone).filter(Boolean)}
                            itemType="Mobile Number"
                            placeholder="Mobile Number"
                            onRedirect={value => redirectToOfficerCompany('phone', value)}
                            inputStyle={{ padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                          />
                        </div>
                        <div>
                          <SuggestionInput
                            id={`company-officer-email-${index}`}
                            type="email"
                            value={off.email}
                            onChange={value => handleOfficerChange(index, 'email', value)}
                            suggestions={officerSuggestionRecords.map(officer => officer.email).filter(Boolean)}
                            itemType="Email Address"
                            placeholder="Email Address"
                            onRedirect={value => redirectToOfficerCompany('email', value)}
                            inputStyle={{ padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
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
                  placeholder="Optional company profile, address or policies..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* MEDIA ASSETS SECTION */}
              <div style={{ marginTop: '24px', marginBottom: '20px', padding: '18px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#4338ca" />
                    Company Media Assets
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Manage company logo, official brochure PDF, corporate video, and facility gallery photos.
                  </p>
                </div>

                {/* 1. Primary Company Logo / Image */}
                <div style={{ marginBottom: '18px', backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#1e293b', fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>
                        Company Logo / Primary Brand Image
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Used as the primary avatar across catalogs, purchase orders, and invoices
                      </span>
                    </div>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {imageUrl ? (
                      <div style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e0e7ff', flexShrink: 0 }}>
                        <img src={imageUrl} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#f8fafc' }} />
                      </div>
                    ) : (
                      <div style={{ width: '70px', height: '70px', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
                        <Building2 size={26} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoUpload(e.target.files[0]);
                          }
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          style={{
                            padding: '7px 14px',
                            backgroundColor: '#4338ca',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Upload size={14} />
                          {uploadingLogo ? 'Uploading Logo...' : (imageUrl ? 'Change Logo' : 'Upload Company Logo')}
                        </button>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PNG, JPG, SVG or WEBP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Official Brochure (PDF / Document) */}
                <div style={{ marginBottom: '18px' }}>
                  <BrochureUploader
                    brochureUrl={brochureUrl}
                    brochureName={brochureName}
                    onChange={({ url, name: bName }) => {
                      setBrochureUrl(url);
                      setBrochureName(bName);
                    }}
                    label="Official Company Brochure (PDF / DOC)"
                  />
                </div>

                {/* 3. Company Video (Upload or YouTube / Vimeo URL) */}
                <div style={{ marginBottom: '18px', backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ display: 'block', color: '#1e293b', fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>
                      Company Corporate Video (Upload MP4 or Paste Video URL)
                    </label>
                    {videoUrl && (
                      <button
                        type="button"
                        onClick={() => setVideoUrl('')}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                      >
                        Remove Video
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: videoUrl ? '10px' : 0 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="url"
                        placeholder="e.g. https://www.youtube.com/watch?v=... or https://cdn.../video.mp4"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          backgroundColor: '#f8fafc'
                        }}
                      />
                    </div>

                    <input
                      type="file"
                      ref={videoInputRef}
                      accept="video/mp4,video/webm,video/ogg"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleVideoUpload(e.target.files[0]);
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Video size={14} />
                      {uploadingVideo ? `Uploading (${videoUploadProgress}%)` : 'Upload File (Max 50MB)'}
                    </button>
                  </div>

                  {/* Video Live Preview */}
                  {videoUrl && (
                    <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#000000', maxHeight: '200px', display: 'flex', justifyContent: 'center' }}>
                      {getEmbedVideoUrl(videoUrl) ? (
                        <iframe
                          src={getEmbedVideoUrl(videoUrl)}
                          title="Company Video Preview"
                          style={{ width: '100%', height: '190px', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={videoUrl}
                          controls
                          style={{ maxWidth: '100%', maxHeight: '190px' }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Multiple Facility / Plant Gallery Images */}
                <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#1e293b', fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>
                        Company Gallery Photos (Factory, Facilities, Certificates)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Add multiple images to showcase infrastructure and credibility
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: '600' }}>
                      {companyImages.length} photo(s) selected
                    </span>
                  </div>
                  <PhotoUploader images={companyImages} onChange={setCompanyImages} maxFiles={10} compact={true} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" onClick={resetForm} style={{ padding: '9px 18px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '9px 18px', border: 'none', backgroundColor: '#4338ca', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  {editingCompanyId ? 'Update Company' : 'Save Company'}
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
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>COMPANY ID</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>COMPANY NAME</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>MEDIA ASSETS</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>SCHEME / OFFER</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>MARGIN</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>DISTRIBUTOR & OFFICER</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>STATUS</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading companies...</td></tr>
            ) : paginatedCompanies.length > 0 ? (
              paginatedCompanies.map((c, cIdx) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '0.85rem' }}>
                    {(currentPage - 1) * itemsPerPage + cIdx + 1}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600', textAlign: 'center' }}>
                    {'COM' + String(c.id).padStart(5, '0')}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {(() => {
                        const img = c.image_url || c.image || (Array.isArray(c.images) && c.images[0]) || (Array.isArray(c.company_images) && c.company_images[0]) || c.company_image;
                        if (img) {
                          return (
                            <img
                              src={img}
                              alt={c.name}
                              style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0', flexShrink: 0, backgroundColor: '#f8fafc' }}
                            />
                          );
                        }
                        return (
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
                            <Building2 size={20} />
                          </div>
                        );
                      })()}
                      <div>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{c.name}</div>
                        {c.description && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {/* Brochure Badge */}
                      {(c.brochure_url || c.company_brochure_url || (Array.isArray(c.brochures) && c.brochures.length > 0)) && (
                        <a
                          href={c.brochure_url || c.company_brochure_url || c.brochures?.[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            width: 'fit-content'
                          }}
                        >
                          <FileText size={12} /> Brochure PDF
                        </a>
                      )}

                      {/* Video Badge */}
                      {(c.video_url || c.video) && (
                        <button
                          type="button"
                          onClick={() => setPreviewMedia({ type: 'video', url: c.video_url || c.video, title: `${c.name} - Corporate Video` })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            width: 'fit-content'
                          }}
                        >
                          <Video size={12} /> Watch Video
                        </button>
                      )}

                      {/* Gallery Badge */}
                      {((Array.isArray(c.images) && c.images.length > 0) || (Array.isArray(c.company_images) && c.company_images.length > 0)) && (
                        <button
                          type="button"
                          onClick={() => setPreviewMedia({
                            type: 'gallery',
                            images: c.images || c.company_images || [],
                            title: `${c.name} - Facility Gallery`
                          })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#ede9fe',
                            color: '#6d28d9',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            width: 'fit-content'
                          }}
                        >
                          <ImageIcon size={12} /> {(c.images || c.company_images || []).length} Photos
                        </button>
                      )}

                      {!c.brochure_url && !c.company_brochure_url && !c.video_url && !(c.images?.length > 0) && !(c.company_images?.length > 0) && (
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>No media attached</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                    {c.scheme ? (
                      <div style={{ color: '#0369a1', fontWeight: '600', marginBottom: c.offer ? '2px' : 0 }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Scheme: </span>{c.scheme}
                      </div>
                    ) : null}
                    {c.offer ? (
                      <div style={{ color: '#b45309', fontWeight: '600' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Offer: </span>{c.offer}
                      </div>
                    ) : null}
                    {!c.scheme && !c.offer && <span style={{ color: '#94a3b8' }}>-</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                    {c.margin ? (
                      <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem' }}>
                        {c.margin.includes('%') ? c.margin : `${c.margin}%`}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', position: 'relative' }}>
                    {c.authorized_distributor && (
                      <div style={{ color: '#0f172a', fontWeight: '600', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Dist: </span>{c.authorized_distributor}
                      </div>
                    )}
                    {(() => {
                      const allOfficers = Array.isArray(c.officers) && c.officers.length > 0
                        ? c.officers
                        : (Array.isArray(c.company_officers) && c.company_officers.length > 0
                          ? c.company_officers.map(co => typeof co === 'object' ? co : { name: String(co), designation: 'Officer' })
                          : (c.company_officer_name ? [{ name: c.company_officer_name, designation: 'Officer' }] : []));
                      const primary = allOfficers.find(o => o.is_primary) || allOfficers[0];

                      if (!primary && !c.authorized_distributor) {
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
                                  setOpenPopoverId(openPopoverId === `comp-${c.id}` ? null : `comp-${c.id}`);
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
                              {openPopoverId === `comp-${c.id}` && (
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
                        onClick={() => handleToggleStatus(c.id, c.status)}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: c.status === 'Active' ? 'flex-end' : 'flex-start',
                          width: '38px',
                          height: '20px',
                          background: c.status === 'Active' ? '#4338ca' : '#cbd5e1',
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
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: c.status === 'Active' ? '#4338ca' : '#94a3b8' }}>
                        {c.status || 'Active'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleViewCompany(c)}
                        title="View Full Company Profile"
                        style={{ backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        title="Edit Company"
                        style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingCompany(c)}
                        title="Delete Company"
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No companies found.</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCompanies.length}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </div>
      {/* VIEW COMPANY DETAILS MODAL */}
      {viewingCompany && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '720px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '28px' }}>
            <button
              type="button"
              onClick={() => setViewingCompany(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={18} />
            </button>

            {/* Fetching Details Indicator */}
            {viewingCompanyLoading && (
              <div style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: '600', padding: '6px 12px', borderRadius: '6px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #bfdbfe' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb', animation: 'pulse 1s infinite' }} />
                Fetching authoritative company details and media from server (ID: #{viewingCompany.id})...
              </div>
            )}

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
              {(() => {
                const img = viewingCompany.logoUrl || viewingCompany.image_url || viewingCompany.image || (Array.isArray(viewingCompany.images) && viewingCompany.images[0]) || viewingCompany.company_image;
                if (img) {
                  return (
                    <img
                      src={img}
                      alt={viewingCompany.name}
                      style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'contain', border: '2px solid #e0e7ff', backgroundColor: '#f8fafc' }}
                    />
                  );
                }
                return (
                  <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                    <Building2 size={32} />
                  </div>
                );
              })()}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                    {viewingCompany.name || viewingCompany.company_name}
                  </h2>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', fontWeight: '700', backgroundColor: viewingCompany.status === 'Active' ? '#ecfdf5' : '#f1f5f9', color: viewingCompany.status === 'Active' ? '#047857' : '#64748b' }}>
                    {viewingCompany.status || 'Active'}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                  ID: {'COM' + String(viewingCompany.id).padStart(5, '0')}
                </span>
                {viewingCompany.description && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#475569' }}>{viewingCompany.description}</p>
                )}
              </div>
            </div>

            {/* Officers & Contact Details */}
            <div style={{ marginBottom: '22px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contact Persons & Officers
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {(viewingCompany.officers && viewingCompany.officers.length > 0 ? viewingCompany.officers : [{ name: viewingCompany.company_officer_name || 'Primary Officer', is_primary: true }]).map((off, idx) => (
                  <div key={idx} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: off.is_primary ? '#f5f3ff' : '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{off.name}</strong>
                      {off.is_primary && (
                        <span style={{ fontSize: '0.65rem', backgroundColor: '#4338ca', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>PRIMARY</span>
                      )}
                    </div>
                    {off.designation && <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>{off.designation}</div>}
                    {off.phone && <div style={{ fontSize: '0.78rem' }}><a href={`tel:${off.phone}`} style={{ color: '#4338ca', textDecoration: 'none' }}>📞 {off.phone}</a></div>}
                    {off.email && <div style={{ fontSize: '0.78rem' }}><a href={`mailto:${off.email}`} style={{ color: '#64748b', textDecoration: 'none' }}>✉️ {off.email}</a></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Commercials: Scheme, Offer, Margin */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '22px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Margin</span>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#047857', marginTop: '2px' }}>{viewingCompany.margin ? `${viewingCompany.margin}%` : '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Scheme</span>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0369a1', marginTop: '2px' }}>{viewingCompany.scheme || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Offer</span>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#b45309', marginTop: '2px' }}>{viewingCompany.offer || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Distributor</span>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>{viewingCompany.authorized_distributor || '-'}</div>
              </div>
            </div>

            {/* Detailed Schemes & Turnover Targets Policy Showcase */}
            <div style={{ marginBottom: '22px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', backgroundColor: '#f5f3ff', borderBottom: '1px solid #ede9fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={18} color="#6366f1" />
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#312e81' }}>
                    Company Trade Schemes & Turnover Targets
                  </span>
                </div>
                {viewingCompany.hasSchemes ? (
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                    ✓ Active Schemes Configured
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                    Standard / Default
                  </span>
                )}
              </div>

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. PRODUCT ITEM SCHEMES */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    1. Product Item Schemes
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    {/* BOGO */}
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: viewingCompany.product_pe_product ? '#eff6ff' : '#f8fafc', border: viewingCompany.product_pe_product ? '1px solid #bfdbfe' : '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Product Pe Product (BOGO)</span>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: viewingCompany.product_pe_product ? '#1d4ed8' : '#94a3b8', marginTop: '3px' }}>
                        {viewingCompany.product_pe_product ? `🎁 Buy + Free: ${viewingCompany.product_pe_product}` : 'Not Configured'}
                      </div>
                    </div>

                    {/* Discount on Product */}
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: viewingCompany.discount_on_product ? '#ecfdf5' : '#f8fafc', border: viewingCompany.discount_on_product ? '1px solid #a7f3d0' : '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Discount on Product (Offer)</span>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: viewingCompany.discount_on_product ? '#047857' : '#94a3b8', marginTop: '3px' }}>
                        {viewingCompany.discount_on_product ? `🏷️ ${viewingCompany.discount_on_product}` : 'Not Configured'}
                      </div>
                    </div>

                    {/* Quantity Target Incentive */}
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: viewingCompany.product_target_scheme ? '#fef3c7' : '#f8fafc', border: viewingCompany.product_target_scheme ? '1px solid #fde68a' : '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Quantity Target Incentive</span>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: viewingCompany.product_target_scheme ? '#b45309' : '#94a3b8', marginTop: '3px' }}>
                        {viewingCompany.product_target_scheme ? `🎯 ${viewingCompany.product_target_scheme}` : 'Not Configured'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. BILL WISE & TURNOVER REBATES */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    2. Bill Wise & Turnover Rebates
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    {/* Bill Discount */}
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: viewingCompany.discount_on_bill_amount ? '#f0fdf4' : '#f8fafc', border: viewingCompany.discount_on_bill_amount ? '1px solid #bbf7d0' : '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Discount on Bill Amount</span>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: viewingCompany.discount_on_bill_amount ? '#15803d' : '#94a3b8', marginTop: '3px' }}>
                        {viewingCompany.discount_on_bill_amount ? `🧾 ${viewingCompany.discount_on_bill_amount}` : 'Not Configured'}
                      </div>
                    </div>

                    {/* Quarterly Turnover */}
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: viewingCompany.quarterly_discount_on_turnover ? '#faf5ff' : '#f8fafc', border: viewingCompany.quarterly_discount_on_turnover ? '1px solid #e9d5ff' : '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Quarterly Turnover Rebate</span>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: viewingCompany.quarterly_discount_on_turnover ? '#7e22ce' : '#94a3b8', marginTop: '3px' }}>
                        {viewingCompany.quarterly_discount_on_turnover ? `📈 ${viewingCompany.quarterly_discount_on_turnover}` : 'Not Configured'}
                      </div>
                    </div>

                    {/* Yearly Turnover */}
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: viewingCompany.yearly_discount_on_turnover ? '#fdf2f8' : '#f8fafc', border: viewingCompany.yearly_discount_on_turnover ? '1px solid #fbcfe8' : '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Yearly Turnover Rebate</span>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: viewingCompany.yearly_discount_on_turnover ? '#be185d' : '#94a3b8', marginTop: '3px' }}>
                        {viewingCompany.yearly_discount_on_turnover ? `🏆 ${viewingCompany.yearly_discount_on_turnover}` : 'Not Configured'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. SEASONAL & FESTIVAL SCHEME */}
                {viewingCompany.seasonal_scheme_name && (
                  <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🎉 Seasonal & Festival Scheme
                      </span>
                      <span style={{ fontSize: '0.7rem', backgroundColor: '#fef08a', color: '#713f12', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                        {viewingCompany.seasonal_applicability || 'All Products'}
                      </span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#713f12' }}>
                      {viewingCompany.seasonal_scheme_name}
                    </div>
                    {(viewingCompany.seasonal_period_start || viewingCompany.seasonal_period_end) && (
                      <div style={{ fontSize: '0.78rem', color: '#854d0e', marginTop: '4px' }}>
                        📅 Validity: {viewingCompany.seasonal_period_start || 'Immediate'} to {viewingCompany.seasonal_period_end || 'Open'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Media Assets Showcase */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="#4338ca" />
                Company Media Assets
              </h4>

              {/* Brochure Section */}
              {(() => {
                const bUrl = viewingCompany.brochureUrl || viewingCompany.brochure_url || viewingCompany.company_brochure_url || viewingCompany.brochure;
                const bName = viewingCompany.brochureName || viewingCompany.brochure_name || viewingCompany.company_brochure_name || (bUrl ? `${viewingCompany.name || viewingCompany.company_name || 'Company'}_Brochure.pdf` : 'Official Company Brochure');
                return (
                  <div style={{ marginBottom: '14px', padding: '12px 16px', backgroundColor: '#eef2ff', borderRadius: '10px', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={24} color="#4338ca" />
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#312e81', display: 'block' }}>
                          {bName}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: bUrl ? '#4338ca' : '#64748b' }}>
                          {bUrl ? 'PDF Document Ready' : 'No PDF brochure attached'}
                        </span>
                      </div>
                    </div>
                    {bUrl && (
                      <a
                        href={bUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ padding: '6px 14px', backgroundColor: '#4338ca', color: '#ffffff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={14} /> View / Download PDF
                      </a>
                    )}
                  </div>
                );
              })()}

              {/* Video Section */}
              {(() => {
                const vid = viewingCompany.videoUrl || viewingCompany.video_url || viewingCompany.video;
                if (!vid) return null;
                return (
                  <div style={{ marginBottom: '14px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Video size={18} color="#b45309" />
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Corporate Video</strong>
                    </div>
                    <div style={{ borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000000', maxHeight: '240px', display: 'flex', justifyContent: 'center' }}>
                      {getEmbedVideoUrl(vid) ? (
                        <iframe
                          src={getEmbedVideoUrl(vid)}
                          title="Corporate Video"
                          style={{ width: '100%', height: '220px', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={vid}
                          controls
                          style={{ maxWidth: '100%', maxHeight: '220px' }}
                        />
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Gallery Grid */}
              {(() => {
                const gallery = (Array.isArray(viewingCompany.images) && viewingCompany.images.length > 0)
                  ? viewingCompany.images
                  : ((Array.isArray(viewingCompany.company_images) && viewingCompany.company_images.length > 0)
                    ? viewingCompany.company_images
                    : []);
                if (gallery.length === 0) return null;
                return (
                  <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <ImageIcon size={18} color="#6d28d9" />
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                        Facility & Product Photos ({gallery.length})
                      </strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
                      {gallery.map((imgUrl, imgIdx) => (
                        <div
                          key={imgIdx}
                          onClick={() => setPreviewMedia({ type: 'gallery', images: gallery, initialIndex: imgIdx, title: viewingCompany.name || viewingCompany.company_name })}
                          style={{ height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                        >
                          <img src={imgUrl} alt={`Facility ${imgIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setViewingCompany(null)}
                style={{ padding: '9px 20px', backgroundColor: '#4338ca', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK PREVIEW MEDIA MODAL */}
      {previewMedia && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '14px', width: '680px', maxWidth: '95vw', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{previewMedia.title || 'Media Preview'}</h3>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
              {previewMedia.type === 'video' && (
                <div style={{ backgroundColor: '#000000', borderRadius: '10px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                  {getEmbedVideoUrl(previewMedia.url) ? (
                    <iframe
                      src={getEmbedVideoUrl(previewMedia.url)}
                      title="Video Preview"
                      style={{ width: '100%', height: '360px', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={previewMedia.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '420px' }} />
                  )}
                </div>
              )}

              {previewMedia.type === 'gallery' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {(previewMedia.images || []).map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '140px' }}>
                      <img src={img} alt={`Gallery ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!deletingCompany}
        title="Delete Company"
        itemName={deletingCompany ? `Company "${deletingCompany.name}"` : ''}
        onClose={() => setDeletingCompany(null)}
        onConfirm={handleConfirmDeleteCompany}
        isLoading={deleteCompanyLoading}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingOfficer}
        title="Delete Officer"
        itemName={deletingOfficer?.officer?.name ? `Officer "${deletingOfficer.officer.name}"` : 'this Officer'}
        onClose={() => setDeletingOfficer(null)}
        onConfirm={handleConfirmDeleteOfficer}
        isLoading={deleteOfficerLoading}
      />
    </div>
  );
};

export default Companies;
