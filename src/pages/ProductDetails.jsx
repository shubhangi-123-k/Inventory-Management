import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Save, Plus, Trash2, FileDown, FileSpreadsheet, X, Upload, Loader2, Image as ImageIcon, Layers, Box, QrCode, Sparkles, CheckCircle2, Building2, Gift, Receipt, Tag, Info, AlertTriangle } from 'lucide-react';
import AttributeBuilder from '../components/AttributeBuilder';
import PhotoUploader from '../components/PhotoUploader';
import SuggestionInput from '../components/SuggestionInput';
import AddOccasionModal from '../components/AddOccasionModal';
import BarcodeUploader from '../components/BarcodeUploader';
import VideoUploader from '../components/VideoUploader';
import BrochureUploader from '../components/BrochureUploader';
import OccasionSelector from '../components/OccasionSelector';
import ProductSchemesManager from '../components/ProductSchemesManager';
import VariantMatrixBuilder from '../components/VariantMatrixBuilder';
import PackagingModal from '../components/PackagingModal';
import QRCodeSVG from '../components/QRCodeSVG';
import { downloadProductBrochurePDF, downloadProductDetailsExcel } from '../utils/productExport';
import { extractCompanyMedia } from '../utils/mediaUtils';

const DEFAULT_PRODUCT_TYPES = [
  { id: 1, name: 'Goods', type_name: 'Goods', description: 'Physical stock tracked in warehouses with batches and reorder levels.', status: 'Active' },
  { id: 2, name: 'Service', type_name: 'Service', description: 'Non-physical billable services (no warehouse stock tracking).', status: 'Active' },
  { id: 3, name: 'Combo', type_name: 'Combo', description: 'Composite kit/bundle made of multiple items.', status: 'Active' },
  { id: 4, name: 'Consumable', type_name: 'Consumable', description: 'Internally consumed items (tape, packaging boxes) not tracked for resale.', status: 'Active' }
];

const DEFAULT_EXPENSES = [
  { id: 1, name: 'Packaging Charges', description: 'Boxes, bubble wrap, polybags, branding wrappers and packing labor.', status: 'Active' },
  { id: 2, name: 'Making Charges', description: 'Artisan, craftsmanship, assembly or manufacturing making charges.', status: 'Active' },
  { id: 3, name: 'Handling Charges', description: 'Dock handling, sorting, palletizing and warehouse staging charges.', status: 'Active' },
  { id: 4, name: 'Freight Inward', description: 'Inbound shipping and freight cost added to item landed valuation.', status: 'Active' },
  { id: 5, name: 'Loading Charges', description: 'Charges incurred for loading inventory into transit vehicles.', status: 'Active' },
  { id: 6, name: 'Unloading Charges', description: 'Charges for unloading consignments at receiving docks.', status: 'Active' },
  { id: 7, name: 'Labour & Coolie Charges', description: 'Manual warehouse handling and labour wages.', status: 'Active' },
  { id: 8, name: 'Fuel & Vehicle Expenses', description: 'Transportation fuel and commercial fleet vehicle running costs.', status: 'Active' },
  { id: 9, name: 'Electricity & Utilities', description: 'Facility electricity, water, and power backup costs.', status: 'Active' }
];

