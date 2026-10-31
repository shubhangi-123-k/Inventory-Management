import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import SearchAutocomplete from '../components/SearchAutocomplete';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  ShoppingCart, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw,
  Plus,
  Building2,
  Truck,
  UserCheck,
  Percent,
  Tag,
  X,
  Trash2,
  Eye,
  Layers,
  FileCheck2,
  CreditCard,
  Package,
  Sparkles,
  RotateCcw
} from 'lucide-react';

const Purchases = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'requests' ? 'requests' : 'orders';
  
  const [activeMainTab, setActiveMainTab] = useState(initialTab);
  const [purchases, setPurchases] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Pagination for 10 records per page (requests & orders)
  const [currentPrPage, setCurrentPrPage] = useState(1);
  const [currentPoPage, setCurrentPoPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedRequests = useMemo(() => {
    const start = (currentPrPage - 1) * itemsPerPage;
    return purchaseRequests.slice(start, start + itemsPerPage);
  }, [purchaseRequests, currentPrPage]);

  const paginatedPurchases = useMemo(() => {
    const start = (currentPoPage - 1) * itemsPerPage;
    return purchases.slice(start, start + itemsPerPage);
  }, [purchases, currentPoPage]);
  
  // Modal states for manual PO creation
  const [showModal, setShowModal] = useState(searchParams.get('action') === 'new');
  const [billFile, setBillFile] = useState(null);
  const [billFileError, setBillFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const billFileInputRef = useRef(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [convertingPrId, setConvertingPrId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [deletingPo, setDeletingPo] = useState(null);
  const [deletePoLoading, setDeletePoLoading] = useState(false);

  const handleConfirmDeletePo = async (reason) => {
    if (!deletingPo) return;
    try {
      setDeletePoLoading(true);
      await api.delete(`/admin/purchases/${deletingPo.id}`, {
        data: { reason }
      });
      alert("Purchase order deleted successfully");
      setDeletingPo(null);
      fetchPurchases();
    } catch (error) {
      console.error("Failed to delete purchase order:", error);
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to delete purchase order");
    } finally {
      setDeletePoLoading(false);
    }
  };
  
  const [formData, setFormData] = useState({
    po_number: '',
    date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    supplier_id: '',
    warehouse_id: '',
    bill_num: '',
    pmt_status: 'Pending',
    shipping_status: 'Ordered',
    notes: '',
    total_paid: 0,
    details: [{ product_id: '', qty: 1, price: 0 }]
  });

  // Tally ERP Keyboard shortcut: Ctrl + F9 to open Create PO Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'F9' || e.code === 'F9')) {
        e.preventDefault();
        setShowModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchPurchases = async () => {
    if (!hasPermission('purchase_orders', 'view')) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/admin/purchases');
      if (response.data.success) {
        setPurchases(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseRequests = async () => {
    if (!hasPermission('purchase_orders', 'view')) {
      setLoadingRequests(false);
      return;
    }
    try {
      setLoadingRequests(true);
      const response = await api.get('/purchase-requests');
      if (response.data.success) {
        setPurchaseRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch purchase requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSuppliersAndProducts = async () => {
    try {
      const [supRes, prodRes, whRes, grpRes] = await Promise.all([
        api.get('/admin/suppliers').catch(() => ({ data: { data: [] }})),
        api.get('/admin/products').catch(() => ({ data: { data: [] }})),
        api.get('/admin/warehouses').catch(() => ({ data: { data: [] }})),
        api.get('/admin/groups').catch(() => ({ data: { data: [] }}))
      ]);
      if (supRes.data?.data) setSuppliers(supRes.data.data);
      if (prodRes.data?.data) setProducts(prodRes.data.data);
      const whList = whRes.data?.data || whRes.data?.warehouses || (Array.isArray(whRes.data) ? whRes.data : []);
      if (Array.isArray(whList)) setWarehouses(whList);
      const grpList = grpRes.data?.data || grpRes.data?.groups || (Array.isArray(grpRes.data) ? grpRes.data : []);
      if (Array.isArray(grpList)) setGroups(grpList);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchPurchaseRequests();
    fetchSuppliersAndProducts();
  }, []);

  const handleConvertToPO = async (pr) => {
    try {
      setConvertingPrId(pr.id);
      const res = await api.post(`/purchase-requests/${pr.id}/convert-to-po`, {
        notes: `Converted directly from Purchase Request ${pr.pr_number}`
      });
      if (res.data?.success) {
        setActionSuccessMsg(`Purchase Request ${pr.pr_number} successfully converted to official Purchase Order!`);
        setTimeout(() => setActionSuccessMsg(''), 5000);
        fetchPurchaseRequests();
        fetchPurchases();
      }
    } catch (err) {
      console.error('Error converting PR to PO:', err);
      alert(err.response?.data?.message || 'Failed to convert Purchase Request to PO');
    } finally {
      setConvertingPrId(null);
    }
  };

  const handleOpenFullProductCreator = (rowIndex) => {
    try {
      const draftState = {
        formData,
        targetRowIndex: rowIndex
      };
      sessionStorage.setItem('pending_po_draft', JSON.stringify(draftState));
      const compParam = formData.supplier_id ? `&company_id=${formData.supplier_id}` : '';
      navigate(`/products?action=create&returnTo=purchases&rowIndex=${rowIndex}${compParam}`);
    } catch (err) {
      console.error('Failed to save PO draft:', err);
      navigate(`/products?action=create&returnTo=purchases&rowIndex=${rowIndex}`);
    }
  };

  // Filter products by selected supplier / company so only items from that supplier are visible
  const filteredProducts = useMemo(() => {
    if (!formData.supplier_id) return [];
    const activeSupplier = suppliers.find(s => String(s.id) === String(formData.supplier_id));
    const activeSupplierName = activeSupplier?.name?.trim().toLowerCase();

    return products.filter(p => {
      // 1. Direct company_id or nested company.id match
      const pCompId = p.company_id ?? p.company?.id;
      if (pCompId && String(pCompId) === String(formData.supplier_id)) return true;

      // 2. Company name match
      if (activeSupplierName) {
        if (p.company_name && p.company_name.trim().toLowerCase() === activeSupplierName) return true;
        if (p.company?.name && p.company.name.trim().toLowerCase() === activeSupplierName) return true;
        if (p.brand?.company_name && p.brand.company_name.trim().toLowerCase() === activeSupplierName) return true;
      }

      return false;
    });
  }, [products, formData.supplier_id, suppliers]);

  const handleSupplierChange = (newSupplierId) => {
    // When changing supplier, clear items that belong to another supplier
    const activeSupplier = suppliers.find(s => String(s.id) === String(newSupplierId));
    const activeSupplierName = activeSupplier?.name?.trim().toLowerCase();

    const updatedDetails = (formData.details || []).map(detail => {
      if (!detail.product_id) return detail;
      const currentProd = products.find(p => String(p.id) === String(detail.product_id));
      if (!currentProd) return detail;

      const currentCompId = currentProd.company_id ?? currentProd.company?.id;
      const matchesId = newSupplierId && currentCompId && String(currentCompId) === String(newSupplierId);
      const matchesName = activeSupplierName && (
        (currentProd.company_name && currentProd.company_name.trim().toLowerCase() === activeSupplierName) ||
        (currentProd.company?.name && currentProd.company.name.trim().toLowerCase() === activeSupplierName) ||
        (currentProd.brand?.company_name && currentProd.brand.company_name.trim().toLowerCase() === activeSupplierName)
      );

      if (newSupplierId && !matchesId && !matchesName) {
        return { ...detail, product_id: '', price: 0 };
      }
      return detail;
    });

    setFormData(prev => ({
      ...prev,
      supplier_id: newSupplierId,
      details: updatedDetails
    }));
  };

  // Restore PO draft upon returning from Full Product / Element creation
  useEffect(() => {
    const rawDraft = sessionStorage.getItem('pending_po_draft');
    const newProductId = searchParams.get('new_product_id');
    const targetRowParam = searchParams.get('targetRow');

    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft);
        if (parsed?.formData) {
          setShowModal(true);

          if (newProductId) {
            // Fetch fresh products so the newly created element master is selectable
            api.get('/admin/products').then(res => {
              const freshProducts = res.data?.data || [];
              if (Array.isArray(freshProducts) && freshProducts.length > 0) {
                setProducts(freshProducts);
                const matched = freshProducts.find(p => String(p.id) === String(newProductId));
                const targetRowIndex = parsed.targetRowIndex ?? (targetRowParam ? parseInt(targetRowParam, 10) : 0);

                const updatedDetails = Array.isArray(parsed.formData.details) ? [...parsed.formData.details] : [];
                if (!updatedDetails[targetRowIndex]) {
                  updatedDetails[targetRowIndex] = { product_id: '', qty: 1, price: 0 };
                }
                updatedDetails[targetRowIndex].product_id = newProductId;
                
                // If PO didn't have a supplier selected yet, auto-select from this product's company
                let activeSupplierId = parsed.formData.supplier_id;
                if (matched) {
                  const pCompId = matched.company_id ?? matched.company?.id;
                  if (!activeSupplierId && pCompId) {
                    activeSupplierId = String(pCompId);
                  }
                  updatedDetails[targetRowIndex].price = parseFloat(matched.purchase_price || matched.price || updatedDetails[targetRowIndex].price || 0);
                  setActionSuccessMsg(`✨ Element "${matched.name}" created successfully and selected in Line Item ${targetRowIndex + 1}!`);
                  setTimeout(() => setActionSuccessMsg(''), 6000);
                }
                setFormData({
                  ...parsed.formData,
                  supplier_id: activeSupplierId || '',
                  details: updatedDetails
                });
              } else {
                setFormData(parsed.formData);
              }
              sessionStorage.removeItem('pending_po_draft');
            }).catch(e => {
              console.error(e);
              setFormData(parsed.formData);
              sessionStorage.removeItem('pending_po_draft');
            });
            return;
          } else {
            // Cancelled creation - preserve existing draft
            setFormData(parsed.formData);
            sessionStorage.removeItem('pending_po_draft');
          }
        }
      } catch (e) {
        console.error('Error restoring PO draft:', e);
      }
    }
  }, [searchParams]);

  const handleDetailChange = (index, field, value) => {
    if (field === 'product_id' && value === '__NEW__') {
      handleOpenFullProductCreator(index);
      return;
    }
    const newDetails = [...formData.details];
    newDetails[index][field] = value;
    if (field === 'product_id') {
      const selectedProd = products.find(p => String(p.id) === String(value));
      if (selectedProd) {
        newDetails[index].price = parseFloat(selectedProd.purchase_price || selectedProd.price || 0);
      }
    }
    setFormData({ ...formData, details: newDetails });
  };

  const addDetailRow = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { product_id: '', qty: 1, price: 0 }]
    });
  };

  const removeDetailRow = (index) => {
    const newDetails = formData.details.filter((_, i) => i !== index);
    setFormData({ ...formData, details: newDetails });
  };

  const calculateLineItemsTotal = () => {
    return formData.details.reduce((sum, d) => sum + ((parseFloat(d.qty) || 0) * (parseFloat(d.price) || 0)), 0);
  };

  const calculateTotal = () => {
    return calculateLineItemsTotal().toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const total_amount = parseFloat(calculateLineItemsTotal().toFixed(2));
      
      const cleanItems = formData.details
        .filter(d => d.product_id && d.qty > 0)
        .map(d => ({
          product_id: parseInt(d.product_id),
          qty: parseFloat(d.qty),
          price: parseFloat(d.price)
        }));

      let billUrl = '';
      if (billFile) {
        const isPdf = billFile.type === 'application/pdf' || billFile.name.toLowerCase().endsWith('.pdf');
        const uploadData = new FormData();
        uploadData.append(isPdf ? 'brochure' : 'image', billFile);
        uploadData.append('folder', 'purchase-bills');
        const uploadEndpoint = isPdf ? '/upload/brochure' : '/upload/image';
        const uploadResponse = await api.post(uploadEndpoint, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000
        });
        billUrl = uploadResponse.data?.url || '';
        if (!billUrl) {
          throw new Error('Bill upload did not return a file URL.');
        }
      }

      const payload = {
        po_number: formData.po_number || `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        supplier_id: parseInt(formData.supplier_id),
        warehouse_id: parseInt(formData.warehouse_id) || (warehouses[0]?.id || 1),
        date: formData.date,
        expected_delivery_date: formData.expected_delivery_date || null,
        shipping_status: formData.shipping_status || 'Ordered',
        notes: formData.notes || '',
        items: cleanItems,
        details: cleanItems,
        total_amount,
        bill_num: formData.bill_num,
        bill_url: billUrl || null,
        bill_file_name: billFile?.name || null,
        pmt_status: formData.pmt_status
      };

      const res = await api.post('/admin/purchases', payload);
      if (res.data.success || res.status === 200 || res.status === 201) {
        setShowModal(false);
        setFormData({
          po_number: '',
          date: new Date().toISOString().split('T')[0],
          expected_delivery_date: '',
          supplier_id: '',
          warehouse_id: '',
          bill_num: '',
          pmt_status: 'Pending',
          shipping_status: 'Ordered',
          notes: '',
          total_paid: 0,
          details: [{ product_id: '', qty: 1, price: 0 }]
        });
        setBillFile(null);
        setBillFileError('');
        if (billFileInputRef.current) billFileInputRef.current.value = '';
        setActionSuccessMsg(`Purchase Order ${payload.po_number} created successfully!`);
        setTimeout(() => setActionSuccessMsg(''), 5000);
        fetchPurchases();
      }
    } catch (error) {
      console.error('Error submitting PO:', error);
      alert(error.response?.data?.message || error.message || 'Failed to create Purchase Order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const draftCount = purchaseRequests.filter(pr => pr.status === 'Draft').length;
  const selectedSupplier = suppliers.find(s => String(s.id) === String(formData.supplier_id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER & TOP CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Procurement & Purchase Management
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Manage supplier purchase orders and approve automated reorder purchase requests
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {hasPermission('purchase_orders', 'create') && (
            <button 
              onClick={() => setShowModal(true)} 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600' }}
            >
              <Plus size={18} /> New Purchase Order
              <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '4px' }}>
                Ctrl + F9
              </span>
            </button>
          )}
          <button 
            onClick={() => { fetchPurchases(); fetchPurchaseRequests(); }}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* TOAST SUCCESS MESSAGE */}
      {actionSuccessMsg && (
        <div style={{ padding: '12px 18px', borderRadius: '8px', backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#15803d', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <CheckCircle size={20} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* MAIN NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
        <button
          onClick={() => { setActiveMainTab('orders'); setSearchParams({}); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeMainTab === 'orders' ? '3px solid #3b82f6' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeMainTab === 'orders' ? '#3b82f6' : '#64748b',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          <FileText size={18} />
          <span>Official Purchase Orders</span>
          <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', backgroundColor: activeMainTab === 'orders' ? '#3b82f6' : '#e2e8f0', color: activeMainTab === 'orders' ? '#fff' : '#475569' }}>
            {purchases.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveMainTab('requests'); setSearchParams({ tab: 'requests' }); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeMainTab === 'requests' ? '3px solid #8b5cf6' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeMainTab === 'requests' ? '#8b5cf6' : '#64748b',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          <ShoppingCart size={18} />
          <span>Draft Purchase Requests</span>
          <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', backgroundColor: activeMainTab === 'requests' ? '#8b5cf6' : '#e2e8f0', color: activeMainTab === 'requests' ? '#fff' : '#475569' }}>
            {draftCount} Pending
          </span>
        </button>
      </div>

      {/* VIEW 1: PURCHASE REQUESTS (DRAFTS CREATED FROM REORDER ENGINE) */}
      {activeMainTab === 'requests' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#0f172a' }}>Reorder Purchase Requests</h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Non-binding procurement drafts generated automatically from low stock alerts or manual inventory requests
              </p>
            </div>
          </div>
          <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)', position: 'relative', margin: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', width: '70px', padding: '14px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Sr. No.</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>PR Number</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Request Date</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Warehouse</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Requested Products & Quantity</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Total Est. Amount</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Priority</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Status</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingRequests ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading purchase requests...</td></tr>
              ) : paginatedRequests.length > 0 ? (
                paginatedRequests.map((pr, index) => {
                  const isDraft = pr.status === 'Draft';
                  const isConverted = pr.status === 'Converted_to_PO';

                  return (
                    <tr key={pr.id}>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '0.84rem' }}>
                        {(currentPrPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td style={{ fontWeight: '700', color: '#8b5cf6', textAlign: 'center' }}>{pr.pr_number}</td>
                      <td style={{ textAlign: 'center' }}>{pr.request_date}</td>
                      <td style={{ textAlign: 'center' }}>{pr.warehouse?.name || 'Central Facility'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {pr.items && pr.items.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            {pr.items.map(item => (
                              <div key={item.id} style={{ fontSize: '0.85rem' }}>
                                <strong>{item.product?.name || `Product #${item.product_id}`}</strong>: <span style={{ color: '#4338ca', fontWeight: '700' }}>{item.required_qty} units</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No items listed</span>
                        )}
                      </td>
                      <td style={{ fontWeight: '700', textAlign: 'center' }}>
                        ${parseFloat(pr.total_estimated_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          backgroundColor: pr.priority === 'Critical' ? '#fee2e2' : '#f1f5f9',
                          color: pr.priority === 'Critical' ? '#b91c1c' : '#334155'
                        }}>
                          {pr.priority || 'Medium'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '999px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          backgroundColor: isConverted ? '#dcfce7' : '#fef3c7',
                          color: isConverted ? '#15803d' : '#d97706'
                        }}>
                          {isConverted ? 'Converted to PO' : pr.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isDraft && (hasPermission('purchase_orders', 'edit') || hasPermission('purchase_orders', 'create')) ? (
                          <button
                            onClick={() => handleConvertToPO(pr)}
                            disabled={convertingPrId === pr.id}
                            className="btn btn-primary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              backgroundColor: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <ShoppingCart size={14} />
                            {convertingPrId === pr.id ? 'Converting...' : 'Convert to PO'}
                          </button>
                        ) : isDraft ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>Pending Review</span>
                        ) : (
                          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
                            <CheckCircle size={15} /> PO Generated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No pending draft purchase requests. When stock drops below reorder level, click "Generate PR" in Inventory to create one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPrPage}
          totalItems={purchaseRequests.length}
          itemsPerPage={10}
          onPageChange={setCurrentPrPage}
        />
      </div>
      )}

      {/* VIEW 2: OFFICIAL PURCHASE ORDERS TABLE */}
      {activeMainTab === 'orders' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative', margin: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', width: '70px', padding: '14px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Sr. No.</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>PO Number</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Supplier</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Destination Godown</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Challan / Tracking</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Tax Invoice No</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Total Amount</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Total Paid</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>PMT Status</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Shipping Status</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white', padding: '14px 16px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="12" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading Purchase Orders...</td></tr>
                ) : paginatedPurchases.length > 0 ? (
                  paginatedPurchases.map((po, index) => {
                    const whObj = warehouses.find(w => String(w.id) === String(po.warehouse_id)) || po.warehouse || po.Warehouse;
                    return (
                      <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '0.84rem' }}>
                          {(currentPoPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155', whiteSpace: 'nowrap', textAlign: 'center' }}>{po.date}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <button
                            onClick={() => navigate(`/purchases/${po.id}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#3b82f6',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '0.9rem',
                              textDecoration: 'underline'
                            }}
                          >
                            {po.po_number || po.po_id || `PO-${po.id}`}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155', textAlign: 'center' }}>{po.supplier?.name || po.Supplier?.name || 'Standard Supplier'}</td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', textAlign: 'center' }}>
                          {whObj?.name || (po.warehouse_id ? `Godown #${po.warehouse_id}` : 'Central Godown')}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', textAlign: 'center' }}>
                          {po.tracking_number || po.challan_number || <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', textAlign: 'center' }}>
                          {po.vendor_invoice_number || po.bill_num || <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          ₹{parseFloat(po.total_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          ₹{parseFloat(po.total_paid || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '0.75rem', 
                            fontWeight: '700',
                            backgroundColor: po.pmt_status === 'Paid' ? '#dcfce7' : po.pmt_status === 'Partial' ? '#cffafe' : '#fef3c7',
                            color: po.pmt_status === 'Paid' ? '#15803d' : po.pmt_status === 'Partial' ? '#0e7490' : '#d97706'
                          }}>
                            {po.pmt_status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '0.75rem', 
                            fontWeight: '700',
                            backgroundColor:
                              po.shipping_status === 'Received'
                                ? '#dcfce7'
                                : po.shipping_status === 'Partially Received'
                                ? '#ede9fe'
                                : po.shipping_status === 'Ordered'
                                ? '#e0e7ff'
                                : '#fef3c7',
                            color:
                              po.shipping_status === 'Received'
                                ? '#15803d'
                                : po.shipping_status === 'Partially Received'
                                ? '#6d28d9'
                                : po.shipping_status === 'Ordered'
                                ? '#3730a3'
                                : '#d97706'
                          }}>
                            {po.shipping_status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              onClick={() => navigate(`/purchases/${po.id}`)}
                              title="View Tally ERP Details"
                              style={{
                                backgroundColor: '#eef2ff',
                                color: '#4338ca',
                                border: '1px solid #c7d2fe',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                              }}
                            >
                              <Eye size={13} /> Details
                            </button>
                            {hasPermission('purchase_orders', 'delete') && (
                              <button
                                onClick={() => setDeletingPo(po)}
                                title="Delete Purchase Order"
                                style={{
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600'
                                }}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No Purchase Orders recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPoPage}
            totalItems={purchases.length}
            itemsPerPage={10}
            onPageChange={setCurrentPoPage}
          />
        </div>
      )}

      {/* CREATE NEW PURCHASE ORDER MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '16px', width: '820px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingCart size={22} color="#4338ca" />
                Create New Purchase Order
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.78rem', backgroundColor: '#eef2ff', color: '#4338ca', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                  Tally Shortcut: Ctrl + F9
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Step 1: Create commercial purchase order with vendor and destination Godown
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: selectedSupplier ? '16px' : '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>
                    PO Number (Optional / Auto)
                  </label>
                  <input
                    type="text"
                    value={formData.po_number}
                    onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder={`e.g. PO-${new Date().getFullYear()}-001`}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Supplier *</label>
                  <select required value={formData.supplier_id} onChange={(e) => handleSupplierChange(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>
                    Destination Godown / Warehouse *
                  </label>
                  <select
                    required
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="">Select Destination Godown</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.warehouse_code ? `[${w.warehouse_code}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Order Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Expected Delivery Date</label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Shipping Status</label>
                  <select value={formData.shipping_status} onChange={(e) => setFormData({...formData, shipping_status: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="Ordered">Ordered</option>
                    <option value="Pending">Pending</option>
                    <option value="Partially Received">Partially Received</option>
                    <option value="Received">Received</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Bill / Invoice Number</label>
                  <input type="text" value={formData.bill_num} onChange={(e) => setFormData({...formData, bill_num: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }} placeholder="e.g. INV-2026-001" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Order Notes / Instructions</label>
                  <input type="text" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }} placeholder="e.g. Urgent stock order" />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="purchase-bill-upload" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>
                  Upload Bill / Invoice (Optional)
                </label>
                <input
                  ref={billFileInputRef}
                  id="purchase-bill-upload"
                  type="file"
                  accept=".pdf,image/*"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    const isPdf = selectedFile?.type === 'application/pdf' || selectedFile?.name.toLowerCase().endsWith('.pdf');
                    const isImage = selectedFile?.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(selectedFile?.name || '');
                    if (selectedFile && !isPdf && !isImage) {
                      setBillFile(null);
                      setBillFileError('Select a PDF or image file.');
                      e.target.value = '';
                      return;
                    }
                    setBillFile(selectedFile);
                    setBillFileError('');
                  }}
                  style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px dashed #94a3b8', backgroundColor: '#f8fafc', fontSize: '0.85rem' }}
                />
                {billFile && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px', fontSize: '0.8rem', color: '#475569' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <FileText size={15} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{billFile.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBillFile(null);
                        setBillFileError('');
                        if (billFileInputRef.current) billFileInputRef.current.value = '';
                      }}
                      disabled={isSubmitting}
                      style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                {billFileError && <div role="alert" style={{ marginTop: '6px', color: '#dc2626', fontSize: '0.8rem' }}>{billFileError}</div>}
                <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.75rem' }}>Attach a bill or invoice as a PDF or image.</div>
              </div>

              {/* SUPPLIER DETAILS CARD */}
              {selectedSupplier && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #4338ca',
                  padding: '16px 20px',
                  marginBottom: '22px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                          Supplier Details
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                          {selectedSupplier.name}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        backgroundColor: selectedSupplier.status === 'Active' ? '#dcfce7' : '#fee2e2', 
                        color: selectedSupplier.status === 'Active' ? '#15803d' : '#b91c1c', 
                        padding: '3px 10px', 
                        borderRadius: '999px' 
                      }}>
                        {selectedSupplier.status || 'Active'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                        COM{String(selectedSupplier.id).padStart(5, '0')}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '14px',
                    paddingTop: '12px',
                    borderTop: '1px dashed #cbd5e1'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', fontWeight: '600' }}>
                        <Truck size={14} color="#4338ca" />
                        <span>Authorized Distributor</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                        {selectedSupplier.authorized_distributor || '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', fontWeight: '600' }}>
                        <UserCheck size={14} color="#4338ca" />
                        <span>Company Officer</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                        {selectedSupplier.company_officer_name || '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', fontWeight: '600' }}>
                        <Percent size={14} color="#4338ca" />
                        <span>Margin</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                        {selectedSupplier.margin || 'Standard'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', fontWeight: '600' }}>
                        <Tag size={14} color="#4338ca" />
                        <span>Scheme / Offer</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                        {[selectedSupplier.scheme, selectedSupplier.offer].filter(Boolean).join(' • ') || 'None'}
                      </div>
                    </div>
                  </div>

                  {selectedSupplier.description && (
                    <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#475569', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: '700', color: '#334155' }}>Description: </span>
                      {selectedSupplier.description}
                    </div>
                  )}
                </div>
              )}

              {/* Line Items */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: '#0f172a' }}>Order Line Items</h3>
                  {selectedSupplier ? (
                    <span style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: '600' }}>
                      Showing products for {selectedSupplier.name} ({filteredProducts.length} available)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>
                      ⚠️ Please select a Supplier above to view its products
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      fetchSuppliersAndProducts();
                      setActionSuccessMsg('Product list refreshed!');
                      setTimeout(() => setActionSuccessMsg(''), 3000);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Fetch latest products from server"
                  >
                    <RotateCcw size={13} /> Refresh List
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenFullProductCreator(formData.details.length - 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #4338ca',
                      backgroundColor: '#4338ca',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(67, 56, 202, 0.2)'
                    }}
                    title="Create a new product / element master"
                  >
                    <Plus size={15} /> + Add Element
                  </button>
                </div>
              </div>

              {formData.details.map((detail, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 2 }}>
                    <select
                      required
                      value={detail.product_id}
                      disabled={!formData.supplier_id}
                      onChange={(e) => handleDetailChange(index, 'product_id', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: !formData.supplier_id ? '#f8fafc' : '#ffffff',
                        color: !formData.supplier_id ? '#94a3b8' : '#0f172a',
                        cursor: !formData.supplier_id ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {!formData.supplier_id ? (
                        <option value="">⚠️ Select a Supplier above first</option>
                      ) : (
                        <>
                          <option value="">
                            {filteredProducts.length === 0 ? '-- No products for this Supplier --' : 'Select Product'}
                          </option>
                          <option value="__NEW__" style={{ fontWeight: '700', color: '#4338ca' }}>
                            ✨ + Create Full Product / Element for this Supplier...
                          </option>
                          {filteredProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                  <input type="number" min="1" required placeholder="Qty" value={detail.qty} onChange={(e) => handleDetailChange(index, 'qty', e.target.value)} style={{ width: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input type="number" step="0.01" min="0" required placeholder="Price" value={detail.price} onChange={(e) => handleDetailChange(index, 'price', e.target.value)} style={{ width: '110px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  {formData.details.length > 1 && (
                    <button type="button" onClick={() => removeDetailRow(index)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer' }}>
                      &times;
                    </button>
                  )}
                </div>
              ))}

              <button type="button" onClick={addDetailRow} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginTop: '6px', fontWeight: '600', fontSize: '0.85rem' }}>
                + Add Another Product
              </button>

              {/* Clean & Simple Order Cost Breakdown */}
              <div style={{ marginTop: '20px', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', fontWeight: '600' }}>TOTAL CONTRACTED QUANTITY</span>
                    <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a' }}>
                      {formData.details.reduce((sum, d) => sum + (parseFloat(d.qty) || 0), 0)} Units
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', fontWeight: '600' }}>TOTAL CONTRACTED PO VALUE</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#4338ca' }}>
                      ₹{calculateLineItemsTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={isSubmitting} style={{ padding: '10px 18px', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '10px 24px', fontWeight: '600', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? (billFile ? 'Uploading bill and submitting...' : 'Submitting...') : 'Submit Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY DELETE REASON CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={!!deletingPo}
        title="Delete Purchase Order"
        itemName={deletingPo ? `Purchase Order "${deletingPo.po_number || deletingPo.po_id || ('#' + deletingPo.id)}"` : 'this purchase order'}
        onClose={() => setDeletingPo(null)}
        onConfirm={handleConfirmDeletePo}
        isLoading={deletePoLoading}
      />
    </div>
  );
};

export default Purchases;
