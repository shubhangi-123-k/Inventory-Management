import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { Save, X, Plus, Trash2, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle, Percent, FileCheck2, FileText, Truck, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const SalesOrderForm = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [roundTotal, setRoundTotal] = useState(false);
  const [billDiscount, setBillDiscount] = useState('');
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [additionalCharges, setAdditionalCharges] = useState([]);

  // Module 3: Dual-Track Stock Billing Modes ('BOTH' | 'PHYSICAL_ONLY' | 'VIRTUAL_ONLY')
  const [stockEffectMode, setStockEffectMode] = useState('BOTH');
  const [converting, setConverting] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    so_id: '',
    date: new Date().toISOString().split('T')[0],
    stock_effect_mode: 'BOTH'
  });

  const [lineItems, setLineItems] = useState([
    {
      id: Date.now(),
      product_id: '',
      qty: 1,
      cost_price: 0,
      mrp: 0,
      selling_price: 0,
      tax_rate: 0,
      pricing_mode: 'STANDARD', // 'STANDARD', 'DISCOUNT_ON_MRP', 'PROFIT_ON_COST', 'MANUAL'
      margin_percent: '',
      round_off: false,
      price: 0,
      amount: 0
    }
  ]);

  useEffect(() => {
    fetchDropdowns();
    if (isEdit) {
      fetchOrder();
    }
  }, [isEdit]);

  const fetchDropdowns = async () => {
    try {
      const custRes = await api.get('/admin/customers?limit=1000');
      setCustomers(custRes.data?.data || custRes.data || []);
    } catch (error) {
      console.error("Failed to load customers", error);
    }

    try {
      const prodRes = await api.get('/admin/products');
      let fetchedProducts = prodRes.data?.data || prodRes.data || [];
      if (!Array.isArray(fetchedProducts)) fetchedProducts = [];
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Failed to load products", error);
      setProducts([]);
    }

    try {
      const expRes = await api.get('/admin/expenses?status=Active');
      const expList = expRes.data?.data || expRes.data || [];
      if (Array.isArray(expList)) setExpenseHeads(expList);
    } catch (error) {
      console.error("Failed to load expense heads", error);
    }
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      let data = null;
      try {
        const res = await api.get(`/admin/sales-orders/${id}`);
        data = res.data?.data || res.data;
      } catch (err) {
        const res = await api.get(`/admin/sales/${id}`);
        data = res.data?.data || res.data;
      }

      const mode = data.stock_effect_mode || 'BOTH';
      setStockEffectMode(mode);

      setFormData({
        customer_id: data.customer_id || '',
        so_id: data.so_number || data.so_id || `SO${String(data.id).padStart(6, '0')}`,
        date: data.date || data.so_date || '',
        stock_effect_mode: mode
      });
      const orderItems = data.items || data.details || [];
      if (orderItems.length > 0) {
        setLineItems(orderItems.map(d => ({
          id: d.id,
          product_id: d.product_id,
          qty: d.qty,
          cost_price: parseFloat(d.product?.purchase_price || 0),
          mrp: parseFloat(d.product?.mrp || d.price || 0),
          selling_price: parseFloat(d.price || 0),
          tax_rate: parseFloat(d.tax_rate ?? d.gst_rate ?? d.product?.gst_rate ?? 0) || 0,
          pricing_mode: 'STANDARD',
          margin_percent: d.discount ? String(d.discount) : '',
          round_off: false,
          price: parseFloat(d.price || 0),
          amount: parseFloat(d.amount || (d.qty * d.price)),
          applied_deal: null
        })));
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to load order", error);
      showError("Failed to load sales order details");
      setLoading(false);
    }
  };

  // Auto-calculate unit price based on selected pricing mode and round off
  const computeUnitPrice = (item, overrideFields = {}) => {
    const mode = overrideFields.pricing_mode !== undefined ? overrideFields.pricing_mode : item.pricing_mode;
    const cost = overrideFields.cost_price !== undefined ? overrideFields.cost_price : parseFloat(item.cost_price || 0);
    const mrp = overrideFields.mrp !== undefined ? overrideFields.mrp : parseFloat(item.mrp || 0);
    const stdPrice = overrideFields.selling_price !== undefined ? overrideFields.selling_price : parseFloat(item.selling_price || 0);
    const pct = overrideFields.margin_percent !== undefined ? parseFloat(overrideFields.margin_percent || 0) : parseFloat(item.margin_percent || 0);
    const shouldRound = overrideFields.round_off !== undefined ? overrideFields.round_off : item.round_off;

    let computed = overrideFields.price !== undefined ? parseFloat(overrideFields.price || 0) : parseFloat(item.price || 0);

    if (mode === 'STANDARD') {
      computed = stdPrice > 0 ? stdPrice : (mrp > 0 ? mrp : cost);
    } else if (mode === 'DISCOUNT_ON_SELLING_PRICE') {
      const baseSell = stdPrice > 0 ? stdPrice : (mrp > 0 ? mrp : cost);
      computed = baseSell * (1 - (pct / 100));
    } else if (mode === 'DISCOUNT_ON_MRP') {
      const baseMrp = mrp > 0 ? mrp : stdPrice;
      computed = baseMrp * (1 - (pct / 100));
    } else if (mode === 'PROFIT_ON_COST') {
      computed = cost * (1 + (pct / 100));
    }

    if (mode !== 'MANUAL') {
      if (shouldRound) {
        computed = Math.round(computed);
      } else {
        computed = parseFloat(computed.toFixed(2));
      }
    }

    return Math.max(0, computed);
  };

  const getCustomerTierPrice = (product, customerId) => {
    const type = String(customers.find((customer) => String(customer.id) === String(customerId))?.customer_type || 'Retail').trim().toLowerCase();
    if (type.includes('distributor')) return parseFloat(product.distributor_price) || parseFloat(product.selling_price) || 0;
    if (type.includes('wholesal')) return parseFloat(product.selling_price_wholesale) || parseFloat(product.selling_price) || 0;
    if (type.includes('retail')) return parseFloat(product.selling_price_retail) || parseFloat(product.mrp) || parseFloat(product.selling_price) || 0;
    return parseFloat(product.selling_price) || 0;
  };

  const handleCustomerChange = (customerId) => {
    setFormData((current) => ({ ...current, customer_id: customerId }));
    setLineItems((currentItems) => currentItems.map((item) => {
      if (!item.product_id) return item;
      const product = products.find((entry) => String(entry.id) === String(item.product_id));
      if (!product) return item;
      const tierPrice = getCustomerTierPrice(product, customerId);
      const nextItem = {
        ...item,
        selling_price: tierPrice,
        mrp: parseFloat(product.mrp || product.selling_price || 0),
        cost_price: parseFloat(product.purchase_price || 0),
        tax_rate: parseFloat(product.gst_rate) || 0,
        pricing_mode: 'STANDARD',
        margin_percent: '',
        applied_deal: null,
      };
      nextItem.price = computeUnitPrice(nextItem, { pricing_mode: 'STANDARD', selling_price: tierPrice, margin_percent: '' });
      nextItem.amount = (parseInt(nextItem.qty, 10) || 1) * nextItem.price;
      return nextItem;
    }));
  };

  const parseSchemePercent = (schemeStr) => {
    if (!schemeStr) return 50;
    const str = String(schemeStr).trim().toLowerCase();

    // Check for X+Y format (e.g. 1+1, 2+1, 3+1, 1 + 1)
    const plusMatch = str.match(/(\d+)\s*\+\s*(\d+)/);
    if (plusMatch) {
      const buy = parseFloat(plusMatch[1]) || 1;
      const free = parseFloat(plusMatch[2]) || 1;
      if (buy + free > 0) {
        return parseFloat(((free / (buy + free)) * 100).toFixed(1));
      }
    }

    // Check for "buy X get Y" format
    const buyGetMatch = str.match(/buy\s*(\d+)\s*get\s*(\d+)/i);
    if (buyGetMatch) {
      const buy = parseFloat(buyGetMatch[1]) || 1;
      const free = parseFloat(buyGetMatch[2]) || 1;
      if (buy + free > 0) {
        return parseFloat(((free / (buy + free)) * 100).toFixed(1));
      }
    }

    // Check for direct percentage number in string (e.g. "50%")
    const numMatch = str.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      return parseFloat(numMatch[1]);
    }

    // Default for BOGO / Buy one get one
    return 50;
  };

  const applyBogoScheme = (itemId, prod) => {
    const updated = lineItems.map(it => {
      if (it.id === itemId) {
        // Toggle OFF if already applied
        if (it.applied_deal === 'SCHEME') {
          const revertedItem = {
            ...it,
            pricing_mode: 'STANDARD',
            margin_percent: '',
            applied_deal: null
          };
          revertedItem.price = computeUnitPrice(revertedItem, {
            pricing_mode: 'STANDARD',
            margin_percent: ''
          });
          const currentQty = parseInt(revertedItem.qty, 10) || 0;
          revertedItem.amount = currentQty * revertedItem.price;
          return revertedItem;
        }

        // Toggle ON / Apply scheme
        const schemeDiscountPct = parseSchemePercent(prod.product_pe_product);
        let targetMode = it.pricing_mode;
        if (targetMode !== 'DISCOUNT_ON_MRP') {
          targetMode = (parseFloat(it.selling_price || prod.selling_price || 0) > 0) 
            ? 'DISCOUNT_ON_SELLING_PRICE' 
            : 'DISCOUNT_ON_MRP';
        }

        const newItem = {
          ...it,
          pricing_mode: targetMode,
          margin_percent: schemeDiscountPct.toString(),
          applied_deal: 'SCHEME'
        };

        newItem.price = computeUnitPrice(newItem, {
          pricing_mode: targetMode,
          margin_percent: schemeDiscountPct.toString()
        });
        const currentQty = parseInt(newItem.qty, 10) || 0;
        newItem.amount = currentQty * newItem.price;
        return newItem;
      }
      return it;
    });

    setLineItems(updated);
  };

  const applyProductOffer = (itemId, prod) => {
    const updated = lineItems.map(it => {
      if (it.id === itemId) {
        // Toggle OFF if already applied
        if (it.applied_deal === 'OFFER') {
          const revertedItem = {
            ...it,
            pricing_mode: 'STANDARD',
            margin_percent: '',
            applied_deal: null
          };
          revertedItem.price = computeUnitPrice(revertedItem, {
            pricing_mode: 'STANDARD',
            margin_percent: ''
          });
          const currentQty = parseInt(revertedItem.qty, 10) || 0;
          revertedItem.amount = currentQty * revertedItem.price;
          return revertedItem;
        }

        // Toggle ON / Apply offer discount
        const rawNum = parseFloat(String(prod.discount_on_product).replace(/[^0-9.]/g, '')) || 0;
        const newItem = {
          ...it,
          pricing_mode: 'DISCOUNT_ON_SELLING_PRICE',
          margin_percent: rawNum ? rawNum.toString() : it.margin_percent,
          applied_deal: 'OFFER'
        };

        newItem.price = computeUnitPrice(newItem, {
          pricing_mode: 'DISCOUNT_ON_SELLING_PRICE',
          margin_percent: rawNum ? rawNum.toString() : it.margin_percent
        });
        const currentQty = parseInt(newItem.qty, 10) || 0;
        newItem.amount = currentQty * newItem.price;
        return newItem;
      }
      return it;
    });

    setLineItems(updated);
  };

  const handleItemChange = (itemId, field, value) => {
    const updated = lineItems.map(item => {
      if (item.id === itemId) {
        let updatedItem = { ...item, [field]: value };

        if (field === 'product_id') {
          const prod = products.find(p => String(p.id) === String(value));
          if (prod) {
            const cost = parseFloat(prod.purchase_price || 0);
            const mrpVal = parseFloat(prod.mrp || prod.selling_price || 0);
            const stdVal = getCustomerTierPrice(prod, formData.customer_id);
            updatedItem.cost_price = cost;
            updatedItem.mrp = mrpVal;
            updatedItem.selling_price = stdVal;
            updatedItem.tax_rate = parseFloat(prod.gst_rate) || 0;
            updatedItem.pricing_mode = 'STANDARD';
            updatedItem.margin_percent = '';
            updatedItem.applied_deal = null;
            updatedItem.price = computeUnitPrice(updatedItem, { cost_price: cost, mrp: mrpVal, selling_price: stdVal, pricing_mode: 'STANDARD', margin_percent: '' });
            updatedItem.amount = (parseInt(updatedItem.qty, 10) || 1) * updatedItem.price;
          }
        } else if (field === 'pricing_mode' || field === 'margin_percent' || field === 'round_off') {
          if (field === 'pricing_mode' || field === 'margin_percent') {
            updatedItem.applied_deal = null;
          }
          updatedItem.price = computeUnitPrice(updatedItem, { [field]: value });
          updatedItem.amount = (parseInt(updatedItem.qty, 10) || 1) * updatedItem.price;
        } else if (field === 'qty') {
          updatedItem.qty = value;
          const qtyVal = parseInt(value, 10) || 0;
          const currentPrice = parseFloat(updatedItem.price) || 0;
          updatedItem.amount = qtyVal * currentPrice;
        } else if (field === 'price') {
          updatedItem.price = value;
          updatedItem.pricing_mode = 'MANUAL';
          updatedItem.applied_deal = null;
          const priceVal = parseFloat(value) || 0;
          const currentQty = parseInt(updatedItem.qty, 10) || 0;
          updatedItem.amount = currentQty * priceVal;
        }

        return updatedItem;
      }
      return item;
    });
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now(),
        product_id: '',
        qty: 1,
        cost_price: 0,
        mrp: 0,
        selling_price: 0,
        tax_rate: 0,
        pricing_mode: 'STANDARD',
        margin_percent: '',
        round_off: false,
        price: 0,
        amount: 0,
        applied_deal: null
      }
    ]);
  };

  const removeLineItem = (itemId) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== itemId));
    }
  };

  // Calculations for total revenue & gross profit
  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const calculateTotalProfit = () => {
    return lineItems.reduce((sum, item) => {
      const q = parseInt(item.qty, 10) || 1;
      const profitPerUnit = (parseFloat(item.price) || 0) - (parseFloat(item.cost_price) || 0);
      return sum + (profitPerUnit * q);
    }, 0);
  };

  const calculateChargesTotal = () => {
    return additionalCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  };

  const handleAddCharge = () => {
    setAdditionalCharges([
      ...additionalCharges,
      { id: Date.now(), expense_id: '', name: '', amount: '' }
    ]);
  };

  const handleRemoveCharge = (chargeId) => {
    setAdditionalCharges(additionalCharges.filter(c => c.id !== chargeId));
  };

  const handleChargeChange = (chargeId, field, value) => {
    setAdditionalCharges(additionalCharges.map(c => {
      if (c.id === chargeId) {
        if (field === 'expense_id') {
          const head = expenseHeads.find(eh => String(eh.id) === String(value));
          return { ...c, expense_id: value, name: head?.name || '' };
        }
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const calculateGrandTotal = () => {
    const rawTotal = calculateSubtotal() + calculateChargesTotal();
    const disc = parseFloat(billDiscount) || 0;
    const discounted = Math.max(0, rawTotal - disc);
    return roundTotal ? Math.round(discounted).toFixed(2) : discounted.toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      showWarning('Please select a customer');
      return;
    }

    const validItems = lineItems.filter(item => item.product_id);
    if (validItems.length === 0) {
      showWarning('Please add at least one product');
      return;
    }

    const totalAmount = parseFloat(calculateGrandTotal());
    const validCharges = additionalCharges.filter(c => (parseFloat(c.amount) || 0) > 0);
    const chargesTotal = calculateChargesTotal();

    let combinedNotes = formData.notes || '';
    if (billDiscount) {
      combinedNotes = `${combinedNotes ? combinedNotes + ' | ' : ''}Special Bill Discount: ₹${billDiscount}`;
    }
    if (validCharges.length > 0) {
      const chargeSummary = validCharges.map(c => `${c.name || 'Expense'}: ₹${c.amount}`).join(', ');
      combinedNotes = `${combinedNotes ? combinedNotes + ' | ' : ''}Charges (${chargeSummary})`;
    }

    // Module 3: Dual-Track Stock Payload
    const payload = {
      ...formData,
      stock_effect_mode: stockEffectMode, // 'BOTH' | 'PHYSICAL_ONLY' | 'VIRTUAL_ONLY'
      total_amount: totalAmount,
      total_sales: totalAmount,
      discount_amount: parseFloat(billDiscount) || 0,
      additional_charges: validCharges,
      shipping_charges: chargesTotal,
      notes: combinedNotes,
      items: validItems.map(i => ({
        product_id: i.product_id,
        qty: parseInt(i.qty, 10) || 1,
        price: parseFloat(i.price) || 0,
        discount: (i.pricing_mode === 'DISCOUNT_ON_MRP' || i.pricing_mode === 'DISCOUNT_ON_SELLING_PRICE') ? (parseFloat(i.margin_percent) || 0) : 0,
        amount: parseFloat(i.amount) || 0,
        tax_rate: parseFloat(i.tax_rate) || 0,
        gst_rate: parseFloat(i.tax_rate) || 0
      })),
      line_items: validItems,
      details: validItems
    };

    try {
      if (isEdit) {
        showWarning("Update functionality coming soon!");
      } else {
        try {
          await api.post('/admin/sales-orders', payload);
        } catch (err1) {
          console.warn('POST /admin/sales-orders failed, trying /admin/sales:', err1);
          await api.post('/admin/sales', payload);
        }
        showSuccess(
          stockEffectMode === 'PHYSICAL_ONLY'
            ? 'Delivery Challan created! Physical floor inventory decremented (Unbilled dispatch).'
            : stockEffectMode === 'VIRTUAL_ONLY'
            ? 'Advance Tax Bill created! Government virtual stock decremented.'
            : 'Official GST Sales Order created! Physical & Virtual stocks updated.',
          'Order Created'
        );
        navigate('/sales');
      }
    } catch (error) {
      console.error('Failed to save sales order:', error);
      showError(error.response?.data?.message || error.response?.data?.error || "Failed to save sales order");
    }
  };

  // Module 3.2: One-Click Delivery Challan to Tax Invoice Conversion
  const handleConvertToTaxInvoice = async () => {
    try {
      setConverting(true);
      try {
        await api.post(`/admin/sales-orders/${id}/convert-to-tax-invoice`);
      } catch (err1) {
        console.warn('POST /admin/sales-orders/:id/convert-to-tax-invoice failed, trying /admin/sales:', err1);
        await api.post(`/admin/sales/${id}/convert-to-tax-invoice`);
      }

      setStockEffectMode('BOTH');
      setFormData(prev => ({ ...prev, stock_effect_mode: 'BOTH' }));
      showSuccess('Delivery Challan converted to official GST Tax Invoice. Virtual stock reconciled.', 'Invoice Converted');
    } catch (err) {
      console.error('Failed to convert challan to tax invoice:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to convert Delivery Challan to Tax Invoice');
    } finally {
      setConverting(false);
    }
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleConfirmCancelOrder = async (reason) => {
    try {
      setCancelLoading(true);
      await api.delete(`/admin/sales/${id}`, {
        data: { reason }
      }).catch(async () => {
        await api.put(`/admin/sales/${id}/cancel`, { reason });
      });
      alert("Order cancelled/deleted successfully");
      setShowCancelModal(false);
      navigate('/sales');
    } catch (error) {
      console.error("Failed to cancel order", error);
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to cancel order");
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading...</div>;

  const totalEstimatedProfit = calculateTotalProfit();

  return (
    <div style={{ padding: '0 0 24px 0', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => navigate('/sales')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#334155',
              fontWeight: '600',
              fontSize: '0.88rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'background-color 0.15s'
            }}
            title="Back to Sales Orders"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            {isEdit ? `Sales Order: ${formData.so_id || id}` : 'Create New Sales Order'}
          </h1>
        </div>
        {isEdit && hasPermission('sales_orders', 'edit') && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
            }}
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* Module 3.2: Delivery Challan to Official GST Tax Invoice Conversion Banner */}
      {stockEffectMode === 'PHYSICAL_ONLY' && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                color: '#b45309'
              }}
            >
              📋
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#92400e', fontSize: '0.98rem' }}>
                This order was dispatched as an unbilled Delivery Challan.
              </div>
              <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '2px' }}>
                Physical floor stock was decremented at the warehouse, but Government Virtual Stock has NOT been billed yet (Excess Ground Gap).
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={converting}
            onClick={handleConvertToTaxInvoice}
            style={{
              padding: '10px 20px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: converting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
              whiteSpace: 'nowrap'
            }}
          >
            <FileCheck2 size={18} />
            <span>{converting ? 'Converting...' : 'Convert to Official GST Tax Invoice'}</span>
          </button>
        </div>
      )}

      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSubmit}>
          {/* Module 3.1: Billing & Stock Mode Selector */}
          <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚖️</span> Billing & Stock Mode Selector *
              </label>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Controls physical floor deduction vs. tax-declared virtual deduction
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {/* Option 1: Official GST Tax Invoice */}
              <div
                onClick={() => !isEdit && setStockEffectMode('BOTH')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: stockEffectMode === 'BOTH' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  backgroundColor: stockEffectMode === 'BOTH' ? '#f0fdf4' : '#ffffff',
                  cursor: isEdit ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="stock_effect_mode"
                  value="BOTH"
                  checked={stockEffectMode === 'BOTH'}
                  onChange={() => setStockEffectMode('BOTH')}
                  disabled={isEdit}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: stockEffectMode === 'BOTH' ? '#166534' : '#0f172a' }}>
                    🧾 1. Official GST Tax Invoice
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                    Decrements <strong>both</strong> Physical Ground Stock and Government Virtual Stock. (Standard Tax Bill)
                  </div>
                </div>
              </div>

              {/* Option 2: Delivery Challan / Gate Pass */}
              <div
                onClick={() => !isEdit && setStockEffectMode('PHYSICAL_ONLY')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: stockEffectMode === 'PHYSICAL_ONLY' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  backgroundColor: stockEffectMode === 'PHYSICAL_ONLY' ? '#fffbeb' : '#ffffff',
                  cursor: isEdit ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="stock_effect_mode"
                  value="PHYSICAL_ONLY"
                  checked={stockEffectMode === 'PHYSICAL_ONLY'}
                  onChange={() => setStockEffectMode('PHYSICAL_ONLY')}
                  disabled={isEdit}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: stockEffectMode === 'PHYSICAL_ONLY' ? '#b45309' : '#0f172a' }}>
                    📋 2. Delivery Challan / Gate Pass
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                    Decrements <strong>only</strong> Physical Ground Stock (unbilled dispatch). Creates an excess ground stock gap.
                  </div>
                </div>
              </div>

              {/* Option 3: Advance Bill Only */}
              <div
                onClick={() => !isEdit && setStockEffectMode('VIRTUAL_ONLY')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: stockEffectMode === 'VIRTUAL_ONLY' ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
                  backgroundColor: stockEffectMode === 'VIRTUAL_ONLY' ? '#f5f3ff' : '#ffffff',
                  cursor: isEdit ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="stock_effect_mode"
                  value="VIRTUAL_ONLY"
                  checked={stockEffectMode === 'VIRTUAL_ONLY'}
                  onChange={() => setStockEffectMode('VIRTUAL_ONLY')}
                  disabled={isEdit}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: stockEffectMode === 'VIRTUAL_ONLY' ? '#6d28d9' : '#0f172a' }}>
                    🏢 3. Advance Bill Only
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                    Decrements <strong>only</strong> Government Virtual Stock before dispatch (advance billing / proforma).
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Header section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem', fontWeight: '600', color: '#334155' }}>
                Customer *
              </label>
              <select
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                value={formData.customer_id}
                onChange={e => handleCustomerChange(e.target.value)}
                required
                disabled={isEdit}
              >
                <option value="">Select Customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : ''} - {c.customer_type || 'Retail'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem', fontWeight: '600', color: '#334155' }}>
                SO Number
              </label>
              <input
                type="text"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#4338ca', fontWeight: '700', fontFamily: 'monospace', outline: 'none' }}
                value={formData.so_id}
                placeholder="Auto-generated (e.g. SO000001)"
                readOnly
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem', fontWeight: '600', color: '#334155' }}>
                Order Date *
              </label>
              <input
                type="date"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                required
                disabled={isEdit}
              >
              </input>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Order Line Items & Pricing Rules
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              💡 Select a product to apply <strong>Offer on Selling Price</strong>, <strong>Profit on Cost</strong> or <strong>Discount on MRP</strong>
            </span>
          </div>

          {/* Quick Guide on Schemes & Offers */}
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong>🏷️ Scheme & Offer Guide:</strong> You can apply <strong>- % Offer on Selling Price</strong>, <strong>- % Discount on MRP</strong>, or <strong>+ % Profit Margin on Purchase Cost</strong> per item. If a product has a saved scheme, click <strong>⚡ Apply</strong> to use it instantly!
            </div>
          </div>

          {/* Line items section */}
          <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', marginBottom: '16px', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#2c3e50', borderBottom: '1px solid #1a252f', color: '#ffffff' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', width: '60px' }}>Sr. No.</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', width: '28%' }}>Product</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', width: '24%' }}>Pricing Rule</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', width: '14%' }}>% & Round-off</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', width: '9%' }}>Qty</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', width: '13%' }}>Billed Rate</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', width: '12%' }}>Total</th>
                  {!isEdit && <th style={{ padding: '12px', width: '40px', textAlign: 'center', verticalAlign: 'middle' }}></th>}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => {
                  const selectedProd = products.find(p => String(p.id) === String(item.product_id));
                  const cost = parseFloat(item.cost_price || selectedProd?.purchase_price || 0);
                  const mrp = parseFloat(item.mrp || selectedProd?.mrp || selectedProd?.selling_price || 0);
                  const billedRate = parseFloat(item.price || 0);
                  const unitProfit = billedRate - cost;
                  const profitPercent = cost > 0 ? ((unitProfit / cost) * 100).toFixed(1) : '0';
                  const isBelowCost = cost > 0 && billedRate < cost;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                      {/* Sr. No. */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                        {idx + 1}
                      </td>

                      {/* Product Selector */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <select
                          style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                          value={item.product_id}
                          onChange={e => handleItemChange(item.id, 'product_id', e.target.value)}
                          disabled={isEdit}
                        >
                          <option value="">Select product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name || p.product_name} {p.sku ? `(${p.sku})` : ''} — In Stock: {p.purchase_quantity || 0}
                            </option>
                          ))}
                        </select>
                        {selectedProd && (
                          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                            <span>MRP: <strong>₹{mrp.toFixed(2)}</strong></span>
                            <span>•</span>
                            <span>Cost: <strong>₹{cost.toFixed(2)}</strong></span>
                            <span>•</span>
                            <span>Std Sell: <strong>₹{parseFloat(selectedProd.selling_price || 0).toFixed(2)}</strong></span>
                          </div>
                        )}
                        {selectedProd && (selectedProd.product_pe_product || selectedProd.discount_on_product || selectedProd.product_target_scheme) && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
                            {selectedProd.product_pe_product && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span 
                                  style={{ 
                                    fontSize: '0.72rem', 
                                    backgroundColor: item.applied_deal === 'SCHEME' ? '#e0e7ff' : '#f1f5f9', 
                                    color: item.applied_deal === 'SCHEME' ? '#3730a3' : '#475569', 
                                    border: item.applied_deal === 'SCHEME' ? '1px solid #6366f1' : '1px solid #cbd5e1',
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontWeight: '600' 
                                  }} 
                                  title="Product Scheme: Buy X Get Y Free"
                                >
                                  🎁 {selectedProd.product_pe_product}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => applyBogoScheme(item.id, selectedProd)}
                                  style={{
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #4338ca',
                                    backgroundColor: item.applied_deal === 'SCHEME' ? '#4338ca' : '#ffffff',
                                    color: item.applied_deal === 'SCHEME' ? '#ffffff' : '#4338ca',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s ease-in-out'
                                  }}
                                  title={item.applied_deal === 'SCHEME' ? 'Click to unapply scheme and revert to standard price' : `Click to apply ${selectedProd.product_pe_product} scheme discount`}
                                >
                                  {item.applied_deal === 'SCHEME' ? '✓ Applied (✕ Remove)' : '⚡ Apply Scheme'}
                                </button>
                              </div>
                            )}
                            {selectedProd.discount_on_product && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span 
                                  style={{ 
                                    fontSize: '0.72rem', 
                                    backgroundColor: item.applied_deal === 'OFFER' ? '#dcfce7' : '#f1f5f9', 
                                    color: item.applied_deal === 'OFFER' ? '#15803d' : '#475569', 
                                    border: item.applied_deal === 'OFFER' ? '1px solid #22c55e' : '1px solid #cbd5e1',
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontWeight: '600' 
                                  }} 
                                  title="Configured Product Offer/Discount"
                                >
                                  🏷️ {selectedProd.discount_on_product}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => applyProductOffer(item.id, selectedProd)}
                                  style={{
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #16a34a',
                                    backgroundColor: item.applied_deal === 'OFFER' ? '#16a34a' : '#ffffff',
                                    color: item.applied_deal === 'OFFER' ? '#ffffff' : '#16a34a',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s ease-in-out'
                                  }}
                                  title={item.applied_deal === 'OFFER' ? 'Click to unapply offer and revert to standard price' : `Click to apply ${selectedProd.discount_on_product} offer discount`}
                                >
                                  {item.applied_deal === 'OFFER' ? '✓ Applied (✕ Remove)' : '⚡ Apply Offer'}
                                </button>
                              </div>
                            )}
                            {selectedProd.product_target_scheme && (
                              <span style={{ fontSize: '0.72rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }} title="Target Scheme">
                                🎯 {selectedProd.product_target_scheme}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Pricing Mode Selector */}
                      <td style={{ padding: '12px 14px' }}>
                        <select
                          style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', backgroundColor: '#f8fafc' }}
                          value={item.pricing_mode}
                          onChange={e => handleItemChange(item.id, 'pricing_mode', e.target.value)}
                          disabled={isEdit || !item.product_id}
                        >
                          <option value="STANDARD">Standard Sell Price (₹{parseFloat(item.selling_price || 0).toFixed(2)})</option>
                          <option value="DISCOUNT_ON_SELLING_PRICE">🏷️ - % Offer on Selling Price (₹{parseFloat(item.selling_price || 0).toFixed(2)})</option>
                          <option value="DISCOUNT_ON_MRP">🏷️ - % Discount on MRP (₹{mrp.toFixed(2)})</option>
                          <option value="PROFIT_ON_COST">💰 + % Profit on Cost (Cost: ₹{cost.toFixed(2)})</option>
                          <option value="MANUAL">✍️ Manual Custom Price</option>
                        </select>

                        {/* Active Rule Description */}
                        <div style={{ marginTop: '5px', fontSize: '0.74rem', color: '#6366f1' }}>
                          {item.pricing_mode === 'DISCOUNT_ON_SELLING_PRICE' && 'Offer % subtracted from Catalog Selling Price'}
                          {item.pricing_mode === 'DISCOUNT_ON_MRP' && 'Discount % subtracted from MRP'}
                          {item.pricing_mode === 'PROFIT_ON_COST' && 'Profit margin % added to Purchase Cost'}
                          {item.pricing_mode === 'STANDARD' && 'Using catalog standard selling price'}
                          {item.pricing_mode === 'MANUAL' && 'Custom rate typed manually'}
                        </div>
                      </td>

                      {/* Percentage Input & Round Off Toggle */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {(item.pricing_mode === 'DISCOUNT_ON_SELLING_PRICE' || item.pricing_mode === 'DISCOUNT_ON_MRP' || item.pricing_mode === 'PROFIT_ON_COST') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{ position: 'relative', width: '90px' }}>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0.0"
                                style={{ width: '100%', padding: '7px 22px 7px 10px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                                value={item.margin_percent}
                                onChange={e => handleItemChange(item.id, 'margin_percent', e.target.value)}
                                disabled={isEdit}
                              />
                              <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', color: '#94a3b8' }}>%</span>
                            </div>

                            {/* Round Off Toggle button */}
                            <button
                              type="button"
                              onClick={() => handleItemChange(item.id, 'round_off', !item.round_off)}
                              disabled={isEdit}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: '1px solid ' + (item.round_off ? '#10b981' : '#cbd5e1'),
                                backgroundColor: item.round_off ? '#dcfce7' : '#f1f5f9',
                                color: item.round_off ? '#15803d' : '#64748b',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Toggle rounding to nearest Rupee"
                            >
                              {item.round_off ? '✓ Round: YES' : 'Round: NO'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          style={{ width: '65px', padding: '9px 8px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                          value={item.qty}
                          onChange={e => handleItemChange(item.id, 'qty', e.target.value)}
                          onFocus={e => e.target.select()}
                          onBlur={() => {
                            if (!item.qty || parseInt(item.qty, 10) < 1) {
                              handleItemChange(item.id, 'qty', 1);
                            }
                          }}
                          disabled={isEdit}
                        />
                      </td>

                      {/* Billed Rate & Profit Margin Badge */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}>₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            style={{
                              width: '105px',
                              padding: '9px 10px 9px 24px',
                              textAlign: 'right',
                              border: isBelowCost ? '2px solid #ef4444' : '1px solid #cbd5e1',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              color: isBelowCost ? '#b91c1c' : '#0f172a',
                              backgroundColor: item.pricing_mode === 'MANUAL' ? '#ffffff' : '#f8fafc',
                              outline: 'none'
                            }}
                            value={item.price}
                            onChange={e => handleItemChange(item.id, 'price', e.target.value)}
                            onFocus={e => e.target.select()}
                            disabled={isEdit}
                          />
                        </div>

                        {/* Unit Profit Badge or Below-Cost Warning */}
                        {item.product_id && cost > 0 && (
                          <div style={{ marginTop: '5px' }}>
                            {isBelowCost ? (
                              <span style={{ fontSize: '0.72rem', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle size={11} /> Below Cost! (Loss: ₹{Math.abs(unitProfit).toFixed(2)})
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                +₹{unitProfit.toFixed(2)} ({profitPercent}%)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>
                        ₹{parseFloat(item.amount || 0).toFixed(2)}
                      </td>

                      {/* Remove Row */}
                      {!isEdit && (
                        <td style={{ padding: '12px 4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                            title="Remove line"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!isEdit && (
              <button
                type="button"
                onClick={addLineItem}
                style={{
                  backgroundColor: '#f8fafc',
                  color: '#4338ca',
                  border: '1px dashed #cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  transition: 'background-color 0.15s'
                }}
              >
                <Plus size={16} style={{ marginRight: '6px' }} /> Add Product Row
              </button>
            )}
          </div>

          {/* Footer totals & Profit Preview */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '2px solid #f1f5f9', paddingTop: '20px', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            {/* Admin Profit Insights Card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', maxWidth: '380px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                <TrendingUp size={16} color="#4338ca" />
                <span>Admin Profit Preview</span>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: '1.4' }}>
                Total Estimated Profit on this sale:
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: totalEstimatedProfit >= 0 ? '#15803d' : '#b91c1c', marginTop: '4px' }}>
                {totalEstimatedProfit >= 0 ? `+₹${totalEstimatedProfit.toFixed(2)}` : `-₹${Math.abs(totalEstimatedProfit).toFixed(2)}`}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                * Visible to admin only. Not printed on customer invoices.
              </div>
            </div>

            {/* Billing Summary & Round Off */}
            <div style={{ width: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.92rem', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>₹{calculateSubtotal().toFixed(2)}</span>
              </div>

              {/* Additional Charges / Freight Section */}
              <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: additionalCharges.length > 0 ? '8px' : '4px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🚚</span> Extra Charges / Freight:
                  </span>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={handleAddCharge}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: '#eef2ff',
                        color: '#4338ca',
                        border: '1px solid #c7d2fe',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>

                {additionalCharges.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    No extra charges (freight, loading, etc.)
                  </div>
                ) : (
                  additionalCharges.map(charge => (
                    <div key={charge.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                      <select
                        value={charge.expense_id}
                        disabled={isEdit}
                        onChange={(e) => handleChargeChange(charge.id, 'expense_id', e.target.value)}
                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                      >
                        <option value="">Select Expense Head</option>
                        {expenseHeads.map(eh => (
                          <option key={eh.id} value={eh.id}>
                            {eh.name} ({eh.category || 'General'})
                          </option>
                        ))}
                      </select>
                      <div style={{ position: 'relative', width: '80px' }}>
                        <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          disabled={isEdit}
                          value={charge.amount}
                          onChange={(e) => handleChargeChange(charge.id, 'amount', e.target.value)}
                          style={{ width: '100%', padding: '4px 4px 4px 18px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                        />
                      </div>
                      {!isEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCharge(charge.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          title="Remove Charge"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}

                {additionalCharges.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4338ca', fontWeight: '600', marginTop: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                    <span>Charges Total:</span>
                    <span>+₹{calculateChargesTotal().toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Bill-Wise Discount Input */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.92rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🏷️</span> Bill Discount:
                </span>
                <div style={{ position: 'relative', width: '120px' }}>
                  <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.82rem' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0.00"
                    disabled={isEdit}
                    value={billDiscount}
                    onChange={(e) => setBillDiscount(e.target.value)}
                    style={{ width: '100%', padding: '5px 8px 5px 22px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'right', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Invoice Round Off Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600' }}>
                  Round Off Grand Total?
                </span>
                <button
                  type="button"
                  onClick={() => setRoundTotal(!roundTotal)}
                  disabled={isEdit}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: roundTotal ? '#10b981' : '#cbd5e1',
                    color: roundTotal ? '#ffffff' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {roundTotal ? 'YES' : 'NO'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                <span>Grand Total:</span>
                <span style={{ color: '#4338ca' }}>₹{calculateGrandTotal()}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!isEdit && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => navigate('/sales')}
                style={{
                  padding: '11px 22px',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#64748b',
                  fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '11px 26px',
                  backgroundColor: '#4338ca',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 4px rgba(67, 56, 202, 0.25)'
                }}
              >
                <Save size={18} />
                <span>Save Sales Order</span>
              </button>
            </div>
          )}
        </form>
      </div>

      <DeleteConfirmationModal
        isOpen={showCancelModal}
        title="Cancel Sales Order"
        itemName={`Sales Order "${formData.so_id || id}"`}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancelOrder}
        isLoading={cancelLoading}
      />
    </div>
  );
};

export default SalesOrderForm;