const DEFAULT_ALIASES = [
  { id: 1, name: 'Biological Name', description: 'Botanical, herbal or taxonomic nomenclature (e.g. Mangifera indica).', status: 'Active' },
  { id: 2, name: 'Local Name', description: 'Regional language, vernacular or marketplace name (e.g. Hapus).', status: 'Active' },
  { id: 3, name: 'Scientific Name', description: 'Chemical formula or Latin scientific classification (e.g. Sodium Chloride).', status: 'Active' },
  { id: 4, name: 'Trade Name', description: 'Commercial brand, wholesale label or market trade title.', status: 'Active' },
  { id: 5, name: 'Billing Name', description: 'Concise abbreviated name printed on POS receipts and invoices.', status: 'Active' }
];

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isReadOnly = location.state?.readOnly !== false;

  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [productAliases, setProductAliases] = useState([{ alias_type_id: '', alias_type_name: '', alias_name: '' }]);
  const [showAddAliasTypeModal, setShowAddAliasTypeModal] = useState(false);
  const [newAliasTypeName, setNewAliasTypeName] = useState('');
  const [newAliasTypeDesc, setNewAliasTypeDesc] = useState('');
  const [isSubmittingAliasType, setIsSubmittingAliasType] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [modalExpenseName, setModalExpenseName] = useState('');
  const [modalExpenseDesc, setModalExpenseDesc] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [hasVariants, setHasVariants] = useState('No');
  const [variantAttributes, setVariantAttributes] = useState([]);
  const [productVariants, setProductVariants] = useState([]);

  // Occasion States
  const [isOccasionBased, setIsOccasionBased] = useState('No');
  const [selectedOccasionType, setSelectedOccasionType] = useState('');
  const [selectedOccasionIds, setSelectedOccasionIds] = useState([]);
  const [occasionsList, setOccasionsList] = useState([]);
  const [occasionTypes, setOccasionTypes] = useState(['Festival', 'Season', 'Event', 'Other']);
  const [showAddOccasionModal, setShowAddOccasionModal] = useState(false);

  // Measurement Units
  const [dimensionUnit, setDimensionUnit] = useState('cm');
  const [customDimensionUnit, setCustomDimensionUnit] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('ml');
  const [customVolumeUnit, setCustomVolumeUnit] = useState('');
  const [weightUnit, setWeightUnit] = useState('g');
  const [customWeightUnit, setCustomWeightUnit] = useState('');

  // Reorder Strategy States
  const [reorderStrategy, setReorderStrategy] = useState('FIXED_THRESHOLD');
  const [expiryAlertHorizonDays, setExpiryAlertHorizonDays] = useState('30');
  const [minShelfLifePercent, setMinShelfLifePercent] = useState('70');
  const [velocityLookbackDays, setVelocityLookbackDays] = useState('30');

  const handleAddAlias = () => {
    setProductAliases(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { alias_type_id: '', alias_type_name: '', alias_name: '' }
    ]);
  };

  const handleUpdateAlias = (index, field, value) => {
    setProductAliases(prev => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      if (!copy[index]) copy[index] = { alias_type_id: '', alias_type_name: '', alias_name: '' };
      if (typeof copy[index] === 'string') {
        copy[index] = { alias_type_id: '', alias_type_name: '', alias_name: copy[index] };
      }

      if (field === 'alias_type_id') {
        const found = catalogAliases.find(a => String(a.id) === String(value));
        copy[index] = {
          ...copy[index],
          alias_type_id: value,
          alias_type_name: found ? found.name : ''
        };
      } else if (field === 'alias_name') {
        copy[index] = {
          ...copy[index],
          alias_name: value
        };
      }

      setProduct(p => ({
        ...p,
        alias_type_id: copy[0]?.alias_type_id ? parseInt(copy[0].alias_type_id, 10) : null,
        alias_type_name: copy[0]?.alias_type_name || null,
        product_alias: copy.map(a => (typeof a === 'object' ? a.alias_name : a)).filter(Boolean).join(', ') || null,
        product_aliases: copy.map(a => (typeof a === 'object' ? a.alias_name : a)).filter(Boolean),
        aliases: copy.filter(a => ((typeof a === 'object' ? a.alias_name : a) || '').trim() !== '')
      }));

      return copy;
    });
  };

  const handleAliasChange = (index, value) => {
    handleUpdateAlias(index, 'alias_name', value);
  };

  const handleRemoveAlias = (index) => {
    setProductAliases(prev => {
      const filtered = (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index);
      const res = filtered.length > 0 ? filtered : [{ alias_type_id: '', alias_type_name: '', alias_name: '' }];
      setProduct(p => ({
        ...p,
        alias_type_id: res[0]?.alias_type_id ? parseInt(res[0].alias_type_id, 10) : null,
        alias_type_name: res[0]?.alias_type_name || null,
        product_alias: res.map(a => (typeof a === 'object' ? a.alias_name : a)).filter(Boolean).join(', ') || null,
        product_aliases: res.map(a => (typeof a === 'object' ? a.alias_name : a)).filter(Boolean),
        aliases: res.filter(a => ((typeof a === 'object' ? a.alias_name : a) || '').trim() !== '')
      }));
      return res;
    });
  };

  const handleCreateAliasType = async (e) => {
    e.preventDefault();
    if (!newAliasTypeName.trim()) return;
    setIsSubmittingAliasType(true);
    try {
      const payload = {
        name: newAliasTypeName.trim(),
        description: newAliasTypeDesc.trim() || null,
        status: 'Active'
      };
      const res = await api.post('/admin/aliases', payload).catch(() => api.post('/aliases', payload));
      const created = res.data?.data || res.data || {
        id: Math.floor(Math.random() * 1000000),
        name: newAliasTypeName.trim(),
        description: newAliasTypeDesc.trim() || null,
        status: 'Active'
      };

      setCatalogAliases(prev => {
        if (prev.some(a => String(a.id) === String(created.id) || a.name?.toLowerCase() === created.name?.toLowerCase())) {
          return prev;
        }
        return [...prev, created];
      });

      setProductAliases(prev => {
        const copy = Array.isArray(prev) ? [...prev] : [];
        const targetIdx = copy.findIndex(a => !a.alias_type_id);
        if (targetIdx !== -1) {
          copy[targetIdx] = {
            ...copy[targetIdx],
            alias_type_id: String(created.id),
            alias_type_name: created.name
          };
        } else if (copy.length === 1 && !copy[0].alias_type_id) {
          copy[0] = {
            ...copy[0],
            alias_type_id: String(created.id),
            alias_type_name: created.name
          };
        }
        return copy;
      });

      setNewAliasTypeName('');
      setNewAliasTypeDesc('');
      setShowAddAliasTypeModal(false);
    } catch (err) {
      console.error("Failed to create alias type:", err);
      alert(err.response?.data?.message || "Failed to create alias type");
    } finally {
      setIsSubmittingAliasType(false);
    }
  };

  const handleCreateExpenseMaster = async (e) => {
    if (e) e.preventDefault();
    const trimmed = modalExpenseName.trim();
    if (!trimmed) {
      alert("Expense Head Name is required.");
      return;
    }
    try {
      setIsSubmittingExpense(true);
      const res = await api.post('/admin/expenses', {
        name: trimmed,
        description: modalExpenseDesc.trim() || null,
        status: 'Active'
      });
      const created = res.data?.data || res.data;

      // Add to expensesList
      setExpensesList(prev => {
        const exists = prev.some(item => item.id === created.id || item.name?.toLowerCase() === created.name?.toLowerCase());
        if (exists) return prev;
        return [...prev, created];
      });

      // Auto-attach or auto-select into current attachedExpenses
      setAttachedExpenses(prev => {
        if (!Array.isArray(prev) || prev.length === 0) {
          return [{
            expense_id: String(created.id),
            expense_name: created.name,
            amount: '',
            note: ''
          }];
        }
        const emptyIdx = prev.findIndex(row => !row.expense_id);
        if (emptyIdx !== -1) {
          const copy = [...prev];
          copy[emptyIdx] = {
            ...copy[emptyIdx],
            expense_id: String(created.id),
            expense_name: created.name
          };
          return copy;
        }
        return [
          ...prev,
          {
            expense_id: String(created.id),
            expense_name: created.name,
            amount: '',
            note: ''
          }
        ];
      });

      setModalExpenseName('');
      setModalExpenseDesc('');
      setShowAddExpenseModal(false);
    } catch (err) {
      console.error("Failed to create expense head:", err);
      alert(err.response?.data?.message || "Failed to create expense head");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const [groups, setGroups] = useState([]);
  const [brands, setBrands] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [productStorageLocations, setProductStorageLocations] = useState([]);
  const [activeDetailsAddModal, setActiveDetailsAddModal] = useState(null); // 'rack' | 'shelf' | 'bin' | null
  const [newDetailsRackInput, setNewDetailsRackInput] = useState('');
  const [newDetailsShelfInput, setNewDetailsShelfInput] = useState('');
  const [newDetailsBinInput, setNewDetailsBinInput] = useState('');
  const [isSubmittingDetailsCoordinate, setIsSubmittingDetailsCoordinate] = useState(false);
  const [productTypesList, setProductTypesList] = useState(DEFAULT_PRODUCT_TYPES);
  const [catalogAliases, setCatalogAliases] = useState(DEFAULT_ALIASES);
  const [expensesList, setExpensesList] = useState(DEFAULT_EXPENSES);
  const [productTypes, setProductTypes] = useState(["Goods", "Service", "Combo", "Consumable"]);

  const isServiceType = useMemo(() => {
    const itemType = (product?.item_type || product?.product_type || '').toLowerCase();
    if (itemType === 'service') return true;
    const found = productTypesList.find(t =>
      (product?.product_type_id && Number(t.id) === Number(product.product_type_id)) ||
      t.name?.toLowerCase() === itemType ||
      t.code?.toLowerCase() === itemType
    );
    if (found && (found.name?.toLowerCase() === 'service' || found.tracks_inventory === false || found.tracks_inventory === 0 || found.tracks_inventory === 'false')) {
      return true;
    }
    return false;
  }, [product?.product_type_id, product?.item_type, product?.product_type, productTypesList]);

  const [attachedExpenses, setAttachedExpenses] = useState([]);

  // Total attached operational expenses calculation from multi-row attached expenses & product.expense_amount
  const totalAttachedExpense = useMemo(() => {
    const listSum = attachedExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const legacyAmt = (attachedExpenses.length === 0 && product?.expense_amount) ? (parseFloat(product?.expense_amount) || 0) : 0;
    return parseFloat((listSum + legacyAmt).toFixed(2));
  }, [attachedExpenses, product?.expense_amount]);

  // Fetch Storage Locations whenever warehouse changes
  useEffect(() => {
    const whId = product?.default_warehouse_id || warehouses.find(w => w.name === product?.warehouse_location)?.id;
    if (!whId) {
      setProductStorageLocations([]);
      return;
    }
    let isMounted = true;
    api.get(`/admin/storage-locations?warehouse_id=${whId}`)
      .then(res => {
        if (isMounted) {
          setProductStorageLocations(res.data?.data || []);
        }
      })
      .catch(err => console.error('Error fetching storage locations in ProductDetails:', err));

    return () => { isMounted = false; };
  }, [product?.default_warehouse_id, product?.warehouse_location, warehouses]);

  const availableProductRacks = useMemo(() => {
    const list = productStorageLocations.map(l => (l.rack_number || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [productStorageLocations]);

  const availableProductShelves = useMemo(() => {
    if (!product?.rack_number) return [];
    const list = productStorageLocations
      .filter(l => (l.rack_number || '').trim().toLowerCase() === String(product.rack_number).trim().toLowerCase())
      .map(l => (l.shelf_number || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [productStorageLocations, product?.rack_number]);

  const availableProductBins = useMemo(() => {
    if (!product?.rack_number || !product?.shelf_number) return [];
    const list = productStorageLocations
      .filter(l =>
        (l.rack_number || '').trim().toLowerCase() === String(product.rack_number).trim().toLowerCase() &&
        (l.shelf_number || '').trim().toLowerCase() === String(product.shelf_number).trim().toLowerCase()
      )
      .map(l => (l.bin_location || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [productStorageLocations, product?.rack_number, product?.shelf_number]);

  const handleOpenDetailsAddCoordinateModal = (type) => {
    const whId = product?.default_warehouse_id || warehouses.find(w => w.name === product?.warehouse_location)?.id;
    if (!whId) {
      alert('Please select a Warehouse first.');
      return;
    }
    if (type === 'shelf' && !product?.rack_number) {
      alert('Please select or add a Rack first.');
      return;
    }
    if (type === 'bin' && !product?.shelf_number) {
      alert('Please select or add a Shelf first.');
      return;
    }
    setNewDetailsRackInput('');
    setNewDetailsShelfInput('');
    setNewDetailsBinInput('');
    setActiveDetailsAddModal(type);
  };

  const handleSaveDetailsCoordinate = async (e) => {
    e.preventDefault();
    const whId = product?.default_warehouse_id || warehouses.find(w => w.name === product?.warehouse_location)?.id;
    if (!whId) return;

    try {
      setIsSubmittingDetailsCoordinate(true);
      let targetRack = product?.rack_number || '';
      let targetShelf = product?.shelf_number || '';
      let targetBin = product?.bin_location || '';

      if (activeDetailsAddModal === 'rack') {
        if (!newDetailsRackInput.trim()) {
          alert('Rack Name is required');
          return;
        }
        targetRack = newDetailsRackInput.trim();
        targetShelf = '';
        targetBin = '';
      } else if (activeDetailsAddModal === 'shelf') {
        if (!newDetailsShelfInput.trim()) {
          alert('Shelf Name is required');
          return;
        }
        targetShelf = newDetailsShelfInput.trim();
        targetBin = '';
      } else if (activeDetailsAddModal === 'bin') {
        if (!newDetailsBinInput.trim()) {
          alert('Bin Name is required');
          return;
        }
        targetBin = newDetailsBinInput.trim();
      }

      try {
        await api.post('/admin/storage-locations', {
          warehouse_id: Number(whId),
          rack_number: targetRack,
          shelf_number: targetShelf,
          bin_location: targetBin
        });
      } catch (err) {
        if (err.response?.status !== 409) {
          throw err;
        }
      }

      // Refresh locations
      const refreshRes = await api.get(`/admin/storage-locations?warehouse_id=${whId}`);
      setProductStorageLocations(refreshRes.data?.data || []);

      if (activeDetailsAddModal === 'rack') {
        setProduct(p => ({ ...p, rack_number: targetRack, shelf_number: '', bin_location: '' }));
      } else if (activeDetailsAddModal === 'shelf') {
        setProduct(p => ({ ...p, shelf_number: targetShelf, bin_location: '' }));
      } else if (activeDetailsAddModal === 'bin') {
        setProduct(p => ({ ...p, bin_location: targetBin }));
      }

      setActiveDetailsAddModal(null);
    } catch (err) {
      console.error('Failed to save coordinate:', err);
      alert(err.response?.data?.message || 'Failed to add coordinate');
    } finally {
      setIsSubmittingDetailsCoordinate(false);
    }
  };
  const landedPurchaseCost = useMemo(() => {
    const p = parseFloat(product?.purchase_price) || 0;
    return parseFloat((p + totalAttachedExpense).toFixed(2));
  }, [product?.purchase_price, totalAttachedExpense]);

  const handleAddAttachedExpense = (presetName = '', defaultAmount = '') => {
    const matched = expensesList.find(e => e.name?.toLowerCase() === presetName?.toLowerCase());
    setAttachedExpenses(prev => [
      ...prev,
      {
        expense_id: matched ? String(matched.id) : '',
        expense_name: matched ? matched.name : presetName,
        amount: defaultAmount,
        note: ''
      }
    ]);
  };

  const handleUpdateAttachedExpense = (index, field, value) => {
    setAttachedExpenses(prev => {
      const updated = [...prev];
      if (field === 'expense_id') {
        const found = expensesList.find(e => String(e.id) === String(value));
        updated[index] = {
          ...updated[index],
          expense_id: value,
          expense_name: found ? found.name : ''
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value
        };
      }
      return updated;
    });
  };

  const handleRemoveAttachedExpense = (index) => {
    setAttachedExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const [pricingMethod, setPricingMethod] = useState('PROFIT_ON_COST');
  const [profitOnCostPercent, setProfitOnCostPercent] = useState('');
  const [discountOnMrpPercent, setDiscountOnMrpPercent] = useState('');
  const [baseSellingPrice, setBaseSellingPrice] = useState('');
  const [discountOnSellingPricePercent, setDiscountOnSellingPricePercent] = useState('');
  const [roundOff, setRoundOff] = useState(false);
  const [costingMethod, setCostingMethod] = useState('FIFO');

  // Auto-calculate selling price based on profit % on cost, discount % on MRP, or offer % on selling price with round off
  useEffect(() => {
    if (!product || pricingMethod === 'MANUAL') return;

    let computed = null;
    if (pricingMethod === 'PROFIT_ON_COST') {
      const cost = landedPurchaseCost;
      const pct = parseFloat(profitOnCostPercent) || 0;
      if (cost > 0 && pct > 0) {
        computed = cost * (1 + (pct / 100));
      }
    } else if (pricingMethod === 'DISCOUNT_ON_MRP') {
      const mrpVal = parseFloat(product?.mrp) || 0;
      const pct = parseFloat(discountOnMrpPercent) || 0;
      if (mrpVal > 0 && pct > 0) {
        computed = mrpVal * (1 - (pct / 100));
      }
    } else if (pricingMethod === 'DISCOUNT_ON_SELLING_PRICE') {
      const baseVal = parseFloat(baseSellingPrice || product?.mrp || product?.selling_price) || 0;
      const pct = parseFloat(discountOnSellingPricePercent) || 0;
      if (baseVal > 0 && pct > 0) {
        computed = baseVal * (1 - (pct / 100));
      }
    }

    if (computed !== null) {
      const finalPrice = roundOff ? Math.round(computed) : parseFloat(computed.toFixed(2));
      setProduct(prev => ({ ...prev, selling_price: finalPrice.toString() }));
    }
  }, [landedPurchaseCost, product?.mrp, baseSellingPrice, profitOnCostPercent, discountOnMrpPercent, discountOnSellingPricePercent, roundOff, pricingMethod]);

  // Custom Modal States
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [modalGroupName, setModalGroupName] = useState('');
  const [modalGroupDesc, setModalGroupDesc] = useState('');
  const [modalGroupImages, setModalGroupImages] = useState([]);

  const [companyName, setCompanyName] = useState('');
  const [companies, setCompanies] = useState([]);
  const [companyBrochure, setCompanyBrochure] = useState({ url: '', name: '' });
  const [companyInheritedMedia, setCompanyInheritedMedia] = useState(null);
  const [companyInheritedSchemes, setCompanyInheritedSchemes] = useState(null);
  const [isInheritingMedia, setIsInheritingMedia] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [modalCompanyName, setModalCompanyName] = useState('');
  const [modalCompanyDesc, setModalCompanyDesc] = useState('');
  const [modalCompanyScheme, setModalCompanyScheme] = useState('');
  const [modalCompanyOffer, setModalCompanyOffer] = useState('');
  const [modalCompanyMargin, setModalCompanyMargin] = useState('');
  const [modalCompanyDistributor, setModalCompanyDistributor] = useState('');
  const [modalCompanyOfficers, setModalCompanyOfficers] = useState(['']);
  const [modalCompanyBrochures, setModalCompanyBrochures] = useState([]);
  const [modalBrandName, setModalBrandName] = useState('');
  const [modalBrandDesc, setModalBrandDesc] = useState('');
  const [modalBrandScheme, setModalBrandScheme] = useState('');
  const [modalBrandOffer, setModalBrandOffer] = useState('');
  const [modalBrandMargin, setModalBrandMargin] = useState('');
  const [modalBrandDistributor, setModalBrandDistributor] = useState('');
  const [modalBrandOfficer, setModalBrandOfficer] = useState('');

  const fetchOccasions = async () => {
    try {
      const [occRes, typesRes] = await Promise.all([
        api.get('/admin/occasions'),
        api.get('/admin/occasions/types')
      ]);
      setOccasionsList(occRes.data?.data || occRes.data || []);
      if (typesRes.data?.data) {
        setOccasionTypes(typesRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch occasions in ProductDetails:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      fetchOccasions();
      const [prodRes, groupsRes, brandsRes, companiesRes, typesRes, aliasesRes, expensesRes] = await Promise.all([
        api.get(`/admin/products/${id}`),
        api.get('/admin/groups'),
        api.get('/admin/brands'),
        api.get('/admin/companies'),
        api.get('/admin/product-types?status=Active').catch(() => ({ data: { data: [] } })),
        api.get('/admin/aliases?status=Active').catch(() => ({ data: { data: [] } })),
        api.get('/admin/expenses?status=Active').catch(() => ({ data: { data: [] } }))
      ]);

      const tData = typesRes.data?.data || typesRes.data || [];
      if (Array.isArray(tData) && tData.length > 0) {
        const mappedTypes = tData.map(t => ({
          ...t,
          name: t.name || t.type_name || ''
        }));
        setProductTypesList(mappedTypes);
        setProductTypes(mappedTypes.map(t => t.name).filter(Boolean));
      }

      const aData = aliasesRes.data?.data || aliasesRes.data || [];
      if (Array.isArray(aData) && aData.length > 0) {
        setCatalogAliases(aData);
      }

      const eData = expensesRes.data?.data || expensesRes.data || [];
      if (Array.isArray(eData) && eData.length > 0) {
        setExpensesList(eData);
      }

      const prod = prodRes.data?.data || prodRes.data;
      const loadedBrandsRaw = brandsRes.data?.data || brandsRes.data || [];
      const loadedCompaniesRaw = companiesRes.data?.data || companiesRes.data || [];
      const loadedGroupsRaw = groupsRes.data?.data || groupsRes.data || [];
      const loadedBrands = Array.isArray(loadedBrandsRaw) ? [...loadedBrandsRaw] : [];
      const loadedCompanies = Array.isArray(loadedCompaniesRaw) ? [...loadedCompaniesRaw] : [];
      const loadedGroups = Array.isArray(loadedGroupsRaw) ? loadedGroupsRaw : [];
      const savedBrandId = prod.brand_id || prod.brand?.id || '';
      let savedBrand = loadedBrands.find(b => String(b.id) === String(savedBrandId));
      if (!savedBrand && prod.brand) {
        savedBrand = { ...prod.brand, id: savedBrandId };
        loadedBrands.push(savedBrand);
      }
      const savedCompany = loadedCompanies.find(c =>
        String(c.id) === String(prod.company_id || prod.company?.id || '') ||
        String(c.name || c.company_name || '').toLowerCase() === String(prod.company_name || prod.company?.name || '').toLowerCase()
      );
      const savedCompanyName = prod.company_name || prod.company?.name || '';
      const savedCompanyId = prod.company_id || prod.company?.id || savedCompany?.id || null;
      if (savedCompanyName && !loadedCompanies.some(c => String(c.name || c.company_name || '').toLowerCase() === savedCompanyName.toLowerCase())) {
        loadedCompanies.push({ ...(prod.company || {}), id: savedCompanyId || `saved-${savedCompanyName}`, name: savedCompanyName });
      }
      setGroups(loadedGroups);
      setBrands(loadedBrands);
      setCompanies(loadedCompanies);
      setCompanyName(savedCompanyName);
      const cleanDate = (d) => {
        if (!d || d === 'Invalid date' || String(d).trim() === '') return '';
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? '' : String(d).trim().split('T')[0];
      };
      const resolvedType = prod.item_type || prod.product_type || 'Goods';
      const foundType = (Array.isArray(tData) ? tData : []).find(t =>
        (prod.product_type_id && Number(t.id) === Number(prod.product_type_id)) ||
        (t.name || t.type_name)?.toLowerCase() === resolvedType?.toLowerCase()
      );
      const resolvedTypeId = prod.product_type_id ? Number(prod.product_type_id) : (foundType?.id || 1);
      const resolvedTypeName = foundType?.name || foundType?.type_name || resolvedType || 'Goods';

      setProduct({
        ...prod,
        product_info: prod.product_info || '',
        currency: prod.currency || 'INR',
        item_type: resolvedTypeName,
        product_type: resolvedTypeName,
        product_type_id: resolvedTypeId,
        expense_id: prod.expense_id || null,
        expense_name: prod.expense_name || '',
        expense_amount: prod.expense_amount !== null && prod.expense_amount !== undefined ? prod.expense_amount : '',
        alias_type_id: prod.alias_type_id || null,
        alias_type_name: prod.alias_type_name || '',
        product_alias: prod.product_alias || '',
        company_id: savedCompanyId,
        company_name: savedCompanyName,
        brand_id: savedBrandId,
        brand_name: prod.brand_name || prod.brand?.name || savedBrand?.name || '',
        seasonal_period_start: cleanDate(prod.seasonal_period_start),
        seasonal_period_end: cleanDate(prod.seasonal_period_end),
        manufacturing_date: cleanDate(prod.manufacturing_date),
        expiry_date: cleanDate(prod.expiry_date),
        best_before_date: cleanDate(prod.best_before_date)
      });

      if (Array.isArray(prod.product_expenses) && prod.product_expenses.length > 0) {
        setAttachedExpenses(prod.product_expenses.map(e => ({
          expense_id: e.expense_id ? String(e.expense_id) : '',
          expense_name: e.expense_name || e.name || '',
          amount: e.amount !== undefined && e.amount !== null ? String(e.amount) : '',
          note: e.note || e.remarks || ''
        })));
      } else if (Array.isArray(prod.expenses) && prod.expenses.length > 0) {
        setAttachedExpenses(prod.expenses.map(e => ({
          expense_id: e.expense_id ? String(e.expense_id) : (e.id ? String(e.id) : ''),
          expense_name: e.expense_name || e.name || '',
          amount: e.amount !== undefined && e.amount !== null ? String(e.amount) : '',
          note: e.note || e.remarks || ''
        })));
      } else if (prod.expense_id || (prod.expense_amount && parseFloat(prod.expense_amount) > 0)) {
        setAttachedExpenses([{
          expense_id: prod.expense_id ? String(prod.expense_id) : '',
          expense_name: prod.expense_name || '',
          amount: prod.expense_amount !== null && prod.expense_amount !== undefined ? String(prod.expense_amount) : '',
          note: ''
        }]);
      } else {
        setAttachedExpenses([]);
      }

      setCostingMethod(prod?.costing_method || 'FIFO');
      setReorderStrategy(prod.reorder_strategy || 'FIXED_THRESHOLD');
      setExpiryAlertHorizonDays(prod.expiry_alert_horizon_days !== undefined && prod.expiry_alert_horizon_days !== null ? String(prod.expiry_alert_horizon_days) : '30');
      setMinShelfLifePercent(prod.min_shelf_life_percent !== undefined && prod.min_shelf_life_percent !== null ? String(prod.min_shelf_life_percent) : '70');
      setVelocityLookbackDays(prod.velocity_lookback_days !== undefined && prod.velocity_lookback_days !== null ? String(prod.velocity_lookback_days) : '30');
      setIsOccasionBased(prod.is_occasion_based ? 'Yes' : 'No');
      if (prod.occasions && prod.occasions.length > 0) {
        setSelectedOccasionIds(prod.occasions.map(o => o.id));
      } else {
        setSelectedOccasionIds([]);
      }
      let effectiveAliases = prod.aliases;
      if (typeof effectiveAliases === 'string') {
        try { effectiveAliases = JSON.parse(effectiveAliases); } catch (e) { effectiveAliases = null; }
      }
      if (Array.isArray(effectiveAliases) && effectiveAliases.length > 0) {
        setProductAliases(effectiveAliases.map(a => ({
          alias_type_id: a.alias_type_id ? String(a.alias_type_id) : '',
          alias_type_name: a.alias_type_name || '',
          alias_name: a.alias_name || a.name || ''
        })));
      } else if (prod.product_aliases && Array.isArray(prod.product_aliases) && prod.product_aliases.length > 0) {
        setProductAliases(prod.product_aliases.map((a, i) => {
          if (typeof a === 'object' && a !== null) {
            return {
              alias_type_id: a.alias_type_id ? String(a.alias_type_id) : (i === 0 && prod.alias_type_id ? String(prod.alias_type_id) : ''),
              alias_type_name: a.alias_type_name || (i === 0 ? prod.alias_type_name || '' : ''),
              alias_name: a.alias_name || a.name || ''
            };
          }
          return {
            alias_type_id: i === 0 && prod.alias_type_id ? String(prod.alias_type_id) : '',
            alias_type_name: i === 0 ? (prod.alias_type_name || '') : '',
            alias_name: typeof a === 'string' ? a : ''
          };
        }));
      } else if (prod.product_alias) {
        const parts = prod.product_alias.split(',').map(a => a.trim()).filter(Boolean);
        setProductAliases(parts.map((p, i) => ({
          alias_type_id: i === 0 && prod.alias_type_id ? String(prod.alias_type_id) : '',
          alias_type_name: i === 0 ? (prod.alias_type_name || '') : '',
          alias_name: p
        })));
      } else {
        setProductAliases([{
          alias_type_id: prod.alias_type_id ? String(prod.alias_type_id) : '',
          alias_type_name: prod.alias_type_name || '',
          alias_name: prod.product_alias || ''
        }]);
      }
      // Parse unit suffixes if present
      if (prod.length) {
        const parts = prod.length.trim().split(/\s+/);
        if (parts.length > 1) {
          const u = parts.slice(1).join(' ').trim();
          if (['cm', 'mm', 'm', 'in', 'ft'].includes(u.toLowerCase())) {
            setDimensionUnit(u.toLowerCase());
          } else {
            setDimensionUnit('custom');
            setCustomDimensionUnit(u);
          }
        }
      }
      if (prod.volume) {
        const parts = prod.volume.trim().split(/\s+/);
        if (parts.length > 1) {
          const u = parts.slice(1).join(' ').trim();
          if (['ml', 'l', 'fl oz', 'gal'].includes(u.toLowerCase())) {
            setVolumeUnit(u === 'L' ? 'L' : u.toLowerCase());
          } else {
            setVolumeUnit('custom');
            setCustomVolumeUnit(u);
          }
        }
      }
      if (prod.net_weight || prod.gross_weight) {
        const wtStr = prod.net_weight || prod.gross_weight;
        const parts = wtStr.trim().split(/\s+/);
        if (parts.length > 1) {
          const u = parts.slice(1).join(' ').trim();
          if (['g', 'kg', 'mg', 'lb', 'oz'].includes(u.toLowerCase())) {
            setWeightUnit(u.toLowerCase());
          } else {
            setWeightUnit('custom');
            setCustomWeightUnit(u);
          }
        }
      }
      if (prod.attributes) {
        setAttributes(prod.attributes.map(a => ({
          name: a.Attribute ? a.Attribute.name : '',
          value: a.value
        })));
      }

      // Hydrate variants if available on product
      if (prod.has_variants || (Array.isArray(prod.variants) && prod.variants.length > 0) || (Array.isArray(prod.ProductVariants) && prod.ProductVariants.length > 0)) {
        setHasVariants('Yes');
        const vLoadedRaw = (Array.isArray(prod.variants) && prod.variants.length > 0)
          ? prod.variants
          : (Array.isArray(prod.ProductVariants) && prod.ProductVariants.length > 0)
            ? prod.ProductVariants
            : [];

        // Build or hydrate variantAttributes
        if (Array.isArray(prod.variant_attributes) && prod.variant_attributes.length > 0) {
          setVariantAttributes(prod.variant_attributes);
        } else if (vLoadedRaw.length > 0) {
          // Reconstruct attribute keys and values from variants' variant_attributes / combination
          const attrMap = {};
          vLoadedRaw.forEach(v => {
            const attrs = v.variant_attributes || v.combination || {};
            Object.entries(attrs).forEach(([k, val]) => {
              if (!attrMap[k]) attrMap[k] = new Set();
              if (val) attrMap[k].add(String(val));
            });
          });
          const reconstructed = Object.entries(attrMap).map(([name, valSet]) => ({
            name,
            values: Array.from(valSet)
          }));
          if (reconstructed.length > 0) {
            setVariantAttributes(reconstructed);
          }
        }

        const normalizedVariants = vLoadedRaw.map((v, i) => {
          const attrs = v.variant_attributes || v.combination || {};
          const pkgs = Array.isArray(v.packagings) && v.packagings.length > 0
            ? v.packagings
            : (Array.isArray(v.packaging) ? v.packaging : []);

          return {
            id: v.id || `var-${i}`,
            name: v.name || v.variant_name,
            variant_name: v.name || v.variant_name,
            sku: v.sku,
            barcode: v.gtin_ean_upc || v.barcode || `${v.sku}-UNIT`,
            gtin_ean_upc: v.gtin_ean_upc || v.barcode || `${v.sku}-UNIT`,
            selling_price: v.selling_price || prod.selling_price || 0,
            purchase_price: v.purchase_price || prod.purchase_price || 0,
            mrp: v.mrp || prod.mrp || v.selling_price || 0,
            opening_stock: v.opening_stock ?? v.purchase_quantity ?? v.current_stock ?? 0,
            price_extra: v.price_extra || '0.00',
            combination: attrs,
            variant_attributes: attrs,
            packaging: pkgs.map((p, pi) => {
              const qty = p.quantity || p.quantity_per_pack || 24;
              const pCode = p.package_barcode || p.barcode || `${v.sku}-C${qty}`;
              return {
                id: p.id || `pkg-${pi}`,
                package_name: p.package_name || `Pack of ${qty}`,
                quantity_per_pack: qty,
                quantity: qty,
                barcode: pCode,
                package_barcode: pCode,
                package_qr_payload: p.package_qr_payload || JSON.stringify({ type: 'PACKAGE', sku: v.sku, qty }),
                selling_price: p.selling_price || ''
              };
            }),
            packagings: pkgs
          };
        });

        if (normalizedVariants.length > 0) {
          setProductVariants(normalizedVariants);
        }
      } else {
        setHasVariants('No');
      }
      try {
        const whRes = await api.get('/admin/warehouses');
        setWarehouses(whRes.data?.data || whRes.data?.warehouses || (Array.isArray(whRes.data) ? whRes.data : []));
      } catch (e) {
        console.error("Failed to fetch warehouses:", e);
      }

      // Hydrate brochure if present
      if (prod.company_brochure_url) {
        setCompanyBrochure({
          url: prod.company_brochure_url,
          name: prod.company_brochure_name || 'Product_Brochure.pdf'
        });
      }

      // Hydrate company independently of brand, then keep the selected brand available.
      if (savedCompany) {
        const fullComp = extractCompanyMedia(savedCompany);
        setCompanyInheritedMedia({
          companyName: savedCompanyName,
          companyId: savedCompany.id,
          logoUrl: fullComp.logoUrl,
          brochureUrl: fullComp.brochureUrl,
          brochureName: fullComp.brochureName,
          videoUrl: fullComp.videoUrl,
          images: fullComp.images,
          hasMedia: Boolean(fullComp.brochureUrl || fullComp.videoUrl || fullComp.images.length > 0 || fullComp.logoUrl)
        });
        setCompanyInheritedSchemes({
          companyName: savedCompanyName,
          companyId: savedCompany.id,
          schemes: fullComp.schemes,
          hasSchemes: fullComp.hasSchemes
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch product details", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddNewGroup = () => {
    setModalGroupName('');
    setModalGroupDesc('');
    setModalGroupImages([]);
    setShowAddGroupModal(true);
  };

  const submitNewGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/groups', {
        name: modalGroupName,
        description: modalGroupDesc,
        status: 'Active',
        images: modalGroupImages,
        image_url: modalGroupImages.length > 0 ? modalGroupImages[0] : null,
        image: modalGroupImages.length > 0 ? modalGroupImages[0] : null
      });
      const newGroup = res.data?.data || res.data;
      setGroups([...groups, newGroup]);
      setProduct({ ...product, group_id: newGroup.id });
      setShowAddGroupModal(false);
      setModalGroupName('');
      setModalGroupDesc('');
      setModalGroupImages([]);
    } catch (err) {
      alert("Failed to add group");
    }
  };



  const handleCompanySelect = async (selectedCompanyName, directCompObj = null) => {
    setCompanyName(selectedCompanyName);
    const matched = selectedCompanyName
      ? (directCompObj || companies.find(c =>
        (c.name && c.name.toLowerCase() === selectedCompanyName.toLowerCase()) ||
        (c.company_name && c.company_name.toLowerCase() === selectedCompanyName.toLowerCase())
      ))
      : null;
    setProduct(prev => ({
      ...prev,
      company_id: matched?.id || null,
      company_name: selectedCompanyName || '',
      brand_id: '',
      brand_name: ''
    }));

    if (!selectedCompanyName) {
      setCompanyInheritedMedia(null);
      setCompanyInheritedSchemes(null);
      return;
    }

    let fullComp = matched ? extractCompanyMedia(matched) : null;
    setIsInheritingMedia(true);

    if (matched?.id) {
      try {
        const res = await api.get(`/admin/companies/${matched.id}`);
        const fresh = res.data?.data || res.data;
        if (fresh) fullComp = extractCompanyMedia({ ...matched, ...fresh });
      } catch (err) {
        console.warn("Could not fetch fresh company details for auto-fetch in details:", err);
      }
    }
    setIsInheritingMedia(false);

    if (!fullComp) return;

    const compBrochureUrl = fullComp.brochureUrl || fullComp.brochure_url || '';
    const compBrochureName = fullComp.brochureName || fullComp.brochure_name ||
      (compBrochureUrl ? `${fullComp.company_name || fullComp.name || selectedCompanyName}_Brochure.pdf` : '');

    const compVideoUrl = fullComp.videoUrl || fullComp.video_url || '';
    const compImages = fullComp.images || [];
    const compLogoUrl = fullComp.logoUrl || fullComp.image_url || (compImages.length > 0 ? compImages[0] : '');

    const hasAnyMedia = Boolean(compBrochureUrl || compVideoUrl || compImages.length > 0 || compLogoUrl);

    setCompanyInheritedMedia({
      companyName: selectedCompanyName,
      companyId: fullComp.id,
      logoUrl: compLogoUrl,
      brochureUrl: compBrochureUrl,
      brochureName: compBrochureName,
      videoUrl: compVideoUrl,
      images: compImages,
      hasMedia: hasAnyMedia
    });

    if (compBrochureUrl && (!companyBrochure?.url || companyBrochure?.isInherited)) {
      setCompanyBrochure({
        url: compBrochureUrl,
        name: compBrochureName,
        isInherited: true,
        sourceCompany: selectedCompanyName
      });
    }

    if (compVideoUrl && (!product?.video_url || product?.video_url === companyInheritedMedia?.videoUrl)) {
      setProduct(prev => ({ ...prev, video_url: compVideoUrl }));
    }

    // Auto-inherit Schemes & Turnover Targets
    const compSchemes = fullComp.schemes || {
      product_pe_product: fullComp.product_pe_product || '',
      discount_on_product: fullComp.discount_on_product || '',
      product_target_scheme: fullComp.product_target_scheme || '',
      discount_on_bill_amount: fullComp.discount_on_bill_amount || '',
      quarterly_discount_on_turnover: fullComp.quarterly_discount_on_turnover || '',
      yearly_discount_on_turnover: fullComp.yearly_discount_on_turnover || '',
      seasonal_scheme_name: fullComp.seasonal_scheme_name || '',
      seasonal_period_start: fullComp.seasonal_period_start || '',
      seasonal_period_end: fullComp.seasonal_period_end || '',
      seasonal_applicability: fullComp.seasonal_applicability || 'All Products',
      seasonal_frequency: fullComp.seasonal_frequency || 'Yearly'
    };

    const compHasSchemes = Boolean(fullComp.hasSchemes || Object.values(compSchemes).some(v => Boolean(v && String(v).trim())));

    setCompanyInheritedSchemes({
      companyName: selectedCompanyName,
      companyId: fullComp.id,
      schemes: compSchemes,
      hasSchemes: compHasSchemes
    });

    // Auto-match schemes if product currently has no schemes configured
    const isProductSchemesEmpty = !product?.product_pe_product &&
      !product?.discount_on_product &&
      !product?.product_target_scheme &&
      !product?.discount_on_bill_amount &&
      !product?.quarterly_discount_on_turnover &&
      !product?.yearly_discount_on_turnover &&
      !product?.seasonal_scheme_name;

    if (isProductSchemesEmpty && compHasSchemes) {
      setProduct(prev => ({
        ...prev,
        product_pe_product: compSchemes.product_pe_product || prev.product_pe_product || '',
        discount_on_product: compSchemes.discount_on_product || prev.discount_on_product || '',
        product_target_scheme: compSchemes.product_target_scheme || prev.product_target_scheme || '',
        discount_on_bill_amount: compSchemes.discount_on_bill_amount || prev.discount_on_bill_amount || '',
        quarterly_discount_on_turnover: compSchemes.quarterly_discount_on_turnover || prev.quarterly_discount_on_turnover || '',
        yearly_discount_on_turnover: compSchemes.yearly_discount_on_turnover || prev.yearly_discount_on_turnover || '',
        seasonal_scheme_name: compSchemes.seasonal_scheme_name || prev.seasonal_scheme_name || '',
        seasonal_period_start: compSchemes.seasonal_period_start || prev.seasonal_period_start || '',
        seasonal_period_end: compSchemes.seasonal_period_end || prev.seasonal_period_end || '',
        seasonal_applicability: compSchemes.seasonal_applicability || prev.seasonal_applicability || 'All Products',
        seasonal_frequency: compSchemes.seasonal_frequency || prev.seasonal_frequency || 'Yearly'
      }));
    }
  };

  const handleApplyCompanySchemes = () => {
    if (!companyInheritedSchemes?.schemes) return;
    const s = companyInheritedSchemes.schemes;
    setProduct(prev => ({
      ...prev,
      product_pe_product: s.product_pe_product || '',
      discount_on_product: s.discount_on_product || '',
      product_target_scheme: s.product_target_scheme || '',
      discount_on_bill_amount: s.discount_on_bill_amount || '',
      quarterly_discount_on_turnover: s.quarterly_discount_on_turnover || '',
      yearly_discount_on_turnover: s.yearly_discount_on_turnover || '',
      seasonal_scheme_name: s.seasonal_scheme_name || '',
      seasonal_period_start: s.seasonal_period_start || '',
      seasonal_period_end: s.seasonal_period_end || '',
      seasonal_applicability: s.seasonal_applicability || 'All Products',
      seasonal_frequency: s.seasonal_frequency || 'Yearly'
    }));
  };

  const handleImportCompanyImages = () => {
    if (!companyInheritedMedia?.images?.length) return;
    const curImgs = Array.isArray(product?.images) ? product.images : (product?.image_url ? [product.image_url] : []);
    const existing = new Set(curImgs);
    const newImgs = companyInheritedMedia.images.filter(img => !existing.has(img));
    if (newImgs.length === 0) {
      alert("All photos from this company gallery are already added to the element.");
      return;
    }
    const combined = [...curImgs, ...newImgs];
    setProduct(prev => ({
      ...prev,
      images: combined,
      image_url: combined[0] || null
    }));
  };

  const handleClearInheritedMedia = () => {
    if (companyBrochure?.isInherited) {
      setCompanyBrochure({ url: '', name: '', isInherited: false });
    }
    if (companyInheritedMedia?.videoUrl && product?.video_url === companyInheritedMedia.videoUrl) {
      setProduct(prev => ({ ...prev, video_url: '' }));
    }
    setCompanyInheritedMedia(null);
  };

  const handleModalAddOfficer = () => {
    setModalCompanyOfficers([...modalCompanyOfficers, '']);
  };

  const handleModalOfficerChange = (index, value) => {
    const next = [...modalCompanyOfficers];
    next[index] = value;
    setModalCompanyOfficers(next);
  };

  const handleModalRemoveOfficer = (index) => {
    if (modalCompanyOfficers.length === 1) {
      setModalCompanyOfficers(['']);
    } else {
      setModalCompanyOfficers(modalCompanyOfficers.filter((_, i) => i !== index));
    }
  };

  const submitNewCompany = async (e) => {
    e.preventDefault();
    try {
      const validOfficers = modalCompanyOfficers.map(o => o.trim()).filter(Boolean);
      const res = await api.post('/admin/companies', {
        name: modalCompanyName,
        description: modalCompanyDesc,
        scheme: modalCompanyScheme,
        offer: modalCompanyOffer,
        margin: modalCompanyMargin,
        authorized_distributor: modalCompanyDistributor,
        company_officer_name: validOfficers.join(', '),
        company_officers: validOfficers,
        brochure_images: modalCompanyBrochures,
        brochures: modalCompanyBrochures,
        brochure_urls: modalCompanyBrochures,
        brochure_url: modalCompanyBrochures.length > 0 ? modalCompanyBrochures[0] : null,
        status: 'Active'
      });
      const newCompany = res.data?.data || res.data;
      setCompanies([...companies, newCompany]);
      handleCompanySelect(newCompany.name || modalCompanyName, newCompany);
      setShowAddCompanyModal(false);
      setModalCompanyName('');
      setModalCompanyDesc('');
      setModalCompanyScheme('');
      setModalCompanyOffer('');
      setModalCompanyMargin('');
      setModalCompanyDistributor('');
      setModalCompanyOfficers(['']);
      setModalCompanyBrochures([]);
    } catch (err) {
      alert("Failed to add company");
    }
  };

  const handleAddNewCompany = () => {
    setShowAddCompanyModal(true);
  };

  const handleAddNewBrand = () => {
    if (!companyName) {
      alert("Please select a Company first");
      return;
    }
    setShowAddBrandModal(true);
  };
  const submitNewBrand = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/brands', {
        name: modalBrandName,
        description: modalBrandDesc,
        company_name: companyName,
        scheme: modalBrandScheme,
        offer: modalBrandOffer,
        margin: modalBrandMargin,
        authorized_distributor: modalBrandDistributor,
        company_officer_name: modalBrandOfficer,
        status: 'Active'
      });
      const newBrand = res.data?.data || res.data;
      setBrands([...brands, newBrand]);
      setProduct(prev => ({ ...prev, company_id: companies.find(c => c.name === companyName || c.company_name === companyName)?.id || prev.company_id || null, company_name: companyName, brand_id: newBrand.id, brand_name: newBrand.name || modalBrandName }));
      setShowAddBrandModal(false);
      setModalBrandName('');
      setModalBrandDesc('');
      setModalBrandScheme('');
      setModalBrandOffer('');
      setModalBrandMargin('');
      setModalBrandDistributor('');
      setModalBrandOfficer('');
    } catch (err) {
      alert("Failed to add brand");
    }
  };

  const handleAutoCalculateReorder = async () => {
    try {
      const res = await api.post('/inventory/calculate-reorder', {
        product_id: product.id,
        lead_time_days: product.lead_time_days || 7,
        safety_stock: product.safety_stock || 0,
        max_stock_level: product.max_stock_level || 0
      });
      if (res.data?.success) {
        const d = res.data.data;
        setProduct(prev => ({
          ...prev,
          reorder_level: d.calculated_reorder_level,
          reorder_qty: d.calculated_reorder_qty
        }));
        alert(`Calculated Successfully!\n\n• 30-Day Sales Velocity: ${d.avg_daily_sales} units/day\n• Formula: ${d.formulas.rol_formula}\n• Suggested Reorder Level: ${d.calculated_reorder_level} units\n• Suggested Reorder Qty: ${d.calculated_reorder_qty} units`);
      }
    } catch (err) {
      console.error('Calculation error:', err);
      alert('Failed to calculate reorder metrics automatically.');
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      const effectiveDimUnit = dimensionUnit === 'custom' ? (customDimensionUnit.trim() || '') : dimensionUnit;
      const effectiveVolUnit = volumeUnit === 'custom' ? (customVolumeUnit.trim() || '') : volumeUnit;
      const effectiveWtUnit = weightUnit === 'custom' ? (customWeightUnit.trim() || '') : weightUnit;

      if (
        (product.purchase_price !== '' && parseFloat(product.purchase_price) < 0) ||
        (product.selling_price !== '' && parseFloat(product.selling_price) < 0) ||
        (product.mrp !== '' && parseFloat(product.mrp) < 0) ||
        (product.distributor_price !== '' && parseFloat(product.distributor_price) < 0) ||
        (product.profit_percent !== '' && parseFloat(product.profit_percent) < 0) ||
        (product.selling_price_wholesale !== '' && parseFloat(product.selling_price_wholesale) < 0) ||
        (product.selling_price_retail !== '' && parseFloat(product.selling_price_retail) < 0) ||
        (product.gst_rate !== '' && parseFloat(product.gst_rate) < 0) ||
        (product.reorder_level !== '' && parseInt(product.reorder_level, 10) < 0)
      ) {
        alert("Pricing, GST rate, and quantities cannot be negative.");
        return;
      }

      if (hasVariants === 'Yes') {
        const hasNegativeVariantPrice = productVariants.some(v => {
          const sPrice = parseFloat(v.selling_price);
          const pExtra = parseFloat(v.price_extra);
          const pkgs = Array.isArray(v.packagings) ? v.packagings : (Array.isArray(v.packaging) ? v.packaging : []);
          const hasNegPkg = pkgs.some(p => (p.selling_price !== '' && parseFloat(p.selling_price) < 0) || (p.quantity && parseInt(p.quantity, 10) < 0));
          return (!isNaN(sPrice) && sPrice < 0) || (!isNaN(pExtra) && pExtra < 0) || hasNegPkg;
        });
        if (hasNegativeVariantPrice) {
          alert("Variant selling prices, extra prices, or packaging prices cannot be negative.");
          return;
        }
      }

      if (
        (product.lot_number !== '' && product.lot_number !== null && !/^\d+$/.test(String(product.lot_number).trim())) ||
        (product.lot_number !== '' && product.lot_number !== null && Number(product.lot_number) < 0)
      ) {
        alert("Lot Number must contain only positive numbers.");
        return;
      }

      if (
        (product.batch_number !== '' && product.batch_number !== null && !/^\d+$/.test(String(product.batch_number).trim())) ||
        (product.batch_number !== '' && product.batch_number !== null && Number(product.batch_number) < 0)
      ) {
        alert("Batch Number must contain only positive numbers.");
        return;
      }

      const cleanVal = (val, u) => {
        if (!val) return '';
        let str = String(val).trim();
        // remove known standard units or custom unit if at end
        str = str.replace(/\s*(cm|mm|m|in|ft|ml|l|fl oz|gal|kg|g|mg|lb|oz)$/i, '').trim();
        if (u) {
          const escU = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          str = str.replace(new RegExp(`\\s*${escU}$`, 'i'), '').trim();
        }
        return str;
      };

      const cleanDatePayload = (d) => {
        if (!d || d === 'Invalid date' || String(d).trim() === '') return null;
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : String(d).trim().split('T')[0];
      };

      const payload = {
        ...product,
        company_id: companies.find(c => (c.name || c.company_name) === companyName)?.id || product.company_id || null,
        company_name: companyName || product.company_name || null,
        brand_id: product.brand_id || null,
        brand_name: brands.find(b => String(b.id) === String(product.brand_id))?.name || product.brand_name || null,
        product_info: product.product_info || null,
        costing_method: costingMethod,
        company_brochure_url: companyBrochure?.url || null,
        company_brochure_name: companyBrochure?.name || null,
        seasonal_period_start: cleanDatePayload(product.seasonal_period_start),
        seasonal_period_end: cleanDatePayload(product.seasonal_period_end),
        manufacturing_date: cleanDatePayload(product.manufacturing_date),
        expiry_date: cleanDatePayload(product.expiry_date),
        best_before_date: cleanDatePayload(product.best_before_date),
        length: cleanVal(product.length, effectiveDimUnit) ? (effectiveDimUnit ? `${cleanVal(product.length, effectiveDimUnit)} ${effectiveDimUnit}` : cleanVal(product.length)) : null,
        breadth: cleanVal(product.breadth, effectiveDimUnit) ? (effectiveDimUnit ? `${cleanVal(product.breadth, effectiveDimUnit)} ${effectiveDimUnit}` : cleanVal(product.breadth)) : null,
        thickness: cleanVal(product.thickness, effectiveDimUnit) ? (effectiveDimUnit ? `${cleanVal(product.thickness, effectiveDimUnit)} ${effectiveDimUnit}` : cleanVal(product.thickness)) : null,
        volume: cleanVal(product.volume, effectiveVolUnit) ? (effectiveVolUnit ? `${cleanVal(product.volume, effectiveVolUnit)} ${effectiveVolUnit}` : cleanVal(product.volume)) : null,
        net_weight: cleanVal(product.net_weight, effectiveWtUnit) ? (effectiveWtUnit ? `${cleanVal(product.net_weight, effectiveWtUnit)} ${effectiveWtUnit}` : cleanVal(product.net_weight)) : null,
        gross_weight: cleanVal(product.gross_weight, effectiveWtUnit) ? (effectiveWtUnit ? `${cleanVal(product.gross_weight, effectiveWtUnit)} ${effectiveWtUnit}` : cleanVal(product.gross_weight)) : null,
        attributes: attributes.filter(a => ((a?.name || a?.Attribute?.name || '') + '').trim() !== '' && ((a?.value || a?.attribute_value || '') + '').trim() !== ''),
        is_occasion_based: isOccasionBased === 'Yes',
        occasion_ids: isOccasionBased === 'Yes' ? selectedOccasionIds : [],
        has_variants: hasVariants === 'Yes',
        variant_attributes: hasVariants === 'Yes' ? variantAttributes : [],
        variants: hasVariants === 'Yes' ? productVariants.map(v => {
          const vSellingPrice = parseFloat(v.selling_price) || (parseFloat(product.selling_price) || 0) + (parseFloat(v.price_extra) || 0);
          const vPurchasePrice = parseFloat(v.purchase_price) || (parseFloat(product.purchase_price) || 0);
          const vMrp = parseFloat(v.mrp) || (parseFloat(product.mrp) || vSellingPrice);
          const vOpeningStock = parseInt(v.opening_stock ?? v.stock ?? (product.purchase_quantity || 0), 10);
          const rawPackagings = Array.isArray(v.packagings) ? v.packagings : (Array.isArray(v.packaging) ? v.packaging : []);

          return {
            name: v.name || v.variant_name || `${product.product_name} (${Object.values(v.combination || v.variant_attributes || {}).join(' - ')})`,
            variant_name: v.name || v.variant_name,
            sku: v.sku,
            product_info: v.product_info || product.product_info || null,
            variant_attributes: v.variant_attributes || v.combination || {},
            combination: v.combination || v.variant_attributes || {},
            purchase_price: vPurchasePrice,
            costing_method: v.costing_method || costingMethod,
            selling_price: vSellingPrice,
            mrp: vMrp,
            opening_stock: vOpeningStock,
            reorder_level: v.reorder_level !== undefined && v.reorder_level !== '' ? Math.max(0, parseInt(v.reorder_level, 10)) : (product.reorder_level ? Math.max(0, parseInt(product.reorder_level, 10)) : 0),
            reorder_qty: v.reorder_qty !== undefined && v.reorder_qty !== '' ? Math.max(0, parseInt(v.reorder_qty, 10)) : (product.reorder_qty ? Math.max(0, parseInt(product.reorder_qty, 10)) : 0),
            safety_stock: v.safety_stock !== undefined && v.safety_stock !== '' ? Math.max(0, parseInt(v.safety_stock, 10)) : (product.safety_stock ? Math.max(0, parseInt(product.safety_stock, 10)) : 0),
            lead_time_days: v.lead_time_days !== undefined && v.lead_time_days !== '' ? Math.max(1, parseInt(v.lead_time_days, 10)) : (product.lead_time_days ? Math.max(1, parseInt(product.lead_time_days, 10)) : 7),
            auto_reorder: v.auto_reorder !== undefined ? !!v.auto_reorder : (product.auto_reorder ?? false),
            reorder_strategy: v.reorder_strategy || product.reorder_strategy || 'MIN_MAX',
            gtin_ean_upc: v.gtin_ean_upc || v.barcode || `${v.sku}-UNIT`,
            barcode: v.gtin_ean_upc || v.barcode || `${v.sku}-UNIT`,
            price_extra: parseFloat(v.price_extra) || 0,
            packagings: rawPackagings.map(p => {
              const qty = parseInt(p.quantity || p.quantity_per_pack || 24, 10);
              const pCode = p.package_barcode || p.barcode || `${v.sku}-C${qty}`;
              return {
                package_name: p.package_name || `Pack of ${qty}`,
                quantity: qty,
                quantity_per_pack: qty,
                package_barcode: pCode,
                barcode: pCode,
                package_qr_payload: p.package_qr_payload || JSON.stringify({ type: "PACKAGE", sku: v.sku, qty }),
                selling_price: parseFloat(p.selling_price) || (vSellingPrice * qty * 0.95)
              };
            }),
            packaging: rawPackagings.map(p => {
              const qty = parseInt(p.quantity || p.quantity_per_pack || 24, 10);
              const pCode = p.package_barcode || p.barcode || `${v.sku}-C${qty}`;
              return {
                id: p.id,
                package_name: p.package_name || `Pack of ${qty}`,
                quantity_per_pack: qty,
                quantity: qty,
                barcode: pCode,
                package_barcode: pCode,
                package_qr_payload: p.package_qr_payload || JSON.stringify({ type: "PACKAGE", sku: v.sku, qty }),
                selling_price: parseFloat(p.selling_price) || (vSellingPrice * qty * 0.95)
              };
            })
          };
        }) : []
      };

      // Sanitize payload to strip relational include objects before sending
      const cleanPayload = { ...payload };
      delete cleanPayload.Group;
      delete cleanPayload.company;
      delete cleanPayload.default_warehouse;
      delete cleanPayload.template;
      delete cleanPayload.packagings;
      delete cleanPayload.createdAt;
      delete cleanPayload.updatedAt;

      // Section 2.D Dropdown Master payload harmonization:
      cleanPayload.product_type_id = product.product_type_id ? parseInt(product.product_type_id, 10) : null;
      cleanPayload.item_type = product.item_type || 'Goods';
      cleanPayload.purchase_price = product.purchase_price ? parseFloat(product.purchase_price) : 0;
      cleanPayload.expense_id = attachedExpenses[0]?.expense_id ? parseInt(attachedExpenses[0].expense_id, 10) : (product.expense_id ? parseInt(product.expense_id, 10) : null);
      cleanPayload.expense_name = attachedExpenses.length > 0 ? attachedExpenses.map(e => e.expense_name).filter(Boolean).join(', ') : (product.expense_name || null);
      cleanPayload.expense_amount = totalAttachedExpense;
      cleanPayload.product_expenses = attachedExpenses.filter(e => e.expense_name || parseFloat(e.amount) > 0);
      cleanPayload.expenses = attachedExpenses.filter(e => e.expense_name || parseFloat(e.amount) > 0);
      cleanPayload.base_unit_cost = landedPurchaseCost;
      cleanPayload.landed_cost = landedPurchaseCost;
      cleanPayload.selling_price = product.selling_price ? parseFloat(product.selling_price) : 0;
      cleanPayload.mrp = product.mrp ? parseFloat(product.mrp) : 0;
      const rawAliasTypeId = productAliases[0]?.alias_type_id || product.alias_type_id;
      const parsedAliasTypeId = rawAliasTypeId ? parseInt(rawAliasTypeId, 10) : null;
      cleanPayload.alias_type_id = (parsedAliasTypeId && !isNaN(parsedAliasTypeId)) ? parsedAliasTypeId : null;
      cleanPayload.alias_type_name = productAliases[0]?.alias_type_name || product.alias_type_name || null;
      cleanPayload.product_alias = productAliases.map(a => (typeof a === 'object' ? a.alias_name : a)).filter(Boolean).join(', ') || product.product_alias || null;
      cleanPayload.product_aliases = productAliases.map(a => (typeof a === 'object' ? a.alias_name : a)).filter(Boolean);
      cleanPayload.aliases = productAliases.filter(a => ((typeof a === 'object' ? a.alias_name : a) || '').trim() !== '');
      cleanPayload.product_info = product.product_info || null;
      cleanPayload.reorder_strategy = reorderStrategy;
      cleanPayload.expiry_alert_horizon_days = parseInt(expiryAlertHorizonDays, 10) || 30;
      cleanPayload.min_shelf_life_percent = parseFloat(minShelfLifePercent) || 70.00;
      cleanPayload.velocity_lookback_days = parseInt(velocityLookbackDays, 10) || 30;

      await api.put(`/admin/products/${id}`, cleanPayload);
      alert('Product updated successfully');
      fetchData();
    } catch (error) {
      console.error("Failed to update product", error);
      alert('Failed to update product');
    }
  };

  const handleStatusChange = async (status) => {
    if (isReadOnly) return;
    try {
      await api.patch(`/admin/products/${id}/status`, { status });
      setProduct({ ...product, status });
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Product not found.</div>;

  return (
    <div>
      {showAddGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <button type="button" onClick={() => { setShowAddGroupModal(false); setModalGroupImages([]); }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>&times;</button>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50', fontSize: '1.25rem' }}>Add Product Group</h2>
            <form onSubmit={submitNewGroup}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Group Name *</label>
                <SuggestionInput id="product-details-new-group-name" value={modalGroupName} onChange={setModalGroupName} suggestions={groups} itemType="Group" required inputStyle={{ padding: '10px', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Description</label>
                <textarea style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px' }} rows="3" value={modalGroupDesc} onChange={e => setModalGroupDesc(e.target.value)}></textarea>
              </div>

              {/* GROUP IMAGES FIELD (MULTIPLE) */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>Group Images (Optional)</label>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{modalGroupImages.length} photo(s) selected</span>
                </div>
                <PhotoUploader images={modalGroupImages} onChange={setModalGroupImages} maxFiles={5} compact={true} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => { setShowAddGroupModal(false); setModalGroupImages([]); }} style={{ padding: '10px 16px', backgroundColor: '#ecf0f1', color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATED PRODUCT BANNER (AUDIT DELETION REASON) */}
      {(product.status === 'Inactive' || product.deleted_at || product.is_deleted) && (product.delete_reason || product.deactivation_reason || product.reason) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#991b1b',
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)'
        }}>
          <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.92rem' }}>
            <span>This product was deactivated. Reason: </span>
            <strong style={{ color: '#7f1d1d' }}>{product.delete_reason || product.deactivation_reason || product.reason}</strong>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn" style={{ padding: '8px', width: 'auto' }} onClick={() => navigate('/products')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            {product.product_name}
            <span style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 'normal', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '6px' }}>
              PRO{String(product.id).padStart(5, '0')}
            </span>
          </h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {(() => {
              let path = [];
              let currentId = product.group_id;
              while (currentId) {
                const g = groups.find(x => x.id == currentId);
                if (g) {
                  path.unshift(`${g.name} (${g.group_code || 'GRP'})`);
                  currentId = g.parent_id;
                } else {
                  break;
                }
              }
              return path.length > 0 ? path.join(' > ') + ' > ' : '';
            })()}
            {product.product_name} | SKU: {product.internal_sku}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => downloadProductBrochurePDF(product, groups, brands)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#4338ca',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)'
            }}
          >
            <FileDown size={16} /> Brochure (PDF)
          </button>
          <button
            type="button"
            onClick={() => downloadProductDetailsExcel(product, groups, brands)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
            }}
          >
            <FileSpreadsheet size={16} /> Export (Excel)
          </button>
          {isReadOnly ? (
            <span style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: product.status === 'Active' ? '#ecfdf5' : '#f1f5f9', color: product.status === 'Active' ? '#059669' : '#475569', fontSize: '0.85rem', fontWeight: '700' }}>
              {product.status || 'Draft'}
            </span>
          ) : (
            <select
              className="form-control"
              style={{ width: 'auto', margin: 0, padding: '8px 12px' }}
              value={product.status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="Draft">Draft</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          )}
        </div>
      </div>

      {isReadOnly && (
        <div style={{ maxWidth: '1000px', margin: '0 auto 16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.85rem', fontWeight: '600' }}>
          View only. Use the Edit action in the element table to make changes.
        </div>
      )}

      <div style={{ maxWidth: '1000px', margin: '0 auto', gap: '24px', display: 'flex', flexDirection: 'column' }}>
        <style>
          {`
            .premium-input:focus { border-color: #3b82f6 !important; background-color: #fff !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
            .premium-card:hover { box-shadow: 0 15px 35px rgba(0,0,0,0.08), 0 5px 15px rgba(0,0,0,0.03) !important; transform: translateY(-2px); }
          `}
        </style>
        <form onSubmit={handleUpdateProduct}>
          <fieldset disabled={isReadOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, pointerEvents: isReadOnly ? 'none' : 'auto' }}>
          {/* CATEGORIZATION CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '24px' }}>Categorization</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {(() => {
                let path = [];
                let currentId = product.group_id;
                while (currentId) {
                  const g = groups.find(x => x.id == currentId);
                  if (g) {
                    path.unshift(g.id);
                    currentId = g.parent_id;
                  } else {
                    break;
                  }
                }

                const dropdowns = [];
                let parentForNext = null;

                for (let i = 0; i <= path.length; i++) {
                  const availableOptions = groups.filter(g => g.parent_id == parentForNext);
                  if (availableOptions.length === 0) break;

                  const selectedValue = i < path.length ? path[i] : '';
                  const currentParentId = parentForNext;

                  dropdowns.push(
                    <div key={i} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', margin: 0 }}>
                          {i === 0 ? 'Product Group (Optional)' : `Product SubGroup (Level ${i})`}
                        </label>
                        {i === 0 && <button type="button" onClick={handleAddNewGroup} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', padding: 0, fontWeight: '600' }}>+ Add Group</button>}
                      </div>
                      <select className="premium-input" style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                        value={selectedValue}
                        onChange={e => {
                          const newGroupId = e.target.value || currentParentId;
                          setProduct({ ...product, group_id: newGroupId });
                        }}
                      >
                        <option value="">{i === 0 ? 'Select Category' : 'Select Subcategory'}</option>
                        {availableOptions.map(g => (
                          <option key={g.id} value={g.id}>{g.name} {g.group_code ? `(${g.group_code})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  );

                  parentForNext = selectedValue;
                  if (!parentForNext) break;
                }

                return dropdowns;
              })()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', margin: 0 }}>Company</label>
                  <button type="button" onClick={handleAddNewCompany} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', padding: 0, fontWeight: '600' }}>+ Add Company</button>
                </div>
                <select className="premium-input" style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }} value={companyName} onChange={(e) => handleCompanySelect(e.target.value)}>
                  <option value="">Select Company</option>
                  {companies.map(c => { const name = c.name || c.company_name || ''; return <option key={c.id} value={name}>{name}</option>; })}
                </select>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', margin: 0 }}>Brand</label>
                  <button type="button" onClick={handleAddNewBrand} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', padding: 0, fontWeight: '600' }}>+ Add Brand</button>
                </div>
                <select className="premium-input" style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }} value={product.brand_id || ''} onChange={e => { const selectedBrand = brands.find(b => String(b.id) === String(e.target.value)); setProduct(prev => ({ ...prev, company_name: companyName, company_id: companies.find(c => (c.name || c.company_name) === companyName)?.id || prev.company_id || null, brand_id: e.target.value, brand_name: selectedBrand?.name || '' })); }} disabled={!companyName}>
                  <option value="">Select Brand</option>
                  {brands.filter(b => b.company_name === companyName || String(b.company_id || '') === String(companies.find(c => (c.name || c.company_name) === companyName)?.id || '') || String(b.id) === String(product.brand_id || '')).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* SMART AUTO-FETCH BANNER (EDIT MODE) */}
            {companyName && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: companyInheritedMedia?.hasMedia
                  ? 'linear-gradient(135deg, #f0fdf4 0%, #eef2ff 100%)'
                  : '#f8fafc',
                border: companyInheritedMedia?.hasMedia
                  ? '1px solid #c7d2fe'
                  : '1px dashed #cbd5e1',
                boxShadow: companyInheritedMedia?.hasMedia
                  ? '0 2px 6px rgba(99, 102, 241, 0.08)'
                  : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: companyInheritedMedia?.hasMedia ? '10px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color={companyInheritedMedia?.hasMedia ? '#4f46e5' : '#94a3b8'} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: companyInheritedMedia?.hasMedia ? '#1e1b4b' : '#64748b' }}>
                      {companyInheritedMedia?.hasMedia
                        ? `Smart Media Auto-Fetch Active (${companyName})`
                        : `Company Media Assets (${companyName})`}
                    </span>
                    {isInheritingMedia && (
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Loader2 size={12} className="animate-spin" /> Fetching assets...
                      </span>
                    )}
                  </div>

                  {companyInheritedMedia?.hasMedia && (
                    <button
                      type="button"
                      onClick={handleClearInheritedMedia}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Clear Inherited
                    </button>
                  )}
                </div>

                {companyInheritedMedia?.hasMedia && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {companyInheritedMedia.brochureUrl && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        fontSize: '0.78rem',
                        fontWeight: '600'
                      }}>
                        <CheckCircle2 size={13} color="#059669" /> Brochure PDF Auto-Linked
                      </span>
                    )}

                    {companyInheritedMedia.videoUrl && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.78rem',
                        fontWeight: '600'
                      }}>
                        <CheckCircle2 size={13} color="#2563eb" /> Video Auto-Linked
                      </span>
                    )}

                    {companyInheritedMedia.images?.length > 0 && (
                      <button
                        type="button"
                        onClick={handleImportCompanyImages}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#4338ca',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <ImageIcon size={13} /> + Import {companyInheritedMedia.images.length} Company Photos
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* OCCASION MANAGEMENT CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>Occasion Management</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure seasonal, festival, or event affiliation for this product</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>Is Occasion Based?</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: isOccasionBased === 'Yes' ? '#4338ca' : '#64748b' }}>
                    <input
                      type="radio"
                      name="edit_is_occasion_based"
                      value="Yes"
                      checked={isOccasionBased === 'Yes'}
                      onChange={() => setIsOccasionBased('Yes')}
                    />
                    Yes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: isOccasionBased === 'No' ? '#4338ca' : '#64748b' }}>
                    <input
                      type="radio"
                      name="edit_is_occasion_based"
                      value="No"
                      checked={isOccasionBased === 'No'}
                      onChange={() => {
                        setIsOccasionBased('No');
                        setSelectedOccasionIds([]);
                      }}
                    />
                    No
                  </label>
                </div>
              </div>
            </div>

            {isOccasionBased === 'Yes' && (
              <OccasionSelector
                occasionsList={occasionsList}
                occasionTypes={occasionTypes}
                selectedOccasionIds={selectedOccasionIds}
                onChange={setSelectedOccasionIds}
                onOpenAddModal={() => setShowAddOccasionModal(true)}
              />
            )}
          </div>

          {/* BASIC INFORMATION CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '24px' }}>Basic Information</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Element Name *</label>
                <input className="premium-input" type="text" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }} value={product.product_name || ''} onChange={e => setProduct({ ...product, product_name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Element Type (From Product Types Master)</label>
                <select
                  className="premium-input"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                  value={product.product_type_id || (productTypesList.find(t => t.name?.toLowerCase() === (product.item_type || product.product_type || '').toLowerCase())?.id) || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = productTypesList.find(t => String(t.id) === String(val)) || productTypesList.find(t => t.name === val);
                    setProduct({
                      ...product,
                      product_type_id: found ? found.id : (Number(val) || null),
                      item_type: found ? found.name : val,
                      product_type: found ? found.name : val
                    });
                  }}
                >
                  <option value="">Select Type</option>
                  {productTypesList.map((t) => (
                    <option key={t.id || t.name} value={t.id}>
                      {t.name} {t.name === 'Service' || t.tracks_inventory === false ? '(Service - No Stock)' : ''}
                    </option>
                  ))}
                </select>
                {isServiceType && (
                  <div style={{ marginTop: '6px', fontSize: '0.74rem', fontWeight: '700', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    Service Item: Physical stock tracking bypassed
                  </div>
                )}
              </div>
            </div>

            {/* Alias Master Integration (Section 2.D) */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={16} style={{ color: '#4338ca' }} />
                  <label style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                    Alias Master Classification & Product Alias
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAliasTypeModal(true)}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #c7d2fe',
                    color: '#4338ca',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={12} /> + Add Alias Type
                </button>
              </div>

              {/* Column Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 36px', gap: '16px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                    Alias Classification Type
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddAliasTypeModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4338ca',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      padding: 0,
                      fontWeight: '600'
                    }}
                  >
                    + Add Alias Type
                  </button>
                </div>
                <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                  Product Alias
                </label>
                <div></div>
              </div>

              {/* Alias Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                {productAliases.map((aliasItem, idx) => {
                  const currentTypeId = typeof aliasItem === 'object' ? aliasItem.alias_type_id : '';
                  const currentTypeName = typeof aliasItem === 'object' ? aliasItem.alias_type_name : '';
                  const currentVal = typeof aliasItem === 'object' ? aliasItem.alias_name : aliasItem;

                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 36px', gap: '16px', alignItems: 'center' }}>
                      <div>
                        <select
                          style={{ width: '100%', padding: '11px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#1e293b', outline: 'none', fontSize: '0.85rem' }}
                          value={currentTypeId || ''}
                          onChange={(e) => handleUpdateAlias(idx, 'alias_type_id', e.target.value)}
                        >
                          <option value="">Select Alias Type (e.g. Biological, Local, Scientific)</option>
                          {catalogAliases.map(ca => (
                            <option key={ca.id} value={ca.id}>{ca.name}</option>
                          ))}
                          {currentTypeName && !catalogAliases.some(ca => String(ca.id) === String(currentTypeId)) && (
                            <option value={currentTypeId || currentTypeName}>{currentTypeName}</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder={currentTypeName ? `e.g. Enter ${currentTypeName}` : "e.g. Mangifera indica, Hapus, etc."}
                          style={{ width: '100%', padding: '11px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#1e293b', outline: 'none', fontSize: '0.85rem' }}
                          value={currentVal || ''}
                          onChange={(e) => handleUpdateAlias(idx, 'alias_name', e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {productAliases.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveAlias(idx)}
                            title="Remove this alias"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#ef4444',
                              borderRadius: '6px',
                              padding: '9px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <X size={15} />
                          </button>
                        ) : (
                          <div style={{ width: '35px' }}></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add More Alias Button */}
              <div style={{ paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={handleAddAlias}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#4338ca',
                    border: '1px dashed #818cf8',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    transition: 'all 0.15s'
                  }}
                >
                  <Plus size={13} /> + Add More Alias
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Product Description (Product Uses)
              </label>
              <textarea className="premium-input" style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s', minHeight: '100px', resize: 'vertical' }} value={product.short_description || ''} onChange={e => setProduct({ ...product, short_description: e.target.value })} placeholder="Short description / product uses..."></textarea>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Product Information
              </label>
              <textarea
                className="premium-input"
                rows={4}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s', minHeight: '90px', resize: 'vertical' }}
                value={product.product_info || ''}
                onChange={e => setProduct({ ...product, product_info: e.target.value })}
                placeholder="Enter detailed specifications, descriptions, or product notes..."
              />
            </div>

            {/* HAS VARIANTS TOGGLE */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: hasVariants === 'Yes' ? '#eef2ff' : '#f8fafc',
                border: '1px solid',
                borderColor: hasVariants === 'Yes' ? '#c7d2fe' : '#e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={20} color="#4338ca" />
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>
                    This product has multiple variants (e.g. Flavors, Sizes, Volumes)
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 28px', fontSize: '0.82rem', color: '#64748b' }}>
                  Manage variant matrix, Cartesian combinations, distinct unit QR codes, and multi-pack cartons.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.92rem', fontWeight: '700', color: hasVariants === 'Yes' ? '#4338ca' : '#64748b' }}>
                  <input
                    type="radio"
                    name="details_has_variants_toggle"
                    value="Yes"
                    checked={hasVariants === 'Yes'}
                    onChange={() => setHasVariants('Yes')}
                  />
                  Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.92rem', fontWeight: '700', color: hasVariants === 'No' ? '#4338ca' : '#64748b' }}>
                  <input
                    type="radio"
                    name="details_has_variants_toggle"
                    value="No"
                    checked={hasVariants === 'No'}
                    onChange={() => setHasVariants('No')}
                  />
                  No
                </label>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed #e2e8f0' }}>
              <AttributeBuilder attributes={attributes} setAttributes={setAttributes} />
            </div>
          </div>

          {/* VARIANT MATRIX BUILDER CARD (WHEN ENABLED) */}
          {hasVariants === 'Yes' && (
            <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid #c7d2fe', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e0e7ff', paddingBottom: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ backgroundColor: '#e0e7ff', padding: '6px', borderRadius: '8px', color: '#4338ca' }}>
                    <Layers size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                      Product Variants Matrix & Packaging QR
                    </h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      Real-time Cartesian product calculation, individual QR codes, and multi-pack (e.g. Pack of 24) carton labels.
                    </p>
                  </div>
                </div>
                <span style={{ backgroundColor: '#ede9fe', color: '#4338ca', padding: '4px 12px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '700' }}>
                  {productVariants.length} Active Combinations
                </span>
              </div>

              <VariantMatrixBuilder
                baseProductName={product.product_name}
                baseSku={product.sku || product.internal_sku}
                basePrice={product.selling_price || product.mrp || product.purchase_price || '0.00'}
                currency={product.currency || 'INR'}
                costingMethod={costingMethod}
                baseProductInfo={product.product_info || ''}
                baseReorderLevel={product.reorder_level}
                baseReorderQty={product.reorder_qty}
                baseSafetyStock={product.safety_stock}
                baseLeadTimeDays={product.lead_time_days}
                attributes={variantAttributes}
                onChangeAttributes={setVariantAttributes}
                variants={productVariants}
                onChangeVariants={setProductVariants}
              />
            </div>
          )}

          {/* PHYSICAL DETAILS CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '24px' }}>Physical Details</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Product Type</label>
                <select
                  className="premium-input"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                  value={product.product_type_id || (productTypesList.find(t => t.name?.toLowerCase() === (product.item_type || product.product_type || '').toLowerCase())?.id) || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = productTypesList.find(t => String(t.id) === String(val)) || productTypesList.find(t => t.name === val);
                    setProduct({
                      ...product,
                      product_type_id: found ? found.id : (Number(val) || null),
                      item_type: found ? found.name : val,
                      product_type: found ? found.name : val
                    });
                  }}
                >
                  <option value="">Select Type</option>
                  {productTypesList.length > 0 ? (
                    productTypesList.map((t) => (
                      <option key={t.id || t.name} value={t.id}>
                        {t.name} {t.tracks_inventory === false || t.tracks_inventory === 0 || t.tracks_inventory === 'false' ? '(Service - No Stock)' : ''}
                      </option>
                    ))
                  ) : (
                    ["Goods", "Service", "Combo", "Consumable", "Solid", "Liquid", "Gas"].map((t, idx) => <option key={idx} value={t}>{t}</option>)
                  )}
                </select>
                {isServiceType && (
                  <div style={{ marginTop: '6px', fontSize: '0.74rem', fontWeight: '700', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    Service Item: Physical stock tracking bypassed
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Physical Appearance</label>
                <select className="premium-input" style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }} value={product.physical_appearance || product.physical_shape || ''} onChange={e => setProduct({ ...product, physical_appearance: e.target.value, physical_shape: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="Powder">Powder</option>
                  <option value="Granules">Granules</option>
                  <option value="Flakes">Flakes</option>
                  <option value="Paste">Paste</option>
                  <option value="Pellets">Pellets</option>
                  <option value="Sheet / Plate">Sheet / Plate</option>
                  <option value="Cylinder / Round">Cylinder / Round</option>
                  <option value="Box / Cube">Box / Cube</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Size</label>
                <input className="premium-input" type="text" placeholder="Enter size..." style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }} value={product.size || ''} onChange={e => setProduct({ ...product, size: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Packaging</label>
                <select className="premium-input" style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }} value={product.packaging || ''} onChange={e => setProduct({ ...product, packaging: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="Box / Carton">Box / Carton</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Bag / Pouch">Bag / Pouch</option>
                  <option value="Can / Tin">Can / Tin</option>
                  <option value="Drum / Barrel">Drum / Barrel</option>
                  <option value="Packet / Sachet">Packet / Sachet</option>
                  <option value="Blister Pack">Blister Pack</option>
                  <option value="Tube">Tube</option>
                  <option value="Jar">Jar</option>
                  <option value="Strips">Strips</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Length</label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <select
                      style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#eef2f6', color: '#4338ca', fontSize: '0.75rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                      value={dimensionUnit}
                      onChange={(e) => setDimensionUnit(e.target.value)}
                      title="Dimension Unit"
                    >
                      <option value="cm">cm</option>
                      <option value="mm">mm</option>
                      <option value="m">m</option>
                      <option value="in">in</option>
                      <option value="ft">ft</option>
                      <option value="custom">+ Custom...</option>
                    </select>
                    {dimensionUnit === 'custom' && (
                      <input
                        type="text"
                        placeholder="unit (e.g. yd)"
                        value={customDimensionUnit}
                        onChange={(e) => setCustomDimensionUnit(e.target.value)}
                        style={{ width: '80px', padding: '2px 6px', border: '1px solid #4338ca', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', outline: 'none' }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="premium-input"
                    type="text"
                    placeholder="Enter length..."
                    style={{ width: '100%', padding: '12px 48px 12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                    value={product.length ? (dimensionUnit === 'custom' && customDimensionUnit ? product.length.replace(new RegExp(`\\s*${customDimensionUnit.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'), '') : product.length.replace(/\s*(cm|mm|m|in|ft)$/i, '')) : ''}
                    onChange={e => setProduct({ ...product, length: e.target.value })}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>{dimensionUnit === 'custom' ? (customDimensionUnit || 'unit') : dimensionUnit}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Breadth</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="premium-input"
                    type="text"
                    placeholder="Enter breadth..."
                    style={{ width: '100%', padding: '12px 48px 12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                    value={product.breadth ? (dimensionUnit === 'custom' && customDimensionUnit ? product.breadth.replace(new RegExp(`\\s*${customDimensionUnit.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'), '') : product.breadth.replace(/\s*(cm|mm|m|in|ft)$/i, '')) : ''}
                    onChange={e => setProduct({ ...product, breadth: e.target.value })}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>{dimensionUnit === 'custom' ? (customDimensionUnit || 'unit') : dimensionUnit}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Thickness / Height</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="premium-input"
                    type="text"
                    placeholder="Enter thickness..."
                    style={{ width: '100%', padding: '12px 48px 12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                    value={product.thickness ? (dimensionUnit === 'custom' && customDimensionUnit ? product.thickness.replace(new RegExp(`\\s*${customDimensionUnit.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'), '') : product.thickness.replace(/\s*(cm|mm|m|in|ft)$/i, '')) : ''}
                    onChange={e => setProduct({ ...product, thickness: e.target.value })}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>{dimensionUnit === 'custom' ? (customDimensionUnit || 'unit') : dimensionUnit}</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Volume</label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <select
                      style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#eef2f6', color: '#4338ca', fontSize: '0.75rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                      value={volumeUnit}
                      onChange={(e) => setVolumeUnit(e.target.value)}
                      title="Volume Unit"
                    >
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="fl oz">fl oz</option>
                      <option value="gal">gal</option>
                      <option value="custom">+ Custom...</option>
                    </select>
                    {volumeUnit === 'custom' && (
                      <input
                        type="text"
                        placeholder="unit (e.g. cc)"
                        value={customVolumeUnit}
                        onChange={(e) => setCustomVolumeUnit(e.target.value)}
                        style={{ width: '80px', padding: '2px 6px', border: '1px solid #4338ca', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', outline: 'none' }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="premium-input"
                    type="text"
                    placeholder="Enter volume..."
                    style={{ width: '100%', padding: '12px 48px 12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                    value={product.volume ? (volumeUnit === 'custom' && customVolumeUnit ? product.volume.replace(new RegExp(`\\s*${customVolumeUnit.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'), '') : product.volume.replace(/\s*(ml|l|fl oz|gal)$/i, '')) : ''}
                    onChange={e => setProduct({ ...product, volume: e.target.value })}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>{volumeUnit === 'custom' ? (customVolumeUnit || 'unit') : volumeUnit}</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Net Weight</label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <select
                      style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#eef2f6', color: '#4338ca', fontSize: '0.75rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value)}
                      title="Weight Unit"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="mg">mg</option>
                      <option value="lb">lb</option>
                      <option value="oz">oz</option>
                      <option value="custom">+ Custom...</option>
                    </select>
                    {weightUnit === 'custom' && (
                      <input
                        type="text"
                        placeholder="unit (e.g. ton)"
                        value={customWeightUnit}
                        onChange={(e) => setCustomWeightUnit(e.target.value)}
                        style={{ width: '80px', padding: '2px 6px', border: '1px solid #4338ca', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', outline: 'none' }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="premium-input"
                    type="text"
                    placeholder="Enter net weight..."
                    style={{ width: '100%', padding: '12px 48px 12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                    value={product.net_weight ? (weightUnit === 'custom' && customWeightUnit ? product.net_weight.replace(new RegExp(`\\s*${customWeightUnit.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'), '') : product.net_weight.replace(/\s*(kg|g|mg|lb|oz)$/i, '')) : ''}
                    onChange={e => setProduct({ ...product, net_weight: e.target.value })}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>{weightUnit === 'custom' ? (customWeightUnit || 'unit') : weightUnit}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Gross Weight</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="premium-input"
                    type="text"
                    placeholder="Enter gross weight..."
                    style={{ width: '100%', padding: '12px 48px 12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                    value={product.gross_weight ? (weightUnit === 'custom' && customWeightUnit ? product.gross_weight.replace(new RegExp(`\\s*${customWeightUnit.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'), '') : product.gross_weight.replace(/\s*(kg|g|mg|lb|oz)$/i, '')) : ''}
                    onChange={e => setProduct({ ...product, gross_weight: e.target.value })}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>{weightUnit === 'custom' ? (customWeightUnit || 'unit') : weightUnit}</span>
                </div>
              </div>
            </div>

            {/* PRODUCT SPECIFICATIONS & DETAILS OVERVIEW */}
            <div style={{ marginTop: '24px', padding: '18px 22px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Info size={16} color="#4338ca" />
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Product Specifications & Detailed Information Overview
                </span>
              </div>
              {product.product_info ? (
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                  {product.product_info}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No detailed information provided
                </p>
              )}
            </div>
          </div>

          {/* IDENTIFIERS & PRICING CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '24px' }}>Identifiers & Pricing</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>
                  SKU (Stock Keeping Unit) {hasVariants === 'Yes' && <span style={{ color: '#6366f1', fontSize: '0.8rem' }}>(Template / Base)</span>}
                </label>
                <input
                  className="premium-input"
                  type="text"
                  placeholder={hasVariants === 'Yes' ? "Auto-managed per variant" : "e.g. SKU-PROD-001"}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: hasVariants === 'Yes' ? '#f1f5f9' : '#f8fafc',
                    color: '#1e293b',
                    outline: 'none',
                    transition: 'all 0.2s',
                    cursor: hasVariants === 'Yes' ? 'not-allowed' : 'text'
                  }}
                  value={product.sku || product.internal_sku || ''}
                  disabled={hasVariants === 'Yes'}
                  onChange={e => setProduct({ ...product, sku: e.target.value, internal_sku: e.target.value })}
                />
                {hasVariants === 'Yes' && (
                  <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '4px' }}>
                    Variant SKUs are configured in the Variants Matrix section above.
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Product Code (Auto)</label>
                <input type="text" style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#94a3b8', outline: 'none', cursor: 'not-allowed' }} value={product.product_code || ''} disabled />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <BarcodeUploader
                  barcodeValue={product.gtin_ean_upc || ''}
                  barcodeImageUrl={product.barcode_image_url || ''}
                  onBarcodeValueChange={(val) => setProduct({ ...product, gtin_ean_upc: val })}
                  onBarcodeImageChange={(url) => setProduct({ ...product, barcode_image_url: url })}
                  label="Barcode / UPC (Universal Product Code)"
                  productName={product.name || ''}
                  sku={product.sku || ''}
                  productCode={product.product_code || ''}
                  sellingPrice={product.selling_price || product.selling_price_retail || ''}
                  mrp={product.mrp || ''}
                  currency={product.currency || 'INR'}
                  hsnCode={product.hsn_code || ''}
                  batchNumber={product.batch_number || ''}
                  expiryDate={product.expiry_date || ''}
                  bestBeforeDate={product.best_before_date || ''}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>HSN Code</label>
                <input
                  className="premium-input"
                  type="text"
                  placeholder="e.g. 1905, 8517.12.00"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                  value={product.hsn_code || ''}
                  onChange={(e) => setProduct({ ...product, hsn_code: e.target.value })}
                />
              </div>
            </div>

            {/* Selling Price Calculation Mode & Round Off */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡</span> Selling Price Calculation Mode
                </span>

                {/* Round Off Toggle (Yes / No) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
                    Round Off (e.g. 10.12 → 10)?
                  </span>
                  <button
                    type="button"
                    onClick={() => setRoundOff(!roundOff)}
                    style={{
                      padding: '4px 14px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: roundOff ? '#10b981' : '#cbd5e1',
                      color: roundOff ? '#ffffff' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {roundOff ? 'YES' : 'NO'}
                  </button>
                </div>
              </div>

              {/* Mode selector buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setPricingMethod('PROFIT_ON_COST')}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid ' + (pricingMethod === 'PROFIT_ON_COST' ? '#4338ca' : '#cbd5e1'),
                    backgroundColor: pricingMethod === 'PROFIT_ON_COST' ? '#e0e7ff' : '#ffffff',
                    color: pricingMethod === 'PROFIT_ON_COST' ? '#4338ca' : '#475569',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  + Profit % on Cost (Purchase Price)
                </button>

                <button
                  type="button"
                  onClick={() => setPricingMethod('DISCOUNT_ON_MRP')}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid ' + (pricingMethod === 'DISCOUNT_ON_MRP' ? '#4338ca' : '#cbd5e1'),
                    backgroundColor: pricingMethod === 'DISCOUNT_ON_MRP' ? '#e0e7ff' : '#ffffff',
                    color: pricingMethod === 'DISCOUNT_ON_MRP' ? '#4338ca' : '#475569',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  - % Discount on MRP
                </button>

                <button
                  type="button"
                  onClick={() => setPricingMethod('DISCOUNT_ON_SELLING_PRICE')}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid ' + (pricingMethod === 'DISCOUNT_ON_SELLING_PRICE' ? '#4338ca' : '#cbd5e1'),
                    backgroundColor: pricingMethod === 'DISCOUNT_ON_SELLING_PRICE' ? '#e0e7ff' : '#ffffff',
                    color: pricingMethod === 'DISCOUNT_ON_SELLING_PRICE' ? '#4338ca' : '#475569',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🏷️ - % Offer on Selling Price
                </button>

                <button
                  type="button"
                  onClick={() => setPricingMethod('MANUAL')}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid ' + (pricingMethod === 'MANUAL' ? '#4338ca' : '#cbd5e1'),
                    backgroundColor: pricingMethod === 'MANUAL' ? '#e0e7ff' : '#ffffff',
                    color: pricingMethod === 'MANUAL' ? '#4338ca' : '#475569',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Manual Price Entry
                </button>
              </div>

              {/* Percentage input for active mode */}
              {pricingMethod === 'PROFIT_ON_COST' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                    Target Profit % on Purchase Price (Cost: {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {product.purchase_price || 0}):
                  </label>
                  <div style={{ position: 'relative', width: '130px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="e.g. 15"
                      value={profitOnCostPercent}
                      onChange={(e) => setProfitOnCostPercent(e.target.value)}
                      style={{ width: '100%', padding: '6px 24px 6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'right' }}
                    />
                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#94a3b8' }}>%</span>
                  </div>
                  {product.selling_price && product.purchase_price && (
                    <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: '600', backgroundColor: '#dcfce7', padding: '4px 12px', borderRadius: '6px' }}>
                      Calculated Price: {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {product.selling_price} (Profit: +{product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {(parseFloat(product.selling_price) - parseFloat(product.purchase_price)).toFixed(2)})
                    </span>
                  )}
                </div>
              )}

              {pricingMethod === 'DISCOUNT_ON_MRP' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                    Discount % off on MRP (MRP: {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {product.mrp || 0}):
                  </label>
                  <div style={{ position: 'relative', width: '130px' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g. 10"
                      value={discountOnMrpPercent}
                      onChange={(e) => setDiscountOnMrpPercent(e.target.value)}
                      style={{ width: '100%', padding: '6px 24px 6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'right' }}
                    />
                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#94a3b8' }}>%</span>
                  </div>
                  {product.selling_price && product.mrp && (
                    <span style={{ fontSize: '0.85rem', color: '#4338ca', fontWeight: '600', backgroundColor: '#ede9fe', padding: '4px 12px', borderRadius: '6px' }}>
                      Calculated Price: {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {product.selling_price} (Save: {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {(parseFloat(product.mrp) - parseFloat(product.selling_price)).toFixed(2)})
                    </span>
                  )}
                </div>
              )}

              {pricingMethod === 'DISCOUNT_ON_SELLING_PRICE' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                    Base Selling Price:
                  </label>
                  <div style={{ position: 'relative', width: '120px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={product.mrp || product.selling_price || "0.00"}
                      value={baseSellingPrice}
                      onChange={(e) => setBaseSellingPrice(e.target.value)}
                      style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                    Offer % off:
                  </label>
                  <div style={{ position: 'relative', width: '110px' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g. 10"
                      value={discountOnSellingPricePercent}
                      onChange={(e) => setDiscountOnSellingPricePercent(e.target.value)}
                      style={{ width: '100%', padding: '6px 24px 6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'right' }}
                    />
                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#94a3b8' }}>%</span>
                  </div>
                  {product.selling_price && (
                    <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: '600', backgroundColor: '#dcfce7', padding: '4px 12px', borderRadius: '6px' }}>
                      Discounted Selling Price: {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {product.selling_price}
                    </span>
                  )}
                </div>
              )}

              {/* Offer & Scheme Explanation Note */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '0.8rem', color: '#64748b' }}>
                🏷️ <strong>Pricing Guide:</strong> Set your selling price based on <strong>Purchase Price (Cost + Profit %)</strong>, <strong>MRP (- Discount %)</strong>, or <strong>Base Selling Price (- Offer %)</strong>. Special BOGO & Turnover schemes are configured below in <strong>🎁 Product Schemes & Targets</strong>.
              </div>
            </div>

            {/* Costing & Valuation Method */}
            <div style={{ marginBottom: '24px', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', color: '#1e293b', fontSize: '0.88rem', fontWeight: '700', marginBottom: '6px' }}>
                    Costing & Valuation Method
                  </label>
                  <select
                    className="premium-input"
                    value={costingMethod}
                    onChange={(e) => setCostingMethod(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '460px',
                      padding: '10px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="FIFO">FIFO (First-In, First-Out) - Recommended</option>
                    <option value="AVCO">Average Cost (AVCO)</option>
                    <option value="NONE">None (Manual / Fixed Cost)</option>
                    <option value="BATCH">Batch / Lot Tracking</option>
                  </select>
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#6366f1', fontSize: '0.95rem' }}>ℹ️</span>
                  <span>
                    {costingMethod === 'AVCO' && "Automatically recalculates the average purchase price when new stock arrives."}
                    {costingMethod === 'NONE' && "Purchase price remains fixed and is never updated automatically."}
                    {costingMethod === 'BATCH' && "Tracks individual batch numbers and expiry dates for each shipment."}
                    {costingMethod === 'FIFO' && "Considers oldest purchased stock first when calculating margins."}
                  </span>
                </div>
              </div>
            </div>

            {/* Operational Expense Head & Landed Cost Integration (Section 2.D) */}
            <div style={{ 
              backgroundColor: '#f8fafc', 
              border: '1px solid #cbd5e1', 
              borderRadius: '12px', 
              padding: '18px 20px', 
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              {/* Header & Quick Action Presets */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={18} style={{ color: '#059669' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>
                      Operational Expenses & Base Unit Cost (Expense Master)
                    </span>
                    <span style={{ fontSize: '0.72rem', backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '999px', fontWeight: '700', border: '1px solid #a7f3d0' }}>
                      Landed Cost Engine
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                    Attach product-level operational charges (packaging, making charges, handling, freight inward) directly to compute accurate base unit cost.
                  </p>
                </div>

                {/* Quick Preset Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginRight: '4px' }}>Quick Attach:</span>
                  <button
                    type="button"
                    onClick={() => handleAddAttachedExpense('Packaging Charges')}
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.75rem', fontWeight: '600', padding: '5px 10px',
                      backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                      borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                  >
                    <Plus size={13} /> Packaging
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAttachedExpense('Making Charges')}
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.75rem', fontWeight: '600', padding: '5px 10px',
                      backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe',
                      borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                  >
                    <Plus size={13} /> Making Charges
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAttachedExpense('Handling Charges')}
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.75rem', fontWeight: '600', padding: '5px 10px',
                      backgroundColor: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff',
                      borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3e8ff'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#faf5ff'}
                  >
                    <Plus size={13} /> Handling
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAttachedExpense('')}
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.75rem', fontWeight: '600', padding: '5px 10px',
                      backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1',
                      borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <Plus size={13} /> Custom Expense
                  </button>
                </div>
              </div>

              {/* Attached Expenses List / Table */}
              {attachedExpenses.length === 0 ? (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  marginBottom: '14px'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#64748b' }}>
                    No additional operational charges attached. Base unit cost is currently equal to purchase price ({product.currency || 'INR'} {parseFloat(product?.purchase_price || 0).toFixed(2)}).
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleAddAttachedExpense('')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.78rem', fontWeight: '600', padding: '6px 14px',
                        backgroundColor: '#4338ca', color: '#ffffff', border: 'none',
                        borderRadius: '6px', cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} /> Attach First Operational Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddExpenseModal(true)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.78rem', fontWeight: '600', padding: '6px 14px',
                        backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                        borderRadius: '6px', cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} /> + Add Expense Head
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 120px 1.6fr 36px', gap: '10px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '4px' }}>
                      <span>Expense Head (Master)</span>
                      <button
                        type="button"
                        onClick={() => setShowAddExpenseModal(true)}
                        title="Add new Expense Head to Master"
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #c7d2fe',
                          color: '#4338ca',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'all 0.15s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                      >
                        <Plus size={11} /> Add Expense
                      </button>
                    </div>
                    <div>Amount ({product.currency || 'INR'})</div>
                    <div>Purpose / Notes</div>
                    <div></div>
                  </div>
                  {attachedExpenses.map((exp, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 120px 1.6fr 36px', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                      <div>
                        <select
                          value={exp.expense_id || ''}
                          onChange={(e) => handleUpdateAttachedExpense(idx, 'expense_id', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#ffffff', outline: 'none' }}
                        >
                          <option value="">Select Expense Head</option>
                          {expensesList.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                          {exp.expense_name && !expensesList.some(x => String(x.id) === String(exp.expense_id) || x.name === exp.expense_name) && (
                            <option value={exp.expense_id || exp.expense_name}>{exp.expense_name}</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={exp.amount}
                          onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                          onChange={(e) => handleUpdateAttachedExpense(idx, 'amount', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#ffffff', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="e.g. Polybag, craftsmanship, transport handling"
                          value={exp.note || ''}
                          onChange={(e) => handleUpdateAttachedExpense(idx, 'note', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#ffffff', outline: 'none' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          title="Remove this expense"
                          onClick={() => handleRemoveAttachedExpense(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleAddAttachedExpense('')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontSize: '0.75rem', fontWeight: '600', padding: '6px 12px',
                        backgroundColor: '#ffffff', color: '#4338ca', border: '1px solid #cbd5e1',
                        borderRadius: '6px', cursor: 'pointer'
                      }}
                    >
                      <Plus size={13} /> Add Another Expense Line
                    </button>
                  </div>
                </div>
              )}

              {/* Live Base Unit Cost Summary Card */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                      Base Purchase Price
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                      {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {parseFloat(product?.purchase_price || 0).toFixed(2)}
                    </strong>
                  </div>
                  <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>+</span>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                      Total Attached Expenses ({attachedExpenses.length})
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                      {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {totalAttachedExpense.toFixed(2)}
                    </strong>
                  </div>
                  <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>=</span>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#15803d', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Calculated Base Unit Cost (Landed Cost)
                    </span>
                    <strong style={{ fontSize: '1.25rem', color: '#14532d', fontWeight: '800' }}>
                      {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))} {landedPurchaseCost.toFixed(2)}
                    </strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: '#166534', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontWeight: '600', border: '1px solid #86efac' }}>
                    Used for Profit Margins & Pricing Formulas
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 120px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Currency</label>
                <select className="premium-input" style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }} value={product.currency || 'INR'} onChange={(e) => setProduct({ ...product, currency: e.target.value })}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Purchase Price</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>
                    {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))}
                  </span>
                  <input
                    className="premium-input"
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '12px 16px 12px 32px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                    value={product.purchase_price || ''}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) setProduct({ ...product, purchase_price: val });
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>
                  Selling Price {hasVariants === 'Yes' && <span style={{ color: '#6366f1', fontSize: '0.8rem' }}>(Base)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>
                    {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))}
                  </span>
                  <input
                    className="premium-input"
                    type="number"
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 32px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: hasVariants === 'Yes' ? '#f1f5f9' : '#f8fafc',
                      color: '#1e293b',
                      outline: 'none',
                      transition: 'all 0.2s',
                      cursor: hasVariants === 'Yes' ? 'not-allowed' : 'text'
                    }}
                    value={product.selling_price || ''}
                    disabled={hasVariants === 'Yes'}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) setProduct({ ...product, selling_price: val });
                    }}
                  />
                </div>
                {hasVariants === 'Yes' && (
                  <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '4px' }}>
                    Variant prices are configured in the Variants Matrix section above.
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>MRP</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>
                    {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))}
                  </span>
                  <input
                    className="premium-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px 16px 12px 32px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                    value={product.mrp || ''}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) setProduct({ ...product, mrp: val });
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Distributor Price</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>
                    {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))}
                  </span>
                  <input
                    className="premium-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px 16px 12px 32px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                    value={product.distributor_price || ''}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) setProduct({ ...product, distributor_price: val });
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Purchase Quantity</label>
                <input
                  className="premium-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                  value={product.purchase_quantity ?? ''}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || parseInt(val, 10) >= 0) {
                      setProduct({ ...product, purchase_quantity: val === '' ? '' : parseInt(val, 10) });
                    }
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>GST Rate (%)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="premium-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px 32px 12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                    value={product.gst_rate || ''}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) setProduct({ ...product, gst_rate: val });
                    }}
                  />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>%</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Profit Percent (%)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="premium-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px 32px 12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                    value={product.profit_percent || ''}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) setProduct({ ...product, profit_percent: val });
                    }}
                  />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>%</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Selling Price (Wholesale)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>
                    {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))}
                  </span>
                  <input
                    className="premium-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px 16px 12px 32px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                    value={product.selling_price_wholesale || ''}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) setProduct({ ...product, selling_price_wholesale: val });
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Selling Price (Retail / MRP)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>
                    {product.currency === 'INR' ? '₹' : (product.currency === 'EUR' ? '€' : (product.currency === 'GBP' ? '£' : '$'))}
                  </span>
                  <input
                    className="premium-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px 16px 12px 32px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                    value={product.selling_price_retail || ''}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) setProduct({ ...product, selling_price_retail: val });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Schemes & Targets Section */}
            {/* COMPANY SCHEMES MATCH & SYNC BANNER */}
            {companyName && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: companyInheritedSchemes?.hasSchemes ? '#f0fdf4' : '#f8fafc',
                border: companyInheritedSchemes?.hasSchemes ? '1px solid #86efac' : '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: companyInheritedSchemes?.hasSchemes ? '#dcfce7' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: companyInheritedSchemes?.hasSchemes ? '#16a34a' : '#64748b'
                  }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                        {companyName} Trade Schemes Engine
                      </strong>
                      {companyInheritedSchemes?.hasSchemes ? (
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                          ✓ Company Policy Available
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                          No default company schemes
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      {companyInheritedSchemes?.hasSchemes
                        ? `Default BOGO, discounts, and turnover rebates configured for ${companyName} match directly with this product.`
                        : `You can configure custom trade schemes below or define defaults in the Companies module.`}
                    </p>
                  </div>
                </div>

                {companyInheritedSchemes?.hasSchemes && (
                  <button
                    type="button"
                    onClick={handleApplyCompanySchemes}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                    }}
                  >
                    <Sparkles size={14} /> Re-apply Company Schemes
                  </button>
                )}
              </div>
            )}

            {/* ZERO-ERROR PRODUCT SCHEMES & TARGETS ENGINE */}
            <ProductSchemesManager
              product={product}
              onChange={(field, value) => {
                setProduct(prev => ({ ...prev, [field]: value }));
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Lot Number</label>
                <input
                  className="premium-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 102401"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                  value={product.lot_number || ''}
                  onKeyDown={(e) => {
                    if (
                      !/^\d$/.test(e.key) &&
                      !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(e.key) &&
                      !e.ctrlKey &&
                      !e.metaKey
                    ) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setProduct({ ...product, lot_number: val });
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Batch Number</label>
                <input
                  className="premium-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 9901"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                  value={product.batch_number || ''}
                  onKeyDown={(e) => {
                    if (
                      !/^\d$/.test(e.key) &&
                      !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(e.key) &&
                      !e.ctrlKey &&
                      !e.metaKey
                    ) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setProduct({ ...product, batch_number: val });
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Manufacturing Date (MFG)</label>
                <input
                  className="premium-input"
                  type="date"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                  value={product.manufacturing_date || ''}
                  onChange={(e) => setProduct({ ...product, manufacturing_date: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Expiry Date (EXP)</label>
                <input
                  className="premium-input"
                  type="date"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                  value={product.expiry_date || ''}
                  onChange={(e) => setProduct({ ...product, expiry_date: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Best Before Date</label>
                <input
                  className="premium-input"
                  type="date"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                  value={product.best_before_date || ''}
                  onChange={(e) => setProduct({ ...product, best_before_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* RACKBIN (WAREHOUSE) CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>Rackbin (Warehouse)</h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Warehouse Storage & Rackbin Allocation</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>Warehouse</label>
                <select
                  className="premium-input"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                  value={product.warehouse_location || ''}
                  onChange={(e) => {
                    const selectedWh = warehouses.find(w => w.name === e.target.value || String(w.id) === e.target.value);
                    setProduct({
                      ...product,
                      warehouse_location: selectedWh ? selectedWh.name : e.target.value,
                      default_warehouse_id: selectedWh ? selectedWh.id : (product.default_warehouse_id || null)
                    });
                  }}
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.name}>
                      {(w.warehouse_code || w.code) ? `[${w.warehouse_code || w.code}] ` : ''}{w.name} {w.is_default ? '★ (Default)' : ''} - ({w.warehouse_type || w.type || 'Warehouse'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rack Number (Cascading Dropdown) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: '#475569', fontSize: '0.95rem', fontWeight: '500', margin: 0 }}>Rack Number</label>
                  <button
                    type="button"
                    onClick={() => handleOpenDetailsAddCoordinateModal('rack')}
                    style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.82rem', padding: 0, fontWeight: '600' }}
                  >
                    + Add Rack
                  </button>
                </div>
                <select
                  className="premium-input"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: product.warehouse_location ? '#f8fafc' : '#f1f5f9',
                    color: '#1e293b',
                    outline: 'none',
                    fontSize: '0.92rem',
                    fontWeight: '500',
                    cursor: product.warehouse_location ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!product.warehouse_location}
                  value={product.rack_number || ''}
                  onChange={(e) => {
                    setProduct({ ...product, rack_number: e.target.value, shelf_number: '', bin_location: '' });
                  }}
                >
                  <option value="">
                    {!product.warehouse_location ? 'Select Warehouse First' : (availableProductRacks.length === 0 ? '-- No Racks Found (Click + Add Rack) --' : '-- Choose Rack --')}
                  </option>
                  {availableProductRacks.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Shelf Number (Cascading Dropdown) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: '#475569', fontSize: '0.95rem', fontWeight: '500', margin: 0 }}>Shelf Number</label>
                  <button
                    type="button"
                    onClick={() => handleOpenDetailsAddCoordinateModal('shelf')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: product.rack_number ? '#4338ca' : '#94a3b8',
                      cursor: product.rack_number ? 'pointer' : 'not-allowed',
                      fontSize: '0.82rem',
                      padding: 0,
                      fontWeight: '600'
                    }}
                  >
                    + Add Shelf
                  </button>
                </div>
                <select
                  className="premium-input"
                  disabled={!product.rack_number}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: product.rack_number ? '#f8fafc' : '#f1f5f9',
                    color: '#1e293b',
                    outline: 'none',
                    fontSize: '0.92rem',
                    fontWeight: '500',
                    cursor: product.rack_number ? 'pointer' : 'not-allowed'
                  }}
                  value={product.shelf_number || ''}
                  onChange={(e) => {
                    setProduct({ ...product, shelf_number: e.target.value, bin_location: '' });
                  }}
                >
                  <option value="">
                    {!product.rack_number ? 'Select Rack First' : (availableProductShelves.length === 0 ? '-- No Shelves Found (Click + Add Shelf) --' : '-- Choose Shelf --')}
                  </option>
                  {availableProductShelves.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Bin Location (Cascading Dropdown) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: '#475569', fontSize: '0.95rem', fontWeight: '500', margin: 0 }}>Bin Location</label>
                  <button
                    type="button"
                    onClick={() => handleOpenDetailsAddCoordinateModal('bin')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: product.shelf_number ? '#4338ca' : '#94a3b8',
                      cursor: product.shelf_number ? 'pointer' : 'not-allowed',
                      fontSize: '0.82rem',
                      padding: 0,
                      fontWeight: '600'
                    }}
                  >
                    + Add Bin
                  </button>
                </div>
                <select
                  className="premium-input"
                  disabled={!product.shelf_number && !product.rack_number}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: (product.shelf_number || product.rack_number) ? '#f8fafc' : '#f1f5f9',
                    color: '#1e293b',
                    outline: 'none',
                    fontSize: '0.92rem',
                    fontWeight: '500',
                    cursor: (product.shelf_number || product.rack_number) ? 'pointer' : 'not-allowed'
                  }}
                  value={product.bin_location || ''}
                  onChange={(e) => {
                    setProduct({ ...product, bin_location: e.target.value });
                  }}
                >
                  <option value="">
                    {!product.shelf_number ? 'Select Shelf First' : (availableProductBins.length === 0 ? '-- No Bins Found (Click + Add Bin) --' : '-- Choose Bin --')}
                  </option>
                  {availableProductBins.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Warehouse Allocation Table if product has allocations */}
            {product.warehouse_allocations && product.warehouse_allocations.length > 0 && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
                  Multi-Warehouse Inventory Stock & Racking Allocations
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#2c3e50', borderBottom: '1px solid #1a252f', color: '#ffffff', textAlign: 'center' }}>
                        <th style={{ padding: '8px 12px', width: '60px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>Sr. No.</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>Warehouse</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>Current Stock</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>Opening Stock</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>Rack</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>Shelf</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>Bin</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>Primary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.warehouse_allocations.map((alloc, idx) => (
                        <tr key={alloc.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a', textAlign: 'center', verticalAlign: 'middle' }}>
                            {alloc.warehouse?.name || `Warehouse #${alloc.warehouse_id}`}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' }}>
                            {alloc.current_stock ?? alloc.opening_stock ?? 0}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b', textAlign: 'center', verticalAlign: 'middle' }}>
                            {alloc.opening_stock ?? 0}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>{alloc.rack_number || '-'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>{alloc.shelf_number || '-'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>{alloc.bin_location || '-'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {alloc.is_primary ? (
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: '600', display: 'inline-block' }}>
                                Primary
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* PRODUCT MEDIA / PHOTOS CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>Product Photos</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {companyInheritedMedia?.images?.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportCompanyImages}
                    style={{
                      background: '#e0e7ff',
                      color: '#4338ca',
                      border: '1px solid #c7d2fe',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <ImageIcon size={13} /> Import from {companyName} Gallery ({companyInheritedMedia.images.length})
                  </button>
                )}
                <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: '600' }}>
                  {(Array.isArray(product.images) ? product.images.length : (product.image_url ? 1 : 0))} photo(s)
                </span>
              </div>
            </div>
            <PhotoUploader
              images={Array.isArray(product.images) ? product.images : (product.image_url ? [product.image_url] : [])}
              onChange={(newImages) => {
                setProduct({
                  ...product,
                  images: newImages,
                  image_url: newImages.length > 0 ? newImages[0] : null
                });
              }}
              maxFiles={15}
            />
          </div>

          {/* PRODUCT VIDEO CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>Product Video</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Upload video demonstration (Max 50 MB, MP4/WebM) or paste link</p>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: '600' }}>
                50 MB Limit
              </span>
            </div>

            {companyInheritedMedia?.videoUrl && product.video_url === companyInheritedMedia.videoUrl && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '0.78rem',
                color: '#1e40af',
                fontWeight: '600'
              }}>
                <span>⚡ Video Auto-Inherited from <strong>{companyName}</strong></span>
                <button
                  type="button"
                  onClick={() => setProduct({ ...product, video_url: '' })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Clear Video
                </button>
              </div>
            )}

            <VideoUploader
              videoUrl={product.video_url || ''}
              onChange={(newUrl) => {
                setProduct({
                  ...product,
                  video_url: newUrl
                });
              }}
            />
          </div>

          {/* PRODUCT BROCHURE CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>Company / Product Brochure PDF</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Digital catalog & technical datasheet</p>
              </div>
            </div>

            {companyBrochure?.url && companyBrochure.url === companyInheritedMedia?.brochureUrl && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '0.78rem',
                color: '#065f46',
                fontWeight: '600'
              }}>
                <span>⚡ Brochure Auto-Inherited from <strong>{companyName}</strong></span>
                <button
                  type="button"
                  onClick={() => setCompanyBrochure({ url: '', name: '', isInherited: false })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Clear Brochure
                </button>
              </div>
            )}

            <BrochureUploader
              brochureUrl={companyBrochure.url}
              brochureName={companyBrochure.name}
              onChange={setCompanyBrochure}
            />
          </div>

          {/* INVENTORY CONTROL & REORDER ENGINE CARD */}
          <div className="premium-card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '32px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Inventory Control & Reorder Intelligence</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure automatic safety thresholds, lead times, and calculation rules</p>
              </div>

              {/* Dynamic Status Badge */}
              {(() => {
                const cur = parseInt(product.purchase_quantity || 0, 10);
                const rLevel = parseInt(product.reorder_level || 0, 10);
                const sStock = parseInt(product.safety_stock || 0, 10);
                let badgeLabel = 'NORMAL';
                let badgeBg = '#dcfce7';
                let badgeColor = '#15803d';

                if (cur <= 0 || (sStock > 0 && cur <= Math.floor(sStock / 2))) {
                  badgeLabel = 'CRITICAL STOCK';
                  badgeBg = '#fee2e2';
                  badgeColor = '#b91c1c';
                } else if (cur <= rLevel) {
                  badgeLabel = 'LOW STOCK';
                  badgeBg = '#fef3c7';
                  badgeColor = '#d97706';
                }

                return (
                  <span style={{ padding: '6px 14px', borderRadius: '999px', fontWeight: '800', fontSize: '0.85rem', backgroundColor: badgeBg, color: badgeColor, letterSpacing: '0.05em' }}>
                    ● {badgeLabel}
                  </span>
                );
              })()}
            </div>

            {/* Reorder Strategy Selector Card */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Reorder Strategy & Intelligence Model
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Select replenishment logic to calculate inventory triggers, safety buffers, and dynamic reorder metrics.
                  </p>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: reorderStrategy === 'EXPIRY_BASED' ? '#ecfdf5' : reorderStrategy === 'SALES_VELOCITY' ? '#eff6ff' : reorderStrategy === 'SEASONAL_DEMAND' ? '#fffbeb' : reorderStrategy === 'JUST_IN_TIME' ? '#faf5ff' : '#f1f5f9',
                  color: reorderStrategy === 'EXPIRY_BASED' ? '#047857' : reorderStrategy === 'SALES_VELOCITY' ? '#1d4ed8' : reorderStrategy === 'SEASONAL_DEMAND' ? '#b45309' : reorderStrategy === 'JUST_IN_TIME' ? '#6b21a8' : '#475569',
                  border: `1px solid ${reorderStrategy === 'EXPIRY_BASED' ? '#a7f3d0' : reorderStrategy === 'SALES_VELOCITY' ? '#bfdbfe' : reorderStrategy === 'SEASONAL_DEMAND' ? '#fde68a' : reorderStrategy === 'JUST_IN_TIME' ? '#e9d5ff' : '#cbd5e1'}`
                }}>
                  {reorderStrategy.replace(/_/g, ' ')}
                </span>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Reorder Strategy
                </label>
                <select
                  value={reorderStrategy}
                  onChange={(e) => setReorderStrategy(e.target.value)}
                  className="premium-input"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontWeight: '600',
                    fontSize: '0.92rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="FIXED_THRESHOLD">Fixed Threshold (Min-Max / Standard ROP) - Recommended for general goods</option>
                  <option value="EXPIRY_BASED">Expiry & Shelf-Life Based (FEFO) - For food, pharma, FMCG & perishables</option>
                  <option value="SALES_VELOCITY">Sales Velocity / Consumption Rate - Dynamic ROP based on daily sales</option>
                  <option value="JUST_IN_TIME">Just-In-Time (JIT) - Replenish only on confirmed Sales Orders</option>
                  <option value="SEASONAL_DEMAND">Seasonal & Occasion Driven - Auto-scales during festival peaks</option>
                </select>
              </div>

              {/* Conditional Strategy Helper Fields */}
              {reorderStrategy === 'EXPIRY_BASED' && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#065f46', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        Expiry Alert Horizon (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={expiryAlertHorizonDays}
                        onChange={(e) => setExpiryAlertHorizonDays(e.target.value)}
                        placeholder="e.g. 30"
                        className="premium-input"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '1px solid #6ee7b7',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          color: '#064e3b',
                          fontWeight: '600',
                          outline: 'none',
                          fontSize: '0.92rem'
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px', display: 'block', lineHeight: '1.4' }}>
                        Trigger low-stock/reorder alert this many days before batch expiry date.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#065f46', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        Minimum Acceptable Shelf Life (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={minShelfLifePercent}
                        onChange={(e) => setMinShelfLifePercent(e.target.value)}
                        placeholder="e.g. 70"
                        className="premium-input"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '1px solid #6ee7b7',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          color: '#064e3b',
                          fontWeight: '600',
                          outline: 'none',
                          fontSize: '0.92rem'
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px', display: 'block', lineHeight: '1.4' }}>
                        Required remaining shelf life percentage when accepting supplier deliveries.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {reorderStrategy === 'SALES_VELOCITY' && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', color: '#1e40af', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        Sales Lookback Window
                      </label>
                      <select
                        value={velocityLookbackDays}
                        onChange={(e) => setVelocityLookbackDays(e.target.value)}
                        className="premium-input"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '1px solid #93c5fd',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          color: '#1e3a8a',
                          fontWeight: '600',
                          outline: 'none',
                          fontSize: '0.92rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="14">Last 14 Days</option>
                        <option value="30">Last 30 Days (Standard)</option>
                        <option value="60">Last 60 Days</option>
                        <option value="90">Last 90 Days (Quarterly)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ display: 'block', color: '#1e40af', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        Dynamic Calculation Formula
                      </span>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#dbeafe',
                        border: '1px solid #93c5fd',
                        color: '#1d4ed8',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        lineHeight: '1.4'
                      }}>
                        Reorder Point (ROP) will be dynamically calculated as: (Average Daily Sales × Lead Time) + Safety Stock.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {reorderStrategy === 'SEASONAL_DEMAND' && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fcd34d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#b45309',
                    fontSize: '1.1rem',
                    flexShrink: 0
                  }}>
                    📈
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: '600', lineHeight: '1.5' }}>
                    Thresholds automatically scale by 1.5x during active dates configured in the 'Schemes & Targets' tab.
                  </div>
                </div>
              )}

              {reorderStrategy === 'JUST_IN_TIME' && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#f3e8ff',
                    border: '1px solid #d8b4fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7e22ce',
                    fontSize: '1.1rem',
                    flexShrink: 0
                  }}>
                    ⚡
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b21a8', fontWeight: '600', lineHeight: '1.5' }}>
                    Holding buffer is kept near zero. Procurement requisitions will only trigger when customer Sales Orders are confirmed.
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* Current Stock (Read-Only) */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Current Stock (Read-Only)</label>
                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '1.1rem', color: '#0f172a' }}>
                  {product.purchase_quantity || 0} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>units</span>
                </div>
              </div>

              {/* Minimum Stock */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Minimum Stock</label>
                <input
                  className="premium-input"
                  type="number"
                  min="0"
                  step="1"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                  value={product.min_stock_level || ''}
                  onChange={(e) => setProduct({ ...product, min_stock_level: e.target.value })}
                  placeholder="e.g. 5"
                />
              </div>

              {/* Maximum Stock */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Maximum Stock</label>
                <input
                  className="premium-input"
                  type="number"
                  min="0"
                  step="1"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                  value={product.max_stock_level || ''}
                  onChange={(e) => setProduct({ ...product, max_stock_level: e.target.value })}
                  placeholder="e.g. 100"
                />
              </div>

              {/* Safety Stock */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Safety Stock (Buffer)</label>
                <input
                  className="premium-input"
                  type="number"
                  min="0"
                  step="1"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                  value={product.safety_stock || ''}
                  onChange={(e) => setProduct({ ...product, safety_stock: e.target.value })}
                  placeholder="e.g. 10"
                />
              </div>

              {/* Lead Time Days */}
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Supplier Lead Time (Days)</label>
                <input
                  className="premium-input"
                  type="number"
                  min="1"
                  step="1"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                  value={product.lead_time_days || ''}
                  onChange={(e) => setProduct({ ...product, lead_time_days: e.target.value })}
                  placeholder="e.g. 7"
                />
              </div>
            </div>

            {/* Reorder Level & Quantity with Auto-Calculate Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', padding: '20px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase' }}>Reorder Level</label>
                  <button
                    type="button"
                    onClick={handleAutoCalculateReorder}
                    style={{ background: 'none', border: 'none', color: '#4338ca', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    ⚡ Auto Calculate
                  </button>
                </div>
                <input
                  className="premium-input"
                  type="number"
                  min="0"
                  step="1"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff', color: '#1e293b', fontWeight: '700', outline: 'none' }}
                  value={product.reorder_level !== undefined && product.reorder_level !== null ? product.reorder_level : ''}
                  onChange={(e) => setProduct({ ...product, reorder_level: e.target.value })}
                  placeholder="e.g. 0"
                />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Formula: (Avg Daily Sales × Lead Time) + Safety Stock</p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase' }}>Reorder Quantity</label>
                  <button
                    type="button"
                    onClick={handleAutoCalculateReorder}
                    style={{ background: 'none', border: 'none', color: '#4338ca', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    ⚡ Auto Calculate
                  </button>
                </div>
                <input
                  className="premium-input"
                  type="number"
                  min="0"
                  step="1"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff', color: '#1e293b', fontWeight: '700', outline: 'none' }}
                  value={product.reorder_qty || ''}
                  onChange={(e) => setProduct({ ...product, reorder_qty: e.target.value })}
                  placeholder="e.g. 50"
                />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Formula: Max Stock Level - Current Stock</p>
              </div>

              {/* Auto Reorder Switch */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={product.auto_reorder || false}
                    onChange={(e) => setProduct({ ...product, auto_reorder: e.target.checked })}
                    style={{ width: '20px', height: '20px', accentColor: '#4338ca' }}
                  />
                  <div>
                    <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>Auto-Reorder Drafting</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Automatically draft Purchase Requests when stock drops below ROL</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Reorder Note */}
            <div>
              <label style={{ display: 'block', color: '#475569', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Reorder Note & Procurement Instructions</label>
              <textarea
                className="premium-input"
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', minHeight: '75px', resize: 'vertical' }}
                value={product.reorder_note || ''}
                onChange={(e) => setProduct({ ...product, reorder_note: e.target.value })}
                placeholder="e.g., Only order from primary supplier in bulk batches of 50..."
              />
            </div>
          </div>

          </fieldset>
          <div style={{ position: 'sticky', bottom: '24px', zIndex: 10, display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 -4px 20px rgba(0,0,0,0.03), 0 4px 10px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.4)' }}>
            <button type="button" onClick={() => navigate('/products')} style={{ padding: '12px 24px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', fontSize: '0.95rem' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#fff'}>{isReadOnly ? 'Back to Elements' : 'Cancel'}</button>
            {!isReadOnly && (
              <button type="submit" style={{ padding: '12px 28px', border: 'none', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', fontSize: '0.95rem' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <Save size={18} /> Save Changes
              </button>
            )}
          </div>
        </form>
        {showAddCompanyModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button type="button" onClick={() => setShowAddCompanyModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>&times;</button>
              <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50', fontSize: '1.25rem' }}>Add Company</h2>
              <form onSubmit={submitNewCompany}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '0.9rem', fontWeight: '600', marginBottom: '6px' }}>Company Name *</label>
                  <SuggestionInput id="product-details-new-company" value={modalCompanyName} onChange={setModalCompanyName} suggestions={companies} itemType="Company" placeholder="e.g. Acme Corp" required inputStyle={{ padding: '10px', borderRadius: '4px' }} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Brand Name</label>
                  <SuggestionInput id="product-details-company-brand" value={modalBrandName} onChange={setModalBrandName} suggestions={brands} itemType="Brand" placeholder="e.g. Acme, Nike" inputStyle={{ padding: '10px', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Scheme</label>
                    <input type="text" placeholder="e.g. Annual Turnover Scheme" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalCompanyScheme} onChange={e => setModalCompanyScheme(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Offer</label>
                    <input type="text" placeholder="e.g. 5% Trade Discount" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalCompanyOffer} onChange={e => setModalCompanyOffer(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Margin (%)</label>
                    <input type="text" placeholder="e.g. 20%" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalCompanyMargin} onChange={e => setModalCompanyMargin(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Authorized Distributor</label>
                    <input type="text" placeholder="e.g. Primus Wholesale" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalCompanyDistributor} onChange={e => setModalCompanyDistributor(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>Company Officer Name(s)</label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{modalCompanyOfficers.filter(o => o.trim()).length} officer(s)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {modalCompanyOfficers.map((officer, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="e.g. Robert Smith (Director of Operations)"
                          style={{ flex: 1, padding: '9px 12px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '0.9rem' }}
                          value={officer}
                          onChange={(e) => handleModalOfficerChange(index, e.target.value)}
                        />
                        {(modalCompanyOfficers.length > 1 || officer.trim() !== '') && (
                          <button
                            type="button"
                            onClick={() => handleModalRemoveOfficer(index)}
                            style={{
                              padding: '9px 12px',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}
                            title="Remove officer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleModalAddOfficer}
                      style={{
                        marginTop: '4px',
                        padding: '8px 12px',
                        backgroundColor: '#f8fafc',
                        color: '#4338ca',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '600'
                      }}
                    >
                      <Plus size={15} /> Add Another Officer
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '0.9rem', fontWeight: '600', marginBottom: '6px' }}>Description</label>
                  <textarea style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px' }} rows="2" placeholder="Optional notes..." value={modalCompanyDesc} onChange={e => setModalCompanyDesc(e.target.value)}></textarea>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ display: 'block', color: '#000', fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>Company Brochure Images (Multiple)</label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{modalCompanyBrochures.length} image(s)</span>
                  </div>
                  <PhotoUploader images={modalCompanyBrochures} onChange={setModalCompanyBrochures} maxFiles={15} compact={true} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => { setShowAddCompanyModal(false); setModalCompanyBrochures([]); }} style={{ padding: '10px 16px', backgroundColor: '#ecf0f1', color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Company</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddBrandModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button type="button" onClick={() => setShowAddBrandModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>&times;</button>
              <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50', fontSize: '1.25rem' }}>Add Brand</h2>
              <form onSubmit={submitNewBrand}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '0.9rem', fontWeight: '600', marginBottom: '6px' }}>Brand Name *</label>
                  <SuggestionInput id="product-details-new-brand" value={modalBrandName} onChange={setModalBrandName} suggestions={brands} itemType="Brand" placeholder="e.g. Nike, Samsung" required inputStyle={{ padding: '10px', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Scheme</label>
                    <input type="text" placeholder="e.g. Buy 10 Get 1" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalBrandScheme} onChange={e => setModalBrandScheme(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Offer</label>
                    <input type="text" placeholder="e.g. 5% Festive Discount" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalBrandOffer} onChange={e => setModalBrandOffer(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Margin (%)</label>
                    <input type="text" placeholder="e.g. 15%" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalBrandMargin} onChange={e => setModalBrandMargin(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Authorized Distributor</label>
                    <input type="text" placeholder="e.g. Apex Distributors" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalBrandDistributor} onChange={e => setModalBrandDistributor(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Company Officer Name</label>
                  <input type="text" placeholder="e.g. John Doe" style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={modalBrandOfficer} onChange={e => setModalBrandOfficer(e.target.value)} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '0.9rem', fontWeight: '600', marginBottom: '6px' }}>Description</label>
                  <textarea style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px' }} rows="2" placeholder="Optional notes..." value={modalBrandDesc} onChange={e => setModalBrandDesc(e.target.value)}></textarea>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setShowAddBrandModal(false)} style={{ padding: '10px 16px', backgroundColor: '#ecf0f1', color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Brand</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddGroupModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
              <button type="button" onClick={() => { setShowAddGroupModal(false); setModalGroupImages([]); }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>&times;</button>
              <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50', fontSize: '1.25rem' }}>Add Product Group</h2>
              <form onSubmit={submitNewGroup}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Group Name *</label>
                  <SuggestionInput id="product-details-new-group" value={modalGroupName} onChange={setModalGroupName} suggestions={groups} itemType="Group" required inputStyle={{ padding: '10px', borderRadius: '4px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Description</label>
                  <textarea style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px' }} rows="3" value={modalGroupDesc} onChange={e => setModalGroupDesc(e.target.value)}></textarea>
                </div>

                {/* GROUP IMAGES FIELD (MULTIPLE) */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ display: 'block', color: '#000', fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>Group Images (Optional)</label>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{modalGroupImages.length} photo(s) selected</span>
                  </div>
                  <PhotoUploader images={modalGroupImages} onChange={setModalGroupImages} maxFiles={10} compact={true} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => { setShowAddGroupModal(false); setModalGroupImages([]); }} style={{ padding: '10px 16px', backgroundColor: '#ecf0f1', color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Group</button>
                </div>
              </form>
            </div>
          </div>
        )}



        {showAddAliasTypeModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', width: '480px', maxWidth: '90%', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddAliasTypeModal(false);
                  setNewAliasTypeName('');
                  setNewAliasTypeDesc('');
                }}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Tag size={18} style={{ color: '#4338ca' }} />
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.15rem', fontWeight: '700' }}>Add Alias Classification Type</h3>
              </div>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#64748b' }}>
                Create a new standardized classification (e.g. Biological Name, Local Name, Scientific Name, Billing Name).
              </p>

              <form onSubmit={handleCreateAliasType}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#334155', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Alias Type Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Botanical Name, Regional Name, Trade Name"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                    value={newAliasTypeName}
                    onChange={(e) => setNewAliasTypeName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#334155', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Description / Purpose (Optional)
                  </label>
                  <textarea
                    placeholder="Brief description or usage note for this classification..."
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', minHeight: '70px', resize: 'vertical' }}
                    value={newAliasTypeDesc}
                    onChange={(e) => setNewAliasTypeDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAliasTypeModal(false);
                      setNewAliasTypeName('');
                      setNewAliasTypeDesc('');
                    }}
                    style={{ padding: '8px 18px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAliasType}
                    style={{ padding: '8px 20px', border: 'none', backgroundColor: '#4338ca', color: '#ffffff', borderRadius: '6px', cursor: isSubmittingAliasType ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: isSubmittingAliasType ? 0.7 : 1 }}
                  >
                    {isSubmittingAliasType ? 'Saving...' : 'Save Alias Type'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddExpenseModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', width: '480px', maxWidth: '90%', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddExpenseModal(false);
                  setModalExpenseName('');
                  setModalExpenseDesc('');
                }}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Receipt size={18} style={{ color: '#059669' }} />
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.15rem', fontWeight: '700' }}>Add Expense Head (Master)</h3>
              </div>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#64748b' }}>
                Create a new standardized operational charge category (e.g. Freight Inward, QC Inspection, Stamping, Labour Wages).
              </p>

              <form onSubmit={handleCreateExpenseMaster}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#334155', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Expense Head Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QC Inspection, Labour & Handling, Courier Freight"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                    value={modalExpenseName}
                    onChange={(e) => setModalExpenseName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#334155', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Description / Purpose (Optional)
                  </label>
                  <textarea
                    placeholder="Brief description or landed cost notes for this operational head..."
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', minHeight: '70px', resize: 'vertical' }}
                    value={modalExpenseDesc}
                    onChange={(e) => setModalExpenseDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExpenseModal(false);
                      setModalExpenseName('');
                      setModalExpenseDesc('');
                    }}
                    style={{ padding: '8px 18px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExpense}
                    style={{ padding: '8px 20px', border: 'none', backgroundColor: '#059669', color: '#ffffff', borderRadius: '6px', cursor: isSubmittingExpense ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: isSubmittingExpense ? 0.7 : 1 }}
                  >
                    {isSubmittingExpense ? 'Saving...' : 'Save Expense Head'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddOccasionModal && (
          <AddOccasionModal
            isOpen={showAddOccasionModal}
            onClose={() => setShowAddOccasionModal(false)}
            defaultType={selectedOccasionType || 'Festival'}
            onOccasionAdded={(newOcc) => {
              fetchOccasions();
              if (newOcc && newOcc.id) {
                setSelectedOccasionIds(prev => (prev.includes(newOcc.id) ? prev : [...prev, newOcc.id]));
                if (newOcc.occasion_type) {
                  setSelectedOccasionType(newOcc.occasion_type);
                }
              }
            }}
          />
        )}

        {/* QUICK ADD RACK / SHELF / BIN MODAL IN DETAILS */}
        {activeDetailsAddModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="#4338ca" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    {activeDetailsAddModal === 'rack' && 'Add New Rack'}
                    {activeDetailsAddModal === 'shelf' && 'Add New Shelf'}
                    {activeDetailsAddModal === 'bin' && 'Add New Bin'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDetailsAddModal(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '0.83rem', color: '#64748b' }}>
                {activeDetailsAddModal === 'rack' && `Create a new Rack for ${product?.warehouse_location || 'selected warehouse'}.`}
                {activeDetailsAddModal === 'shelf' && `Create a new Shelf inside Rack "${product?.rack_number}".`}
                {activeDetailsAddModal === 'bin' && `Create a new Bin inside Rack "${product?.rack_number}" > Shelf "${product?.shelf_number}".`}
              </p>

              <form onSubmit={handleSaveDetailsCoordinate}>
                {activeDetailsAddModal === 'rack' && (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Rack Name / Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rack A-12, R-04"
                      required
                      autoFocus
                      value={newDetailsRackInput}
                      onChange={e => setNewDetailsRackInput(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
                    />
                  </div>
                )}

                {activeDetailsAddModal === 'shelf' && (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Shelf Name / Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shelf 03, S-2"
                      required
                      autoFocus
                      value={newDetailsShelfInput}
                      onChange={e => setNewDetailsShelfInput(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
                    />
                  </div>
                )}

                {activeDetailsAddModal === 'bin' && (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Bin Name / Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bin B-05, BIN-101"
                      required
                      autoFocus
                      value={newDetailsBinInput}
                      onChange={e => setNewDetailsBinInput(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveDetailsAddModal(null)}
                    style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDetailsCoordinate}
                    style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#4338ca', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                  >
                    {isSubmittingDetailsCoordinate ? 'Saving...' : 'Save & Select'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductDetails;
