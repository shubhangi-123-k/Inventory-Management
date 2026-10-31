import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  ShoppingCart,
  Truck,
  RotateCcw,
  FileCheck2,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  FileText,
  DollarSign,
  Printer,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Tag,
  ShieldCheck,
  ChevronRight,
  Info,
  IndianRupee,
  Repeat,
  TrendingUp,
  TrendingDown,
  Scale
} from 'lucide-react';

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Modal visibility states for the Tally ERP 5-step actions
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Modal 2: Receive Goods (Receipt Note / GRN - Alt+F9)
  const [receiveForm, setReceiveForm] = useState({
    tracking_number: '',
    warehouse_id: '',
    items: []
  });

  // Form states for Modal 3: Rejections Out (Alt+F6)
  const [rejectForm, setRejectForm] = useState({
    reason: '',
    items: []
  });

  // Form states for Modal 4: Book Tax Invoice / Purchase Voucher (F9)
  const [invoiceForm, setInvoiceForm] = useState({
    vendor_invoice_number: '',
    vendor_invoice_date: new Date().toISOString().split('T')[0],
    gst_rate: 18,
    notes: ''
  });

  // Form states for Modal 5: Payment Voucher (F5)
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    pmt_method: 'Bank Transfer / RTGS',
    notes: ''
  });

  // Fetch PO details and master lookups
  const fetchPoDetails = useCallback(async () => {
    try {
      setLoading(true);
      let foundPo = null;

      // 1. Try single purchase endpoint
      try {
        const res = await api.get(`/admin/purchases/${id}`);
        foundPo = res.data?.data || res.data?.purchase || res.data;
      } catch (err) {
        console.warn('Single PO endpoint failed, falling back to list query:', err);
      }

      // 2. Fallback to list endpoint if single not available
      if (!foundPo || !foundPo.id) {
        const listRes = await api.get('/admin/purchases');
        const list = listRes.data?.data || listRes.data || [];
        foundPo = list.find((p) => String(p.id) === String(id));
      }

      if (foundPo) {
        setPo(foundPo);
      } else {
        showError(`Purchase Order #${id} not found.`);
      }
    } catch (err) {
      console.error('Failed to load PO details:', err);
      showError('Failed to load purchase order details.');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  const fetchLookups = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        api.get('/admin/warehouses').catch(() => ({ data: [] })),
        api.get('/admin/products').catch(() => ({ data: [] }))
      ]);

      const whList = whRes.data?.data || whRes.data?.warehouses || (Array.isArray(whRes.data) ? whRes.data : []);
      setWarehouses(whList);

      const prodList = prodRes.data?.data || (Array.isArray(prodRes.data) ? prodRes.data : []);
      setProducts(prodList);
    } catch (err) {
      console.error('Error fetching lookups for PO details:', err);
    }
  };

  useEffect(() => {
    fetchPoDetails();
    fetchLookups();
  }, [fetchPoDetails]);

  // Keyboard shortcut listener for authentic Tally ERP experience
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or textarea
      const targetTag = e.target?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      // Alt + F9: Receive Goods / Receipt Note
      if (e.altKey && (e.key === 'F9' || e.code === 'F9')) {
        e.preventDefault();
        openReceiveModal();
        return;
      }

      // Alt + F6: Rejections Out
      if (e.altKey && (e.key === 'F6' || e.code === 'F6')) {
        e.preventDefault();
        openRejectModal();
        return;
      }

      // F9 (without Alt/Ctrl): Purchase Voucher (Tax Invoice)
      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'F9' || e.code === 'F9')) {
        e.preventDefault();
        openInvoiceModal();
        return;
      }

      // F5 (without Alt/Ctrl): Payment Voucher (Prevent browser reload!)
      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'F5' || e.code === 'F5')) {
        e.preventDefault();
        openPaymentModal();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [po]);

  // Normalized PO Item extraction
  const poItems = useMemo(() => {
    if (!po) return [];
    const items = po.items || po.details || po.PurchaseOrderDetails || po.purchase_items || [];
    return items.map((item, idx) => {
      const productId = item.product_id || item.Product?.id || item.product?.id;
      const productObj = products.find((p) => String(p.id) === String(productId)) || item.product || item.Product || {};
      const orderedQty = parseFloat(item.qty || item.ordered_qty || 0);
      const receivedQty = parseFloat(item.received_qty ?? item.delivered_qty ?? (po.shipping_status === 'Received' ? orderedQty : 0));
      const rejectedQty = parseFloat(item.rejected_qty || item.returned_qty || 0);
      const balanceQty = Math.max(0, orderedQty - receivedQty + rejectedQty);
      const unitPrice = parseFloat(item.price || item.unit_price || item.cost_price || 0);
      const lineTotal = parseFloat(item.total_amount || item.amount || (orderedQty * unitPrice));

      return {
        id: item.id || idx,
        product_id: productId,
        name: productObj.name || item.name || item.product_name || `Product #${productId || idx + 1}`,
        sku: productObj.sku || item.sku || productObj.code || '—',
        ordered_qty: orderedQty,
        received_qty: receivedQty,
        rejected_qty: rejectedQty,
        balance_qty: balanceQty,
        price: unitPrice,
        total_amount: lineTotal,
        lot_number: item.lot_number || '',
        batch_number: item.batch_number || '',
        manufacturing_date: item.manufacturing_date || '',
        expiry_date: item.expiry_date || ''
      };
    });
  }, [po, products]);

  // Total quantity metrics
  const totalOrderedQty = useMemo(() => poItems.reduce((acc, it) => acc + it.ordered_qty, 0), [poItems]);
  const totalReceivedQty = useMemo(() => poItems.reduce((acc, it) => acc + it.received_qty, 0), [poItems]);
  const totalRejectedQty = useMemo(() => poItems.reduce((acc, it) => acc + it.rejected_qty, 0), [poItems]);
  const totalShortageQty = useMemo(() => poItems.reduce((acc, it) => acc + (parseFloat(it.shortage_qty) || 0), 0) + totalRejectedQty, [poItems, totalRejectedQty]);
  const totalBalanceQty = useMemo(() => Math.max(0, totalOrderedQty - totalReceivedQty + totalRejectedQty), [totalOrderedQty, totalReceivedQty, totalRejectedQty]);

  // Three-Tier PO Quantities (Module 2.1 & 2.2)
  const combineContractedQty = totalOrderedQty;
  const physicalReceivedQty = totalReceivedQty;
  const virtualPendingQty = Math.max(0, combineContractedQty - physicalReceivedQty - totalShortageQty);
  const physicalPct = combineContractedQty > 0 ? (physicalReceivedQty / combineContractedQty) * 100 : 0;
  const pendingPct = combineContractedQty > 0 ? (virtualPendingQty / combineContractedQty) * 100 : 0;
  const shortagePct = combineContractedQty > 0 ? (totalShortageQty / combineContractedQty) * 100 : 0;

  // Financial calculations
  const totalAmount = parseFloat(po?.total_amount || 0);
  const totalPaid = parseFloat(po?.total_paid || 0);
  const balancePayable = Math.max(0, totalAmount - totalPaid);

  // Destination Warehouse / Godown
  const warehouse = useMemo(() => {
    if (!po) return null;
    return (
      warehouses.find((w) => String(w.id) === String(po.warehouse_id)) ||
      po.warehouse ||
      po.Warehouse ||
      null
    );
  }, [po, warehouses]);

  // Contextual action triggers
  const canReceiveGoods = po && po.shipping_status !== 'Received' && po.shipping_status !== 'Cancelled';
  const canRejectGoods = totalReceivedQty > 0;
  const canBookInvoice = po && (!po.vendor_invoice_number || po.vendor_invoice_number.trim() === '');
  const canRecordPayment = po && (po.pmt_status !== 'Paid' && balancePayable > 0);

  // Open Modal 2: Receive Goods (Receipt Note / GRN - Alt+F9)
  const openReceiveModal = () => {
    if (!po) return;
    setReceiveForm({
      tracking_number: po.tracking_number || po.challan_number || `CHALLAN-GRN-${Date.now().toString().slice(-4)}`,
      warehouse_id: po.warehouse_id || (warehouses[0]?.id || 1),
      items: poItems.map((it) => ({
        id: it.id,
        product_id: it.product_id,
        name: it.name,
        sku: it.sku,
        ordered_qty: it.ordered_qty,
        previously_received: it.received_qty,
        balance_qty: it.balance_qty,
        received_qty: it.balance_qty, // default to remaining balance
        shortage_qty: 0,
        lot_number: `LOT-${new Date().getFullYear()}-${String(it.product_id).padStart(2, '0')}`,
        batch_number: `BATCH-${String(Date.now()).slice(-4)}`,
        manufacturing_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        // Substitution mode (Module 2.3)
        is_substituted: false,
        substitute_product_id: '',
        substitute_qty: it.balance_qty,
        substitute_price: it.price
      }))
    });
    setShowReceiveModal(true);
  };

  // Open Modal 3: Rejections Out
  const openRejectModal = () => {
    if (!po) return;
    const receivedItems = poItems.filter((it) => it.received_qty > 0);
    if (receivedItems.length === 0) {
      showWarning('No items have been received yet. Rejections Out is only valid after goods are received.');
      return;
    }
    setRejectForm({
      reason: 'Damaged goods / Broken packaging',
      items: receivedItems.map((it) => ({
        product_id: it.product_id,
        name: it.name,
        sku: it.sku,
        received_qty: it.received_qty,
        rejected_qty: 0,
        rejection_reason: 'Quality check failed / seal damaged'
      }))
    });
    setShowRejectModal(true);
  };

  // Open Modal 4: Book Tax Invoice (Tally F9 with price variances & freight)
  const openInvoiceModal = () => {
    if (!po) return;
    setInvoiceForm({
      vendor_invoice_number: po.vendor_invoice_number || `TAX-INV-${Date.now().toString().slice(-4)}`,
      vendor_invoice_date: po.vendor_invoice_date || new Date().toISOString().split('T')[0],
      gst_rate: po.gst_rate !== undefined ? po.gst_rate : 18,
      freight_charges: parseFloat(po.freight_charges) || 0,
      other_charges: parseFloat(po.other_charges) || 0,
      notes: po.notes || 'Verified against physical challan and gate entry',
      items: poItems.map((it) => ({
        id: it.id,
        product_id: it.product_id,
        name: it.name,
        sku: it.sku,
        ordered_qty: it.ordered_qty,
        received_qty: it.received_qty > 0 ? it.received_qty : it.ordered_qty,
        contracted_price: it.price,
        invoiced_price: it.price
      }))
    });
    setShowInvoiceModal(true);
  };

  // Open Modal 5: Record Payment
  const openPaymentModal = () => {
    if (!po) return;
    setPaymentForm({
      amount_paid: balancePayable > 0 ? balancePayable : 0,
      pmt_method: 'Bank Transfer / RTGS',
      notes: `Payment for PO ${po.po_number || po.po_id || '#' + po.id}`
    });
    setShowPaymentModal(true);
  };

  // SUBMIT Step 2: Receive Goods (Receipt Note / GRN - Alt+F9 with Substitution & Shortages)
  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const itemsPayload = receiveForm.items.map((it) => {
        if (it.is_substituted) {
          return {
            id: it.id,
            product_id: it.product_id,
            is_substituted: true,
            substitute_product_id: parseInt(it.substitute_product_id) || it.product_id,
            substitute_qty: parseFloat(it.substitute_qty) || 0,
            substitute_price: parseFloat(it.substitute_price) || 0,
            lot_number: it.lot_number || null,
            batch_number: it.batch_number || null,
            manufacturing_date: it.manufacturing_date || null,
            expiry_date: it.expiry_date || null
          };
        }
        return {
          id: it.id,
          product_id: it.product_id,
          received_qty: parseFloat(it.received_qty) || 0,
          shortage_qty: parseFloat(it.shortage_qty) || 0,
          lot_number: it.lot_number || null,
          batch_number: it.batch_number || null,
          manufacturing_date: it.manufacturing_date || null,
          expiry_date: it.expiry_date || null
        };
      }).filter((it) => (it.is_substituted ? it.substitute_qty > 0 : (it.received_qty > 0 || it.shortage_qty > 0)));

      if (itemsPayload.length === 0) {
        showWarning('Please enter at least one item received or shortage quantity.');
        setSubmitting(false);
        return;
      }

      const payload = {
        tracking_number: receiveForm.tracking_number,
        warehouse_id: parseInt(receiveForm.warehouse_id) || po.warehouse_id || 1,
        items: itemsPayload
      };

      await api.post(`/admin/purchases/${id}/receive`, payload);
      showSuccess(
        `Receipt Note / GRN recorded successfully! (Challan: ${payload.tracking_number})`,
        'Goods Received'
      );
      setShowReceiveModal(false);
      fetchPoDetails();
    } catch (err) {
      console.error('Error receiving goods:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to record Receipt Note');
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMIT Step 3: Rejections Out (Alt+F6)
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const itemsToReject = rejectForm.items
        .filter((it) => parseFloat(it.rejected_qty) > 0)
        .map((it) => ({
          product_id: it.product_id,
          rejected_qty: parseFloat(it.rejected_qty),
          rejection_reason: it.rejection_reason || rejectForm.reason
        }));

      if (itemsToReject.length === 0) {
        showWarning('Please specify a rejected quantity > 0 for at least one item.');
        setSubmitting(false);
        return;
      }

      const payload = {
        reason: rejectForm.reason || 'Damaged goods / Broken packaging',
        items: itemsToReject
      };

      await api.post(`/admin/purchases/${id}/reject`, payload);
      showSuccess(
        `Rejections Out recorded! Items returned to vendor and stock decremented.`,
        'Rejections Out (Alt+F6)'
      );
      setShowRejectModal(false);
      fetchPoDetails();
    } catch (err) {
      console.error('Error rejecting items:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to process Rejections Out');
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMIT Step 4: Purchase Voucher (F9 - Tax Invoice Booking with Line Item Variances & Freight)
  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        vendor_invoice_number: invoiceForm.vendor_invoice_number,
        vendor_invoice_date: invoiceForm.vendor_invoice_date,
        gst_rate: parseFloat(invoiceForm.gst_rate) || 0,
        freight_charges: parseFloat(invoiceForm.freight_charges) || 0,
        other_charges: parseFloat(invoiceForm.other_charges) || 0,
        notes: invoiceForm.notes,
        items: (invoiceForm.items || []).map((it) => ({
          id: it.id,
          invoiced_price: parseFloat(it.invoiced_price) || it.contracted_price
        }))
      };

      await api.post(`/admin/purchases/${id}/invoice`, payload);
      showSuccess(
        `Tax Invoice ${payload.vendor_invoice_number} booked successfully! GST & Total Amount recalculated.`,
        'Purchase Voucher (F9)'
      );
      setShowInvoiceModal(false);
      fetchPoDetails();
    } catch (err) {
      console.error('Error booking tax invoice:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to book Tax Invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMIT Step 5: Payment Voucher (F5)
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const amount = parseFloat(paymentForm.amount_paid);
      if (!amount || amount <= 0) {
        showWarning('Please enter a valid payment amount greater than zero.');
        setSubmitting(false);
        return;
      }

      const payload = {
        amount_paid: amount,
        pmt_method: paymentForm.pmt_method || 'Bank Transfer / RTGS',
        notes: paymentForm.notes || ''
      };

      await api.post(`/admin/purchases/${id}/pay`, payload);
      showSuccess(
        `Payment of ₹${amount.toFixed(2)} recorded! Payment Status updated.`,
        'Payment Voucher (F5)'
      );
      setShowPaymentModal(false);
      fetchPoDetails();
    } catch (err) {
      console.error('Error recording payment:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" color="#4338ca" />
        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155' }}>
          Loading Purchase Order #{id}...
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>Purchase Order Not Found</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          The requested purchase order could not be loaded or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/purchases')}
          className="btn btn-primary"
          style={{ padding: '10px 20px', borderRadius: '8px' }}
        >
          Return to Purchases List
        </button>
      </div>
    );
  }

  // Tally ERP 5-Stage Step Indicators
  const steps = [
    {
      num: 1,
      title: 'Purchase Order',
      shortcut: 'Ctrl + F9',
      desc: 'Commercial PO with Vendor & Godown',
      status: 'completed', // PO is created
      date: po.date
    },
    {
      num: 2,
      title: 'Receipt Note / GRN',
      shortcut: 'Alt + F9',
      desc: po.tracking_number ? `Challan: ${po.tracking_number}` : 'Physical delivery & batch logging',
      status: po.shipping_status === 'Received' ? 'completed' : po.shipping_status === 'Partially Received' ? 'in_progress' : 'pending',
      badge: po.shipping_status
    },
    {
      num: 3,
      title: 'Rejections Out',
      shortcut: 'Alt + F6',
      desc: totalRejectedQty > 0 ? `${totalRejectedQty} items rejected & returned` : 'Pre-invoice inspection & return',
      status: totalRejectedQty > 0 ? 'completed' : 'pending'
    },
    {
      num: 4,
      title: 'Tax Invoice (F9)',
      shortcut: 'F9',
      desc: po.vendor_invoice_number ? `Inv: ${po.vendor_invoice_number}` : 'Vendor GST tax invoice booking',
      status: po.vendor_invoice_number ? 'completed' : 'pending'
    },
    {
      num: 5,
      title: 'Payment Voucher',
      shortcut: 'F5',
      desc: po.pmt_status === 'Paid' ? 'Paid in full' : `Balance ₹${balancePayable.toFixed(2)}`,
      status: po.pmt_status === 'Paid' ? 'completed' : totalPaid > 0 ? 'in_progress' : 'pending',
      badge: po.pmt_status
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* ── TOP BREADCRUMB & BACK BUTTON ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => navigate('/purchases')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: '600',
            color: '#334155'
          }}
        >
          <ArrowLeft size={16} /> Back to Purchase Orders
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: '600',
              color: '#334155'
            }}
          >
            <Printer size={15} /> Print Voucher
          </button>
          <button
            onClick={fetchPoDetails}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: '600',
              color: '#334155'
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 1. HEADER CARD (STATUS BADGES, TRACKING, INVOICE, GODOWN) ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', color: '#0f172a' }}>
                {po.po_number || po.po_id || `PO-${po.id}`}
              </h1>
              {/* Shipping Status Badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  backgroundColor:
                    po.shipping_status === 'Received'
                      ? '#dcfce7'
                      : po.shipping_status === 'Partially Received'
                      ? '#ede9fe'
                      : po.shipping_status === 'Ordered'
                      ? '#e0e7ff'
                      : po.shipping_status === 'Cancelled'
                      ? '#fee2e2'
                      : '#fef3c7',
                  color:
                    po.shipping_status === 'Received'
                      ? '#15803d'
                      : po.shipping_status === 'Partially Received'
                      ? '#6d28d9'
                      : po.shipping_status === 'Ordered'
                      ? '#3730a3'
                      : po.shipping_status === 'Cancelled'
                      ? '#b91c1c'
                      : '#b45309'
                }}
              >
                <Truck size={14} /> Shipping: {po.shipping_status || 'Pending'}
              </span>

              {/* Billing Status Badge (Module 2.2) */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  backgroundColor: po.vendor_invoice_number ? '#dcfce7' : physicalReceivedQty > 0 ? '#ede9fe' : '#f1f5f9',
                  color: po.vendor_invoice_number ? '#15803d' : physicalReceivedQty > 0 ? '#6d28d9' : '#64748b'
                }}
              >
                <FileCheck2 size={14} /> Billing: {po.vendor_invoice_number ? 'Fully Billed' : physicalReceivedQty > 0 ? 'Partially Billed' : 'Not Billed'}
              </span>

              {/* Payment Status Badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  backgroundColor:
                    po.pmt_status === 'Paid'
                      ? '#dcfce7'
                      : po.pmt_status === 'Partial'
                      ? '#cffafe'
                      : '#fef3c7',
                  color:
                    po.pmt_status === 'Paid'
                      ? '#15803d'
                      : po.pmt_status === 'Partial'
                      ? '#0e7490'
                      : '#b45309'
                }}
              >
                <CreditCard size={14} /> Payment: {po.pmt_status || 'Pending'}
              </span>

              {/* Variance Audit Report Button */}
              <Link
                to={`/purchases/${id}/variance-summary`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#4338ca',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  textDecoration: 'none',
                  boxShadow: '0 2px 4px rgba(67, 56, 202, 0.25)',
                  cursor: 'pointer'
                }}
              >
                <FileCheck2 size={15} /> Variance Audit Report &rarr;
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', color: '#64748b', fontSize: '0.88rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={15} /> Order Date: <strong style={{ color: '#1e293b' }}>{po.date || '—'}</strong>
              </span>
              {po.expected_delivery_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={15} /> Expected Delivery: <strong style={{ color: '#1e293b' }}>{po.expected_delivery_date}</strong>
                </span>
              )}
            </div>

            {/* Multi-Segment Fulfillment Bar (Module 2.2) */}
            <div style={{ marginTop: '14px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                  <Layers size={16} color="#4338ca" />
                  Three-Tier PO Quantities: Combine Total {combineContractedQty} units
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                  Physical Arrived: <strong style={{ color: '#10b981' }}>{physicalReceivedQty}</strong> | Pending In-Transit: <strong style={{ color: '#f59e0b' }}>{virtualPendingQty}</strong> | Shortages: <strong style={{ color: '#94a3b8' }}>{totalShortageQty}</strong>
                </div>
              </div>

              <div
                style={{
                  height: '14px',
                  borderRadius: '999px',
                  backgroundColor: '#e2e8f0',
                  overflow: 'hidden',
                  display: 'flex',
                  width: '100%',
                  border: '1px solid #cbd5e1'
                }}
              >
                {physicalPct > 0 && (
                  <div
                    style={{ width: `${physicalPct}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }}
                    title={`Physical Received: ${physicalReceivedQty} units (${physicalPct.toFixed(1)}%)`}
                  />
                )}
                {pendingPct > 0 && (
                  <div
                    style={{ width: `${pendingPct}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s' }}
                    title={`Virtual In-Transit Pending: ${virtualPendingQty} units (${pendingPct.toFixed(1)}%)`}
                  />
                )}
                {shortagePct > 0 && (
                  <div
                    style={{ width: `${shortagePct}%`, backgroundColor: '#94a3b8', transition: 'width 0.3s' }}
                    title={`Shortages / Damages: ${totalShortageQty} units (${shortagePct.toFixed(1)}%)`}
                  />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '0.76rem', color: '#475569', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  Physical Received: <strong>{physicalReceivedQty}</strong> ({physicalPct.toFixed(1)}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  Virtual Pending: <strong>{virtualPendingQty}</strong> ({pendingPct.toFixed(1)}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#94a3b8' }} />
                  Shortages / Damages: <strong>{totalShortageQty}</strong> ({shortagePct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Supplier details card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 18px',
              minWidth: '240px'
            }}
          >
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>
              Vendor / Supplier
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {po.supplier?.name || po.Supplier?.name || 'Standard Supplier'}
            </div>
            {po.supplier?.email && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                {po.supplier.email}
              </div>
            )}
          </div>
        </div>

        {/* ── KEY LOGISTICS & VOUCHER DETAILS GRID ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginTop: '20px'
          }}
        >
          {/* Destination Godown / Warehouse */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4338ca', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
              <Building2 size={16} /> Destination Godown / Warehouse
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
              {warehouse?.name || (po.warehouse_id ? `Warehouse #${po.warehouse_id}` : 'Central Godown')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
              {warehouse?.warehouse_code ? `Code: ${warehouse.warehouse_code}` : ''} {warehouse?.city ? `• ${warehouse.city}` : ''}
            </div>
          </div>

          {/* Delivery Challan / Tracking Number */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
              <Package size={16} /> Delivery Challan / Tracking No
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: po.tracking_number ? '#0f172a' : '#94a3b8' }}>
              {po.tracking_number || po.challan_number || 'Awaiting Physical GRN'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
              {po.tracking_number ? 'Recorded in Receipt Note' : 'Press Alt + F9 to record GRN'}
            </div>
          </div>

          {/* Vendor Tax Invoice Number & Date */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
              <FileCheck2 size={16} /> Vendor GST Tax Invoice
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: po.vendor_invoice_number ? '#0f172a' : '#94a3b8' }}>
              {po.vendor_invoice_number || 'Not Booked Yet'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
              {po.vendor_invoice_date ? `Inv Date: ${po.vendor_invoice_date}` : 'Press F9 to book Tax Invoice'}
            </div>
          </div>

          {/* Financial Summary Pill */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
              <DollarSign size={16} /> Net Order Amount & Balance
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              ₹{totalAmount.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: balancePayable === 0 ? '#15803d' : '#b45309', marginTop: '3px', fontWeight: '600' }}>
              Paid: ₹{totalPaid.toFixed(2)} • Due: ₹{balancePayable.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. TALLY ERP 5-STEP WORKFLOW TRACKER ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
          padding: '20px 24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#4338ca" />
              Tally ERP 5-Stage Purchase Order Lifecycle
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Commercial PO &rarr; Physical Delivery Note &rarr; Inspection Return &rarr; Official GST Booking &rarr; Settlement
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', backgroundColor: '#eef2ff', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>
            ERP Compliant
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {steps.map((st) => {
            const isDone = st.status === 'completed';
            const isInProgress = st.status === 'in_progress';
            return (
              <div
                key={st.num}
                style={{
                  borderRadius: '10px',
                  padding: '14px',
                  border: isDone
                    ? '1px solid #86efac'
                    : isInProgress
                    ? '1px solid #c7d2fe'
                    : '1px dashed #cbd5e1',
                  backgroundColor: isDone ? '#f0fdf4' : isInProgress ? '#f5f3ff' : '#f8fafc',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: isDone ? '#16a34a' : isInProgress ? '#4338ca' : '#cbd5e1',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '800'
                    }}
                  >
                    {isDone ? '✓' : st.num}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      backgroundColor: isDone ? '#dcfce7' : isInProgress ? '#e0e7ff' : '#f1f5f9',
                      color: isDone ? '#15803d' : isInProgress ? '#4338ca' : '#64748b',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {st.shortcut}
                  </span>
                </div>
                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: isDone ? '#14532d' : '#0f172a' }}>
                  {st.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', lineHeight: '1.3' }}>
                  {st.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. CONTEXTUAL ACTION BUTTON BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)'
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginRight: '4px' }}>
          Workflow Actions:
        </span>

        {/* Step 2 Action: Receive Goods (Receipt Note) */}
        {canReceiveGoods && (
          <button
            onClick={openReceiveModal}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              backgroundColor: '#4338ca',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)'
            }}
          >
            <Truck size={17} /> Receive Goods (Receipt Note)
            <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '4px' }}>
              Alt + F9
            </span>
          </button>
        )}

        {/* Step 3 Action: Return / Reject Items */}
        {canRejectGoods && (
          <button
            onClick={openRejectModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={16} /> Return / Reject Items
            <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(185, 28, 28, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
              Alt + F6
            </span>
          </button>
        )}

        {/* Step 4 Action: Book Tax Invoice */}
        <button
          onClick={openInvoiceModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '0.88rem',
            backgroundColor: po.vendor_invoice_number ? '#f1f5f9' : '#f0fdf4',
            color: po.vendor_invoice_number ? '#334155' : '#15803d',
            border: po.vendor_invoice_number ? '1px solid #cbd5e1' : '1px solid #86efac',
            cursor: 'pointer'
          }}
        >
          <FileCheck2 size={16} /> {po.vendor_invoice_number ? 'Update Tax Invoice' : 'Book Tax Invoice'}
          <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
            F9
          </span>
        </button>

        {/* Step 5 Action: Record Payment */}
        {canRecordPayment && (
          <button
            onClick={openPaymentModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              backgroundColor: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              cursor: 'pointer'
            }}
          >
            <CreditCard size={16} /> Record Payment
            <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(4, 120, 87, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
              F5
            </span>
          </button>
        )}
      </div>

      {/* ── 4. ITEMS PROGRESS TABLE (TALLY AUDIT VIEW) ── */}
      <div
        className="table-container"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #eaecf0',
          overflowX: 'auto',
          marginTop: 0,
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eaecf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
              Order Line Items & Delivery Progress
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Track ordered vs physical inward delivery and returned quantities per item
            </p>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>
            Total Items: <strong>{poItems.length}</strong> • Total Ordered: <strong>{totalOrderedQty}</strong> • Received: <strong style={{ color: '#16a34a' }}>{totalReceivedQty}</strong>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
              <th style={{ width: '60px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', verticalAlign: 'middle' }}>
                Sr. No.
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', verticalAlign: 'middle' }}>
                Item Name & SKU
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', verticalAlign: 'middle' }}>
                Ordered Qty
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', verticalAlign: 'middle' }}>
                Received Qty
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', verticalAlign: 'middle' }}>
                Rejected Qty
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', verticalAlign: 'middle' }}>
                Balance Qty
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', verticalAlign: 'middle' }}>
                Unit Price
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', textAlign: 'center', verticalAlign: 'middle' }}>
                Total Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {poItems.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                  No line items found for this purchase order.
                </td>
              </tr>
            ) : (
              poItems.map((item, idx) => {
                const percentReceived = item.ordered_qty > 0 ? Math.min(100, Math.round((item.received_qty / item.ordered_qty) * 100)) : 0;
                return (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #eaecf0', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '14px 16px', borderRight: '1px solid #eaecf0', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                      {idx + 1}
                    </td>

                    <td style={{ padding: '14px 16px', borderRight: '1px solid #eaecf0', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem' }}>
                        {item.name}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        <span>SKU: {item.sku}</span>
                        {item.lot_number && (
                          <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            {item.lot_number}
                          </span>
                        )}
                        {item.batch_number && (
                          <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            Batch: {item.batch_number}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #eaecf0' }}>
                      {item.ordered_qty}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #eaecf0' }}>
                      <div style={{ fontWeight: '700', color: item.received_qty > 0 ? '#15803d' : '#64748b' }}>
                        {item.received_qty}
                      </div>
                      {item.ordered_qty > 0 && (
                        <div style={{ width: '80px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', margin: '4px auto 0', overflow: 'hidden' }}>
                          <div style={{ width: `${percentReceived}%`, height: '100%', backgroundColor: percentReceived === 100 ? '#16a34a' : '#3b82f6' }} />
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #eaecf0' }}>
                      <span
                        style={{
                          fontWeight: '700',
                          color: item.rejected_qty > 0 ? '#b91c1c' : '#94a3b8',
                          backgroundColor: item.rejected_qty > 0 ? '#fee2e2' : 'transparent',
                          padding: item.rejected_qty > 0 ? '2px 8px' : '0',
                          borderRadius: '4px'
                        }}
                      >
                        {item.rejected_qty}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #eaecf0' }}>
                      <span style={{ fontWeight: '700', color: item.balance_qty > 0 ? '#d97706' : '#15803d' }}>
                        {item.balance_qty}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', color: '#334155', borderRight: '1px solid #eaecf0' }}>
                      ₹{item.price.toFixed(2)}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700', color: '#0f172a' }}>
                      ₹{item.total_amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── FINANCIAL & GST RECONCILIATION SUMMARY ── */}
        <div
          style={{
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #eaecf0',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#64748b' }}>
              <span>Items Subtotal:</span>
              <strong style={{ color: '#1e293b' }}>
                ₹{poItems.reduce((sum, it) => sum + it.total_amount, 0).toFixed(2)}
              </strong>
            </div>

            {po.gst_rate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#64748b' }}>
                <span>GST ({po.gst_rate}%):</span>
                <strong style={{ color: '#1e293b' }}>
                  ₹{(parseFloat(po.tax_amount) || 0).toFixed(2)}
                </strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
              <span>Total Invoice Amount:</span>
              <span style={{ color: '#4338ca' }}>₹{totalAmount.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#15803d' }}>
              <span>Total Paid:</span>
              <strong>₹{totalPaid.toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: '700', color: balancePayable > 0 ? '#b91c1c' : '#15803d', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
              <span>Balance Due:</span>
              <span>₹{balancePayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. MODAL 2: RECEIVE GOODS (RECEIPT NOTE / GRN - ALT + F9) ── */}
      {showReceiveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '960px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={22} color="#4338ca" />
                  Receipt Note / Goods Received Note (GRN)
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Tally Shortcut: <strong>Alt + F9</strong> • Records physical floor delivery, transit shortages & dynamic item substitution
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Delivery Challan / Tracking Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHALLAN-MH-4512"
                    value={receiveForm.tracking_number}
                    onChange={(e) => setReceiveForm({ ...receiveForm, tracking_number: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Receiving Godown / Warehouse *
                  </label>
                  <select
                    required
                    value={receiveForm.warehouse_id}
                    onChange={(e) => setReceiveForm({ ...receiveForm, warehouse_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    <option value="">Select Godown</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.warehouse_code ? `(${w.warehouse_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table for Receipt Note */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Delivery Line Items (Specify Received Quantities, Transit Shortages & Item Substitutions)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Floor stock will increment by received units
                </span>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px', width: '55px', textAlign: 'center', fontWeight: '700' }}>Sr. No.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Item / Contracted</th>
                      <th style={{ padding: '10px 12px', width: '105px', textAlign: 'center', fontWeight: '700' }}>Arrived Qty *</th>
                      <th style={{ padding: '10px 12px', width: '105px', textAlign: 'center', fontWeight: '700' }}>Shortage Qty</th>
                      <th style={{ padding: '10px 12px', width: '120px', textAlign: 'center', fontWeight: '700' }}>Lot / Batch</th>
                      <th style={{ padding: '10px 12px', width: '180px', textAlign: 'center', fontWeight: '700' }}>Mfg / Expiry</th>
                      <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center', fontWeight: '700' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiveForm.items.map((item, idx) => (
                      <React.Fragment key={item.product_id || idx}>
                        <tr style={{ borderBottom: item.is_substituted ? 'none' : '1px solid #f1f5f9', backgroundColor: item.is_substituted ? '#fffbeb' : '#ffffff' }}>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              SKU: {item.sku} • Ord: <strong>{item.ordered_qty}</strong> • Bal: <strong>{item.balance_qty}</strong>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={item.is_substituted}
                              value={item.received_qty}
                              onChange={(e) => {
                                const updated = [...receiveForm.items];
                                updated[idx].received_qty = e.target.value;
                                setReceiveForm({ ...receiveForm, items: updated });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontWeight: '700',
                                textAlign: 'right',
                                backgroundColor: item.is_substituted ? '#f1f5f9' : '#ffffff'
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              disabled={item.is_substituted}
                              value={item.shortage_qty}
                              onChange={(e) => {
                                const updated = [...receiveForm.items];
                                updated[idx].shortage_qty = e.target.value;
                                setReceiveForm({ ...receiveForm, items: updated });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #fca5a5',
                                fontWeight: '600',
                                textAlign: 'right',
                                color: '#b91c1c',
                                backgroundColor: item.is_substituted ? '#f1f5f9' : '#fff'
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="text"
                              placeholder="Lot / Batch"
                              value={item.batch_number}
                              onChange={(e) => {
                                const updated = [...receiveForm.items];
                                updated[idx].batch_number = e.target.value;
                                updated[idx].lot_number = e.target.value;
                                setReceiveForm({ ...receiveForm, items: updated });
                              }}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <input
                                type="date"
                                title="Mfg Date"
                                value={item.manufacturing_date}
                                onChange={(e) => {
                                  const updated = [...receiveForm.items];
                                  updated[idx].manufacturing_date = e.target.value;
                                  setReceiveForm({ ...receiveForm, items: updated });
                                }}
                                style={{ width: '85px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }}
                              />
                              <input
                                type="date"
                                title="Expiry Date"
                                value={item.expiry_date}
                                onChange={(e) => {
                                  const updated = [...receiveForm.items];
                                  updated[idx].expiry_date = e.target.value;
                                  setReceiveForm({ ...receiveForm, items: updated });
                                }}
                                style={{ width: '85px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...receiveForm.items];
                                const currentSub = !updated[idx].is_substituted;
                                updated[idx].is_substituted = currentSub;
                                if (currentSub && !updated[idx].substitute_product_id) {
                                  const otherProd = products.find((p) => String(p.id) !== String(item.product_id));
                                  if (otherProd) {
                                    updated[idx].substitute_product_id = otherProd.id;
                                  }
                                }
                                setReceiveForm({ ...receiveForm, items: updated });
                              }}
                              style={{
                                padding: '5px 8px',
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: item.is_substituted ? '#f59e0b' : '#cbd5e1',
                                backgroundColor: item.is_substituted ? '#fef3c7' : '#f8fafc',
                                color: item.is_substituted ? '#b45309' : '#475569',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Repeat size={12} />
                              {item.is_substituted ? 'Substituted' : 'Swap'}
                            </button>
                          </td>
                        </tr>

                        {/* Substitution Nested Drawer (Module 2.3) */}
                        {item.is_substituted && (
                          <tr style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                            <td colSpan={7} style={{ padding: '10px 16px', textAlign: 'left' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: '700', fontSize: '0.8rem' }}>
                                  <Repeat size={14} />
                                  <span>Dynamic Substitution for {item.name}:</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#78350f' }}>Replacement Product:</label>
                                  <select
                                    value={item.substitute_product_id}
                                    onChange={(e) => {
                                      const updated = [...receiveForm.items];
                                      updated[idx].substitute_product_id = e.target.value;
                                      const selProd = products.find((p) => String(p.id) === String(e.target.value));
                                      if (selProd) {
                                        updated[idx].substitute_price = selProd.price || selProd.purchase_price || item.substitute_price;
                                      }
                                      setReceiveForm({ ...receiveForm, items: updated });
                                    }}
                                    style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '0.8rem', backgroundColor: '#fff', maxWidth: '220px' }}
                                  >
                                    <option value="">Select Alternate Item</option>
                                    {products.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku || p.code || 'SKU'})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#78350f' }}>Swap Qty:</label>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={item.substitute_qty}
                                    onChange={(e) => {
                                      const updated = [...receiveForm.items];
                                      updated[idx].substitute_qty = e.target.value;
                                      setReceiveForm({ ...receiveForm, items: updated });
                                    }}
                                    style={{ width: '80px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '0.8rem', textAlign: 'right', fontWeight: '700' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#78350f' }}>Agreed Rate (₹):</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.substitute_price}
                                    onChange={(e) => {
                                      const updated = [...receiveForm.items];
                                      updated[idx].substitute_price = e.target.value;
                                      setReceiveForm({ ...receiveForm, items: updated });
                                    }}
                                    style={{ width: '90px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '0.8rem', textAlign: 'right', fontWeight: '700' }}
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...receiveForm.items];
                                    updated[idx].is_substituted = false;
                                    setReceiveForm({ ...receiveForm, items: updated });
                                  }}
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  Cancel Swap
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  style={{ padding: '10px 18px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: '700', borderRadius: '8px' }}
                >
                  {submitting ? 'Receiving...' : 'Record Goods Inward (GRN)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. MODAL 3: REJECTIONS OUT (ALT + F6) ── */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '750px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCcw size={22} color="#b91c1c" />
                  Rejections Out (Return Defective Items)
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Tally Shortcut: <strong>Alt + F6</strong> • Decrements received quantity and deducts physical stock
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Primary Rejection / Return Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Damaged goods / Broken packaging / Quality check failed"
                  value={rejectForm.reason}
                  onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ border: '1px solid #fee2e2', borderRadius: '10px', overflowX: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fff1f2', color: '#9f1239', borderBottom: '1px solid #fecdd3' }}>
                      <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center', fontWeight: '700' }}>Sr. No.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Item Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Received Qty</th>
                      <th style={{ padding: '10px 12px', width: '120px', textAlign: 'center', fontWeight: '700' }}>Reject Qty *</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Specific Defect Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectForm.items.map((item, idx) => (
                      <tr key={item.product_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.sku}</div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>
                          {item.received_qty}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="number"
                            min="0"
                            max={item.received_qty}
                            step="any"
                            value={item.rejected_qty}
                            onChange={(e) => {
                              const updated = [...rejectForm.items];
                              updated[idx].rejected_qty = e.target.value;
                              setRejectForm({ ...rejectForm, items: updated });
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fca5a5', fontWeight: '700', textAlign: 'right', color: '#b91c1c' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="text"
                            placeholder="e.g. Seal damaged, dented box"
                            value={item.rejection_reason}
                            onChange={(e) => {
                              const updated = [...rejectForm.items];
                              updated[idx].rejection_reason = e.target.value;
                              setRejectForm({ ...rejectForm, items: updated });
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{ padding: '10px 18px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 24px', backgroundColor: '#b91c1c', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submitting ? 'Processing...' : 'Confirm Rejections Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. MODAL 4: BOOK TAX INVOICE (PURCHASE VOUCHER - F9) ── */}
      {showInvoiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '800px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck2 size={22} color="#16a34a" />
                  Book Purchase Voucher (Vendor Tax Invoice)
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Tally Shortcut: <strong>F9</strong> • Official Tax Bill (Virtual Stock Inward & Input Tax Credit)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Vendor Invoice Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TAX-INV-9921"
                      value={invoiceForm.vendor_invoice_number}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor_invoice_number: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Invoice Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={invoiceForm.vendor_invoice_date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor_invoice_date: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      GST Rate % *
                    </label>
                    <select
                      value={invoiceForm.gst_rate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, gst_rate: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    >
                      <option value="0">0% (Nil / Exempted)</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST (Standard)</option>
                      <option value="28">28% GST</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Freight & Logistics Charges (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={invoiceForm.freight_charges}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, freight_charges: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Other / Handling Charges (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={invoiceForm.other_charges}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, other_charges: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {/* Line Item Rates & Price Variances (Module 2.4) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                    Line Item Invoiced Rates & Price Variance Review
                  </label>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 10px', width: '50px', textAlign: 'center', fontWeight: '700' }}>Sr. No.</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700' }}>Product Details</th>
                          <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center', fontWeight: '700' }}>Billed Qty</th>
                          <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center', fontWeight: '700' }}>Contracted Rate</th>
                          <th style={{ padding: '8px 10px', width: '120px', textAlign: 'center', fontWeight: '700' }}>Invoiced Rate *</th>
                          <th style={{ padding: '8px 10px', width: '150px', textAlign: 'center', fontWeight: '700' }}>Price Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(invoiceForm.items || []).map((item, idx) => {
                          const contracted = parseFloat(item.contracted_price) || 0;
                          const invoiced = parseFloat(item.invoiced_price) || 0;
                          const diff = invoiced - contracted;
                          const qty = parseFloat(item.received_qty) > 0 ? parseFloat(item.received_qty) : (parseFloat(item.ordered_qty) || 1);

                          return (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.name}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>SKU: {item.sku}</div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>
                                {qty}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>
                                ₹{contracted.toFixed(2)}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  required
                                  value={item.invoiced_price}
                                  onChange={(e) => {
                                    const updated = [...invoiceForm.items];
                                    updated[idx].invoiced_price = e.target.value;
                                    setInvoiceForm({ ...invoiceForm, items: updated });
                                  }}
                                  style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '700', textAlign: 'right' }}
                                />
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {diff > 0.001 ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309' }}>
                                    <TrendingUp size={12} />
                                    +₹{diff.toFixed(2)} Revised
                                  </span>
                                ) : diff < -0.001 ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                    <TrendingDown size={12} />
                                    -₹{Math.abs(diff).toFixed(2)} Discount
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569' }}>
                                    <CheckCircle2 size={12} />
                                    Exact Rate
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary & Variance Box (Module 2.4) */}
                {(() => {
                  const itemsList = invoiceForm.items || [];
                  const goodsSubtotal = itemsList.reduce((acc, it) => {
                    const q = parseFloat(it.received_qty) > 0 ? parseFloat(it.received_qty) : (parseFloat(it.ordered_qty) || 1);
                    return acc + (q * (parseFloat(it.invoiced_price) || 0));
                  }, 0);
                  const expectedGoodsSubtotal = itemsList.reduce((acc, it) => {
                    const q = parseFloat(it.received_qty) > 0 ? parseFloat(it.received_qty) : (parseFloat(it.ordered_qty) || 1);
                    return acc + (q * (parseFloat(it.contracted_price) || 0));
                  }, 0);
                  const freight = parseFloat(invoiceForm.freight_charges) || 0;
                  const other = parseFloat(invoiceForm.other_charges) || 0;
                  const gstPct = parseFloat(invoiceForm.gst_rate) || 0;
                  const taxable = goodsSubtotal + freight + other;
                  const gstAmount = (taxable * gstPct) / 100;
                  const grandTotal = taxable + gstAmount;

                  const expectedTaxable = expectedGoodsSubtotal + freight + other;
                  const expectedGstAmount = (expectedTaxable * gstPct) / 100;
                  const expectedTotal = expectedTaxable + expectedGstAmount;
                  const netVariance = grandTotal - expectedTotal;

                  return (
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '14px 18px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px', color: '#475569' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Goods Subtotal:</span>
                          <strong>₹{goodsSubtotal.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Freight & Other Fees:</span>
                          <strong>₹{(freight + other).toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>GST Amount ({gstPct}%):</span>
                          <strong>₹{gstAmount.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                          <span style={{ fontWeight: '600' }}>Expected PO Total:</span>
                          <span style={{ fontWeight: '600' }}>₹{expectedTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Grand Billed Total (Accounts Payable):</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#16a34a' }}>
                            ₹{grandTotal.toFixed(2)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Net Financial Variance:</div>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            color: netVariance > 0 ? '#b45309' : netVariance < 0 ? '#15803d' : '#475569'
                          }}>
                            {netVariance > 0 ? `+₹${netVariance.toFixed(2)} (Excess)` : netVariance < 0 ? `-₹${Math.abs(netVariance).toFixed(2)} (Savings)` : '₹0.00 (Balanced)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Verification Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Verified against physical challan and gate entry"
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  style={{ padding: '10px 18px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 24px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submitting ? 'Booking...' : 'Book Tax Invoice (F9)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. MODAL 5: RECORD PAYMENT (PAYMENT VOUCHER - F5) ── */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={22} color="#047857" />
                  Payment Voucher (Record Vendor Pmt)
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Tally Shortcut: <strong>F5</strong> • Records bank/cash voucher & clears payable balance
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Total Invoice Amount:</span>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>₹{totalAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Outstanding Balance:</span>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: balancePayable > 0 ? '#b91c1c' : '#15803d' }}>
                      ₹{balancePayable.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balancePayable > 0 ? balancePayable : undefined}
                    required
                    placeholder="e.g. 5000"
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: '700', color: '#047857' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Payment Method *
                  </label>
                  <select
                    value={paymentForm.pmt_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, pmt_method: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    <option value="Bank Transfer / RTGS">Bank Transfer / RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Transaction Reference / UTR Number / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Transaction UTR: 123456789"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{ padding: '10px 18px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 24px', backgroundColor: '#047857', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submitting ? 'Recording...' : 'Record Payment (F5)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseDetails;
