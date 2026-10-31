import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Eye, Folder, Layers, Package, Search, Plus, ExternalLink, ChevronRight, Hash, Tag, Info, FileText, Download } from 'lucide-react';
import { extractGroupMedia } from '../utils/mediaUtils';
import Pagination from '../components/Pagination';

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter state for products
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' (incl. sub-groups) or 'direct'

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, scopeFilter]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch all groups flat list for hierarchy and breadcrumbs
        const groupsRes = await api.get('/admin/groups');
        const rawGroupsList = groupsRes.data?.data || groupsRes.data || [];
        const groupsList = Array.isArray(rawGroupsList) ? rawGroupsList.map(extractGroupMedia) : [];
        setAllGroups(groupsList);

        // 2. Fetch specific group by authoritative ID endpoint
        let currentGroup = groupsList.find((g) => g.id.toString() === id.toString()) || null;
        try {
          const singleRes = await api.get(`/admin/groups/${id}`);
          const singleGroup = singleRes.data?.data || singleRes.data;
          if (singleGroup) {
            currentGroup = extractGroupMedia({ ...currentGroup, ...singleGroup });
          }
        } catch (e) {
          console.warn("Could not fetch single group by ID, fallback to list cache:", e);
        }

        if (!currentGroup) {
          setError('Group not found in system.');
          setLoading(false);
          return;
        }

        setGroup(currentGroup);

        // 3. Fetch products under this group including all its sub-groups
        const prodRes = await api.get(`/admin/products?group_id=${id}&include_subgroups=true`);
        const prodList = prodRes.data?.data || prodRes.data || [];
        setProducts(prodList);

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch group details', err);
        setError('Failed to load group information. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Compute Ancestor Breadcrumbs (e.g. Amul > AmulSubGroupTet)
  const breadcrumbTrail = useMemo(() => {
    if (!group || allGroups.length === 0) return [];
    const trail = [group];
    let current = group;
    while (current.parent_id) {
      const parent = allGroups.find((g) => g.id.toString() === current.parent_id.toString());
      if (parent) {
        trail.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    return trail;
  }, [group, allGroups]);

  // Compute Direct Child Sub-Groups
  const directSubgroups = useMemo(() => {
    if (!group || allGroups.length === 0) return [];
    return allGroups.filter((g) => g.parent_id && g.parent_id.toString() === group.id.toString());
  }, [group, allGroups]);

  // Parent Group Object
  const parentGroup = useMemo(() => {
    if (!group || !group.parent_id || allGroups.length === 0) return null;
    return allGroups.find((g) => g.id.toString() === group.parent_id.toString());
  }, [group, allGroups]);

  // Filter Products based on search and scope (all vs direct)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Scope filter: direct vs all
      if (scopeFilter === 'direct' && group) {
        if (p.group_id?.toString() !== group.id.toString()) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = p.product_name?.toLowerCase().includes(query);
        const codeMatch = p.product_code?.toLowerCase().includes(query);
        const skuMatch = p.sku?.toLowerCase().includes(query);
        const gtinMatch = p.gtin_ean_upc?.toLowerCase().includes(query);
        const brandMatch = p.Brand?.name?.toLowerCase().includes(query);
        if (!nameMatch && !codeMatch && !skuMatch && !gtinMatch && !brandMatch) return false;
      }

      return true;
    });
  }, [products, scopeFilter, searchQuery, group]);

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '1rem', fontWeight: '500' }}>Loading group information and products...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', background: '#ffffff', padding: '32px', borderRadius: '12px', border: '1px solid #fee2e2', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#dc2626' }}>
          <Info size={24} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
          {error || 'Group Not Found'}
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
          The requested group ID (#{id}) could not be located in the database.
        </p>
        <button
          onClick={() => navigate('/groups')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Back to Groups List
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* ── TOP BREADCRUMBS & NAVIGATION ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => navigate('/groups')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#475569',
            fontSize: '0.92rem',
            fontWeight: '600',
            padding: 0
          }}
        >
          <ArrowLeft size={18} style={{ marginRight: '6px' }} /> Back to Groups
        </button>

        {/* Hierarchy Trail */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
          <Link to="/groups" style={{ color: '#64748b', textDecoration: 'none', fontWeight: '500' }}>Groups</Link>
          {breadcrumbTrail.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight size={14} color="#94a3b8" />
              {idx === breadcrumbTrail.length - 1 ? (
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{crumb.name}</span>
              ) : (
                <Link to={`/groups/${crumb.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                  {crumb.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── HEADER CARD ── */}
      <div style={{
        background: '#ffffff',
        padding: '24px 28px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {group.image_url || group.image ? (
                  <img src={group.image_url || group.image} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Folder size={22} />
                )}
              </div>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
                  {group.name}
                </h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>ID: #{group.id}</span>
                  {group.group_code && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      CODE: {group.group_code}
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: '700',
                    backgroundColor: group.status === 'Active' ? '#dcfce7' : '#fee2e2',
                    color: group.status === 'Active' ? '#15803d' : '#b91c1c'
                  }}>
                    {group.status || 'Active'}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>
                    Level {breadcrumbTrail.length}
                  </span>
                </div>
              </div>
            </div>
            {group.description && (
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: '10px 0 0 0', maxWidth: '800px', lineHeight: '1.5' }}>
                {group.description}
              </p>
            )}

            {/* Multiple Images Gallery if available */}
            {group.images && Array.isArray(group.images) && group.images.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                {group.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer" title={`View Photo ${i + 1}`}>
                    <img
                      src={img}
                      alt={`${group.name} ${i + 1}`}
                      style={{
                        width: '56px',
                        height: '56px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: i === 0 ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                        transition: 'transform 0.15s ease',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </a>
                ))}
              </div>
            )}

            {/* Group Brochure PDF if available */}
            {(group.brochureUrl || group.brochure_url) && (
              <div style={{ marginTop: '14px' }}>
                <a
                  href={group.brochureUrl || group.brochure_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  <FileText size={15} />
                  {group.brochureName || group.brochure_name || `${group.name} Brochure (PDF)`}
                </a>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate(`/products`)}
              style={{
                padding: '9px 16px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Total Products</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>{products.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>in this group & sub-groups</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Direct Sub-Groups</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>{directSubgroups.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>child categories</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Parent Group</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: parentGroup ? '#3b82f6' : '#64748b' }}>
              {parentGroup ? (
                <Link to={`/groups/${parentGroup.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                  {parentGroup.name}
                </Link>
              ) : (
                'None (Root Group)'
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              {parentGroup ? `ID: #${parentGroup.id}` : 'Top-level category'}
            </div>
          </div>
        </div>
      </div>

      {/* ── DIRECT SUB-GROUPS SECTION (IF ANY) ── */}
      {directSubgroups.length > 0 && (
        <div style={{
          background: '#ffffff',
          padding: '20px 24px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#3b82f6" /> Sub-Groups under {group.name} ({directSubgroups.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {directSubgroups.map((sub) => (
              <div
                key={sub.id}
                onClick={() => navigate(`/groups/${sub.id}`)}
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                  e.currentTarget.style.borderColor = '#bfdbfe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.92rem' }}>{sub.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    {sub.group_code ? `Code: ${sub.group_code}` : `ID: #${sub.id}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontSize: '0.8rem', fontWeight: '600' }}>
                  <span>View</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRODUCTS LIST TABLE ── */}
      <div style={{
        background: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Table Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} color="#3b82f6" /> Products ({filteredProducts.length})
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
              All products currently cataloged under this group
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Scope Filter (All vs Direct) */}
            {directSubgroups.length > 0 && (
              <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setScopeFilter('all')}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    backgroundColor: scopeFilter === 'all' ? '#ffffff' : 'transparent',
                    color: scopeFilter === 'all' ? '#1e293b' : '#64748b',
                    boxShadow: scopeFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  All ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter('direct')}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    backgroundColor: scopeFilter === 'direct' ? '#ffffff' : 'transparent',
                    color: scopeFilter === 'direct' ? '#1e293b' : '#64748b',
                    boxShadow: scopeFilter === 'direct' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Direct Only ({products.filter((p) => p.group_id?.toString() === group.id.toString()).length})
                </button>
              </div>
            )}

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backgroundColor: '#f8fafc'
                }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', borderBottom: '1px solid #1a252f', color: '#ffffff', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ width: '60px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>Sr. No.</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>Product Code</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>SKU</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>Product Name</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>Assigned Group</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>Brand</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>Price</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>Status</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '14px 16px', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p, idx) => {
                  const assignedGroupName = allGroups.find((g) => g.id.toString() === p.group_id?.toString())?.name || p.Group?.name || '-';
                  const isDirect = p.group_id?.toString() === group.id.toString();

                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>
                          {p.product_code || `#${p.id}`}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        {p.sku || '-'}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{p.name || p.product_name}</div>
                        {p.item_type && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.item_type}</div>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          backgroundColor: isDirect ? '#eff6ff' : '#f1f5f9',
                          color: isDirect ? '#1d4ed8' : '#475569',
                          border: isDirect ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          display: 'inline-block'
                        }}>
                          {assignedGroupName} {isDirect ? '(Direct)' : ''}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#475569', textAlign: 'center', verticalAlign: 'middle' }}>
                        {p.Brand?.name || '-'}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b', textAlign: 'center', verticalAlign: 'middle' }}>
                        ₹{p.selling_price || p.purchase_price || 0}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontWeight: '700',
                          backgroundColor: p.status === 'Active' ? '#dcfce7' : '#fee2e2',
                          color: p.status === 'Active' ? '#15803d' : '#b91c1c',
                          display: 'inline-block'
                        }}>
                          {p.status || 'Active'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/products/${p.id}`)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#eff6ff',
                              color: '#3b82f6',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#3b82f6';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#eff6ff';
                              e.currentTarget.style.color = '#3b82f6';
                            }}
                          >
                            <Eye size={14} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <Package size={32} style={{ margin: '0 auto 8px', display: 'block', color: '#cbd5e1' }} />
                    <p style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#64748b' }}>No products found in this group</p>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>
                      {searchQuery ? 'Try adjusting your search criteria.' : 'Create a new product and assign it to this group.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination 
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default GroupDetails;
