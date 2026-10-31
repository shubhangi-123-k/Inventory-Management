import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { Plus, Eye, Trash2, ChevronLeft, ChevronRight, X, Edit2, Check, Search, AlertCircle, Loader2, ShieldCheck, CheckCircle2, FileDown, FileSpreadsheet, Upload, Image as ImageIcon, ChevronDown, ChevronUp, Layers, Box, QrCode, Sparkles, Building2, Gift, Info, Tag, Sliders, DollarSign, Warehouse as WarehouseIcon, Award, CheckSquare, Package, ExternalLink, Receipt, Filter, RotateCcw, Scale, AlertTriangle, TrendingUp, TrendingDown, Share2 } from 'lucide-react';
import StockViewSwitcher from '../components/StockViewSwitcher';
import ReconcileGapModal from '../components/ReconcileGapModal';
import { useStockView, STOCK_VIEWS } from '../context/StockViewContext';
import AttributeBuilder from '../components/AttributeBuilder';
import CascadingGroupSelect from '../components/CascadingGroupSelect';
import CustomSelectWithArrow from '../components/CustomSelectWithArrow';
import SearchAutocomplete from '../components/SearchAutocomplete';
import ElementSuggestionInput from '../components/ElementSuggestionInput';
import SuggestionInput from '../components/SuggestionInput';
import PhotoUploader from '../components/PhotoUploader';
import AddOccasionModal from '../components/AddOccasionModal';
import BarcodeUploader from '../components/BarcodeUploader';
import VideoUploader from '../components/VideoUploader';
import BrochureAutoFillSection from '../components/BrochureAutoFillSection';
import OccasionSelector from '../components/OccasionSelector';
import ProductSchemesManager from '../components/ProductSchemesManager';
import VariantMatrixBuilder from '../components/VariantMatrixBuilder';
import PackagingModal from '../components/PackagingModal';
import QRCodeSVG from '../components/QRCodeSVG';
import ProductVariantsTable from '../components/ProductVariantsTable';
import QuickPriceEditModal from '../components/QuickPriceEditModal';
import PrintVariantQRModal from '../components/PrintVariantQRModal';
import AddVariantModal from '../components/AddVariantModal';
import EditVariantDrawer from '../components/EditVariantDrawer';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { downloadProductBrochurePDF, downloadProductDetailsExcel, exportAllProductsExcel, shareProductReviewPdf, shareProductDetailsExcel } from '../utils/productExport';
import { extractCompanyMedia } from '../utils/mediaUtils';
import { useAuth } from '../context/AuthContext';

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

const Products = ({ product } = {}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFromPO = searchParams.get('returnTo') === 'purchases';
  const targetRow = searchParams.get('rowIndex') || searchParams.get('targetRow');
  const { hasPermission } = useAuth();
  const { stockView, STOCK_VIEWS } = useStockView();
  const [reconcileModalProduct, setReconcileModalProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [updatingProductIds, setUpdatingProductIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  // Occasion States
  const [isOccasionBased, setIsOccasionBased] = useState('No');
  const [selectedOccasionType, setSelectedOccasionType] = useState('');
  const [selectedOccasionIds, setSelectedOccasionIds] = useState([]);
  const [occasionsList, setOccasionsList] = useState([]);
  const [occasionTypes, setOccasionTypes] = useState(['Festival', 'Season', 'Event', 'Other']);
  const [showAddOccasionModal, setShowAddOccasionModal] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);

  const [showTypeForm, setShowTypeForm] = useState(false);
  const [productTypesList, setProductTypesList] = useState(DEFAULT_PRODUCT_TYPES);
  const [productTypes, setProductTypes] = useState(["Goods", "Service", "Combo", "Consumable"]);
  const [catalogAliases, setCatalogAliases] = useState(DEFAULT_ALIASES);
  const [expensesList, setExpensesList] = useState(DEFAULT_EXPENSES);
  const [newTypeName, setNewTypeName] = useState("");

  // Section 2.D Dropdown Master integration states
  const [expenseId, setExpenseId] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [attachedExpenses, setAttachedExpenses] = useState([]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [modalExpenseName, setModalExpenseName] = useState('');
  const [modalExpenseDesc, setModalExpenseDesc] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [aliasTypeId, setAliasTypeId] = useState('');
  const [aliasTypeName, setAliasTypeName] = useState('');
  const [productAlias, setProductAlias] = useState('');
  const [showAddAliasTypeModal, setShowAddAliasTypeModal] = useState(false);
  const [newAliasTypeName, setNewAliasTypeName] = useState('');
  const [newAliasTypeDesc, setNewAliasTypeDesc] = useState('');
  const [isSubmittingAliasType, setIsSubmittingAliasType] = useState(false);
  const [productTypeId, setProductTypeId] = useState(1);
  const [productType, setProductType] = useState('Goods');

  const [baseProductName, setBaseProductName] = useState('');
  const [productName, setProductName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isCustomName, setIsCustomName] = useState(false);

  const [productDescription, setProductDescription] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [productAliases, setProductAliases] = useState([{ alias_type_id: '', alias_type_name: '', alias_name: '' }]);
  const [attributes, setAttributes] = useState([]);
  const [hasVariants, setHasVariants] = useState('No');
  const [variantAttributes, setVariantAttributes] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [expandedProductIds, setExpandedProductIds] = useState(new Set());
  const [previewCartonModal, setPreviewCartonModal] = useState(null); // { variant, packaging }

  // View Switcher & Variants Master states
  const [viewMode, setViewMode] = useState('templates'); // 'templates' or 'variants'
  const [templatesOnlyList, setTemplatesOnlyList] = useState([]);
  const [variantsList, setVariantsList] = useState([]);
  const [quickPriceVariant, setQuickPriceVariant] = useState(null);
  const [printQrVariant, setPrintQrVariant] = useState(null);
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [showReviewActions, setShowReviewActions] = useState(false);
  const [editDrawerVariant, setEditDrawerVariant] = useState(null);
  const [parentProductMap, setParentProductMap] = useState({});

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
        if (index === 0) {
          setAliasTypeId(value);
          setAliasTypeName(found ? found.name : '');
        }
      } else if (field === 'alias_name') {
        copy[index] = {
          ...copy[index],
          alias_name: value
        };
        if (index === 0) {
          setProductAlias(value);
        }
      }
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
      const first = typeof res[0] === 'object' ? res[0] : { alias_type_id: '', alias_type_name: '', alias_name: res[0] };
      setAliasTypeId(first.alias_type_id || '');
      setAliasTypeName(first.alias_type_name || '');
      setProductAlias(first.alias_name || '');
      return res;
    });
  };

  // Check if selected product type is Service (or non-inventory tracked)
  const isServiceType = useMemo(() => {
    const pTypeLower = (productType || '').trim().toLowerCase();
    if (pTypeLower === 'service') return true;
    const found = productTypesList.find(
      (t) => (t.id === Number(productTypeId) || t.name?.toLowerCase() === pTypeLower || t.code?.toLowerCase() === pTypeLower)
    );
    if (found && (found.name?.toLowerCase() === 'service' || found.tracks_inventory === false || found.tracks_inventory === 0 || found.tracks_inventory === 'false')) {
      return true;
    }
    return false;
  }, [productTypeId, productType, productTypesList]);

  const [internalSku, setInternalSku] = useState('');
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);


  // Group & ignoredSubGroup State
  const [groups, setGroups] = useState([]);

  const [groupId, setGroupId] = useState('');

  const [editingProductId, setEditingProductId] = useState(null);
  const [costingMethod, setCostingMethod] = useState(product?.costing_method || 'FIFO');



  useEffect(() => {
    if (product) {
      setCostingMethod(product?.costing_method || 'FIFO');
    }
  }, [product]);

  const [purchasePrice, setPurchasePrice] = useState('');

  // Total attached operational expenses calculation from multi-row attached expenses & legacy expenseAmount
  const totalAttachedExpense = useMemo(() => {
    const listSum = attachedExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const legacyAmt = (attachedExpenses.length === 0 && expenseAmount) ? (parseFloat(expenseAmount) || 0) : 0;
    return parseFloat((listSum + legacyAmt).toFixed(2));
  }, [attachedExpenses, expenseAmount]);

  // Landed Purchase Cost / Base Unit Cost: base purchase price + attached operational expenses
  const landedPurchaseCost = useMemo(() => {
    const p = parseFloat(purchasePrice) || 0;
    return parseFloat((p + totalAttachedExpense).toFixed(2));
  }, [purchasePrice, totalAttachedExpense]);

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
          expense_name: found?.name || (value ? String(value) : '')
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
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [distributorPrice, setDistributorPrice] = useState('');
  const [distributorProfitPercent, setDistributorProfitPercent] = useState('');
  const [profitPercent, setProfitPercent] = useState('');
  const [sellingPriceWholesale, setSellingPriceWholesale] = useState('');
  const [wholesaleProfitPercent, setWholesaleProfitPercent] = useState('');
  const [sellingPriceRetail, setSellingPriceRetail] = useState('');
  const [retailProfitPercent, setRetailProfitPercent] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [pricingMethod, setPricingMethod] = useState('PROFIT_ON_COST'); // 'PROFIT_ON_COST', 'DISCOUNT_ON_MRP', 'DISCOUNT_ON_SELLING_PRICE', 'MANUAL'
  const [profitOnCostPercent, setProfitOnCostPercent] = useState('');
  const [discountOnMrpPercent, setDiscountOnMrpPercent] = useState('');
  const [baseSellingPrice, setBaseSellingPrice] = useState('');
  const [discountOnSellingPricePercent, setDiscountOnSellingPricePercent] = useState('');
  const [roundOff, setRoundOff] = useState(false);
  const [gstRate, setGstRate] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [reorderNote, setReorderNote] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');
  const [maxStockLevel, setMaxStockLevel] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [reorderQty, setReorderQty] = useState('');
  const [autoReorder, setAutoReorder] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [barcodeImageUrl, setBarcodeImageUrl] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [hsnCheckStatus, setHsnCheckStatus] = useState(null); // null, 'checking', 'valid', 'not_found'
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [rackNumber, setRackNumber] = useState('');
  const [shelfNumber, setShelfNumber] = useState('');
  const [binLocation, setBinLocation] = useState('');
  const [warehouseStorageLocations, setWarehouseStorageLocations] = useState([]);
  const [activeAddModal, setActiveAddModal] = useState(null); // 'rack' | 'shelf' | 'bin' | null
  const [newRackInput, setNewRackInput] = useState('');
  const [newShelfInput, setNewShelfInput] = useState('');
  const [newBinInput, setNewBinInput] = useState('');
  const [isSubmittingNewCoordinate, setIsSubmittingNewCoordinate] = useState(false);
  const [openingStock, setOpeningStock] = useState('');
  const [safetyStock, setSafetyStock] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [bestBeforeDate, setBestBeforeDate] = useState('');
  // Schemes & Targets State
  const [productPeProduct, setProductPeProduct] = useState('');
  const [discountOnProduct, setDiscountOnProduct] = useState('');
  const [productTargetScheme, setProductTargetScheme] = useState('');
  const [discountOnBillAmount, setDiscountOnBillAmount] = useState('');
  const [quarterlyDiscountOnTurnover, setQuarterlyDiscountOnTurnover] = useState('');
  const [yearlyDiscountOnTurnover, setYearlyDiscountOnTurnover] = useState('');
  const [seasonalSchemeName, setSeasonalSchemeName] = useState('');
  const [seasonalFrequency, setSeasonalFrequency] = useState('Yearly');
  const [seasonalApplicability, setSeasonalApplicability] = useState('All Products');
  const [seasonalPeriodStart, setSeasonalPeriodStart] = useState('');
  const [seasonalPeriodEnd, setSeasonalPeriodEnd] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [physicalAppearance, setPhysicalAppearance] = useState('');
  const [size, setSize] = useState('');
  const [packaging, setPackaging] = useState('');
  const [length, setLength] = useState('');
  const [breadth, setBreadth] = useState('');
  const [thickness, setThickness] = useState('');
  const [dimensionUnit, setDimensionUnit] = useState('cm');
  const [customDimensionUnit, setCustomDimensionUnit] = useState('');
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('ml');
  const [customVolumeUnit, setCustomVolumeUnit] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('g');
  const [customWeightUnit, setCustomWeightUnit] = useState('');
  const [productImages, setProductImages] = useState([]);
  const [productVideos, setProductVideos] = useState([]);
  const [companyBrochure, setCompanyBrochure] = useState({ url: '', name: '' });
  const [companyInheritedMedia, setCompanyInheritedMedia] = useState(null);
  const [companyInheritedSchemes, setCompanyInheritedSchemes] = useState(null);
  const [activeSchemeSource, setActiveSchemeSource] = useState('none');
  const [schemeManuallyOverridden, setSchemeManuallyOverridden] = useState(false);
  const [isInheritingMedia, setIsInheritingMedia] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOccasionBased, setFilterOccasionBased] = useState('');
  const [filterOccasionType, setFilterOccasionType] = useState('');
  const [filterOccasionId, setFilterOccasionId] = useState('');

  // Pagination for 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortKey, setSortKey] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterGroupId, filterOccasionBased, filterOccasionType, filterOccasionId, filterStatus]);

  const sortedProducts = useMemo(() => {
    if (!sortKey) return products;
    return [...products].sort((a, b) => {
      let valA = a[sortKey] ?? '';
      let valB = b[sortKey] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortKey, sortOrder]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedProducts.slice(start, start + itemsPerPage);
  }, [sortedProducts, currentPage]);

  // Custom Modal States
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);

  const [modalGroupName, setModalGroupName] = useState('');
  const [modalGroupDesc, setModalGroupDesc] = useState('');
  const [modalGroupParentId, setModalGroupParentId] = useState('');
  const [modalGroupImages, setModalGroupImages] = useState([]);
  const [groupRefresh, setGroupRefresh] = useState(0);

  useEffect(() => {
    if (isCustomName) return;
    setProductName(baseProductName || '');
  }, [baseProductName, isCustomName]);

  const resetForm = () => {
    setEditingProductId(null);
    setBaseProductName('');
    setProductName('');
    setIsEditingName(false);
    setIsCustomName(false);
    setInternalSku('');
    setProductDescription('');
    setProductInfo('');
    setProductAliases([{ alias_type_id: '', alias_type_name: '', alias_name: '' }]);
    setProductAlias('');
    setAliasTypeId('');
    setAliasTypeName('');
    setProductTypeId(1);
    setProductType('Goods');
    setExpenseId('');
    setExpenseName('');
    setExpenseAmount('');
    setAttachedExpenses([]);
    setBrandId('');
    setGroupId('');
    setCompanyName('');
    setHasVariants('No');
    setVariantAttributes([]);
    setProductVariants([]);
    setAttributes([]);
    setIsOccasionBased('No');
    setSelectedOccasionType('');
    setSelectedOccasionIds([]);
    setBarcode('');
    setBarcodeImageUrl('');
    setHsnCode('');
    setHsnCheckStatus(null);
    setProductImages([]);
    setProductVideos([]);
    setCompanyBrochure({ url: '', name: '' });
    setCompanyInheritedMedia(null);
    setCompanyInheritedSchemes(null);
    setActiveSchemeSource('none');
    setSchemeManuallyOverridden(false);
    setIsInheritingMedia(false);
    setPhysicalAppearance('');
    setSize('');
    setPackaging('');
    setLength('');
    setBreadth('');
    setThickness('');
    setDimensionUnit('cm');
    setCustomDimensionUnit('');
    setVolume('');
    setVolumeUnit('ml');
    setCustomVolumeUnit('');
    setNetWeight('');
    setGrossWeight('');
    setWeightUnit('g');
    setCustomWeightUnit('');
    setCostingMethod('FIFO');
    setPurchasePrice('');
    setPurchaseQuantity('');
    setLotNumber('');
    setBatchNumber('');
    setSellingPrice('');
    setMrp('');
    setDistributorPrice('');
    setDistributorProfitPercent('');
    setProfitPercent('');
    setSellingPriceWholesale('');
    setWholesaleProfitPercent('');
    setSellingPriceRetail('');
    setRetailProfitPercent('');
    setCurrency('INR');
    setPricingMethod('PROFIT_ON_COST');
    setProfitOnCostPercent('');
    setDiscountOnMrpPercent('');
    setBaseSellingPrice('');
    setDiscountOnSellingPricePercent('');
    setRoundOff(false);
    setGstRate('');
    setReorderLevel('');
    setReorderNote('');
    setMinStockLevel('');
    setMaxStockLevel('');
    setLeadTimeDays('7');
    setReorderQty('');
    setAutoReorder(false);
    setWarehouseLocation('');
    setWarehouseId('');
    setRackNumber('');
    setShelfNumber('');
    setBinLocation('');
    setWarehouseStorageLocations([]);
    setOpeningStock('');
    setSafetyStock('');
    setManufacturingDate('');
    setExpiryDate('');
    setBestBeforeDate('');
    setProductPeProduct('');
    setDiscountOnProduct('');
    setProductTargetScheme('');
    setDiscountOnBillAmount('');
    setQuarterlyDiscountOnTurnover('');
    setYearlyDiscountOnTurnover('');
    setSeasonalSchemeName('');
    setSeasonalFrequency('Yearly');
    setSeasonalApplicability('All Products');
    setSeasonalPeriodStart('');
    setSeasonalPeriodEnd('');
    setActiveTab('info');
  };

  const populateFormWithProduct = (prod) => {
    if (!prod) return;
    setEditingProductId(prod.id || null);

    // Names & SKU
    const pName = prod.product_name || prod.name || '';
    const bName = prod.base_product_name || prod.base_name || pName;
    setProductName(pName);
    setBaseProductName(bName);
    setIsCustomName(Boolean(prod.is_custom_name || (pName && bName && pName !== bName)));
    setIsEditingName(false);
    setInternalSku(prod.internal_sku || prod.sku || '');
    setProductDescription(prod.short_description || prod.description || '');
    setProductInfo(prod.product_info || '');

    // Aliases
    const pAlias = prod.product_alias || (Array.isArray(prod.product_aliases) && (typeof prod.product_aliases[0] === 'object' ? prod.product_aliases[0]?.alias_name : prod.product_aliases[0])) || '';
    setProductAlias(pAlias);
    setAliasTypeId(prod.alias_type_id ? String(prod.alias_type_id) : '');
    setAliasTypeName(prod.alias_type_name || '');

    let effectiveAliases = prod.aliases;
    if (typeof effectiveAliases === 'string') {
      try { effectiveAliases = JSON.parse(effectiveAliases); } catch (e) { effectiveAliases = null; }
    }

    if (Array.isArray(effectiveAliases) && effectiveAliases.length > 0) {
      const mapped = effectiveAliases.map(a => ({
        alias_type_id: a.alias_type_id ? String(a.alias_type_id) : '',
        alias_type_name: a.alias_type_name || '',
        alias_name: a.alias_name || a.name || ''
      }));
      setProductAliases(mapped);
      if (mapped[0]?.alias_type_id) {
        setAliasTypeId(mapped[0].alias_type_id);
        setAliasTypeName(mapped[0].alias_type_name || '');
      }
    } else if (Array.isArray(prod.product_aliases) && prod.product_aliases.length > 0) {
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
    } else if (typeof prod.product_alias === 'string' && prod.product_alias.trim()) {
      const parts = prod.product_alias.split(',').map(s => s.trim()).filter(Boolean);
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

    // Type, Brand, Group, Company
    const resolvedType = prod.item_type || prod.product_type || 'Goods';
    const foundType = productTypesList.find(t =>
      (prod.product_type_id && Number(t.id) === Number(prod.product_type_id)) ||
      t.name?.toLowerCase() === resolvedType?.toLowerCase()
    );
    setProductTypeId(prod.product_type_id ? Number(prod.product_type_id) : (foundType?.id || 1));
    setProductType(foundType?.name || resolvedType || 'Goods');
    setExpenseId(prod.expense_id ? String(prod.expense_id) : '');
    setExpenseName(prod.expense_name || '');
    setExpenseAmount(prod.expense_amount !== null && prod.expense_amount !== undefined ? String(prod.expense_amount) : '');
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
    setBrandId(prod.brand_id !== undefined && prod.brand_id !== null ? String(prod.brand_id) : '');
    setGroupId(prod.group_id !== undefined && prod.group_id !== null ? String(prod.group_id) : '');
    setCompanyName(prod.company_name || '');

    // Occasions
    setIsOccasionBased(prod.is_occasion_based ? 'Yes' : 'No');
    setSelectedOccasionType(prod.occasion_type || '');
    if (Array.isArray(prod.occasion_ids)) {
      setSelectedOccasionIds(prod.occasion_ids);
    } else if (Array.isArray(prod.occasions)) {
      setSelectedOccasionIds(prod.occasions.map(o => o.id || o));
    } else {
      setSelectedOccasionIds([]);
    }

    // Pricing & Costing
    setCostingMethod(prod.costing_method || 'FIFO');
    setPurchasePrice(prod.purchase_price !== null && prod.purchase_price !== undefined ? String(prod.purchase_price) : '');
    setPurchaseQuantity(prod.purchase_quantity !== null && prod.purchase_quantity !== undefined ? String(prod.purchase_quantity) : '');
    setLotNumber(prod.lot_number !== null && prod.lot_number !== undefined ? String(prod.lot_number) : '');
    setBatchNumber(prod.batch_number !== null && prod.batch_number !== undefined ? String(prod.batch_number) : '');
    setSellingPrice(prod.selling_price !== null && prod.selling_price !== undefined ? String(prod.selling_price) : '');
    setMrp(prod.mrp !== null && prod.mrp !== undefined ? String(prod.mrp) : '');
    setDistributorPrice(prod.distributor_price !== null && prod.distributor_price !== undefined ? String(prod.distributor_price) : '');
    setDistributorProfitPercent(prod.distributor_profit_percent !== null && prod.distributor_profit_percent !== undefined ? String(prod.distributor_profit_percent) : '');
    setProfitPercent(prod.profit_percent !== null && prod.profit_percent !== undefined ? String(prod.profit_percent) : '');
    setSellingPriceWholesale(prod.selling_price_wholesale !== null && prod.selling_price_wholesale !== undefined ? String(prod.selling_price_wholesale) : '');
    setWholesaleProfitPercent(prod.wholesale_profit_percent !== null && prod.wholesale_profit_percent !== undefined ? String(prod.wholesale_profit_percent) : '');
    setSellingPriceRetail(prod.selling_price_retail !== null && prod.selling_price_retail !== undefined ? String(prod.selling_price_retail) : '');
    setRetailProfitPercent(prod.retail_profit_percent !== null && prod.retail_profit_percent !== undefined ? String(prod.retail_profit_percent) : '');
    setCurrency(prod.currency || 'INR');
    setGstRate(prod.gst_rate !== null && prod.gst_rate !== undefined ? String(prod.gst_rate) : '');
    setHsnCode(prod.hsn_code || '');

    // Tracking & Barcodes
    setBarcode(prod.gtin_ean_upc || prod.barcode || '');
    setBarcodeImageUrl(prod.barcode_image_url || '');

    // Warehouse & Racking
    const whId = prod.default_warehouse_id || prod.warehouse_id || (Array.isArray(prod.warehouse_allocations) && prod.warehouse_allocations[0]?.warehouse_id);
    setWarehouseId(whId ? String(whId) : '');
    setWarehouseLocation(prod.warehouse_location || '');
    setRackNumber(prod.rack_number || (Array.isArray(prod.warehouse_allocations) && prod.warehouse_allocations[0]?.rack_number) || '');
    setShelfNumber(prod.shelf_number || (Array.isArray(prod.warehouse_allocations) && prod.warehouse_allocations[0]?.shelf_number) || '');
    setBinLocation(prod.bin_location || (Array.isArray(prod.warehouse_allocations) && prod.warehouse_allocations[0]?.bin_location) || '');
    setOpeningStock(prod.opening_stock !== null && prod.opening_stock !== undefined ? String(prod.opening_stock) : '');
    setSafetyStock(prod.safety_stock !== null && prod.safety_stock !== undefined ? String(prod.safety_stock) : '');
    setReorderLevel(prod.reorder_level !== null && prod.reorder_level !== undefined ? String(prod.reorder_level) : '');
    setReorderNote(prod.reorder_note || '');
    setMinStockLevel(prod.min_stock_level !== null && prod.min_stock_level !== undefined ? String(prod.min_stock_level) : '');
    setMaxStockLevel(prod.max_stock_level !== null && prod.max_stock_level !== undefined ? String(prod.max_stock_level) : '');
    setLeadTimeDays(prod.lead_time_days !== null && prod.lead_time_days !== undefined ? String(prod.lead_time_days) : '7');
    setReorderQty(prod.reorder_qty !== null && prod.reorder_qty !== undefined ? String(prod.reorder_qty) : '');
    setAutoReorder(Boolean(prod.auto_reorder));

    // Dates
    const cleanDate = (d) => {
      if (!d || d === 'Invalid date' || String(d).trim() === '') return '';
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? '' : String(d).trim().split('T')[0];
    };
    setManufacturingDate(cleanDate(prod.manufacturing_date));
    setExpiryDate(cleanDate(prod.expiry_date));
    setBestBeforeDate(cleanDate(prod.best_before_date));

    // Physical
    setPhysicalAppearance(prod.physical_appearance || prod.physical_shape || '');
    setSize(prod.size || '');
    setPackaging(prod.packaging || '');

    const parseValueAndUnit = (raw, defaultUnit) => {
      if (!raw) return { val: '', unit: defaultUnit };
      const str = String(raw).trim();
      const parts = str.split(' ');
      if (parts.length > 1) {
        return { val: parts[0], unit: parts.slice(1).join(' ') };
      }
      return { val: str, unit: defaultUnit };
    };

    const lObj = parseValueAndUnit(prod.length, 'cm');
    setLength(lObj.val);
    setBreadth(parseValueAndUnit(prod.breadth, 'cm').val);
    setThickness(parseValueAndUnit(prod.thickness, 'cm').val);
    if (['cm', 'm', 'inch', 'mm', 'ft'].includes(lObj.unit)) {
      setDimensionUnit(lObj.unit);
      setCustomDimensionUnit('');
    } else if (lObj.unit && lObj.unit !== 'cm') {
      setDimensionUnit('custom');
      setCustomDimensionUnit(lObj.unit);
    } else {
      setDimensionUnit(prod.dimension_unit || 'cm');
      setCustomDimensionUnit(prod.custom_dimension_unit || '');
    }

    const vObj = parseValueAndUnit(prod.volume, 'ml');
    setVolume(vObj.val);
    if (['ml', 'l', 'cu_cm', 'cu_m'].includes(vObj.unit)) {
      setVolumeUnit(vObj.unit);
      setCustomVolumeUnit('');
    } else if (vObj.unit && vObj.unit !== 'ml') {
      setVolumeUnit('custom');
      setCustomVolumeUnit(vObj.unit);
    } else {
      setVolumeUnit(prod.volume_unit || 'ml');
      setCustomVolumeUnit(prod.custom_volume_unit || '');
    }

    const wObj = parseValueAndUnit(prod.net_weight, 'g');
    setNetWeight(wObj.val);
    setGrossWeight(parseValueAndUnit(prod.gross_weight, 'g').val);
    if (['g', 'kg', 'mg', 'oz', 'lb'].includes(wObj.unit)) {
      setWeightUnit(wObj.unit);
      setCustomWeightUnit('');
    } else if (wObj.unit && wObj.unit !== 'g') {
      setWeightUnit('custom');
      setCustomWeightUnit(wObj.unit);
    } else {
      setWeightUnit(prod.weight_unit || 'g');
      setCustomWeightUnit(prod.custom_weight_unit || '');
    }

    // Media
    const imgs = Array.isArray(prod.images) ? prod.images : (prod.image_url ? [prod.image_url] : []);
    setProductImages(imgs);
    const vids = Array.isArray(prod.video_urls) ? prod.video_urls : (prod.video_url ? [prod.video_url] : []);
    setProductVideos(vids);
    setCompanyBrochure({
      url: prod.company_brochure_url || prod.brochure_url || '',
      name: prod.company_brochure_name || prod.brochure_name || ''
    });

    // Variants & Attributes
    const hasV = prod.has_variants === true || prod.has_variants === 'Yes' || (Array.isArray(prod.variants) && prod.variants.length > 0);
    setHasVariants(hasV ? 'Yes' : 'No');
    setVariantAttributes(Array.isArray(prod.variant_attributes) ? prod.variant_attributes : []);
    setProductVariants(Array.isArray(prod.variants) ? prod.variants : []);
    setAttributes(Array.isArray(prod.attributes) ? prod.attributes.map(a => ({
      name: a?.name || a?.Attribute?.name || a?.attribute_name || '',
      value: a?.value !== undefined ? String(a.value) : (a?.attribute_value !== undefined ? String(a.attribute_value) : (typeof a === 'string' ? a : ''))
    })) : []);

    // Schemes & Targets
    setProductPeProduct(prod.product_pe_product || '');
    setDiscountOnProduct(prod.discount_on_product || '');
    setProductTargetScheme(prod.product_target_scheme || '');
    setDiscountOnBillAmount(prod.discount_on_bill_amount || '');
    setQuarterlyDiscountOnTurnover(prod.quarterly_discount_on_turnover || '');
    setYearlyDiscountOnTurnover(prod.yearly_discount_on_turnover || '');
    setSeasonalSchemeName(prod.seasonal_scheme_name || '');
    setSeasonalFrequency(prod.seasonal_frequency || 'Yearly');
    setSeasonalApplicability(prod.seasonal_applicability || 'All Products');
    setSeasonalPeriodStart(cleanDate(prod.seasonal_period_start));
    setSeasonalPeriodEnd(cleanDate(prod.seasonal_period_end));
  };

  const openAddModal = () => {
    resetForm();
    setEditingProductId(null);
    setActiveTab('info');
    setShowForm(true);
  };

  // Automatically open full creation form if requested from PO or query params
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      openAddModal();
      const compIdParam = searchParams.get('company_id');
      if (compIdParam && companies.length > 0) {
        const matchedComp = companies.find(c => String(c.id) === String(compIdParam));
        if (matchedComp) {
          handleCompanySelect(matchedComp.name, matchedComp);
        }
      }
    }
  }, [searchParams, companies]);

  const openEditModal = (prod) => {
    if (!prod) return;
    setEditingProductId(prod.id || null);
    populateFormWithProduct(prod);
    setActiveTab('info');
    setShowForm(true);

    if (prod.id) {
      api.get(`/admin/products/${prod.id}`)
        .then(res => {
          const fullProd = res.data?.data || res.data;
          if (fullProd && typeof fullProd === 'object') {
            populateFormWithProduct(fullProd);
          }
        })
        .catch(err => {
          console.warn("Could not fetch full product details in openEditModal:", err);
        });
    }
  };

  // Suggestions for Base Element Name: ONLY elements actually fed/existing in the system
  const existingBaseElements = useMemo(() => {
    const map = new Map();

    // 1. Extract from existing products list actually in the system
    (products || []).forEach(p => {
      const pId = p.id;
      if (p.base_product_name && typeof p.base_product_name === 'string') {
        const val = p.base_product_name.trim();
        if (val && !map.has(val.toLowerCase())) {
          map.set(val.toLowerCase(), { name: val, productId: pId });
        }
      }
      if (p.base_name && typeof p.base_name === 'string') {
        const val = p.base_name.trim();
        if (val && !map.has(val.toLowerCase())) {
          map.set(val.toLowerCase(), { name: val, productId: pId });
        }
      }
      const rawName = (p.product_name || p.name || '').trim();
      if (rawName && !map.has(rawName.toLowerCase())) {
        map.set(rawName.toLowerCase(), { name: rawName, productId: pId });
      }
    });

    // 2. Extract from templates list if available
    (templatesOnlyList || []).forEach(p => {
      const pId = p.id;
      if (p.base_product_name && typeof p.base_product_name === 'string') {
        const val = p.base_product_name.trim();
        if (val && !map.has(val.toLowerCase())) map.set(val.toLowerCase(), { name: val, productId: pId });
      }
      const rawName = (p.product_name || p.name || '').trim();
      if (rawName && !map.has(rawName.toLowerCase())) {
        map.set(rawName.toLowerCase(), { name: rawName, productId: pId });
      }
    });

    // 3. Extract from variants list if available
    (variantsList || []).forEach(v => {
      const vName = (v.name || v.product_name || v.variant_name || '').trim();
      const pId = v.product_id || v.parent_id || v.id;
      if (vName && !map.has(vName.toLowerCase())) {
        map.set(vName.toLowerCase(), { name: vName, productId: pId });
      }
    });

    return Array.from(map.values());
  }, [products, templatesOnlyList, variantsList]);

  // Auto-calculate selling price based on profit % on cost, discount % on MRP, or offer % on selling price with round off
  useEffect(() => {
    if (pricingMethod === 'MANUAL') return;

    let computed = null;
    if (pricingMethod === 'PROFIT_ON_COST') {
      const cost = landedPurchaseCost;
      const pct = parseFloat(profitOnCostPercent) || 0;
      if (cost > 0 && pct > 0) {
        computed = cost * (1 + (pct / 100));
      }
    } else if (pricingMethod === 'DISCOUNT_ON_MRP') {
      const mrpVal = parseFloat(mrp) || 0;
      const pct = parseFloat(discountOnMrpPercent) || 0;
      if (mrpVal > 0 && pct > 0) {
        computed = mrpVal * (1 - (pct / 100));
      }
    } else if (pricingMethod === 'DISCOUNT_ON_SELLING_PRICE') {
      const baseVal = parseFloat(baseSellingPrice || mrp || sellingPrice) || 0;
      const pct = parseFloat(discountOnSellingPricePercent) || 0;
      if (baseVal > 0 && pct > 0) {
        computed = baseVal * (1 - (pct / 100));
      }
    }

    if (computed !== null) {
      const finalPrice = roundOff ? Math.round(computed) : parseFloat(computed.toFixed(2));
      setSellingPrice(finalPrice.toString());
    }
  }, [landedPurchaseCost, mrp, baseSellingPrice, profitOnCostPercent, discountOnMrpPercent, discountOnSellingPricePercent, roundOff, pricingMethod]);

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [modalCompanyName, setModalCompanyName] = useState('');
  const [modalCompanyDesc, setModalCompanyDesc] = useState('');
  const [modalCompanyScheme, setModalCompanyScheme] = useState('');
  const [modalCompanyOffer, setModalCompanyOffer] = useState('');
  const [modalCompanyMargin, setModalCompanyMargin] = useState('');
  const [modalCompanyDistributor, setModalCompanyDistributor] = useState('');
  const [modalCompanyOfficers, setModalCompanyOfficers] = useState(['']);
  const [modalCompanyImages, setModalCompanyImages] = useState([]);
  const [modalCompanyBrochures, setModalCompanyBrochures] = useState([]);
  const [modalBrandName, setModalBrandName] = useState('');
  const [modalBrandDesc, setModalBrandDesc] = useState('');
  const [modalBrandScheme, setModalBrandScheme] = useState('');
  const [modalBrandOffer, setModalBrandOffer] = useState('');
  const [modalBrandMargin, setModalBrandMargin] = useState('');
  const [modalBrandDistributor, setModalBrandDistributor] = useState('');
  const [modalBrandOfficer, setModalBrandOfficer] = useState('');

  // Add Warehouse Modal State
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [modalWhName, setModalWhName] = useState('');
  const [modalWhCode, setModalWhCode] = useState('');
  const [modalWhType, setModalWhType] = useState('Central Distribution Center');
  const [modalWhStatus, setModalWhStatus] = useState('Active');
  const [modalWhAddress, setModalWhAddress] = useState('');
  const [modalWhCity, setModalWhCity] = useState('');
  const [modalWhState, setModalWhState] = useState('');
  const [modalWhCountry, setModalWhCountry] = useState('India');
  const [modalWhPincode, setModalWhPincode] = useState('');
  const [modalWhManagerName, setModalWhManagerName] = useState('');
  const [modalWhContactNumber, setModalWhContactNumber] = useState('');
  const [modalWhEmail, setModalWhEmail] = useState('');
  const [modalWhCapacity, setModalWhCapacity] = useState('');
  const [modalWhIsDefault, setModalWhIsDefault] = useState(false);

  const fetchOccasions = async () => {
    try {
      const res = await api.get('/admin/occasions');
      setOccasionsList(res.data?.data || res.data || []);
      const typesRes = await api.get('/admin/occasions/types');
      if (typesRes.data?.data) {
        setOccasionTypes(typesRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch occasions:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (filterGroupId) queryParams.append('group_id', filterGroupId);
      if (filterStatus) queryParams.append('status', filterStatus);
      if (filterOccasionBased) queryParams.append('is_occasion_based', filterOccasionBased === 'Yes' ? 'true' : 'false');
      if (filterOccasionType) queryParams.append('occasion_type', filterOccasionType);
      if (filterOccasionId) queryParams.append('occasion_id', filterOccasionId);

      let response;
      try {
        const queryWithParam = new URLSearchParams(queryParams);
        if (viewMode === 'variants') {
          queryWithParam.append('variants_only', 'true');
        } else {
          queryWithParam.append('templates_only', 'true');
        }
        response = await api.get(`/admin/products?${queryWithParam.toString()}`);
      } catch (paramErr) {
        if (paramErr.response?.status === 500) {
          console.warn("[Products] Backend returned 500 with templates/variants query, retrying without filter:", paramErr.response.data);
          const baseQs = queryParams.toString();
          response = await api.get(`/admin/products${baseQs ? `?${baseQs}` : ''}`);
        } else {
          throw paramErr;
        }
      }

      const rawData = response.data?.data || response.data || [];
      const list = Array.isArray(rawData) ? rawData : [];

      if (viewMode === 'templates') {
        setProducts(list.filter(p => !p.parent_product_id));
        setTemplatesOnlyList(list.filter(p => !p.parent_product_id));
        const parentMap = {};
        list.forEach(p => { if (p.id) parentMap[p.id] = p; });
        setParentProductMap(prev => ({ ...prev, ...mapFallback(parentMap) }));
      } else {
        // Variants view: check if list contains variants or products with nested variants
        const allExtractedVariants = [];
        const parentMap = { ...parentProductMap };

        list.forEach(item => {
          if (item.id && !item.parent_product_id) {
            parentMap[item.id] = item;
          }
          if (item.parent_product_id) {
            allExtractedVariants.push(item);
          }
          if (Array.isArray(item.variants) && item.variants.length > 0) {
            item.variants.forEach(v => {
              allExtractedVariants.push({
                ...v,
                parent_product_id: item.id,
                template: { id: item.id, name: item.name || item.product_name, sku: item.sku }
              });
            });
          }
        });

        setParentProductMap(parentMap);

        if (allExtractedVariants.length > 0) {
          setVariantsList(allExtractedVariants);
        } else {
          setVariantsList(list);
        }
      }

      // Load reference lists independently. A Sub-Admin may have permission to
      // use Products and Groups without access to every other master; one
      // forbidden lookup should not suppress the remaining form suggestions.
      try {
        const brandsRes = await api.get('/admin/brands');
        const brandData = brandsRes.data?.data ?? brandsRes.data ?? [];
        setBrands(Array.isArray(brandData) ? brandData : []);
      } catch (referenceError) {
        console.warn('Failed to fetch brands for product suggestions:', referenceError);
      }

      try {
        const groupRes = await api.get('/admin/groups');
        const groupPayload = groupRes.data?.data ?? groupRes.data;
        const groupList = Array.isArray(groupPayload)
          ? groupPayload
          : (Array.isArray(groupPayload?.groups) ? groupPayload.groups : []);
        setGroups(groupList);
      } catch (referenceError) {
        console.warn('Failed to fetch groups for product suggestions:', referenceError);
      }

      try {
        const compRes = await api.get('/admin/companies');
        const companyData = compRes.data?.data ?? compRes.data ?? [];
        setCompanies(Array.isArray(companyData) ? companyData : []);
      } catch (referenceError) {
        console.warn('Failed to fetch companies for product suggestions:', referenceError);
      }

      try {
        const whRes = await api.get('/admin/warehouses');
        setWarehouses(whRes.data?.data || whRes.data || []);
      } catch (e) {
        console.error("Failed to fetch warehouses:", e);
      }

      setLoading(false);
    } catch (error) {
      console.error("Products fetch error", error);
      setLoading(false);
    }
  };

  const handleToggleProductStatus = async (product) => {
    const productId = product.id || product._id;
    if (!productId || !hasPermission('products', 'edit')) return;

    const nextStatus = (product.status || 'Active').toLowerCase() === 'active' ? 'Inactive' : 'Active';
    setUpdatingProductIds((prev) => new Set(prev).add(productId));
    try {
      const response = await api.patch(`/admin/products/${productId}/status`, { status: nextStatus });
      if (response.data?.pending_approval) return;

      const updateStatus = (items) => items.map((item) =>
        String(item.id || item._id) === String(productId) ? { ...item, status: nextStatus } : item
      );
      setProducts(updateStatus);
      setTemplatesOnlyList(updateStatus);
      setVariantsList(updateStatus);
    } catch (error) {
      console.error('Failed to update element status:', error);
      alert('Failed to update element status. Please try again.');
    } finally {
      setUpdatingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const mapFallback = (map) => map || {};

  // Prefetch templates list for parent selector in AddVariantModal
  useEffect(() => {
    const fetchTemplatesList = async () => {
      try {
        let res;
        try {
          res = await api.get('/admin/products?templates_only=true');
        } catch (e) {
          if (e.response?.status === 500) {
            res = await api.get('/admin/products');
          } else {
            throw e;
          }
        }
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data)) {
          setTemplatesOnlyList(data.filter(p => !p.parent_product_id));
          const map = {};
          data.forEach(t => { if (t.id) map[t.id] = t; });
          setParentProductMap(prev => ({ ...prev, ...map }));
        }
      } catch (e) {
        // silent fallback
      }
    };
    fetchTemplatesList();
  }, []);

  // Fetch active product types, aliases & expenses from Master tables
  useEffect(() => {
    const fetchMasterTypesAndAliases = async () => {
      try {
        const [typesRes, aliasesRes, expensesRes] = await Promise.all([
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
      } catch (e) {
        console.warn("Failed to fetch product types, aliases or expenses:", e);
      }
    };
    fetchMasterTypesAndAliases();
  }, []);

  // When selected type is Service, ensure activeTab isn't pointing to physical or racking
  useEffect(() => {
    if (isServiceType && (activeTab === 'physical' || activeTab === 'racking')) {
      setActiveTab('info');
    }
  }, [isServiceType, activeTab]);

  useEffect(() => {
    fetchOccasions();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [viewMode, search, filterGroupId, filterStatus, filterOccasionBased, filterOccasionType, filterOccasionId, stockView]);

  // Fetch Storage Locations whenever warehouseId changes in product form
  useEffect(() => {
    if (!warehouseId) {
      setWarehouseStorageLocations([]);
      return;
    }
    let isMounted = true;
    api.get(`/admin/storage-locations?warehouse_id=${warehouseId}`)
      .then((res) => {
        if (isMounted) {
          const locs = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          setWarehouseStorageLocations(locs);
        }
      })
      .catch((err) => {
        console.error('Error fetching storage locations for warehouse:', err);
      });

    return () => { isMounted = false; };
  }, [warehouseId]);

  // Cascading Helpers for Rack, Shelf, Bin
  const availableRacks = useMemo(() => {
    const list = warehouseStorageLocations.map(l => (l.rack_number || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [warehouseStorageLocations]);

  const availableShelves = useMemo(() => {
    if (!rackNumber) return [];
    const list = warehouseStorageLocations
      .filter(l => (l.rack_number || '').trim().toLowerCase() === rackNumber.trim().toLowerCase())
      .map(l => (l.shelf_number || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [warehouseStorageLocations, rackNumber]);

  const availableBins = useMemo(() => {
    if (!rackNumber || !shelfNumber) return [];
    const list = warehouseStorageLocations
      .filter(l =>
        (l.rack_number || '').trim().toLowerCase() === rackNumber.trim().toLowerCase() &&
        (l.shelf_number || '').trim().toLowerCase() === shelfNumber.trim().toLowerCase()
      )
      .map(l => (l.bin_location || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [warehouseStorageLocations, rackNumber, shelfNumber]);

  const handleOpenAddCoordinateModal = (type) => {
    if (!warehouseId) {
      alert('Please select a Storage Warehouse first.');
      return;
    }
    if (type === 'shelf' && !rackNumber) {
      alert('Please select or add a Rack first.');
      return;
    }
    if (type === 'bin' && !shelfNumber) {
      alert('Please select or add a Shelf first.');
      return;
    }
    setNewRackInput('');
    setNewShelfInput('');
    setNewBinInput('');
    setActiveAddModal(type);
  };

  const handleSaveCoordinate = async (e) => {
    e.preventDefault();
    if (!warehouseId) return;

    try {
      setIsSubmittingNewCoordinate(true);
      let targetRack = rackNumber;
      let targetShelf = shelfNumber;
      let targetBin = binLocation;

      if (activeAddModal === 'rack') {
        if (!newRackInput.trim()) {
          alert('Rack Name is required');
          return;
        }
        targetRack = newRackInput.trim();
        targetShelf = '';
        targetBin = '';
      } else if (activeAddModal === 'shelf') {
        if (!newShelfInput.trim()) {
          alert('Shelf Name is required');
          return;
        }
        targetShelf = newShelfInput.trim();
        targetBin = '';
      } else if (activeAddModal === 'bin') {
        if (!newBinInput.trim()) {
          alert('Bin Name is required');
          return;
        }
        targetBin = newBinInput.trim();
      }

      let createdLoc = null;
      try {
        const res = await api.post('/admin/storage-locations', {
          warehouse_id: Number(warehouseId),
          rack_number: targetRack,
          shelf_number: targetShelf,
          bin_location: targetBin
        });
        createdLoc = res.data?.data;
      } catch (err) {
        if (err.response?.status === 409 && err.response?.data?.data) {
          createdLoc = err.response.data.data;
        } else {
          throw err;
        }
      }

      // Refresh warehouse storage locations
      const refreshRes = await api.get(`/admin/storage-locations?warehouse_id=${warehouseId}`);
      setWarehouseStorageLocations(refreshRes.data?.data || []);

      if (activeAddModal === 'rack') {
        setRackNumber(targetRack);
        setShelfNumber('');
        setBinLocation('');
      } else if (activeAddModal === 'shelf') {
        setShelfNumber(targetShelf);
        setBinLocation('');
      } else if (activeAddModal === 'bin') {
        setBinLocation(targetBin);
      }

      setActiveAddModal(null);
      setNewRackInput('');
      setNewShelfInput('');
      setNewBinInput('');
    } catch (err) {
      console.error('Failed to save coordinate:', err);
      alert(err.response?.data?.message || 'Failed to add coordinate');
    } finally {
      setIsSubmittingNewCoordinate(false);
    }
  };

  const handleAddNewGroup = (explicitParentId) => {
    setModalGroupParentId(explicitParentId !== undefined ? explicitParentId : (groupId || ''));
    setModalGroupName('');
    setModalGroupDesc('');
    setModalGroupImages([]);
    setShowAddGroupModal(true);
  };

  const submitNewGroup = async (e) => {
    e.preventDefault();
    const normalizedGroupName = modalGroupName.trim().toLocaleLowerCase();
    const duplicateGroup = groups.find(group =>
      String(group.name || group.group_name || '').trim().toLocaleLowerCase() === normalizedGroupName
    );
    if (normalizedGroupName && duplicateGroup) {
      alert(`Group "${duplicateGroup.name || duplicateGroup.group_name}" already exists. Select it from the suggestions to view it.`);
      return;
    }
    try {
      const payload = {
        name: modalGroupName.trim(),
        description: modalGroupDesc,
        status: 'Active',
        parent_id: modalGroupParentId ? parseInt(modalGroupParentId) : null,
        images: modalGroupImages,
        image_url: modalGroupImages.length > 0 ? modalGroupImages[0] : null,
        image: modalGroupImages.length > 0 ? modalGroupImages[0] : null
      };
      const res = await api.post('/admin/groups', payload);
      const newGroup = res.data?.data || res.data;
      setGroups([...groups, newGroup]);
      setGroupId(newGroup.id);
      setShowAddGroupModal(false);
      setModalGroupName('');
      setModalGroupDesc('');
      setModalGroupParentId('');
      setModalGroupImages([]);
      setGroupRefresh(prev => prev + 1);
    } catch (err) {
      alert("Failed to add group");
    }
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

      // Auto-assign the newly created alias type to the current empty alias row or first row
      setProductAliases(prev => {
        const copy = Array.isArray(prev) ? [...prev] : [];
        const targetIdx = copy.findIndex(a => !a.alias_type_id);
        if (targetIdx !== -1) {
          copy[targetIdx] = {
            ...copy[targetIdx],
            alias_type_id: String(created.id),
            alias_type_name: created.name
          };
          if (targetIdx === 0) {
            setAliasTypeId(String(created.id));
            setAliasTypeName(created.name);
          }
        } else if (copy.length === 1 && !copy[0].alias_type_id) {
          copy[0] = {
            ...copy[0],
            alias_type_id: String(created.id),
            alias_type_name: created.name
          };
          setAliasTypeId(String(created.id));
          setAliasTypeName(created.name);
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

  const handleCompanySelect = async (selectedCompanyName, directCompObj = null) => {
    setCompanyName(selectedCompanyName);
    setBrandId('');

    if (!selectedCompanyName) {
      setCompanyInheritedMedia(null);
      setCompanyInheritedSchemes(null);
      if (!schemeManuallyOverridden) {
        setActiveSchemeSource('none');
        setProductPeProduct('');
        setDiscountOnProduct('');
        setProductTargetScheme('');
        setDiscountOnBillAmount('');
        setQuarterlyDiscountOnTurnover('');
        setYearlyDiscountOnTurnover('');
        setSeasonalSchemeName('');
      }
      return;
    }

    // Locate company in companies list or directCompObj
    const matched = directCompObj || companies.find(
      c => (c.name && c.name.toLowerCase() === selectedCompanyName.toLowerCase()) ||
        (c.company_name && c.company_name.toLowerCase() === selectedCompanyName.toLowerCase())
    );

    let fullComp = matched ? extractCompanyMedia(matched) : null;
    setIsInheritingMedia(true);

    if (matched?.id) {
      try {
        const res = await api.get(`/admin/companies/${matched.id}`);
        const fresh = res.data?.data || res.data;
        if (fresh) fullComp = extractCompanyMedia({ ...matched, ...fresh });
      } catch (err) {
        console.warn("Could not fetch fresh company details for auto-fetch:", err);
      }
    }
    setIsInheritingMedia(false);

    if (!fullComp) return;

    // Brochure
    const compBrochureUrl = fullComp.brochureUrl || fullComp.brochure_url || '';
    const compBrochureName = fullComp.brochureName || fullComp.brochure_name ||
      (compBrochureUrl ? `${fullComp.company_name || fullComp.name || selectedCompanyName}_Brochure.pdf` : '');

    // Video
    const compVideoUrl = fullComp.videoUrl || fullComp.video_url || '';

    // Gallery images
    const compImages = fullComp.images || [];

    // Primary Logo
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

    // Auto-inherit Brochure if product brochure is currently empty or was previously auto-inherited
    if (compBrochureUrl && (!companyBrochure?.url || companyBrochure?.isInherited)) {
      setCompanyBrochure({
        url: compBrochureUrl,
        name: compBrochureName,
        isInherited: true,
        sourceCompany: selectedCompanyName
      });
    }

    // Auto-inherit Video if product videos is currently empty or was previously auto-inherited
    if (compVideoUrl && (productVideos.length === 0 || productVideos._isInherited)) {
      const vArr = [compVideoUrl];
      vArr._isInherited = true;
      setProductVideos(vArr);
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
    if (!schemeManuallyOverridden) {
      setProductPeProduct(compSchemes.product_pe_product || '');
      setDiscountOnProduct(compSchemes.discount_on_product || '');
      setProductTargetScheme(compSchemes.product_target_scheme || '');
      setDiscountOnBillAmount(compSchemes.discount_on_bill_amount || '');
      setQuarterlyDiscountOnTurnover(compSchemes.quarterly_discount_on_turnover || '');
      setYearlyDiscountOnTurnover(compSchemes.yearly_discount_on_turnover || '');
      setSeasonalSchemeName(compSchemes.seasonal_scheme_name || '');
      setSeasonalPeriodStart(compSchemes.seasonal_period_start || '');
      setSeasonalPeriodEnd(compSchemes.seasonal_period_end || '');
      setSeasonalApplicability(compSchemes.seasonal_applicability || 'All Products');
      setSeasonalFrequency(compSchemes.seasonal_frequency || 'Yearly');
      setActiveSchemeSource(compHasSchemes ? 'company' : 'none');
    }
  };

  const handleBrandSelect = (selectedBrandId, directBrand = null) => {
    setBrandId(selectedBrandId || '');
    if (schemeManuallyOverridden) return;

    const brand = directBrand || brands.find(item => String(item.id) === String(selectedBrandId));
    const nestedSchemes = brand?.schemes || {};
    const brandBogo = brand?.scheme || brand?.product_pe_product || nestedSchemes.product_pe_product || nestedSchemes.scheme || '';
    const brandOffer = brand?.offer || brand?.discount_on_product || nestedSchemes.discount_on_product || nestedSchemes.offer || '';
    const isActive = !brand?.status || String(brand.status).toLowerCase() === 'active';
    const hasBrandScheme = isActive && Boolean(String(brandBogo || '').trim() || String(brandOffer || '').trim());

    if (hasBrandScheme) {
      setProductPeProduct(brandBogo || '');
      setDiscountOnProduct(brandOffer || '');
      setActiveSchemeSource('brand');
      return;
    }

    const fallback = companyInheritedSchemes?.schemes;
    if (fallback && companyInheritedSchemes.hasSchemes) {
      setProductPeProduct(fallback.product_pe_product || '');
      setDiscountOnProduct(fallback.discount_on_product || '');
      setProductTargetScheme(fallback.product_target_scheme || '');
      setDiscountOnBillAmount(fallback.discount_on_bill_amount || '');
      setQuarterlyDiscountOnTurnover(fallback.quarterly_discount_on_turnover || '');
      setYearlyDiscountOnTurnover(fallback.yearly_discount_on_turnover || '');
      setSeasonalSchemeName(fallback.seasonal_scheme_name || '');
      setSeasonalPeriodStart(fallback.seasonal_period_start || '');
      setSeasonalPeriodEnd(fallback.seasonal_period_end || '');
      setSeasonalApplicability(fallback.seasonal_applicability || 'All Products');
      setSeasonalFrequency(fallback.seasonal_frequency || 'Yearly');
      setActiveSchemeSource('company');
    } else {
      setProductPeProduct('');
      setDiscountOnProduct('');
      setProductTargetScheme('');
      setDiscountOnBillAmount('');
      setQuarterlyDiscountOnTurnover('');
      setYearlyDiscountOnTurnover('');
      setSeasonalSchemeName('');
      setSeasonalPeriodStart('');
      setSeasonalPeriodEnd('');
      setActiveSchemeSource('none');
    }
  };

  const handleApplyCompanySchemes = () => {
    if (!companyInheritedSchemes?.schemes) return;
    const s = companyInheritedSchemes.schemes;
    setProductPeProduct(s.product_pe_product || '');
    setDiscountOnProduct(s.discount_on_product || '');
    setProductTargetScheme(s.product_target_scheme || '');
    setDiscountOnBillAmount(s.discount_on_bill_amount || '');
    setQuarterlyDiscountOnTurnover(s.quarterly_discount_on_turnover || '');
    setYearlyDiscountOnTurnover(s.yearly_discount_on_turnover || '');
    setSeasonalSchemeName(s.seasonal_scheme_name || '');
    setSeasonalPeriodStart(s.seasonal_period_start || '');
    setSeasonalPeriodEnd(s.seasonal_period_end || '');
    setSeasonalApplicability(s.seasonal_applicability || 'All Products');
    setSeasonalFrequency(s.seasonal_frequency || 'Yearly');
    setActiveSchemeSource('company');
    setSchemeManuallyOverridden(false);
  };

  const handleImportCompanyImages = () => {
    if (!companyInheritedMedia?.images?.length) return;
    const existing = new Set(productImages);
    const newImgs = companyInheritedMedia.images.filter(img => !existing.has(img));
    if (newImgs.length === 0) {
      alert("All photos from this company gallery are already added to the element.");
      return;
    }
    setProductImages(prev => [...prev, ...newImgs]);
  };

  const handleClearInheritedMedia = () => {
    if (companyBrochure?.isInherited) {
      setCompanyBrochure({ url: '', name: '', isInherited: false });
    }
    if (productVideos._isInherited || (companyInheritedMedia?.videoUrl && productVideos.includes(companyInheritedMedia.videoUrl))) {
      setProductVideos([]);
    }
    setCompanyInheritedMedia(null);
  };

  const handleAutoFillFromBrochure = (extracted) => {
    if (!extracted || typeof extracted !== 'object') return;

    if (extracted.productName) {
      setProductName(extracted.productName);
      setIsCustomName(true);
    }
    if (extracted.baseProductName) {
      setBaseProductName(extracted.baseProductName);
    }
    if (extracted.internalSku && hasVariants !== 'Yes') {
      setInternalSku(extracted.internalSku);
    }
    if (extracted.productDescription) {
      setProductDescription(extracted.productDescription);
    }
    if (extracted.product_info || extracted.productInfo) {
      setProductInfo(extracted.product_info || extracted.productInfo);
    }
    if (extracted.companyName) {
      handleCompanySelect(extracted.companyName);
    }
    if (extracted.brandId) {
      setBrandId(String(extracted.brandId));
    } else if (extracted.brandName && brands?.length > 0) {
      const foundB = brands.find(b => b.name?.toLowerCase() === extracted.brandName.toLowerCase());
      if (foundB) setBrandId(String(foundB.id));
    }
    if (extracted.groupId) {
      setGroupId(String(extracted.groupId));
    }
    if (extracted.productTypeId) {
      setProductTypeId(extracted.productTypeId);
      if (extracted.productType) setProductType(extracted.productType);
    }
    if (extracted.productAlias) {
      setProductAlias(extracted.productAlias);
      setProductAliases(prev => {
        const copy = Array.isArray(prev) ? [...prev] : [''];
        copy[0] = extracted.productAlias;
        return copy;
      });
    }
    if (extracted.hsnCode) {
      setHsnCode(extracted.hsnCode);
    }
    if (extracted.barcode) {
      setBarcode(extracted.barcode);
    }
    if (extracted.mrp) {
      setMrp(extracted.mrp);
    }
    if (extracted.purchasePrice) {
      setPurchasePrice(extracted.purchasePrice);
    }
    if (extracted.sellingPriceRetail) {
      setSellingPriceRetail(extracted.sellingPriceRetail);
      setSellingPrice(extracted.sellingPriceRetail);
    } else if (extracted.sellingPrice) {
      setSellingPrice(extracted.sellingPrice);
      setSellingPriceRetail(extracted.sellingPrice);
    }
    if (extracted.sellingPriceWholesale) {
      setSellingPriceWholesale(extracted.sellingPriceWholesale);
    }
    if (extracted.distributorPrice) {
      setDistributorPrice(extracted.distributorPrice);
    }
    if (extracted.gstRate) {
      setGstRate(extracted.gstRate);
    }
    if (extracted.netWeight) {
      setNetWeight(extracted.netWeight);
    }
    if (extracted.grossWeight) {
      setGrossWeight(extracted.grossWeight);
    }
    if (extracted.weightUnit) {
      setWeightUnit(extracted.weightUnit);
    }
    if (extracted.volume) {
      setVolume(extracted.volume);
    }
    if (extracted.volumeUnit) {
      setVolumeUnit(extracted.volumeUnit);
    }
    if (extracted.length) {
      setLength(extracted.length);
    }
    if (extracted.breadth) {
      setBreadth(extracted.breadth);
    }
    if (extracted.thickness) {
      setThickness(extracted.thickness);
    }
    if (extracted.dimensionUnit) {
      setDimensionUnit(extracted.dimensionUnit);
    }
    if (extracted.packaging) {
      setPackaging(extracted.packaging);
    }
    if (extracted.physicalAppearance) {
      setPhysicalAppearance(extracted.physicalAppearance);
    }
  };

  const handleAddNewCompany = () => {
    setShowAddCompanyModal(true);
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
        company_images: modalCompanyImages,
        images: modalCompanyImages,
        image_url: modalCompanyImages.length > 0 ? modalCompanyImages[0] : null,
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
      setModalCompanyImages([]);
      setModalCompanyBrochures([]);
    } catch (err) {
      alert("Failed to add company");
    }
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
      handleBrandSelect(newBrand.id, newBrand);
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

  const submitNewWarehouse = async (e) => {
    e.preventDefault();
    if (!modalWhName.trim()) {
      alert("Warehouse Name is required");
      return;
    }
    try {
      const payload = {
        name: modalWhName.trim(),
        warehouse_code: modalWhCode.trim() || null,
        code: modalWhCode.trim() || null,
        warehouse_type: modalWhType || 'Central Distribution Center',
        type: modalWhType || 'Central Distribution Center',
        status: modalWhStatus || 'Active',
        address_line_1: modalWhAddress.trim() || null,
        address: modalWhAddress.trim() || null,
        city: modalWhCity.trim() || 'N/A',
        state: modalWhState.trim() || null,
        country: modalWhCountry.trim() || 'India',
        pincode: modalWhPincode.trim() || null,
        contact_person: modalWhManagerName.trim() || null,
        manager_name: modalWhManagerName.trim() || null,
        phone_number: modalWhContactNumber.trim() || null,
        contact_number: modalWhContactNumber.trim() || null,
        email: modalWhEmail.trim() || null,
        total_capacity: modalWhCapacity.trim() || null,
        capacity: modalWhCapacity.trim() || null,
        is_default: modalWhIsDefault
      };
      const res = await api.post('/admin/warehouses', payload);
      const newWh = res.data?.data || res.data;
      setWarehouses(prev => [...prev, newWh]);
      if (newWh.id) {
        setWarehouseId(String(newWh.id));
      }
      setWarehouseLocation(newWh.name || modalWhName);
      setShowAddWarehouseModal(false);
      setModalWhName('');
      setModalWhCode('');
      setModalWhType('Central Distribution Center');
      setModalWhStatus('Active');
      setModalWhAddress('');
      setModalWhCity('');
      setModalWhState('');
      setModalWhCountry('India');
      setModalWhPincode('');
      setModalWhManagerName('');
      setModalWhContactNumber('');
      setModalWhEmail('');
      setModalWhCapacity('');
      setModalWhIsDefault(false);
    } catch (err) {
      console.error("Failed to add warehouse:", err);
      alert(err.response?.data?.message || "Failed to add warehouse");
    }
  };

  const handleCheckHsn = async () => {
    const code = (hsnCode || '').trim();
    if (!code) {
      alert('Please enter an HSN Code to check.');
      return;
    }

    setHsnCheckStatus({ loading: true });

    // 1. Immediate instant format verification
    const digitsOnly = code.replace(/\D/g, '');
    const isStandardDigits = [2, 4, 6, 8].includes(digitsOnly.length);

    try {
      // 2. Fast non-blocking lookup in customs records with 1.5s timeout
      const customsRes = await api.get('/admin/customs', { timeout: 1500 });
      const list = customsRes.data?.data || customsRes.data || [];
      const cleaned = code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      const matched = list.find(item => {
        const localHsn = (item.local_tariff_hsn_code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const globalHs = (item.global_hs6_code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return (localHsn && localHsn === cleaned) || (globalHs && globalHs === cleaned) || (localHsn && localHsn.startsWith(cleaned)) || (cleaned && localHsn.startsWith(cleaned));
      });

      if (matched) {
        setHsnCheckStatus({
          valid: true,
          details: `Verified with Customs Tariff (Duty: ${matched.import_duty_rate || 0}%, Country: ${matched.country_code || 'All'})`
        });
        return;
      }
    } catch (err) {
      // Ignore network delays and proceed immediately with standard validation
    }

    if (isStandardDigits) {
      setHsnCheckStatus({
        valid: true,
        details: `Valid standard ${digitsOnly.length}-digit HSN/Tariff code format.`
      });
    } else if (digitsOnly.length > 0) {
      setHsnCheckStatus({
        valid: false,
        details: `Standard HSN code uses 2, 4, 6, or 8 numeric digits (currently ${digitsOnly.length} digits).`
      });
    } else {
      setHsnCheckStatus({
        valid: false,
        details: 'Invalid HSN format. Please enter numeric HSN digits.'
      });
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (activeTab !== 'review') {
      setActiveTab('review');
      return;
    }
    const isUpdate = Boolean(editingProductId || product?.id);
    const targetId = editingProductId || product?.id;
    try {
      const effectiveDimUnit = dimensionUnit === 'custom' ? (customDimensionUnit.trim() || '') : dimensionUnit;
      const effectiveVolUnit = volumeUnit === 'custom' ? (customVolumeUnit.trim() || '') : volumeUnit;
      const effectiveWtUnit = weightUnit === 'custom' ? (customWeightUnit.trim() || '') : weightUnit;

      if (
        (purchasePrice !== '' && parseFloat(purchasePrice) < 0) ||
        (sellingPrice !== '' && parseFloat(sellingPrice) < 0) ||
        (mrp !== '' && parseFloat(mrp) < 0) ||
        (distributorPrice !== '' && parseFloat(distributorPrice) < 0) ||
        (profitPercent !== '' && parseFloat(profitPercent) < 0) ||
        (sellingPriceWholesale !== '' && parseFloat(sellingPriceWholesale) < 0) ||
        (sellingPriceRetail !== '' && parseFloat(sellingPriceRetail) < 0) ||
        (gstRate !== '' && parseFloat(gstRate) < 0) ||
        (purchaseQuantity !== '' && parseInt(purchaseQuantity, 10) < 0) ||
        (reorderLevel !== '' && parseInt(reorderLevel, 10) < 0)
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
        !isServiceType && (
          (lotNumber !== '' && !/^\d+$/.test(String(lotNumber).trim())) ||
          (lotNumber !== '' && Number(lotNumber) < 0)
        )
      ) {
        alert("Lot Number must contain only positive numbers.");
        return;
      }

      if (
        !isServiceType && (
          (batchNumber !== '' && !/^\d+$/.test(String(batchNumber).trim())) ||
          (batchNumber !== '' && Number(batchNumber) < 0)
        )
      ) {
        alert("Batch Number must contain only positive numbers.");
        return;
      }

      const endpoint = isUpdate ? `/admin/products/${targetId}` : '/admin/products';
      const payload = {
        product_name: productName,
        product_type_id: productTypeId ? parseInt(productTypeId, 10) : null,
        item_type: productType || 'Goods',
        sku: internalSku || null,
        costing_method: costingMethod,
        alias_type_id: productAliases[0]?.alias_type_id ? parseInt(productAliases[0].alias_type_id, 10) : (aliasTypeId ? parseInt(aliasTypeId, 10) : null),
        alias_type_name: productAliases[0]?.alias_type_name || aliasTypeName || null,
        product_alias: productAliases.map(a => (typeof a === 'object' ? a.alias_name : a)).filter(Boolean).join(', ') || productAlias || null,
        product_aliases: productAliases.map(a => (typeof a === 'object' ? a.alias_name : a)).filter(Boolean),
        aliases: productAliases.filter(a => ((typeof a === 'object' ? a.alias_name : a) || '').trim() !== ''),
        company_id: companies.find(c => (c.name && companyName && c.name.toLowerCase() === companyName.toLowerCase()) || (c.company_name && companyName && c.company_name.toLowerCase() === companyName.toLowerCase()))?.id || null,
        company_name: companyName || null,
        brand_id: brandId || null,
        brand_name: brands.find(b => String(b.id) === String(brandId))?.name || null,
        group_id: groupId ? parseInt(groupId, 10) : null,

        short_description: productDescription || null,
        product_info: productInfo || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : 0,
        expense_id: attachedExpenses[0]?.expense_id ? parseInt(attachedExpenses[0].expense_id, 10) : (expenseId ? parseInt(expenseId, 10) : null),
        expense_name: attachedExpenses.length > 0 ? attachedExpenses.map(e => e.expense_name).filter(Boolean).join(', ') : (expenseName || null),
        expense_amount: totalAttachedExpense,
        product_expenses: attachedExpenses.filter(e => e.expense_name || parseFloat(e.amount) > 0),
        expenses: attachedExpenses.filter(e => e.expense_name || parseFloat(e.amount) > 0),
        base_unit_cost: landedPurchaseCost,
        landed_cost: landedPurchaseCost,
        purchase_quantity: isServiceType ? 0 : (purchaseQuantity ? parseInt(purchaseQuantity, 10) : 0),
        lot_number: isServiceType ? null : (lotNumber || null),
        batch_number: isServiceType ? null : (batchNumber || null),
        selling_price: sellingPrice || 0,
        mrp: mrp ? parseFloat(mrp) : 0,
        distributor_price: distributorPrice ? parseFloat(distributorPrice) : 0,
        distributor_profit_percent: distributorProfitPercent ? parseFloat(distributorProfitPercent) : 0,
        profit_percent: profitPercent ? parseFloat(profitPercent) : 0,
        selling_price_wholesale: sellingPriceWholesale ? parseFloat(sellingPriceWholesale) : 0,
        wholesale_profit_percent: wholesaleProfitPercent ? parseFloat(wholesaleProfitPercent) : 0,
        selling_price_retail: sellingPriceRetail ? parseFloat(sellingPriceRetail) : 0,
        retail_profit_percent: retailProfitPercent ? parseFloat(retailProfitPercent) : 0,
        currency: currency,
        gst_rate: gstRate || 0,
        reorder_level: isServiceType ? 0 : (reorderLevel ? parseInt(reorderLevel, 10) : 0),
        reorder_note: isServiceType ? null : (reorderNote || null),
        min_stock_level: isServiceType ? 0 : (minStockLevel ? parseInt(minStockLevel, 10) : 0),
        max_stock_level: isServiceType ? 0 : (maxStockLevel ? parseInt(maxStockLevel, 10) : 0),
        lead_time_days: isServiceType ? 0 : (leadTimeDays ? parseInt(leadTimeDays, 10) : 7),
        reorder_qty: isServiceType ? 0 : (reorderQty ? parseInt(reorderQty, 10) : 0),
        auto_reorder: isServiceType ? false : Boolean(autoReorder),
        gtin_ean_upc: barcode || null,
        hsn_code: hsnCode || null,
        status: 'Active',
        attributes: attributes.filter(a => ((a?.name || a?.Attribute?.name || '') + '').trim() !== '' && ((a?.value || a?.attribute_value || '') + '').trim() !== ''),
        physical_appearance: isServiceType ? null : (physicalAppearance || null),
        physical_shape: isServiceType ? null : (physicalAppearance || null),
        size: isServiceType ? null : (size || null),
        packaging: isServiceType ? null : (packaging || null),
        length: isServiceType ? null : (length ? (effectiveDimUnit ? `${length} ${effectiveDimUnit}` : length) : null),
        breadth: isServiceType ? null : (breadth ? (effectiveDimUnit ? `${breadth} ${effectiveDimUnit}` : breadth) : null),
        thickness: isServiceType ? null : (thickness ? (effectiveDimUnit ? `${thickness} ${effectiveDimUnit}` : thickness) : null),
        volume: isServiceType ? null : (volume ? (effectiveVolUnit ? `${volume} ${effectiveVolUnit}` : volume) : null),
        net_weight: isServiceType ? null : (netWeight ? (effectiveWtUnit ? `${netWeight} ${effectiveWtUnit}` : netWeight) : null),
        gross_weight: isServiceType ? null : (grossWeight ? (effectiveWtUnit ? `${grossWeight} ${effectiveWtUnit}` : grossWeight) : null),
        image_url: productImages.length > 0 ? productImages[0] : null,
        images: productImages,
        video_url: productVideos.length > 0 ? productVideos[0] : null,
        video_urls: productVideos.length > 0 ? productVideos : null,
        company_brochure_url: companyBrochure?.url || null,
        company_brochure_name: companyBrochure?.name || null,
        barcode_image_url: barcodeImageUrl || null,
        manufacturing_date: manufacturingDate || null,
        expiry_date: expiryDate || null,
        best_before_date: bestBeforeDate || null,
        warehouse_location: warehouseLocation || (warehouses.find(w => String(w.id) === String(warehouseId))?.name) || null,
        default_warehouse_id: isServiceType ? null : (warehouseId ? parseInt(warehouseId, 10) : (warehouses.find(w => w.name === warehouseLocation)?.id || null)),
        rack_number: isServiceType ? null : (rackNumber || null),
        shelf_number: isServiceType ? null : (shelfNumber || null),
        bin_location: isServiceType ? null : (binLocation || null),
        opening_stock: isServiceType ? 0 : (openingStock ? parseInt(openingStock, 10) : (purchaseQuantity ? parseInt(purchaseQuantity, 10) : null)),
        safety_stock: isServiceType ? 0 : (safetyStock ? parseInt(safetyStock, 10) : null),
        warehouse_allocations: (!isServiceType && (warehouseId || warehouseLocation)) ? [{
          warehouse_id: warehouseId ? parseInt(warehouseId, 10) : (warehouses.find(w => w.name === warehouseLocation)?.id || null),
          is_primary: true,
          opening_stock: openingStock ? parseInt(openingStock, 10) : (purchaseQuantity ? parseInt(purchaseQuantity, 10) : 0),
          rack_number: rackNumber || null,
          shelf_number: shelfNumber || null,
          bin_location: binLocation || null,
          safety_stock: safetyStock ? parseInt(safetyStock, 10) : null,
          reorder_level: reorderLevel ? parseInt(reorderLevel, 10) : null
        }].filter(a => a.warehouse_id) : [],
        product_pe_product: productPeProduct || null,
        discount_on_product: discountOnProduct || null,
        product_target_scheme: productTargetScheme || null,
        discount_on_bill_amount: discountOnBillAmount || null,
        quarterly_discount_on_turnover: quarterlyDiscountOnTurnover || null,
        yearly_discount_on_turnover: yearlyDiscountOnTurnover || null,
        seasonal_scheme_name: seasonalSchemeName || null,
        seasonal_frequency: seasonalFrequency || null,
        seasonal_applicability: seasonalApplicability || null,
        seasonal_period_start: seasonalPeriodStart || null,
        seasonal_period_end: seasonalPeriodEnd || null,
        is_occasion_based: isOccasionBased === 'Yes',
        occasion_ids: isOccasionBased === 'Yes' ? selectedOccasionIds : [],
        has_variants: hasVariants === 'Yes',
        variant_attributes: hasVariants === 'Yes' ? variantAttributes : [],
        variants: hasVariants === 'Yes' ? productVariants.map(v => {
          const vSellingPrice = parseFloat(v.selling_price) || (parseFloat(sellingPrice) || 0) + (parseFloat(v.price_extra) || 0);
          const vPurchasePrice = parseFloat(v.purchase_price) || (parseFloat(purchasePrice) || 0);
          const vMrp = parseFloat(v.mrp) || (parseFloat(mrp) || vSellingPrice);
          const vOpeningStock = parseInt(v.opening_stock ?? v.stock ?? (purchaseQuantity || 0), 10);
          const rawPackagings = Array.isArray(v.packagings) ? v.packagings : (Array.isArray(v.packaging) ? v.packaging : []);

          return {
            name: v.name || v.variant_name || `${productName} (${Object.values(v.combination || v.variant_attributes || {}).join(' - ')})`,
            variant_name: v.name || v.variant_name,
            sku: v.sku,
            product_info: v.product_info || productInfo || null,
            variant_attributes: v.variant_attributes || v.combination || {},
            combination: v.combination || v.variant_attributes || {},
            purchase_price: vPurchasePrice,
            costing_method: v.costing_method || costingMethod,
            selling_price: vSellingPrice,
            mrp: vMrp,
            opening_stock: vOpeningStock,
            reorder_level: v.reorder_level !== undefined && v.reorder_level !== '' ? Math.max(0, parseInt(v.reorder_level, 10)) : (reorderLevel ? Math.max(0, parseInt(reorderLevel, 10)) : 0),
            reorder_qty: v.reorder_qty !== undefined && v.reorder_qty !== '' ? Math.max(0, parseInt(v.reorder_qty, 10)) : (reorderQty ? Math.max(0, parseInt(reorderQty, 10)) : 0),
            safety_stock: v.safety_stock !== undefined && v.safety_stock !== '' ? Math.max(0, parseInt(v.safety_stock, 10)) : (safetyStock ? Math.max(0, parseInt(safetyStock, 10)) : 0),
            lead_time_days: v.lead_time_days !== undefined && v.lead_time_days !== '' ? Math.max(1, parseInt(v.lead_time_days, 10)) : (leadTimeDays ? Math.max(1, parseInt(leadTimeDays, 10)) : 7),
            auto_reorder: v.auto_reorder !== undefined ? !!v.auto_reorder : (autoReorder === 'Yes' || autoReorder === true),
            reorder_strategy: v.reorder_strategy || 'MIN_MAX',
            warehouse_id: v.warehouse_id ? parseInt(v.warehouse_id, 10) : (warehouseId ? parseInt(warehouseId, 10) : null),
            default_warehouse_id: v.warehouse_id ? parseInt(v.warehouse_id, 10) : (warehouseId ? parseInt(warehouseId, 10) : null),
            warehouse_allocations: (v.warehouse_id || warehouseId) ? [{
              warehouse_id: parseInt(v.warehouse_id || warehouseId, 10),
              is_primary: true,
              opening_stock: vOpeningStock,
              rack_number: rackNumber || null,
              shelf_number: shelfNumber || null,
              bin_location: binLocation || null,
              safety_stock: (v.safety_stock !== undefined && v.safety_stock !== '') ? parseInt(v.safety_stock, 10) : (safetyStock ? parseInt(safetyStock, 10) : null)
            }] : [],
            gtin_ean_upc: v.gtin_ean_upc || v.barcode || `${v.sku}-UNIT`,
            barcode: v.gtin_ean_upc || v.barcode || `${v.sku}-UNIT`,
            barcode_image_url: v.barcode_image_url || null,
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

      const res = isUpdate ? await api.put(endpoint, payload) : await api.post(endpoint, payload);
      setProductImages([]);
      setProductVideos([]);
      setCompanyBrochure({ url: '', name: '' });
      setCompanyInheritedMedia(null);
      setCompanyName('');
      setBaseProductName('');
      setProductName('');
      setInternalSku('');
      setProductDescription('');
      setProductInfo('');
      setProductAliases([{ alias_type_id: '', alias_type_name: '', alias_name: '' }]);
      setProductAlias('');
      setAliasTypeId('');
      setAliasTypeName('');
      setExpenseId('');
      setExpenseName('');
      setExpenseAmount('');
      setAttachedExpenses([]);
      setHasVariants('No');
      setVariantAttributes([]);
      setProductVariants([]);
      setBrandId('');
      setCostingMethod('FIFO');
      setPurchasePrice('');
      setPurchaseQuantity('');
      setLotNumber('');
      setBatchNumber('');
      setSellingPrice('');
      setMrp('');
      setDistributorPrice('');
      setDistributorProfitPercent('');
      setProfitPercent('');
      setSellingPriceWholesale('');
      setWholesaleProfitPercent('');
      setSellingPriceRetail('');
      setRetailProfitPercent('');
      setGstRate('');
      setReorderLevel('');
      setReorderNote('');
      setMinStockLevel('');
      setMaxStockLevel('');
      setLeadTimeDays('7');
      setReorderQty('');
      setAutoReorder(false);
      setBarcode('');
      setBarcodeImageUrl('');
      setHsnCode('');
      setWarehouseLocation('');
      setWarehouseId('');
      setRackNumber('');
      setShelfNumber('');
      setBinLocation('');
      setOpeningStock('');
      setSafetyStock('');
      setManufacturingDate('');
      setExpiryDate('');
      setBestBeforeDate('');
      setProductPeProduct('');
      setDiscountOnProduct('');
      setProductTargetScheme('');
      setActiveSchemeSource('none');
      setSchemeManuallyOverridden(false);
      setDiscountOnBillAmount('');
      setQuarterlyDiscountOnTurnover('');
      setYearlyDiscountOnTurnover('');
      setSeasonalSchemeName('');
      setSeasonalFrequency('Yearly');
      setSeasonalApplicability('All Products');
      setSeasonalPeriodStart('');
      setSeasonalPeriodEnd('');
      setGroupId('');
      setProductTypeId(1);
      setProductType('Goods');
      setPhysicalAppearance('');
      setSize('');
      setPackaging('');
      setLength('');
      setBreadth('');
      setThickness('');
      setDimensionUnit('cm');
      setCustomDimensionUnit('');
      setVolume('');
      setVolumeUnit('ml');
      setCustomVolumeUnit('');
      setNetWeight('');
      setGrossWeight('');
      setWeightUnit('g');
      setCustomWeightUnit('');
      setIsOccasionBased('No');
      setSelectedOccasionType('');
      setSelectedOccasionIds([]);
      setIsEditingName(false);
      setIsCustomName(false);
      setActiveTab('info');
      setEditingProductId(null);
      setShowForm(false);
      alert(isUpdate ? "Product updated successfully!" : "Product added successfully!");
      fetchProducts();
      if (isFromPO && !isUpdate) {
        const createdProd = res?.data?.data || res?.data;
        const createdId = createdProd?.id;
        navigate(`/purchases?action=new&new_product_id=${createdId || ''}&targetRow=${targetRow || 0}`);
        return;
      }
    } catch (error) {
      console.error("Failed to save product", error);
      alert(isUpdate ? "Failed to update product" : "Failed to create product");
    }
  };

  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleConfirmDelete = async (reason) => {
    if (!deletingProduct) return;
    try {
      setDeleteLoading(true);
      const res = await api.delete(`/admin/products/${deletingProduct.id}`, {
        data: { reason }
      });
      alert(res.data?.message || "Product logically deleted successfully!");
      setDeletingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete product", error);
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to delete product");
    } finally {
      setDeleteLoading(false);
    }
  };

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupStatus, setNewGroupStatus] = useState('Active');
  const [newGroupParentId, setNewGroupParentId] = useState('');
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newGroupName,
        description: newGroupDescription,
        status: newGroupStatus,
        parent_id: newGroupParentId ? parseInt(newGroupParentId) : null
      };
      await api.post('/admin/groups', payload);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupStatus('Active');
      setNewGroupParentId('');
      setShowGroupForm(false);
      fetchProducts(); // refresh groups dropdown

    } catch (err) {
      alert("Failed to create group");
    }
  };

  const getCurrentFormProduct = () => ({
    name: productName || baseProductName || 'New Product',
    product_name: productName || baseProductName || 'New Product',
    sku: internalSku,
    internal_sku: internalSku,
    group_id: groupId,
    company_id: companies.find(c => (c.name || c.company_name) === companyName)?.id || null,
    brand_id: brandId,
    brand_name: brands.find(b => String(b.id) === String(brandId))?.name || '',
    company_name: companyName,
    description: productDescription,
    product_info: productInfo,
    product_alias: productAliases.map(a => typeof a === 'object' ? a.alias_name : a).filter(Boolean).join(', '),
    item_type: productType || 'Goods',
    product_type: productType,
    product_type_id: productTypeId ? parseInt(productTypeId, 10) : null,
    physical_appearance: physicalAppearance,
    size,
    packaging,
    length,
    breadth,
    thickness,
    dimension_unit: dimensionUnit === 'custom' ? customDimensionUnit : dimensionUnit,
    volume,
    volume_unit: volumeUnit === 'custom' ? customVolumeUnit : volumeUnit,
    net_weight: netWeight,
    gross_weight: grossWeight,
    weight_unit: weightUnit === 'custom' ? customWeightUnit : weightUnit,
    selling_price: sellingPrice || 0,
    costing_method: costingMethod,
    mrp: mrp || 0,
    purchase_price: purchasePrice || 0,
    distributor_price: distributorPrice || 0,
    profit_percent: profitPercent || 0,
    selling_price_wholesale: sellingPriceWholesale || 0,
    selling_price_retail: sellingPriceRetail || 0,
    purchase_quantity: purchaseQuantity || openingStock || 0,
    reorder_level: reorderLevel || 0,
    reorder_note: reorderNote || '',
    min_stock_level: minStockLevel || 0,
    max_stock_level: maxStockLevel || 0,
    lead_time_days: leadTimeDays || 7,
    reorder_qty: reorderQty || 0,
    auto_reorder: autoReorder || false,
    safety_stock: safetyStock || 0,
    currency,
    gst_rate: gstRate || 0,
    hsn_code: hsnCode,
    gtin_ean_upc: barcode,
    lot_number: lotNumber,
    batch_number: batchNumber,
    manufacturing_date: manufacturingDate,
    expiry_date: expiryDate,
    best_before_date: bestBeforeDate,
    warehouse_location: warehouseLocation,
    rack_number: rackNumber,
    shelf_number: shelfNumber,
    bin_location: binLocation,
    product_pe_product: productPeProduct,
    discount_on_product: discountOnProduct,
    product_target_scheme: productTargetScheme,
    discount_on_bill_amount: discountOnBillAmount,
    quarterly_discount_on_turnover: quarterlyDiscountOnTurnover,
    yearly_discount_on_turnover: yearlyDiscountOnTurnover,
    seasonal_scheme_name: seasonalSchemeName,
    occasions: occasionsList.filter(o => selectedOccasionIds.includes(o.id)),
    image_url: productImages[0] || '',
    images: productImages,
    barcode_image_url: barcodeImageUrl,
    attributes: attributes.filter(a => a.name && a.value),
    status: 'Active'
  });

  return (
    <div>
      {/* 1. Page Header Navigation & View Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        {/* Segmented View Switcher: Element Templates vs Product Variants */}
        <div style={{ display: 'inline-flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setViewMode('templates')}
            style={{
              padding: '8px 18px',
              borderRadius: '7px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: viewMode === 'templates' ? '#ffffff' : 'transparent',
              color: viewMode === 'templates' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'templates' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Box size={16} color={viewMode === 'templates' ? '#6366f1' : '#64748b'} />
            Element Templates
            {viewMode === 'templates' && !loading && (
              <span style={{ fontSize: '0.72rem', backgroundColor: '#ede9fe', color: '#4338ca', padding: '1px 6px', borderRadius: '999px' }}>
                {products.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode('variants')}
            style={{
              padding: '8px 18px',
              borderRadius: '7px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: viewMode === 'variants' ? '#ffffff' : 'transparent',
              color: viewMode === 'variants' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'variants' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Layers size={16} color={viewMode === 'variants' ? '#6366f1' : '#64748b'} />
            Element Variants
            {viewMode === 'variants' && !loading && (
              <span style={{ fontSize: '0.72rem', backgroundColor: '#ede9fe', color: '#4338ca', padding: '1px 6px', borderRadius: '999px' }}>
                {variantsList.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {hasPermission('products', 'create') && (
            <button
              type="button"
              onClick={() => setShowAddVariantModal(true)}
              style={{
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                fontSize: '0.88rem'
              }}
            >
              <Plus size={18} /> Add Variant
            </button>
          )}

          {hasPermission('products', 'create') && (
            <button
              style={{
                backgroundColor: '#1abc9c',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem'
              }}
              onClick={openAddModal}
            >
              <Plus size={18} /> Add Element
            </button>
          )}

          <button
            type="button"
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              fontSize: '0.88rem'
            }}
            onClick={() => exportAllProductsExcel(viewMode === 'variants' ? variantsList : products, groups, brands)}
          >
            <FileSpreadsheet size={18} /> Export to Excel
          </button>
        </div>
      </div>


      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <SearchAutocomplete
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU, occasion, barcode..."
          style={{ flex: '1 1 200px' }}
        />
        <select className="form-control" style={{ flex: '1 1 150px' }} value={filterGroupId} onChange={(e) => setFilterGroupId(e.target.value)}>
          <option value="">All Groups</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name} {g.group_code ? `(${g.group_code})` : ''}</option>)}
        </select>

        <select className="form-control" style={{ flex: '1 1 140px' }} value={filterOccasionBased} onChange={(e) => { setFilterOccasionBased(e.target.value); if (e.target.value !== 'Yes') { setFilterOccasionType(''); setFilterOccasionId(''); } }}>
          <option value="">All Occasion Statuses</option>
          <option value="Yes">Occasion Based: Yes</option>
          <option value="No">Occasion Based: No</option>
        </select>

        {filterOccasionBased === 'Yes' && (
          <>
            <select className="form-control" style={{ flex: '1 1 140px' }} value={filterOccasionType} onChange={(e) => { setFilterOccasionType(e.target.value); setFilterOccasionId(''); }}>
              <option value="">All Occasion Types</option>
              {occasionTypes.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
            </select>

            <select className="form-control" style={{ flex: '1 1 140px' }} value={filterOccasionId} onChange={(e) => setFilterOccasionId(e.target.value)}>
              <option value="">All Occasions</option>
              {occasionsList
                .filter(o => !filterOccasionType || o.occasion_type === filterOccasionType)
                .map(o => <option key={o.id} value={o.id}>{o.occasion_name}</option>)}
            </select>
          </>
        )}

        <select className="form-control" style={{ flex: '1 1 130px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {viewMode === 'variants' ? (
        <ProductVariantsTable
          variants={variantsList}
          loading={loading}
          updatingIds={updatingProductIds}
          parentMap={parentProductMap}
          currency={currency}
          onToggleStatus={handleToggleProductStatus}
          onQuickPriceEdit={(v) => setQuickPriceVariant(v)}
          onPrintQR={(v) => setPrintQrVariant(v)}
          onEditFull={(v) => setEditDrawerVariant(v)}
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', width: '60px' }}>Sr. No.</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', width: '60px' }}>Photo</th>
                <th
                  onClick={() => handleSort('product_code')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Element ID {sortKey === 'product_code' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'product_code' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('group_id')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Element Group {sortKey === 'group_id' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'group_id' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Group Code</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>HSN Code</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('name')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Element Name {sortKey === 'name' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'name' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Occasion Based</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Occasion Type</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Occasion Name</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Type</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Description</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Alias</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('purchase_price')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Purchase Price {sortKey === 'purchase_price' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'purchase_price' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('selling_price')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Sell Price {sortKey === 'selling_price' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'selling_price' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('mrp')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      MRP {sortKey === 'mrp' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'mrp' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Profit (Price)</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Profit (%)</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('qty_purchased')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      QTY Purchased {sortKey === 'qty_purchased' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'qty_purchased' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('qty_sold')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      QTY Sold {sortKey === 'qty_sold' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'qty_sold' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('remaining_qty')}
                  style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', userSelect: 'none', minWidth: '180px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {stockView === STOCK_VIEWS.GOVERNMENT ? 'Gov Stock (Virtual Stock)' : stockView === STOCK_VIEWS.PHYSICAL ? 'Physical Stock (Floor)' : 'Between Stock (Gap)'} {sortKey === 'remaining_qty' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </span>
                    <Filter size={13} style={{ color: sortKey === 'remaining_qty' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Reorder Level</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Reorder Required</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Status</span>
                    <Filter size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  </div>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff', padding: '13px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1a252f', whiteSpace: 'nowrap', minWidth: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="25" style={{ textAlign: 'center', padding: '30px' }}>Loading products...</td></tr>
              ) : paginatedProducts.length > 0 ? (
                paginatedProducts.map((product, pIdx) => (
                  <Fragment key={product.id || product._id}>
                    <tr style={{ borderBottom: '1px solid #eaecf0', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                        {(currentPage - 1) * 10 + pIdx + 1}
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                        {product.image_url || (Array.isArray(product.images) && product.images[0]) ? (
                          <img
                            src={product.image_url || product.images[0]}
                            alt={product.name || 'Product'}
                            className="saas-avatar"
                            style={{ margin: '0 auto', display: 'block' }}
                          />
                        ) : (
                          <div className="saas-avatar" style={{ margin: '0 auto', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                            {(product.name || 'P').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className="saas-code-link"
                          onClick={() => navigate(`/products/${product.id}`, { state: { readOnly: true } })}
                          style={{ cursor: 'pointer', fontFamily: 'monospace' }}
                          title="Click to view details"
                        >
                          {product.product_code || `PRO${String(product.id || product._id).padStart(5, '0')}`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          if (!product.group_id) return '-';
                          let path = [];
                          let currentId = product.group_id;
                          while (currentId) {
                            const g = groups.find(x => x.id == currentId);
                            if (g) {
                              path.unshift(g.name);
                              currentId = g.parent_id;
                            } else {
                              break;
                            }
                          }
                          return path.length > 0 ? path.join(' > ') : (product.Group?.name || '-');
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: '#64748b' }}>
                        {(() => {
                          if (!product.group_id) return '-';
                          const g = groups.find(x => x.id == product.group_id);
                          return g ? (g.group_code || 'GRP...') : '-';
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: '#475569' }}>
                        {product.hsn_code || '-'}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{product.name || product.product_name}</span>
                          {product.costing_method && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                letterSpacing: '0.02em',
                                backgroundColor:
                                  product.costing_method === 'AVCO' ? '#e0f2fe' :
                                    product.costing_method === 'BATCH' ? '#fef3c7' :
                                      product.costing_method === 'FIFO' ? '#dcfce7' : '#f1f5f9',
                                color:
                                  product.costing_method === 'AVCO' ? '#0369a1' :
                                    product.costing_method === 'BATCH' ? '#b45309' :
                                      product.costing_method === 'FIFO' ? '#15803d' : '#64748b',
                                border: `1px solid ${product.costing_method === 'AVCO' ? '#bae6fd' :
                                  product.costing_method === 'BATCH' ? '#fde68a' :
                                    product.costing_method === 'FIFO' ? '#bbf7d0' : '#e2e8f0'
                                  }`
                              }}
                              title={`Costing Method: ${product.costing_method}`}
                            >
                              {product.costing_method === 'AVCO' ? 'AVCO' :
                                product.costing_method === 'BATCH' ? 'Batch' :
                                  product.costing_method === 'FIFO' ? 'FIFO' : 'None'}
                            </span>
                          )}
                          {(() => {
                            const hasVar = product.has_variants || (Array.isArray(product.variants) && product.variants.length > 0) || (Array.isArray(product.ProductVariants) && product.ProductVariants.length > 0);
                            const vList = (Array.isArray(product.variants) && product.variants.length > 0)
                              ? product.variants
                              : (Array.isArray(product.ProductVariants) && product.ProductVariants.length > 0)
                                ? product.ProductVariants
                                : (product.has_variants ? [
                                  { id: 1, variant_name: 'Elaichi - 200ml' },
                                  { id: 2, variant_name: 'Elaichi - 400ml' },
                                  { id: 3, variant_name: 'Chocolate - 200ml' },
                                  { id: 4, variant_name: 'Chocolate - 400ml' }
                                ] : []);

                            if (!hasVar) return null;

                            const isExpanded = expandedProductIds.has(product.id || product._id);
                            return (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: '#ede9fe',
                                    color: '#4338ca',
                                    padding: '3px 8px',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    border: '1px solid #c7d2fe'
                                  }}
                                >
                                  <Layers size={12} />
                                  {vList.length > 0 ? `${vList.length} Variants` : 'Variants'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const prodKey = product.id || product._id;
                                    const nextSet = new Set(expandedProductIds);
                                    if (nextSet.has(prodKey)) {
                                      nextSet.delete(prodKey);
                                    } else {
                                      nextSet.add(prodKey);
                                    }
                                    setExpandedProductIds(nextSet);
                                  }}
                                  title={isExpanded ? "Collapse Variants" : "Expand Variants Matrix"}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    border: '1px solid #c7d2fe',
                                    backgroundColor: isExpanded ? '#4338ca' : '#f5f3ff',
                                    color: isExpanded ? '#ffffff' : '#4338ca',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600',
                          backgroundColor: product.is_occasion_based ? '#ede9fe' : '#f1f5f9',
                          color: product.is_occasion_based ? '#4338ca' : '#64748b'
                        }}>
                          {product.is_occasion_based ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: '#475569' }}>
                        {product.occasions && product.occasions.length > 0
                          ? product.occasions.map(o => o.occasion_type).filter((v, i, a) => a.indexOf(v) === i).join(', ')
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                        {product.occasions && product.occasions.length > 0
                          ? product.occasions.map(o => o.occasion_name).join(', ')
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{product.item_type || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>{product.short_description || product.product_info || product.long_description || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          let tblAliases = product.aliases;
                          if (typeof tblAliases === 'string') {
                            try { tblAliases = JSON.parse(tblAliases); } catch (e) { tblAliases = null; }
                          }
                          if (Array.isArray(tblAliases) && tblAliases.length > 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {tblAliases.map((al, idx) => {
                                  const tName = typeof al === 'object' ? al.alias_type_name : '';
                                  const val = typeof al === 'object' ? al.alias_name : al;
                                  return (
                                    <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                      {tName && (
                                        <span style={{ fontSize: '0.72rem', background: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                          {tName}
                                        </span>
                                      )}
                                      <span>{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                          if (product.product_alias) {
                            return (
                              <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '0.9rem' }}>
                                {product.product_alias.split(',').map((alias, idx) => (
                                  <li key={idx} style={{ marginBottom: '2px' }}>
                                    {product.alias_type_name && idx === 0 && (
                                      <span style={{ fontSize: '0.72rem', background: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', marginRight: '4px' }}>
                                        {product.alias_type_name}
                                      </span>
                                    )}
                                    {alias.trim()}
                                  </li>
                                ))}
                              </ol>
                            );
                          }
                          return '-';
                        })()}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {product.purchase_price > 0 ? `${product.currency || 'INR'} ${parseFloat(product.purchase_price).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {product.selling_price > 0 ? `${product.currency || 'INR'} ${parseFloat(product.selling_price).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {product.mrp > 0 ? `${product.currency || 'INR'} ${parseFloat(product.mrp).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {product.purchase_price > 0 || product.selling_price > 0 ? (
                          <span style={{ color: (product.selling_price - product.purchase_price) >= 0 ? '#10b981' : '#ef4444', fontWeight: '500' }}>
                            {product.currency || 'INR'} {(product.selling_price - product.purchase_price).toFixed(2)}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {product.purchase_price > 0 ? (
                          <span style={{ color: (product.selling_price - product.purchase_price) >= 0 ? '#10b981' : '#ef4444', fontWeight: '500' }}>
                            {(((product.selling_price - product.purchase_price) / product.purchase_price) * 100).toFixed(2)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{product.qty_purchased || 0}</td>
                      <td style={{ padding: '12px 16px' }}>{product.qty_sold || 0}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {(() => {
                          const phys = parseFloat(product.physical_stock ?? product.remaining_qty ?? 0);
                          const virt = parseFloat(product.virtual_stock ?? product.remaining_qty ?? 0);
                          const gap = parseFloat(product.stock_gap ?? (phys - virt));
                          const isAlert = Boolean(product.is_alert || (Math.abs(gap) >= (product.threshold || 10) && gap !== 0));

                          if (stockView === STOCK_VIEWS.GOVERNMENT) {
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  fontWeight: '800',
                                  backgroundColor: '#f3e8ff',
                                  color: '#7c3aed',
                                  border: '1px solid #ddd6fe'
                                }}
                                title="Official Government Virtual Stock"
                              >
                                <Building2 size={13} /> Govt: {virt}
                              </span>
                            );
                          }

                          if (stockView === STOCK_VIEWS.PHYSICAL) {
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  fontWeight: '800',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0284c7',
                                  border: '1px solid #bae6fd'
                                }}
                                title="Physical Ground Stock in Warehouses"
                              >
                                <Package size={13} /> Physical: {phys}
                              </span>
                            );
                          }

                          // Consolidated Gap View
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: '800',
                                    backgroundColor: '#e0f2fe',
                                    color: '#0284c7',
                                    border: '1px solid #bae6fd'
                                  }}
                                  title="Physical Ground Stock"
                                >
                                  Physical: {phys}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: '800',
                                    backgroundColor: '#f3e8ff',
                                    color: '#7c3aed',
                                    border: '1px solid #ddd6fe'
                                  }}
                                  title="Government / Tax Virtual Stock"
                                >
                                  Govt: {virt}
                                </span>
                              </div>

                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {isAlert && (
                                  <span
                                    title={`Alert: Discrepancy ${gap} units exceeds threshold!`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      color: '#d97706',
                                      animation: 'pulse 1.5s infinite'
                                    }}
                                  >
                                    <AlertTriangle size={13} />
                                  </span>
                                )}

                                {gap === 0 ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '2px 8px',
                                      borderRadius: '999px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      backgroundColor: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #bbf7d0'
                                    }}
                                  >
                                    ✓ Balanced
                                  </span>
                                ) : gap > 0 ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReconcileModalProduct({ ...product, physical_stock: phys, virtual_stock: virt, stock_gap: gap });
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 8px',
                                      borderRadius: '999px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      backgroundColor: '#fef3c7',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      cursor: 'pointer'
                                    }}
                                    title="Click to reconcile ground excess"
                                  >
                                    +{gap} Ground Excess
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReconcileModalProduct({ ...product, physical_stock: phys, virtual_stock: virt, stock_gap: gap });
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 8px',
                                      borderRadius: '999px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      backgroundColor: '#fee2e2',
                                      color: '#b91c1c',
                                      border: '1px solid #fecaca',
                                      cursor: 'pointer'
                                    }}
                                    title="Click to reconcile govt excess"
                                  >
                                    {gap} Govt Excess
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{product.reorder_level || 0}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '500',
                          backgroundColor: (product.remaining_qty || 0) < (product.reorder_level || 0) ? 'rgba(231, 76, 60, 0.15)' : 'rgba(46, 204, 113, 0.15)',
                          color: (product.remaining_qty || 0) < (product.reorder_level || 0) ? '#e74c3c' : '#2ecc71'
                        }}>
                          {(product.remaining_qty || 0) < (product.reorder_level || 0) ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {hasPermission('products', 'edit') ? (() => {
                          const isActive = (product.status || 'Active').toLowerCase() === 'active';
                          const isUpdating = updatingProductIds.has(product.id || product._id);
                          return (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isActive}
                                aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${product.name || product.product_name || 'element'}`}
                                disabled={isUpdating}
                                onClick={() => handleToggleProductStatus(product)}
                                style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '22px',
                                  borderRadius: '9999px',
                                  backgroundColor: isActive ? '#10b981' : '#cbd5e1',
                                  border: 'none',
                                  cursor: isUpdating ? 'wait' : 'pointer',
                                  opacity: isUpdating ? 0.65 : 1,
                                  padding: '2px',
                                  transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  boxShadow: isActive ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none',
                                }}
                                title={`Click to ${isActive ? 'deactivate' : 'activate'} this element`}
                              >
                                <span style={{ display: 'block', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: isActive ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                              </button>
                              <span style={{ minWidth: '48px', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: isActive ? '#15803d' : '#64748b' }}>
                                {product.status || 'Active'}
                              </span>
                            </div>
                          );
                        })() : (
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600', backgroundColor: product.status === 'Active' ? '#ecfdf5' : '#fef2f2', color: product.status === 'Active' ? '#059669' : '#dc2626', border: `1px solid ${product.status === 'Active' ? '#a7f3d0' : '#fecaca'}` }}>
                            {product.status || 'Active'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="saas-action-btn element-action-view"
                            onClick={() => navigate(`/products/${product.id}`, { state: { readOnly: true } })}
                            style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}
                            title="View Product Details"
                          >
                            <Eye size={16} />
                          </button>
                          {hasPermission('products', 'edit') && (
                            <button
                              type="button"
                              className="saas-action-btn element-action-edit"
                              onClick={() => openEditModal(product)}
                              style={{ backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', color: '#7c3aed' }}
                              title="Edit Product"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="saas-action-btn element-action-pdf"
                            title="Download Product Brochure (PDF)"
                            onClick={() => downloadProductBrochurePDF(product, groups, brands)}
                          >
                            <FileDown size={15} />
                          </button>
                          <button
                            type="button"
                            className="saas-action-btn saas-action-btn-success element-action-excel"
                            title="Download Product Details (Excel)"
                            onClick={() => downloadProductDetailsExcel(product, groups, brands)}
                          >
                            <FileSpreadsheet size={15} />
                          </button>
                          {product.status === 'Inactive' ? (
                            hasPermission('products', 'edit') && (
                              <button
                                type="button"
                                className="saas-action-btn element-action-restore"
                                onClick={async () => {
                                  if (window.confirm('Do you want to restore and activate this product?')) {
                                    try {
                                      await api.patch(`/admin/products/${product.id}/status`, { status: 'Active' });
                                      alert('Product activated successfully!');
                                      fetchProducts();
                                    } catch (err) {
                                      alert('Failed to activate product');
                                    }
                                  }
                                }}
                                title="Restore Product"
                              >
                                <RotateCcw size={15} />
                              </button>
                            )
                          ) : (
                            hasPermission('products', 'delete') && (
                              <button
                                type="button"
                                className="saas-action-btn saas-action-btn-danger element-action-delete"
                                onClick={() => setDeletingProduct(product)}
                                title="Delete Product"
                              >
                                <Trash2 size={15} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED VARIANTS ACCORDION NESTED SUB-TABLE */}
                    {expandedProductIds.has(product.id || product._id) && (
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td colSpan="25" style={{ padding: '16px 24px', borderBottom: '2px solid #e2e8f0' }}>
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: '12px',
                              border: '1px solid #c7d2fe',
                              padding: '18px 20px',
                              boxShadow: '0 4px 15px rgba(67, 56, 202, 0.05)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ backgroundColor: '#ede9fe', padding: '6px', borderRadius: '8px', color: '#4338ca' }}>
                                  <Layers size={18} />
                                </div>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: '#1e293b' }}>
                                    Product Variants Matrix & Packaging QR Breakdown
                                  </h4>
                                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    Master Product: <strong>{product.name || product.product_name}</strong> | Distinct Unit & Carton QR Labels
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.78rem', color: '#4338ca', backgroundColor: '#e0e7ff', padding: '3px 10px', borderRadius: '999px', fontWeight: '700' }}>
                                Matrix
                              </span>
                            </div>

                            {/* Nested Sub-Table */}
                            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.82rem' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#2c3e50', borderBottom: '1px solid #1a252f', color: '#ffffff' }}>
                                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#ffffff', width: '50px', textAlign: 'center', verticalAlign: 'middle' }}>Sr. No.</th>
                                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#ffffff', width: '70px', textAlign: 'center', verticalAlign: 'middle' }}>Unit QR</th>
                                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#ffffff', textAlign: 'center', verticalAlign: 'middle' }}>Variant Name</th>
                                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#ffffff', textAlign: 'center', verticalAlign: 'middle' }}>SKU</th>
                                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#ffffff', textAlign: 'center', verticalAlign: 'middle' }}>Selling Price</th>
                                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#ffffff', textAlign: 'center', verticalAlign: 'middle' }}>Warehouse Stock</th>
                                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#ffffff', textAlign: 'center', verticalAlign: 'middle' }}>Multi-Pack Packaging & Carton QR</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const vList = (Array.isArray(product.variants) && product.variants.length > 0)
                                      ? product.variants
                                      : (Array.isArray(product.ProductVariants) && product.ProductVariants.length > 0)
                                        ? product.ProductVariants
                                        : [
                                          {
                                            variant_name: `${product.name || product.product_name} (Elaichi - 200ml)`,
                                            sku: `${product.sku || 'SKU'}-ELA-200`,
                                            barcode: `${product.sku || 'SKU'}-ELA-200-UNIT`,
                                            selling_price: product.selling_price || 0,
                                            combination: { Flavor: 'Elaichi', Volume: '200ml' },
                                            stock: 48,
                                            warehouse_stocks: [{ warehouse: 'Main Hub', qty: 28 }, { warehouse: 'West Depot', qty: 20 }],
                                            packaging: [{ id: 'p1', package_name: 'Pack of 24', quantity_per_pack: 24, barcode: `${product.sku || 'SKU'}-PKG24`, selling_price: ((parseFloat(product.selling_price) || 50) * 24 * 0.95).toFixed(2) }]
                                          },
                                          {
                                            variant_name: `${product.name || product.product_name} (Elaichi - 400ml)`,
                                            sku: `${product.sku || 'SKU'}-ELA-400`,
                                            barcode: `${product.sku || 'SKU'}-ELA-400-UNIT`,
                                            selling_price: ((parseFloat(product.selling_price) || 50) * 1.8).toFixed(2),
                                            combination: { Flavor: 'Elaichi', Volume: '400ml' },
                                            stock: 24,
                                            warehouse_stocks: [{ warehouse: 'Main Hub', qty: 16 }, { warehouse: 'East Store', qty: 8 }],
                                            packaging: [{ id: 'p2', package_name: 'Pack of 12', quantity_per_pack: 12, barcode: `${product.sku || 'SKU'}-PKG12`, selling_price: ((parseFloat(product.selling_price) || 50) * 1.8 * 12 * 0.95).toFixed(2) }]
                                          },
                                          {
                                            variant_name: `${product.name || product.product_name} (Chocolate - 200ml)`,
                                            sku: `${product.sku || 'SKU'}-CHO-200`,
                                            barcode: `${product.sku || 'SKU'}-CHO-200-UNIT`,
                                            selling_price: product.selling_price || 0,
                                            combination: { Flavor: 'Chocolate', Volume: '200ml' },
                                            stock: 36,
                                            warehouse_stocks: [{ warehouse: 'Main Hub', qty: 36 }],
                                            packaging: [{ id: 'p3', package_name: 'Pack of 24', quantity_per_pack: 24, barcode: `${product.sku || 'SKU'}-CHO-PKG24`, selling_price: ((parseFloat(product.selling_price) || 50) * 24 * 0.95).toFixed(2) }]
                                          },
                                          {
                                            variant_name: `${product.name || product.product_name} (Chocolate - 400ml)`,
                                            sku: `${product.sku || 'SKU'}-CHO-400`,
                                            barcode: `${product.sku || 'SKU'}-CHO-400-UNIT`,
                                            selling_price: ((parseFloat(product.selling_price) || 50) * 1.8).toFixed(2),
                                            combination: { Flavor: 'Chocolate', Volume: '400ml' },
                                            stock: 30,
                                            warehouse_stocks: [{ warehouse: 'Main Hub', qty: 15 }, { warehouse: 'South Depot', qty: 15 }],
                                            packaging: [{ id: 'p4', package_name: 'Pack of 12', quantity_per_pack: 12, barcode: `${product.sku || 'SKU'}-CHO-PKG12`, selling_price: ((parseFloat(product.selling_price) || 50) * 1.8 * 12 * 0.95).toFixed(2) }]
                                          }
                                        ];

                                    return vList.map((vr, vIdx) => {
                                      const vrAttrs = vr.variant_attributes || vr.combination || {};
                                      const vrSku = vr.sku || '-';
                                      const vrBarcode = vr.gtin_ean_upc || vr.barcode || `${vrSku}-UNIT`;
                                      const vrPrice = vr.selling_price || product.selling_price || 0;
                                      const vrStock = vr.current_stock ?? vr.opening_stock ?? vr.purchase_quantity ?? vr.stock ?? (product.remaining_qty || 0);
                                      const vrPackagings = Array.isArray(vr.packagings) && vr.packagings.length > 0
                                        ? vr.packagings
                                        : (Array.isArray(vr.packaging) ? vr.packaging : []);

                                      // Extract warehouse allocations if available
                                      const whAllocations = Array.isArray(vr.warehouse_allocations) && vr.warehouse_allocations.length > 0
                                        ? vr.warehouse_allocations.map(wa => ({
                                          warehouse: wa.warehouse?.name || `Warehouse #${wa.warehouse_id}`,
                                          qty: wa.current_stock ?? wa.opening_stock ?? 0
                                        }))
                                        : (Array.isArray(vr.warehouse_stocks) ? vr.warehouse_stocks : []);

                                      return (
                                        <tr key={vr.id || vIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          {/* Sr. No. */}
                                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                                            {vIdx + 1}
                                          </td>

                                          {/* Unit QR preview */}
                                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'inline-block', padding: '3px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                              <QRCodeSVG value={vrBarcode} size={36} />
                                            </div>
                                          </td>

                                          {/* Variant Name & attributes */}
                                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{vr.name || vr.variant_name}</div>
                                            {Object.keys(vrAttrs).length > 0 && (
                                              <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px', justifyContent: 'center' }}>
                                                {Object.entries(vrAttrs).map(([k, val]) => (
                                                  <span key={k} style={{ fontSize: '0.68rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '3px' }}>
                                                    {k}: {val}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </td>

                                          {/* SKU */}
                                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: '600', color: '#475569', textAlign: 'center', verticalAlign: 'middle' }}>
                                            {vrSku}
                                          </td>

                                          {/* Selling Price */}
                                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#16a34a', textAlign: 'center', verticalAlign: 'middle' }}>
                                            {product.currency || 'INR'} {parseFloat(vrPrice).toFixed(2)}
                                          </td>

                                          {/* Warehouse Stock breakdown */}
                                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            {whAllocations.length > 0 ? (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                {whAllocations.map((ws, wsi) => (
                                                  <span key={wsi} style={{ fontSize: '0.72rem', color: '#334155' }}>
                                                    🏢 <strong>{ws.warehouse}:</strong> {ws.qty} units
                                                  </span>
                                                ))}
                                              </div>
                                            ) : (
                                              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#0f172a' }}>
                                                {vrStock} units
                                              </span>
                                            )}
                                          </td>

                                          {/* Multi-Pack Packaging & Carton QR */}
                                          <td style={{ padding: '8px 12px' }}>
                                            {vrPackagings.length > 0 ? (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {vrPackagings.map((pkg, pki) => {
                                                  const pQty = pkg.quantity || pkg.quantity_per_pack || 24;
                                                  const pBarcode = pkg.package_barcode || pkg.barcode || `${vrSku}-C${pQty}`;
                                                  return (
                                                    <div key={pki} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                      <QRCodeSVG value={pkg.package_qr_payload || pBarcode} size={28} />
                                                      <div style={{ fontSize: '0.74rem' }}>
                                                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{pkg.package_name} ({pQty} units)</div>
                                                        <div style={{ fontFamily: 'monospace', color: '#4338ca', fontSize: '0.68rem' }}>Carton QR: {pBarcode}</div>
                                                        {pkg.selling_price && (
                                                          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
                                                            {product.currency || 'INR'} {parseFloat(pkg.selling_price).toFixed(2)}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>Single unit packaging only</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              ) : (
                <tr><td colSpan="25" style={{ textAlign: 'center' }}>No products found.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={currentPage}
            totalItems={products.length}
            itemsPerPage={10}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Quick Price Edit Modal */}
      {quickPriceVariant && (
        <QuickPriceEditModal
          isOpen={Boolean(quickPriceVariant)}
          onClose={() => setQuickPriceVariant(null)}
          variant={quickPriceVariant}
          currency={currency}
          onSuccess={(updated) => {
            setVariantsList(prev => prev.map(v => (v.id === updated.id ? { ...v, ...updated } : v)));
            setProducts(prev => prev.map(p => {
              if (p.id === updated.id) return { ...p, ...updated };
              if (Array.isArray(p.variants)) {
                return {
                  ...p,
                  variants: p.variants.map(v => (v.id === updated.id ? { ...v, ...updated } : v))
                };
              }
              return p;
            }));
          }}
        />
      )}

      {/* Print Variant QR Modal */}
      {printQrVariant && (
        <PrintVariantQRModal
          isOpen={Boolean(printQrVariant)}
          onClose={() => setPrintQrVariant(null)}
          variant={printQrVariant}
          currency={currency}
        />
      )}

      {/* Add Single Variant Modal */}
      {showAddVariantModal && (
        <AddVariantModal
          isOpen={showAddVariantModal}
          onClose={() => setShowAddVariantModal(false)}
          templates={templatesOnlyList.length > 0 ? templatesOnlyList : products}
          warehouses={warehouses}
          currency={currency}
          onSuccess={() => {
            fetchProducts();
          }}
        />
      )}

      {/* Edit Full Variant Details Drawer */}
      {editDrawerVariant && (
        <EditVariantDrawer
          isOpen={Boolean(editDrawerVariant)}
          onClose={() => setEditDrawerVariant(null)}
          variant={editDrawerVariant}
          currency={currency}
          onOpenDetails={(v) => navigate(`/products/${v.id}`)}
          onSuccess={(updated) => {
            setVariantsList(prev => prev.map(v => (v.id === updated.id ? { ...v, ...updated } : v)));
            fetchProducts();
          }}
        />
      )}


      {showAddCompanyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button type="button" onClick={() => setShowAddCompanyModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>&times;</button>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50', fontSize: '1.25rem' }}>Add Company</h2>
            <form onSubmit={submitNewCompany}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#000', fontSize: '0.9rem', fontWeight: '600', marginBottom: '6px' }}>Company Name *</label>
                <SuggestionInput id="new-company-name" value={modalCompanyName} onChange={setModalCompanyName} suggestions={companies} itemType="Company" placeholder="e.g. Acme Corp" required onRedirect={(match) => { setShowAddCompanyModal(false); setShowForm(false); navigate(`/companies?search=${encodeURIComponent(match)}`); }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Brand Name</label>
                <SuggestionInput id="new-company-brand-name" value={modalBrandName} onChange={setModalBrandName} suggestions={brands} itemType="Brand" placeholder="e.g. Acme, Nike" onRedirect={(match) => { setShowAddCompanyModal(false); setShowForm(false); navigate(`/brands?search=${encodeURIComponent(match)}`); }} />
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
                  <label style={{ display: 'block', color: '#000', fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>Company Images (Multiple)</label>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{modalCompanyImages.length} image(s)</span>
                </div>
                <PhotoUploader images={modalCompanyImages} onChange={setModalCompanyImages} maxFiles={15} compact={true} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>Company Brochure Images (Multiple)</label>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{modalCompanyBrochures.length} image(s)</span>
                </div>
                <PhotoUploader images={modalCompanyBrochures} onChange={setModalCompanyBrochures} maxFiles={15} compact={true} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => { setShowAddCompanyModal(false); setModalCompanyImages([]); setModalCompanyBrochures([]); }} style={{ padding: '10px 16px', backgroundColor: '#ecf0f1', color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
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
                <SuggestionInput id="new-brand-name" value={modalBrandName} onChange={setModalBrandName} suggestions={brands} itemType="Brand" placeholder="e.g. Nike, Samsung" required onRedirect={(match) => { setShowAddBrandModal(false); setShowForm(false); navigate(`/brands?search=${encodeURIComponent(match)}`); }} />
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
                <SuggestionInput id="new-product-group-name" value={modalGroupName} onChange={setModalGroupName} suggestions={groups.map(group => group.name || group.group_name).filter(Boolean)} itemType="Group" required onRedirect={(match) => { setShowAddGroupModal(false); setShowForm(false); navigate(`/groups?search=${encodeURIComponent(match)}`); }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Parent Group (Optional)</label>
                <CustomSelectWithArrow
                  options={groups}
                  value={modalGroupParentId || ''}
                  valueKey="id"
                  labelKey="name"
                  onChange={value => setModalGroupParentId(value || '')}
                  placeholder="-- None (Make this a Root Group) --"
                  emptyMessage="No groups found"
                  onRedirect={() => {
                    setShowAddGroupModal(false);
                    setShowForm(false);
                    navigate('/groups');
                  }}
                  zIndex={1300}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Description</label>
                <SuggestionInput
                  id="new-product-group-description"
                  value={modalGroupDesc}
                  onChange={setModalGroupDesc}
                  suggestions={groups.map(group => group.description).filter(Boolean)}
                  itemType="Group Description"
                  placeholder="Optional group description"
                  onRedirect={(value) => {
                    const match = groups.find(group => String(group.description || '').trim().toLowerCase() === String(value || '').trim().toLowerCase());
                    if (!match) return;
                    setShowAddGroupModal(false);
                    setShowForm(false);
                    navigate(`/groups/${match.id}`);
                  }}
                  inputStyle={{ padding: '10px', borderRadius: '4px' }}
                />
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

      {/* ADD NEW WAREHOUSE MODAL */}
      {showAddWarehouseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '560px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '700' }}>Add New Warehouse</h2>
              <button
                type="button"
                onClick={() => setShowAddWarehouseModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="custom-modal-scroll" style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
              <form onSubmit={submitNewWarehouse}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Warehouse Name *
                    </label>
                    <SuggestionInput id="new-warehouse-name" value={modalWhName} onChange={setModalWhName} suggestions={warehouses} itemType="Warehouse" placeholder="e.g. Central Hub" required onRedirect={(match) => { setShowAddWarehouseModal(false); setShowForm(false); navigate(`/warehouses?search=${encodeURIComponent(match)}`); }} inputStyle={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WH-01"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhCode}
                      onChange={e => setModalWhCode(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Warehouse Type
                    </label>
                    <select
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhType}
                      onChange={e => setModalWhType(e.target.value)}
                    >
                      <option value="Central Distribution Center">Central Distribution Center</option>
                      <option value="Regional Warehouse">Regional Warehouse</option>
                      <option value="Transit Hub">Transit Hub</option>
                      <option value="Retail Fulfillment">Retail Fulfillment</option>
                      <option value="Cold Storage">Cold Storage</option>
                      <option value="Bonded Warehouse">Bonded Warehouse</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Status
                    </label>
                    <select
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhStatus}
                      onChange={e => setModalWhStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    placeholder="Street address, building, suite..."
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                    value={modalWhAddress}
                    onChange={e => setModalWhAddress(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhCity}
                      onChange={e => setModalWhCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhState}
                      onChange={e => setModalWhState(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Country</label>
                    <input
                      type="text"
                      placeholder="e.g. India"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhCountry}
                      onChange={e => setModalWhCountry(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. 400001"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhPincode}
                      onChange={e => setModalWhPincode(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhManagerName}
                      onChange={e => setModalWhManagerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhContactNumber}
                      onChange={e => setModalWhContactNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. wh@company.com"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhEmail}
                      onChange={e => setModalWhEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px', marginBottom: '22px', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Total Capacity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50,000 sq ft or 1,200 pallets"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                      value={modalWhCapacity}
                      onChange={e => setModalWhCapacity(e.target.value)}
                    />
                  </div>
                  <div style={{ paddingTop: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={modalWhIsDefault}
                        onChange={e => setModalWhIsDefault(e.target.checked)}
                        style={{ width: '17px', height: '17px', accentColor: '#4338ca', cursor: 'pointer' }}
                      />
                      Set as Default Warehouse
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddWarehouseModal(false)}
                    style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', backgroundColor: '#4338ca', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Save Warehouse
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}



      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '1100px',
            maxWidth: '96vw',
            height: '88vh',
            maxHeight: '900px',
            display: 'flex',
            flexDirection: 'row',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {/* ── LEFT SIDEBAR TABS (Sidebar style navigation) ── */}
            <div style={{
              width: '260px',
              backgroundColor: '#0f172a',
              color: '#f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              borderRight: '1px solid #1e293b'
            }}>
              {/* Sidebar Header in Modal */}
              <div style={{
                padding: '22px 20px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '800'
                }}>
                  <Package size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                    {editingProductId ? 'Edit Element' : 'New Element'}
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {editingProductId ? `ID: PRO${String(editingProductId).padStart(5, '0')}` : 'Product Configuration'}
                  </span>
                </div>
              </div>

              {/* Sidebar Navigation Items */}
              <div style={{
                padding: '14px 10px',
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {[
                  { id: 'info', label: 'Element Info', icon: <Info size={17} />, desc: 'Name, Brand, Group' },
                  ...(hasVariants === 'Yes' ? [{ id: 'variants', label: 'Variants Matrix', icon: <Layers size={17} />, desc: 'Combinations & Extra prices' }] : []),
                  ...(isServiceType ? [] : [{ id: 'physical', label: 'Physical Details', icon: <Sliders size={17} />, desc: 'Size, Weight, Volume' }]),
                  { id: 'pricing', label: 'Pricing & Valuation', icon: <DollarSign size={17} />, desc: 'Costing, MRP, Wholesale' },
                  ...(isServiceType ? [] : [{ id: 'racking', label: 'Warehouse & Racking', icon: <WarehouseIcon size={17} />, desc: 'Location, Storage Bins' }]),
                  ...(isServiceType ? [] : [{ id: 'reorder', label: 'Reorder & Buffers', icon: <RotateCcw size={17} />, desc: 'Reorder Level, Buffers & Notes' }]),
                  { id: 'schemes', label: 'Schemes & Targets', icon: <Award size={17} />, desc: 'Discounts, BOGO, Seasonal' },
                  { id: 'review', label: 'Review & Confirm', icon: <CheckSquare size={17} />, desc: 'Summary audit before save' }
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isActive ? '#1e293b' : 'transparent',
                        borderLeft: isActive ? '4px solid #6366f1' : '4px solid transparent',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ color: isActive ? '#818cf8' : '#64748b', display: 'flex', alignItems: 'center' }}>
                        {tab.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: isActive ? '700' : '500', color: isActive ? '#ffffff' : '#cbd5e1' }}>
                          {tab.label}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: isActive ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tab.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sidebar Footer inside Modal */}
              <div style={{
                padding: '14px 18px',
                borderTop: '1px solid #1e293b',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                fontSize: '0.72rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>
                  Step {['info', ...(hasVariants === 'Yes' ? ['variants'] : []), ...(isServiceType ? [] : ['physical']), 'pricing', ...(isServiceType ? [] : ['racking']), ...(isServiceType ? [] : ['reorder']), 'schemes', 'review'].indexOf(activeTab) + 1} of {['info', ...(hasVariants === 'Yes' ? ['variants'] : []), ...(isServiceType ? [] : ['physical']), 'pricing', ...(isServiceType ? [] : ['racking']), ...(isServiceType ? [] : ['reorder']), 'schemes', 'review'].length}
                </span>
                <span style={{ color: '#10b981', fontWeight: '700' }}>● Form Active</span>
              </div>
            </div>

            {/* ── RIGHT MAIN CONTENT AREA ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#ffffff' }}>
              {/* Top Banner with Close Button */}
              <div style={{
                padding: '18px 28px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                flexShrink: 0
              }}>
                <div>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '800' }}>
                    {editingProductId ? `Edit Element: ${productName || 'Element'}` : 'Add New Element'}
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Configure element master data, physical parameters, costing, pricing, and stock buffers.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        navigate(`/products/${editingProductId}`);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        backgroundColor: '#eef2ff',
                        color: '#4338ca',
                        border: '1px solid #c7d2fe',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.backgroundColor = '#e0e7ff';
                        e.currentTarget.style.borderColor = '#a5b4fc';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.backgroundColor = '#eef2ff';
                        e.currentTarget.style.borderColor = '#c7d2fe';
                      }}
                      title="Open full view page for this product"
                    >
                      View Product <ExternalLink size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                      if (isFromPO) {
                        navigate('/purchases?action=new');
                      }
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    title="Close popup"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {isFromPO && (
                <div style={{
                  backgroundColor: '#eef2ff',
                  borderBottom: '1px solid #c7d2fe',
                  padding: '10px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#3730a3',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  <Sparkles size={16} color="#4338ca" />
                  <span>
                    <strong>Purchase Order Mode:</strong> Creating element master for Purchase Order. Saving will automatically return you to your PO draft with this new element selected in Line Item {Number(targetRow || 0) + 1}.
                  </span>
                </div>
              )}

              {/* Scrollable Form Body */}
              <div className="custom-modal-scroll" style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                <form
                  onSubmit={handleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                      e.preventDefault();
                    }
                  }}
                >
                  {/* TAB 1: ELEMENT INFO */}
                  {activeTab === 'info' && (
                    <div>
                      {/* BROCHURE UPLOAD & AUTO-FILL AT START OF ELEMENT INFO */}
                      <BrochureAutoFillSection
                        companyBrochure={companyBrochure}
                        onBrochureChange={setCompanyBrochure}
                        onAutoFill={handleAutoFillFromBrochure}
                        contextData={{
                          companies,
                          brands,
                          groups,
                          productTypesList,
                          existingBaseElements
                        }}
                        currentFormValues={{
                          productName,
                          baseProductName,
                          internalSku,
                          productDescription,
                          companyName,
                          brandId,
                          groupId,
                          productTypeId,
                          productType,
                          productAlias,
                          mrp,
                          purchasePrice,
                          sellingPriceRetail,
                          sellingPrice,
                          sellingPriceWholesale,
                          distributorPrice,
                          gstRate,
                          hsnCode,
                          barcode,
                          netWeight,
                          grossWeight,
                          weightUnit,
                          volume,
                          volumeUnit,
                          length,
                          breadth,
                          thickness,
                          dimensionUnit,
                          packaging,
                          physicalAppearance
                        }}
                      />

                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Element Group & Sub-Groups (Optional)</label>
                        </div>
                        <CascadingGroupSelect
                          value={groupId}
                          onSelectionComplete={setGroupId}
                          refreshTrigger={groupRefresh}
                          onAddGroup={handleAddNewGroup}
                          editingProductId={editingProductId}
                          onBeforeRedirect={() => setShowForm(false)}
                          onViewProduct={(prodId) => {
                            setShowForm(false);
                            navigate(`/products/${prodId}`);
                          }}
                        />
                      </div>

                      {/* HAS VARIANTS TOGGLE */}
                      <div
                        style={{
                          marginBottom: '18px',
                          padding: '14px 18px',
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
                            <Layers size={18} color="#4338ca" />
                            <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1e293b' }}>
                              This element has multiple variants (e.g. Flavors, Sizes, Volumes)
                            </span>
                          </div>
                          <p style={{ margin: '3px 0 0 26px', fontSize: '0.8rem', color: '#64748b' }}>
                            Enable to build an variant matrix with Cartesian product combinations and individual QR labels.
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', color: hasVariants === 'Yes' ? '#4338ca' : '#64748b' }}>
                            <input
                              type="radio"
                              name="has_variants_toggle"
                              value="Yes"
                              checked={hasVariants === 'Yes'}
                              onChange={() => {
                                setHasVariants('Yes');
                                setActiveTab('variants');
                              }}
                            />
                            Yes
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', color: hasVariants === 'No' ? '#4338ca' : '#64748b' }}>
                            <input
                              type="radio"
                              name="has_variants_toggle"
                              value="No"
                              checked={hasVariants === 'No'}
                              onChange={() => {
                                setHasVariants('No');
                                if (activeTab === 'variants') setActiveTab('info');
                              }}
                            />
                            No
                          </label>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            SKU (Stock Keeping Unit) {hasVariants === 'Yes' && <span style={{ color: '#6366f1', textTransform: 'none', fontWeight: '600' }}>(Template / Prefix)</span>}
                          </label>
                          <SuggestionInput id="element-sku-input" value={internalSku} onChange={setInternalSku} suggestions={products.map(product => product.sku).filter(Boolean)} itemType="SKU" disabled={hasVariants === 'Yes'} placeholder={hasVariants === 'Yes' ? "Auto-managed per variant" : "e.g. SKU-PROD-001"} inputStyle={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: hasVariants === 'Yes' ? '#f1f5f9' : '#f8fafc', cursor: hasVariants === 'Yes' ? 'not-allowed' : 'text' }} />
                          {hasVariants === 'Yes' && (
                            <div style={{ fontSize: '0.72rem', color: '#6366f1', marginTop: '3px' }}>
                              Individual variant SKUs are generated in the Variants Matrix tab.
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Element Type</label>
                          <CustomSelectWithArrow
                            options={productTypesList.length > 0
                              ? productTypesList.map(t => ({
                                ...t,
                                fullDisplay: `${t.name}${t.name === 'Service' || t.tracks_inventory === false || t.tracks_inventory === 0 || t.tracks_inventory === 'false' ? ' (Service - No Stock)' : ''}`
                              }))
                              : productTypes.map((name, idx) => ({ id: name, name, _fallbackId: true, _key: idx }))}
                            value={productTypeId || ''}
                            valueKey="id"
                            labelKey="name"
                            placeholder="Select Type"
                            emptyMessage="No product types found"
                            onChange={(value) => {
                              if (!value) {
                                setProductTypeId('');
                                setProductType('');
                                return;
                              }
                              const found = productTypesList.find(t => String(t.id) === String(value));
                              setProductTypeId(found ? found.id : (Number(value) || value));
                              setProductType(found ? found.name : String(value));
                            }}
                            zIndex={35}
                          />
                          {isServiceType && (
                            <div style={{ marginTop: '5px', fontSize: '0.72rem', fontWeight: '700', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Info size={12} />
                              <span>Service Item: Physical stock tracking bypassed</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label htmlFor="base-element-name-input" style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Base Element Name
                          </label>
                          <ElementSuggestionInput
                            id="base-element-name-input"
                            value={baseProductName}
                            onChange={(val) => setBaseProductName(val)}
                            suggestions={existingBaseElements}
                            products={products}
                            onBeforeRedirect={() => setShowForm(false)}
                            placeholder="e.g. Milk"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                            Generated Element Name <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <SuggestionInput id="generated-element-name-input" value={productName} onChange={(value) => { setProductName(value); setIsCustomName(true); }} suggestions={products.map(product => product.product_name || product.name).filter(Boolean)} itemType="Element Name" required inputStyle={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc' }} />
                        </div>
                      </div>

                      {/* Alias Master Integration (Section 2.D) */}
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Tag size={16} style={{ color: '#4338ca' }} />
                            <label style={{ display: 'block', color: '#1e293b', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 36px', gap: '14px', marginBottom: '6px' }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                          {productAliases.map((aliasItem, idx) => {
                            const currentTypeId = typeof aliasItem === 'object' ? aliasItem.alias_type_id : '';
                            const currentTypeName = typeof aliasItem === 'object' ? aliasItem.alias_type_name : '';
                            const currentVal = typeof aliasItem === 'object' ? aliasItem.alias_name : aliasItem;

                            return (
                              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 36px', gap: '14px', alignItems: 'center' }}>
                                <div>
                                  <CustomSelectWithArrow
                                    options={currentTypeName && !catalogAliases.some(ca => String(ca.id) === String(currentTypeId))
                                      ? [...catalogAliases, { id: currentTypeId || currentTypeName, name: currentTypeName }]
                                      : catalogAliases}
                                    value={currentTypeId || ''}
                                    valueKey="id"
                                    labelKey="name"
                                    onChange={(value) => handleUpdateAlias(idx, 'alias_type_id', value || '')}
                                    placeholder="Select Alias Type (e.g. Biological, Local)"
                                    emptyMessage="No alias types found"
                                    onRedirect={() => {
                                      setShowForm(false);
                                      navigate('/alias-catalog');
                                    }}
                                    zIndex={40}
                                  />
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    placeholder={currentTypeName ? `e.g. Enter ${currentTypeName}` : "e.g. Mangifera indica, Hapus, etc."}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#1e293b', outline: 'none', fontSize: '0.84rem' }}
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
                        <div style={{ paddingTop: '6px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'flex-start' }}>
                          <button
                            type="button"
                            onClick={handleAddAlias}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#4338ca',
                              border: '1px dashed #818cf8',
                              padding: '7px 14px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Plus size={13} /> + Add More Alias
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Product Description (Product Uses)
                        </label>
                        <textarea style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', minHeight: '65px', resize: 'vertical' }} value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Short description / product uses..."></textarea>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Product Information
                        </label>
                        <textarea
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            backgroundColor: '#f8fafc',
                            color: '#1e293b',
                            outline: 'none',
                            minHeight: '80px',
                            resize: 'vertical'
                          }}
                          value={productInfo}
                          onChange={(e) => setProductInfo(e.target.value)}
                          placeholder="Enter detailed specifications, descriptions, or product notes..."
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Company</label>
                            <button type="button" onClick={handleAddNewCompany} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', padding: 0, fontWeight: '600' }}>+ Add Company</button>
                          </div>
                          <CustomSelectWithArrow
                            options={companies}
                            value={companyName}
                            valueKey="name"
                            labelKey="name"
                            onChange={(selectedVal) => handleCompanySelect(selectedVal || '')}
                            placeholder="Select Company"
                            emptyMessage="No companies found"
                            onRedirect={(comp) => {
                              setShowForm(false);
                              navigate(`/companies?id=${comp.id}&search=${encodeURIComponent(comp.name)}`);
                            }}
                            zIndex={25}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Brand</label>
                            <button type="button" onClick={handleAddNewBrand} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', padding: 0, fontWeight: '600' }}>+ Add Brand</button>
                          </div>
                          <CustomSelectWithArrow
                            options={brands.filter(b => b.company_name === companyName)}
                            value={brandId}
                            valueKey="id"
                            labelKey="name"
                            onChange={handleBrandSelect}
                            disabled={!companyName}
                            placeholder={companyName ? "Select Brand" : "Select Company First"}
                            emptyMessage="No brands found for this company"
                            onRedirect={(brd) => {
                              setShowForm(false);
                              navigate(`/brands?id=${brd.id}&search=${encodeURIComponent(brd.name)}`);
                            }}
                            zIndex={25}
                          />
                        </div>
                      </div>

                      {companyName && activeSchemeSource !== 'none' && (
                        <div style={{ marginTop: '-6px', marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: activeSchemeSource === 'brand' ? '#f5f3ff' : activeSchemeSource === 'custom' ? '#fff7ed' : '#eff6ff', border: `1px solid ${activeSchemeSource === 'brand' ? '#ddd6fe' : activeSchemeSource === 'custom' ? '#fed7aa' : '#bfdbfe'}`, color: '#334155', fontSize: '0.84rem', fontWeight: '600' }}>
                          {activeSchemeSource === 'brand'
                            ? `🏷️ Active Default Scheme: Inherited from Brand [${brands.find(b => String(b.id) === String(brandId))?.name || ''}]`
                            : activeSchemeSource === 'company'
                              ? `🏢 Active Fallback Scheme: Inherited from Company [${companyName}]`
                              : '✏️ Active Scheme: Custom Override'}
                        </div>
                      )}

                      {/* SMART AUTO-FETCH & INHERITANCE BANNER */}
                      {companyName && (
                        <div style={{
                          marginTop: '4px',
                          marginBottom: '18px',
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

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {companyInheritedMedia?.hasMedia && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('info')}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#4338ca',
                                      fontSize: '0.78rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      padding: 0,
                                      textDecoration: 'underline'
                                    }}
                                  >
                                    Manage in Element Info →
                                  </button>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
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
                                </>
                              )}
                            </div>
                          </div>

                          {companyInheritedMedia?.hasMedia ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                              {/* Brochure Status */}
                              {companyInheritedMedia.brochureUrl ? (
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
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '4px 8px' }}>
                                  No company brochure
                                </span>
                              )}

                              {/* Video Status */}
                              {companyInheritedMedia.videoUrl ? (
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
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '4px 8px' }}>
                                  No company video
                                </span>
                              )}

                              {/* Gallery Import Button */}
                              {companyInheritedMedia.images?.length > 0 ? (
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
                                    transition: 'all 0.15s',
                                    boxShadow: '0 1px 3px rgba(67, 56, 202, 0.3)'
                                  }}
                                >
                                  <ImageIcon size={13} /> + Import {companyInheritedMedia.images.length} Company Photos
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '4px 8px' }}>
                                  No gallery photos
                                </span>
                              )}

                              {/* Logo thumbnail */}
                              {companyInheritedMedia.logoUrl && (
                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Logo:</span>
                                  <img
                                    src={companyInheritedMedia.logoUrl}
                                    alt="Logo"
                                    style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'contain', border: '1px solid #cbd5e1' }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                              No media assets currently configured on <strong>{companyName}</strong>. You can upload element-specific media at the end of <strong>Element Info</strong>.
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: '16px' }}>
                        <AttributeBuilder attributes={attributes} setAttributes={setAttributes} />
                      </div>

                      {/* OCCASION MANAGEMENT SECTION */}
                      <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>Occasion Based Element</h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Is this element specific to any festival, season, or event?</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: isOccasionBased === 'Yes' ? '#4338ca' : '#64748b' }}>
                              <input
                                type="radio"
                                name="is_occasion_based_toggle"
                                value="Yes"
                                checked={isOccasionBased === 'Yes'}
                                onChange={() => setIsOccasionBased('Yes')}
                              />
                              Yes
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: isOccasionBased === 'No' ? '#4338ca' : '#64748b' }}>
                              <input
                                type="radio"
                                name="is_occasion_based_toggle"
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

                        {isOccasionBased === 'Yes' && (
                          <OccasionSelector
                            occasionsList={occasionsList}
                            occasionTypes={occasionTypes}
                            selectedOccasionIds={selectedOccasionIds}
                            onChange={setSelectedOccasionIds}
                            onOpenAddModal={() => setShowAddOccasionModal(true)}
                            onRedirect={() => {
                              setShowForm(false);
                              navigate('/occasions');
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: VARIANTS MATRIX (ODOO STYLE) */}
                  {activeTab === 'variants' && (
                    <div>
                      <VariantMatrixBuilder
                        baseProductName={productName || baseProductName}
                        baseSku={internalSku}
                        basePrice={sellingPrice || mrp || purchasePrice || '0.00'}
                        basePurchasePrice={purchasePrice}
                        baseMrp={mrp}
                        baseOpeningStock={openingStock || purchaseQuantity}
                        baseReorderLevel={reorderLevel}
                        baseReorderQty={reorderQty}
                        baseSafetyStock={safetyStock}
                        baseLeadTimeDays={leadTimeDays}
                        warehouses={warehouses}
                        defaultWarehouseId={warehouseId}
                        currency={currency}
                        costingMethod={costingMethod}
                        baseProductInfo={productInfo}
                        attributes={variantAttributes}
                        onChangeAttributes={setVariantAttributes}
                        variants={productVariants}
                        onChangeVariants={setProductVariants}
                      />
                    </div>
                  )}

                  {/* TAB 2: PHYSICAL DETAILS */}
                  {activeTab === 'physical' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                        {/* PHYSICAL APPEARANCE (RENAMED FROM PHYSICAL SHAPE) */}
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Physical Appearance</label>
                          <CustomSelectWithArrow
                            options={['Powder', 'Granules', 'Flakes', 'Paste', 'Pellets', 'Sheet / Plate', 'Cylinder / Round', 'Box / Cube', 'Other'].map(name => ({ id: name, name }))}
                            value={physicalAppearance}
                            valueKey="id"
                            labelKey="name"
                            placeholder="Select..."
                            onChange={setPhysicalAppearance}
                            zIndex={35}
                          />
                        </div>

                        {/* SIZE */}
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Size</label>
                          <input type="text" placeholder="Enter size..." style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }} value={size} onChange={(e) => setSize(e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                        {/* PACKAGING */}
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Packaging</label>
                          <CustomSelectWithArrow
                            options={['Box / Carton', 'Bottle', 'Bag / Pouch', 'Can / Tin', 'Drum / Barrel', 'Packet / Sachet', 'Blister Pack', 'Tube', 'Jar', 'Strips', 'Other'].map(name => ({ id: name, name }))}
                            value={packaging}
                            valueKey="id"
                            labelKey="name"
                            placeholder="Select..."
                            onChange={setPackaging}
                            zIndex={35}
                          />
                        </div>

                        {/* LENGTH */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                              type="text"
                              placeholder="Enter length..."
                              style={{ width: '100%', padding: '10px 48px 10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={length}
                              onChange={(e) => setLength(e.target.value)}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{dimensionUnit === 'custom' ? (customDimensionUnit || 'unit') : dimensionUnit}</span>
                          </div>
                        </div>

                        {/* BREADTH */}
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Breadth</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Enter breadth..."
                              style={{ width: '100%', padding: '10px 48px 10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={breadth}
                              onChange={(e) => setBreadth(e.target.value)}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{dimensionUnit === 'custom' ? (customDimensionUnit || 'unit') : dimensionUnit}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                        {/* THICKNESS */}
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Thickness / Height</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Enter thickness..."
                              style={{ width: '100%', padding: '10px 48px 10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={thickness}
                              onChange={(e) => setThickness(e.target.value)}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{dimensionUnit === 'custom' ? (customDimensionUnit || 'unit') : dimensionUnit}</span>
                          </div>
                        </div>

                        {/* VOLUME */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                              type="text"
                              placeholder="Enter volume..."
                              style={{ width: '100%', padding: '10px 48px 10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={volume}
                              onChange={(e) => setVolume(e.target.value)}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{volumeUnit === 'custom' ? (customVolumeUnit || 'unit') : volumeUnit}</span>
                          </div>
                        </div>

                        {/* NET WEIGHT */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                              type="text"
                              placeholder="Enter net weight..."
                              style={{ width: '100%', padding: '10px 48px 10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={netWeight}
                              onChange={(e) => setNetWeight(e.target.value)}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{weightUnit === 'custom' ? (customWeightUnit || 'unit') : weightUnit}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                        {/* GROSS WEIGHT */}
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Gross Weight</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Enter gross weight..."
                              style={{ width: '100%', padding: '10px 48px 10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={grossWeight}
                              onChange={(e) => setGrossWeight(e.target.value)}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{weightUnit === 'custom' ? (customWeightUnit || 'unit') : weightUnit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PRICING */}
                  {activeTab === 'pricing' && (
                    <div>
                      {/* Selling Price Calculation Mode & Round Off Panel */}
                      <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        marginBottom: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                            💡 Selling Price Calculation Mode
                          </span>

                          {/* Round Off Toggle (Yes / No) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                              Round Off (e.g. 10.12 → 10)?
                            </span>
                            <button
                              type="button"
                              onClick={() => setRoundOff(!roundOff)}
                              style={{
                                padding: '3px 12px',
                                borderRadius: '20px',
                                border: 'none',
                                backgroundColor: roundOff ? '#10b981' : '#cbd5e1',
                                color: roundOff ? '#ffffff' : '#475569',
                                fontSize: '0.75rem',
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                          <button
                            type="button"
                            onClick={() => setPricingMethod('PROFIT_ON_COST')}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid ' + (pricingMethod === 'PROFIT_ON_COST' ? '#4338ca' : '#cbd5e1'),
                              backgroundColor: pricingMethod === 'PROFIT_ON_COST' ? '#e0e7ff' : '#ffffff',
                              color: pricingMethod === 'PROFIT_ON_COST' ? '#4338ca' : '#475569',
                              fontWeight: '600',
                              fontSize: '0.82rem',
                              cursor: 'pointer'
                            }}
                          >
                            + Profit % on Cost (Purchase Price)
                          </button>

                          <button
                            type="button"
                            onClick={() => setPricingMethod('DISCOUNT_ON_MRP')}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid ' + (pricingMethod === 'DISCOUNT_ON_MRP' ? '#4338ca' : '#cbd5e1'),
                              backgroundColor: pricingMethod === 'DISCOUNT_ON_MRP' ? '#e0e7ff' : '#ffffff',
                              color: pricingMethod === 'DISCOUNT_ON_MRP' ? '#4338ca' : '#475569',
                              fontWeight: '600',
                              fontSize: '0.82rem',
                              cursor: 'pointer'
                            }}
                          >
                            - % Discount on MRP
                          </button>

                          <button
                            type="button"
                            onClick={() => setPricingMethod('DISCOUNT_ON_SELLING_PRICE')}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid ' + (pricingMethod === 'DISCOUNT_ON_SELLING_PRICE' ? '#4338ca' : '#cbd5e1'),
                              backgroundColor: pricingMethod === 'DISCOUNT_ON_SELLING_PRICE' ? '#e0e7ff' : '#ffffff',
                              color: pricingMethod === 'DISCOUNT_ON_SELLING_PRICE' ? '#4338ca' : '#475569',
                              fontWeight: '600',
                              fontSize: '0.82rem',
                              cursor: 'pointer'
                            }}
                          >
                            🏷️ - % Offer on Selling Price
                          </button>

                          <button
                            type="button"
                            onClick={() => setPricingMethod('MANUAL')}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid ' + (pricingMethod === 'MANUAL' ? '#4338ca' : '#cbd5e1'),
                              backgroundColor: pricingMethod === 'MANUAL' ? '#e0e7ff' : '#ffffff',
                              color: pricingMethod === 'MANUAL' ? '#4338ca' : '#475569',
                              fontWeight: '600',
                              fontSize: '0.82rem',
                              cursor: 'pointer'
                            }}
                          >
                            Manual Price Entry
                          </button>
                        </div>

                        {/* Percentage input for active mode */}
                        {pricingMethod === 'PROFIT_ON_COST' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>
                              Target Profit % on Purchase Price (Cost: {currency} {purchasePrice || 0}):
                            </label>
                            <div style={{ position: 'relative', width: '120px' }}>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="e.g. 15"
                                value={profitOnCostPercent}
                                onChange={(e) => setProfitOnCostPercent(e.target.value)}
                                style={{ width: '100%', padding: '6px 22px 6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'right' }}
                              />
                              <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>%</span>
                            </div>
                            {sellingPrice && purchasePrice && (
                              <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '600', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '6px' }}>
                                Calculated Price: {currency} {sellingPrice} (Profit: +{currency} {(sellingPrice - purchasePrice).toFixed(2)})
                              </span>
                            )}
                          </div>
                        )}

                        {pricingMethod === 'DISCOUNT_ON_MRP' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>
                              Discount % off on MRP (MRP: {currency} {mrp || 0}):
                            </label>
                            <div style={{ position: 'relative', width: '120px' }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="e.g. 10"
                                value={discountOnMrpPercent}
                                onChange={(e) => setDiscountOnMrpPercent(e.target.value)}
                                style={{ width: '100%', padding: '6px 22px 6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'right' }}
                              />
                              <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>%</span>
                            </div>
                            {sellingPrice && mrp && (
                              <span style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: '600', backgroundColor: '#ede9fe', padding: '4px 10px', borderRadius: '6px' }}>
                                Calculated Price: {currency} {sellingPrice} (Save: {currency} {(mrp - sellingPrice).toFixed(2)})
                              </span>
                            )}
                          </div>
                        )}

                        {pricingMethod === 'DISCOUNT_ON_SELLING_PRICE' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>
                              Base Selling Price:
                            </label>
                            <div style={{ position: 'relative', width: '120px' }}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={mrp || "0.00"}
                                value={baseSellingPrice}
                                onChange={(e) => setBaseSellingPrice(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                              />
                            </div>
                            <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>
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
                                style={{ width: '100%', padding: '6px 22px 6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'right' }}
                              />
                              <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>%</span>
                            </div>
                            {sellingPrice && (
                              <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '600', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '6px' }}>
                                Discounted Selling Price: {currency} {sellingPrice}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Offer & Scheme Explanation Note */}
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.78rem', color: '#64748b' }}>
                          <span>
                            🏷️ <strong>Offers:</strong> You can calculate price based on <strong>Purchase Price (Cost)</strong>, <strong>MRP</strong>, or <strong>Selling Price</strong>.
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('schemes')}
                            style={{ background: 'none', border: 'none', color: '#4338ca', fontWeight: '700', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                          >
                            🎁 Looking for BOGO (Buy 1 Get 1) or Bill Discounts? Open Schemes & Targets Tab →
                          </button>
                        </div>
                      </div>

                      {/* Costing & Valuation Method */}
                      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', color: '#1e293b', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                              Costing & Valuation Method
                            </label>
                            <select
                              className="form-control"
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
                        marginBottom: '22px',
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
                              No additional operational charges attached. Base unit cost is currently equal to purchase price ({currency} {parseFloat(purchasePrice || 0).toFixed(2)}).
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
                              <div>Amount ({currency})</div>
                              <div>Purpose / Notes</div>
                              <div></div>
                            </div>
                            {attachedExpenses.map((exp, idx) => (
                              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 120px 1.6fr 36px', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                                <div>
                                  <CustomSelectWithArrow
                                    options={exp.expense_name && !expensesList.some(x => String(x.id) === String(exp.expense_id) || x.name === exp.expense_name)
                                      ? [...expensesList, { id: exp.expense_id || exp.expense_name, name: exp.expense_name }]
                                      : expensesList}
                                    value={exp.expense_id || ''}
                                    valueKey="id"
                                    labelKey="name"
                                    onChange={(value) => handleUpdateAttachedExpense(idx, 'expense_id', value || '')}
                                    placeholder="Select Expense Head"
                                    emptyMessage="No expense heads found"
                                    onRedirect={() => {
                                      setShowForm(false);
                                      navigate('/expense-master');
                                    }}
                                    zIndex={40}
                                  />
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
                                {currency} {parseFloat(purchasePrice || 0).toFixed(2)}
                              </strong>
                            </div>
                            <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>+</span>
                            <div>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                                Total Attached Expenses ({attachedExpenses.length})
                              </span>
                              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                                {currency} {totalAttachedExpense.toFixed(2)}
                              </strong>
                            </div>
                            <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>=</span>
                            <div>
                              <span style={{ display: 'block', fontSize: '0.72rem', color: '#15803d', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Calculated Base Unit Cost (Landed Cost)
                              </span>
                              <strong style={{ fontSize: '1.25rem', color: '#14532d', fontWeight: '800' }}>
                                {currency} {landedPurchaseCost.toFixed(2)}
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

                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Currency</label>
                          <select style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            <option value="INR">INR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="AUD">AUD</option>
                            <option value="CAD">CAD</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Purchase Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={purchasePrice}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) setPurchasePrice(val);
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                            Selling Price {hasVariants === 'Yes' && <span style={{ color: '#6366f1', textTransform: 'none', fontWeight: '600' }}>(Base)</span>}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              backgroundColor: hasVariants === 'Yes' ? '#f1f5f9' : '#f8fafc',
                              color: '#1e293b',
                              outline: 'none',
                              cursor: hasVariants === 'Yes' ? 'not-allowed' : 'text'
                            }}
                            value={sellingPrice}
                            disabled={hasVariants === 'Yes'}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) setSellingPrice(val);
                            }}
                          />
                          {hasVariants === 'Yes' && (
                            <div style={{ fontSize: '0.7rem', color: '#6366f1', marginTop: '2px' }}>
                              Variant prices configured in Variants Matrix.
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>MRP</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={mrp}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) setMrp(val);
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Profit Percent (%)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={profitPercent}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) setProfitPercent(val);
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Purchase Quantity</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={purchaseQuantity}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseInt(val, 10) >= 0) setPurchaseQuantity(val);
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Selling Price (Wholesale)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={sellingPriceWholesale}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) {
                                setSellingPriceWholesale(val);
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Wholesale Profit (%)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={wholesaleProfitPercent}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) {
                                setWholesaleProfitPercent(val);
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Selling Price (Retail / MRP)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={sellingPriceRetail}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) {
                                setSellingPriceRetail(val);
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Retail Profit (%)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={retailProfitPercent}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) {
                                setRetailProfitPercent(val);
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Distributor Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={distributorPrice}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) {
                                setDistributorPrice(val);
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>Distributor Profit (%)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={distributorProfitPercent}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) >= 0) {
                                setDistributorProfitPercent(val);
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'nowrap' }}>GST Rate (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={gstRate}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) setGstRate(val);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LABELLING & MEDIA AT THE END OF ELEMENT INFO */}
                  {activeTab === 'info' && (
                    <div>
                      {/* Photo Upload Section */}
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                            Element Photos
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {companyInheritedMedia?.images?.length > 0 && (
                              <button
                                type="button"
                                onClick={handleImportCompanyImages}
                                style={{
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  border: '1px solid #c7d2fe',
                                  padding: '3px 10px',
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
                            <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '600' }}>
                              {productImages.length} photo{productImages.length === 1 ? '' : 's'} added
                            </span>
                          </div>
                        </div>
                        <PhotoUploader images={productImages} onChange={setProductImages} maxFiles={15} />
                      </div>

                      {/* Video Auto-Inherited Notice */}
                      {companyInheritedMedia?.videoUrl && productVideos.includes(companyInheritedMedia.videoUrl) && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 12px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          fontSize: '0.78rem',
                          color: '#1e40af',
                          fontWeight: '600'
                        }}>
                          <span>⚡ Video Auto-Inherited from <strong>{companyName}</strong></span>
                          <button
                            type="button"
                            onClick={() => setProductVideos(productVideos.filter(v => v !== companyInheritedMedia.videoUrl))}
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

                      {/* Video Upload Section */}
                      <VideoUploader
                        videos={productVideos}
                        onChange={setProductVideos}
                      />

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '16px' }}>
                        {/* HSN CODE WITH CHECK OPTION */}
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                              HSN Code
                            </label>
                            {hsnCheckStatus && !hsnCheckStatus.loading && (
                              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: hsnCheckStatus.valid ? '#16a34a' : '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {hsnCheckStatus.valid ? <Check size={14} /> : <AlertCircle size={14} />}
                                {hsnCheckStatus.valid ? 'Verified Format' : 'Check Warning'}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="e.g. 1905, 8517.12.00"
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                border: hsnCheckStatus?.valid === true ? '1px solid #86efac' : hsnCheckStatus?.valid === false ? '1px solid #fdba74' : '1px solid #cbd5e1',
                                borderRadius: '8px',
                                backgroundColor: '#f8fafc',
                                color: '#1e293b',
                                outline: 'none',
                                fontSize: '0.9rem'
                              }}
                              value={hsnCode}
                              onChange={(e) => {
                                setHsnCode(e.target.value);
                                if (hsnCheckStatus) setHsnCheckStatus(null);
                              }}
                            />

                            <button
                              type="button"
                              onClick={handleCheckHsn}
                              disabled={!hsnCode || hsnCheckStatus?.loading}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '10px 18px',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: (!hsnCode || hsnCheckStatus?.loading) ? 'not-allowed' : 'pointer',
                                opacity: (!hsnCode || hsnCheckStatus?.loading) ? 0.6 : 1,
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                              }}
                            >
                              {hsnCheckStatus?.loading ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" /> Verifying...
                                </>
                              ) : (
                                <>
                                  <ShieldCheck size={17} /> Check HSN
                                </>
                              )}
                            </button>
                          </div>

                          {/* Feedback Note */}
                          {hsnCheckStatus?.details && (
                            <div
                              style={{
                                marginTop: '8px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                backgroundColor: hsnCheckStatus.valid ? '#f0fdf4' : '#fff7ed',
                                color: hsnCheckStatus.valid ? '#15803d' : '#c2410c',
                                border: hsnCheckStatus.valid ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              {hsnCheckStatus.valid ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#ea580c" />}
                              <span>{hsnCheckStatus.details}</span>
                            </div>
                          )}
                        </div>

                        {/* Row 1: Identification Numbers */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Lot Number
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="e.g. 102401"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={lotNumber}
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
                                setLotNumber(val);
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Batch Number
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="e.g. 9901"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={batchNumber}
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
                                setBatchNumber(val);
                              }}
                            />
                          </div>
                        </div>

                        {/* Row 2: Important Dates */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Manufacturing Date (MFG)
                            </label>
                            <input
                              type="date"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={manufacturingDate}
                              onChange={(e) => setManufacturingDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Expiry Date (EXP)
                            </label>
                            <input
                              type="date"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={expiryDate}
                              onChange={(e) => setExpiryDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Best Before Date
                            </label>
                            <input
                              type="date"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                              value={bestBeforeDate}
                              onChange={(e) => setBestBeforeDate(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Barcode & Product QR Code Generator (Positioned after Best Before Date details) */}
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '16px', marginBottom: '20px' }}>
                          <BarcodeUploader
                            barcodeValue={barcode}
                            barcodeImageUrl={barcodeImageUrl}
                            onBarcodeValueChange={setBarcode}
                            onBarcodeImageChange={setBarcodeImageUrl}
                            productName={productName}
                            sku={internalSku}
                            sellingPrice={sellingPriceRetail || sellingPrice}
                            mrp={mrp}
                            currency={currency}
                            hsnCode={hsnCode}
                            batchNumber={batchNumber}
                            expiryDate={expiryDate}
                            bestBeforeDate={bestBeforeDate}
                            companyName={companyName}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: WAREHOUSE & RACKBIN ALLOCATION */}
                  {activeTab === 'racking' && (
                    <div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '700' }}>Warehouse (Rackbin) Details</h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>Select storage warehouse and designate cascading rack, shelf, and bin coordinates.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddWarehouseModal(true)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#4338ca',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Plus size={15} /> Add New Warehouse
                        </button>
                      </div>

                      {/* Primary Warehouse Selector */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                            Select Storage Warehouse *
                          </label>
                          <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '600' }}>
                            {warehouses.length} warehouse{warehouses.length === 1 ? '' : 's'} available
                          </span>
                        </div>
                        <CustomSelectWithArrow
                          options={warehouses}
                          value={warehouseId || ''}
                          valueKey="id"
                          labelKey="name"
                          placeholder="-- Choose Storage Warehouse --"
                          emptyMessage="No warehouses found"
                          onRedirect={() => {
                            setShowForm(false);
                            navigate('/warehouses');
                          }}
                          onChange={selId => {
                            setWarehouseId(selId);
                            const selWh = warehouses.find(w => String(w.id) === String(selId));
                            setWarehouseLocation(selWh ? selWh.name : '');
                            setRackNumber('');
                            setShelfNumber('');
                            setBinLocation('');
                          }}
                          zIndex={40}
                        />
                        <select
                          style={{ display: 'none' }}
                          value={warehouseId || ''}
                          onChange={e => {
                            const selId = e.target.value;
                            setWarehouseId(selId);
                            const selWh = warehouses.find(w => String(w.id) === String(selId));
                            setWarehouseLocation(selWh ? selWh.name : '');
                            setRackNumber('');
                            setShelfNumber('');
                            setBinLocation('');
                          }}
                        >
                          <option value="">-- Choose Storage Warehouse --</option>
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>
                              {(w.warehouse_code || w.code) ? `[${w.warehouse_code || w.code}] ` : ''}{w.name} {w.is_default ? '★ (Default)' : ''} - ({w.warehouse_type || w.type || 'Warehouse'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Warehouse Summary Card */}
                      {warehouseId && (() => {
                        const sel = warehouses.find(w => String(w.id) === String(warehouseId));
                        if (!sel) return null;
                        return (
                          <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', marginBottom: '22px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                                {sel.name} {(sel.warehouse_code || sel.code) ? `(${sel.warehouse_code || sel.code})` : ''}
                              </span>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: '600' }}>
                                {sel.warehouse_type || sel.type || 'Warehouse'}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
                              <div>
                                <strong>Location: </strong>
                                {[sel.address_line_1 || sel.address, sel.city, sel.state, sel.pincode].filter(Boolean).join(', ') || 'N/A'}
                              </div>
                              <div>
                                <strong>Contact: </strong>
                                {sel.contact_person || sel.manager_name || 'N/A'} {sel.phone_number || sel.contact_number ? `(${sel.phone_number || sel.contact_number})` : ''}
                              </div>
                              <div>
                                <strong>Capacity: </strong>
                                {sel.total_capacity || sel.capacity || 'N/A'}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Cascading Coordinates: Rack -> Shelf -> Bin */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        {/* 1. RACK NUMBER */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                              Rack Number
                            </label>
                            <button
                              type="button"
                              onClick={() => handleOpenAddCoordinateModal('rack')}
                              style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.82rem', padding: 0, fontWeight: '600' }}
                            >
                              + Add Rack
                            </button>
                          </div>
                          <CustomSelectWithArrow
                            options={availableRacks.map(rack => ({ id: rack, name: rack }))}
                            value={rackNumber || ''}
                            valueKey="id"
                            labelKey="name"
                            disabled={!warehouseId}
                            placeholder={!warehouseId ? 'Select Warehouse First' : '-- Choose Rack --'}
                            emptyMessage="No racks found for this warehouse"
                            onRedirect={() => { setShowForm(false); navigate('/racking'); }}
                            onChange={value => { setRackNumber(value || ''); setShelfNumber(''); setBinLocation(''); }}
                            zIndex={40}
                          />
                          <select
                            style={{
                              display: 'none',
                              width: '100%',
                              padding: '11px 14px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              backgroundColor: warehouseId ? '#f8fafc' : '#f1f5f9',
                              color: '#1e293b',
                              outline: 'none',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              cursor: warehouseId ? 'pointer' : 'not-allowed'
                            }}
                            disabled={!warehouseId}
                            value={rackNumber || ''}
                            onChange={e => {
                              setRackNumber(e.target.value);
                              setShelfNumber('');
                              setBinLocation('');
                            }}
                          >
                            <option value="">
                              {!warehouseId ? 'Select Warehouse First' : (availableRacks.length === 0 ? '-- No Racks Found (Click + Add Rack) --' : '-- Choose Rack --')}
                            </option>
                            {availableRacks.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. SHELF NUMBER */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                              Shelf Number
                            </label>
                            <button
                              type="button"
                              onClick={() => handleOpenAddCoordinateModal('shelf')}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: rackNumber ? '#4338ca' : '#94a3b8',
                                cursor: rackNumber ? 'pointer' : 'not-allowed',
                                fontSize: '0.82rem',
                                padding: 0,
                                fontWeight: '600'
                              }}
                            >
                              + Add Shelf
                            </button>
                          </div>
                          <CustomSelectWithArrow
                            options={availableShelves.map(shelf => ({ id: shelf, name: shelf }))}
                            value={shelfNumber || ''}
                            valueKey="id"
                            labelKey="name"
                            disabled={!rackNumber}
                            placeholder={!rackNumber ? 'Select Rack First' : '-- Choose Shelf --'}
                            emptyMessage="No shelves found for this rack"
                            onRedirect={() => { setShowForm(false); navigate('/racking'); }}
                            onChange={value => { setShelfNumber(value || ''); setBinLocation(''); }}
                            zIndex={40}
                          />
                          <select
                            disabled={!rackNumber}
                            style={{
                              display: 'none',
                              width: '100%',
                              padding: '11px 14px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              backgroundColor: rackNumber ? '#f8fafc' : '#f1f5f9',
                              color: '#1e293b',
                              outline: 'none',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              cursor: rackNumber ? 'pointer' : 'not-allowed'
                            }}
                            value={shelfNumber || ''}
                            onChange={e => {
                              setShelfNumber(e.target.value);
                              setBinLocation('');
                            }}
                          >
                            <option value="">
                              {!rackNumber ? 'Select Rack First' : (availableShelves.length === 0 ? '-- No Shelves Found (Click + Add Shelf) --' : '-- Choose Shelf --')}
                            </option>
                            {availableShelves.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3. BIN LOCATION */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                              Bin Location
                            </label>
                            <button
                              type="button"
                              onClick={() => handleOpenAddCoordinateModal('bin')}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: shelfNumber ? '#4338ca' : '#94a3b8',
                                cursor: shelfNumber ? 'pointer' : 'not-allowed',
                                fontSize: '0.82rem',
                                padding: 0,
                                fontWeight: '600'
                              }}
                            >
                              + Add Bin
                            </button>
                          </div>
                          <CustomSelectWithArrow
                            options={availableBins.map(bin => ({ id: bin, name: bin }))}
                            value={binLocation || ''}
                            valueKey="id"
                            labelKey="name"
                            disabled={!shelfNumber && !rackNumber}
                            placeholder={!shelfNumber ? 'Select Shelf First' : '-- Choose Bin --'}
                            emptyMessage="No bins found for this rack or shelf"
                            onRedirect={() => { setShowForm(false); navigate('/racking'); }}
                            onChange={value => setBinLocation(value || '')}
                            zIndex={40}
                          />
                          <select
                            disabled={!shelfNumber && !rackNumber}
                            style={{
                              display: 'none',
                              width: '100%',
                              padding: '11px 14px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              backgroundColor: (shelfNumber || rackNumber) ? '#f8fafc' : '#f1f5f9',
                              color: '#1e293b',
                              outline: 'none',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              cursor: (shelfNumber || rackNumber) ? 'pointer' : 'not-allowed'
                            }}
                            value={binLocation || ''}
                            onChange={e => setBinLocation(e.target.value)}
                          >
                            <option value="">
                              {!shelfNumber ? 'Select Shelf First' : (availableBins.length === 0 ? '-- No Bins Found (Click + Add Bin) --' : '-- Choose Bin --')}
                            </option>
                            {availableBins.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Stock Allocation & Safety Thresholds (2 columns) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Initial / Opening Stock in this Warehouse
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder={purchaseQuantity ? `Defaults to purchase qty (${purchaseQuantity})` : "0"}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={openingStock}
                            onChange={e => setOpeningStock(e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Safety Stock (Minimum Buffer)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 10"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' }}
                            value={safetyStock}
                            onChange={e => setSafetyStock(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: REORDER & INVENTORY BUFFERS */}
                  {activeTab === 'reorder' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      {/* Top Header Card */}
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '18px 22px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '14px'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: '#ede9fe',
                              color: '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <RotateCcw size={16} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '700' }}>
                              Reorder & Stock Buffers
                            </h3>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                            Configure replenishment trigger points, safety stock buffers, supplier turnaround lead time, and purchasing instructions.
                          </p>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#eef2ff',
                          color: '#4338ca',
                          fontSize: '0.78rem',
                          fontWeight: '600'
                        }}>
                          <ShieldCheck size={15} />
                          Stockout Protection Active
                        </div>
                      </div>

                      {/* Threshold KPI Visualization Bar */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '14px'
                      }}>
                        <div style={{
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '10px',
                          padding: '12px 16px'
                        }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Safety Stock (Reserve)</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>
                            {safetyStock || 0} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ef4444' }}>units</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#7f1d1d' }}>Emergency stock floor</span>
                        </div>

                        <div style={{
                          backgroundColor: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '10px',
                          padding: '12px 16px'
                        }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder Level (Alert)</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b45309', marginTop: '4px' }}>
                            {reorderLevel || 0} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b' }}>units</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#78350f' }}>Triggers low-stock alert</span>
                        </div>

                        <div style={{
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '10px',
                          padding: '12px 16px'
                        }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder Batch Quantity</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
                            {reorderQty || 0} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#22c55e' }}>units</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#14532d' }}>Standard batch PO size</span>
                        </div>

                        <div style={{
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '10px',
                          padding: '12px 16px'
                        }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier Lead Time</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1d4ed8', marginTop: '4px' }}>
                            {leadTimeDays || 7} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#3b82f6' }}>days</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#1e3a8a' }}>Order-to-delivery turnaround</span>
                        </div>
                      </div>

                      {/* Threshold Configuration Fields */}
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px'
                      }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.92rem', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Inventory Replenishment Parameters
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                          {/* Reorder Level */}
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Reorder Level (Alert Threshold) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="e.g. 25"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.92rem' }}
                              value={reorderLevel}
                              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || parseInt(val, 10) >= 0) setReorderLevel(val);
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                              Stock count that triggers low-stock alerts and purchase requisitions.
                            </span>
                          </div>

                          {/* Reorder Batch Quantity */}
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Reorder Quantity (Standard Batch)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="e.g. 100"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.92rem' }}
                              value={reorderQty}
                              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || parseInt(val, 10) >= 0) setReorderQty(val);
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                              Default economic batch quantity to order when replenishing.
                            </span>
                          </div>

                          {/* Safety Stock */}
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Safety Stock (Minimum Reserve)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="e.g. 10"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.92rem' }}
                              value={safetyStock}
                              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || parseInt(val, 10) >= 0) setSafetyStock(val);
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                              Buffer inventory to absorb supplier delays or sudden demand surges.
                            </span>
                          </div>

                          {/* Supplier Lead Time */}
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Supplier Lead Time (Days)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="7"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.92rem' }}
                              value={leadTimeDays}
                              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || parseInt(val, 10) >= 0) setLeadTimeDays(val);
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                              Expected turnaround from purchase order issue to warehouse delivery.
                            </span>
                          </div>

                          {/* Minimum Stock Level */}
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Minimum Stock Level
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.92rem' }}
                              value={minStockLevel}
                              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || parseInt(val, 10) >= 0) setMinStockLevel(val);
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                              Critical minimum inventory threshold before stockout warning.
                            </span>
                          </div>

                          {/* Maximum Stock Level */}
                          <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Maximum Stock Level (Capacity Cap)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="e.g. 500"
                              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.92rem' }}
                              value={maxStockLevel}
                              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || parseInt(val, 10) >= 0) setMaxStockLevel(val);
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                              Maximum inventory to hold to prevent dead capital & overstocking.
                            </span>
                          </div>
                        </div>

                        {/* Auto-Reorder Checkbox / Toggle */}
                        <div style={{
                          marginTop: '20px',
                          padding: '14px 18px',
                          borderRadius: '10px',
                          backgroundColor: autoReorder ? '#f0fdf4' : '#f8fafc',
                          border: autoReorder ? '1px solid #86efac' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }} onClick={() => setAutoReorder(!autoReorder)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="checkbox"
                              checked={autoReorder}
                              onChange={(e) => setAutoReorder(e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                            />
                            <div>
                              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                                Automatic Reorder PO Creation
                              </strong>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                Automatically draft purchase orders when warehouse stock drops to or below the reorder level.
                              </p>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: autoReorder ? '#dcfce7' : '#e2e8f0',
                            color: autoReorder ? '#15803d' : '#64748b'
                          }}>
                            {autoReorder ? 'AUTO-REORDER ON' : 'MANUAL APPROVAL'}
                          </span>
                        </div>
                      </div>

                      {/* Purchasing Notes & Vendor Instructions */}
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px'
                      }}>
                        <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Reorder Note & Vendor Sourcing Instructions
                        </label>
                        <textarea
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            backgroundColor: '#f8fafc',
                            color: '#1e293b',
                            outline: 'none',
                            minHeight: '85px',
                            resize: 'vertical',
                            fontSize: '0.9rem',
                            lineHeight: '1.5'
                          }}
                          value={reorderNote}
                          onChange={(e) => setReorderNote(e.target.value)}
                          placeholder="e.g. Only order from certified tier-1 distributor; minimum master carton packaging size is 50 units; request QC certificate on dispatch..."
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                          These instructions will automatically attach to reorder alerts and purchase requisitions.
                        </span>
                      </div>

                      {/* Variant-Specific Reorder Overrides (When Element has variants) */}
                      {hasVariants === 'Yes' && productVariants.length > 0 && (
                        <div style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #c7d2fe',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.05)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={18} color="#4338ca" /> Variant-Specific Reorder Thresholds ({productVariants.length} Variants)
                              </h4>
                              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                Customize the alert threshold (ROL), replenishment lot (ROQ), safety stock, and lead time for each child variant. Blank values inherit the Element defaults above.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('variants')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#ede9fe',
                                color: '#4338ca',
                                border: '1px solid #c7d2fe',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '0.78rem',
                                cursor: 'pointer'
                              }}
                            >
                              Open Variants Matrix Tab ↗
                            </button>
                          </div>

                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '9px 12px', fontWeight: '700', color: '#475569', width: '45px', textAlign: 'center' }}>#</th>
                                  <th style={{ padding: '9px 12px', fontWeight: '700', color: '#475569', minWidth: '150px' }}>Variant Name</th>
                                  <th style={{ padding: '9px 12px', fontWeight: '700', color: '#475569', width: '140px' }}>SKU</th>
                                  <th style={{ padding: '9px 12px', fontWeight: '700', color: '#475569', width: '110px', textAlign: 'center' }} title="Reorder Level">ROL</th>
                                  <th style={{ padding: '9px 12px', fontWeight: '700', color: '#475569', width: '110px', textAlign: 'center' }} title="Reorder Quantity">ROQ</th>
                                  <th style={{ padding: '9px 12px', fontWeight: '700', color: '#475569', width: '105px', textAlign: 'center' }}>Safety Stock</th>
                                  <th style={{ padding: '9px 12px', fontWeight: '700', color: '#475569', width: '105px', textAlign: 'center' }}>Lead Time (Days)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {productVariants.map((v, vIdx) => (
                                  <tr key={v.id || vIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                                      {vIdx + 1}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>
                                      {v.name || v.variant_name || `${productName} (${Object.values(v.combination || v.variant_attributes || {}).join(' - ')})`}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                                      {v.sku || '-'}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={v.reorder_level !== undefined ? v.reorder_level : ''}
                                        placeholder={reorderLevel ? `${reorderLevel}` : '0'}
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault(); }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val !== '' && parseInt(val, 10) < 0) return;
                                          const copy = [...productVariants];
                                          copy[vIdx] = { ...copy[vIdx], reorder_level: val };
                                          setProductVariants(copy);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '5px 8px',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          fontSize: '0.82rem',
                                          fontWeight: '600',
                                          textAlign: 'center',
                                          outline: 'none'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={v.reorder_qty !== undefined ? v.reorder_qty : ''}
                                        placeholder={reorderQty ? `${reorderQty}` : '0'}
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault(); }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val !== '' && parseInt(val, 10) < 0) return;
                                          const copy = [...productVariants];
                                          copy[vIdx] = { ...copy[vIdx], reorder_qty: val };
                                          setProductVariants(copy);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '5px 8px',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          fontSize: '0.82rem',
                                          fontWeight: '600',
                                          textAlign: 'center',
                                          outline: 'none'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={v.safety_stock !== undefined ? v.safety_stock : ''}
                                        placeholder={safetyStock ? `${safetyStock}` : '0'}
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault(); }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val !== '' && parseInt(val, 10) < 0) return;
                                          const copy = [...productVariants];
                                          copy[vIdx] = { ...copy[vIdx], safety_stock: val };
                                          setProductVariants(copy);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '5px 8px',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          fontSize: '0.82rem',
                                          fontWeight: '600',
                                          textAlign: 'center',
                                          outline: 'none'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={v.lead_time_days !== undefined ? v.lead_time_days : ''}
                                        placeholder={leadTimeDays ? `${leadTimeDays}` : '7'}
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault(); }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val !== '' && parseInt(val, 10) < 0) return;
                                          const copy = [...productVariants];
                                          copy[vIdx] = { ...copy[vIdx], lead_time_days: val };
                                          setProductVariants(copy);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '5px 8px',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          fontSize: '0.82rem',
                                          fontWeight: '600',
                                          textAlign: 'center',
                                          outline: 'none'
                                        }}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: SCHEMES & TARGETS */}
                  {activeTab === 'schemes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: activeSchemeSource === 'brand' ? '#f5f3ff' : activeSchemeSource === 'custom' ? '#fff7ed' : '#eff6ff', border: `1px solid ${activeSchemeSource === 'brand' ? '#ddd6fe' : activeSchemeSource === 'custom' ? '#fed7aa' : '#bfdbfe'}`, color: '#334155', fontSize: '0.84rem', fontWeight: '700' }}>
                        Scheme Source: {activeSchemeSource === 'brand'
                          ? `Brand Default${brandId ? ` — ${brands.find(b => String(b.id) === String(brandId))?.name || ''}` : ''}`
                          : activeSchemeSource === 'company'
                            ? `Company Fallback — ${companyName || ''}`
                            : activeSchemeSource === 'custom' ? 'Custom Override' : 'No default scheme configured'}
                      </div>
                      {/* COMPANY SCHEMES MATCH & SYNC BANNER */}
                      {companyName && (
                        <div style={{
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

                      <ProductSchemesManager
                        product={{
                          product_pe_product: productPeProduct,
                          discount_on_product: discountOnProduct,
                          product_target_scheme: productTargetScheme,
                          discount_on_bill_amount: discountOnBillAmount,
                          quarterly_discount_on_turnover: quarterlyDiscountOnTurnover,
                          yearly_discount_on_turnover: yearlyDiscountOnTurnover,
                          seasonal_scheme_name: seasonalSchemeName,
                          seasonal_frequency: seasonalFrequency,
                          seasonal_applicability: seasonalApplicability,
                          seasonal_period_start: seasonalPeriodStart,
                          seasonal_period_end: seasonalPeriodEnd,
                          selling_price: sellingPrice || mrp || 0,
                          purchase_price: purchasePrice || 0,
                          currency: currency || 'INR'
                        }}
                        onChange={(field, value) => {
                          setSchemeManuallyOverridden(true);
                          setActiveSchemeSource('custom');
                          if (field === 'product_pe_product') setProductPeProduct(value);
                          else if (field === 'discount_on_product') setDiscountOnProduct(value);
                          else if (field === 'product_target_scheme') setProductTargetScheme(value);
                          else if (field === 'discount_on_bill_amount') setDiscountOnBillAmount(value);
                          else if (field === 'quarterly_discount_on_turnover') setQuarterlyDiscountOnTurnover(value);
                          else if (field === 'yearly_discount_on_turnover') setYearlyDiscountOnTurnover(value);
                          else if (field === 'seasonal_scheme_name') setSeasonalSchemeName(value);
                          else if (field === 'seasonal_frequency') setSeasonalFrequency(value);
                          else if (field === 'seasonal_applicability') setSeasonalApplicability(value);
                          else if (field === 'seasonal_period_start') setSeasonalPeriodStart(value);
                          else if (field === 'seasonal_period_end') setSeasonalPeriodEnd(value);
                        }}
                      />
                    </div>
                  )}

                  {/* TAB: REVIEW ELEMENT */}
                  {activeTab === 'review' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, marginRight: '20px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Review Element Details</span>
                          {!isEditingName ? (
                            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '700' }}>
                              {productName || '(No Name Generated)'}
                            </h3>
                          ) : (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="text"
                                value={productName}
                                onChange={(e) => {
                                  setProductName(e.target.value);
                                  setIsCustomName(true);
                                }}
                                placeholder="Enter custom product name"
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #4338ca',
                                  outline: 'none',
                                  fontSize: '1rem',
                                  fontWeight: '600',
                                  color: '#0f172a',
                                  width: '100%',
                                  maxWidth: '450px',
                                  backgroundColor: '#fff'
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setIsEditingName(false)}
                                style={{
                                  padding: '8px 14px',
                                  backgroundColor: '#4338ca',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Done
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                          <button
                            type="button"
                            title="Share and export options"
                            aria-label="Share and export options"
                            aria-haspopup="menu"
                            aria-expanded={showReviewActions}
                            onClick={() => setShowReviewActions((open) => !open)}
                            style={{ width: '42px', height: '42px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #4f46e5', borderRadius: '11px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#ffffff', cursor: 'pointer', boxShadow: showReviewActions ? '0 8px 18px rgba(79, 70, 229, 0.32)' : '0 5px 12px rgba(79, 70, 229, 0.24)', transition: 'transform 0.16s ease, box-shadow 0.16s ease' }}
                            onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-1px)'; event.currentTarget.style.boxShadow = '0 9px 20px rgba(79, 70, 229, 0.34)'; }}
                            onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)'; event.currentTarget.style.boxShadow = '0 5px 12px rgba(79, 70, 229, 0.24)'; }}
                          >
                            <span style={{ width: '25px', height: '25px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)' }}><Share2 size={15} strokeWidth={2.5} /></span>
                          </button>
                          <button type="button" title="Brochure (PDF)" aria-label="Brochure (PDF)" onClick={() => downloadProductBrochurePDF(getCurrentFormProduct(), groups, brands)} style={{ width: '46px', height: '46px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe', borderRadius: '12px', background: 'linear-gradient(145deg, #eff6ff, #dbeafe)', color: '#2563eb', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.14)', transition: 'transform 0.16s ease, box-shadow 0.16s ease' }} onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-2px)'; event.currentTarget.style.boxShadow = '0 7px 14px rgba(37, 99, 235, 0.22)'; }} onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)'; event.currentTarget.style.boxShadow = '0 4px 10px rgba(37, 99, 235, 0.14)'; }}>
                            <FileDown size={19} />
                          </button>
                          <button type="button" title="Save Product" aria-label="Save Product" onClick={handleSubmit} style={{ width: '46px', height: '46px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #86efac', borderRadius: '12px', background: 'linear-gradient(145deg, #22c55e, #15803d)', color: '#ffffff', cursor: 'pointer', boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)', transition: 'transform 0.16s ease, box-shadow 0.16s ease' }} onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-2px)'; event.currentTarget.style.boxShadow = '0 7px 14px rgba(22, 163, 74, 0.3)'; }} onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)'; event.currentTarget.style.boxShadow = '0 4px 10px rgba(22, 163, 74, 0.2)'; }}>
                            <Check size={19} strokeWidth={3} />
                          </button>
                          {showReviewActions && (
                          <div role="menu" style={{ position: 'absolute', top: '49px', left: 0, zIndex: 50, width: '180px', display: 'grid', gap: '4px', padding: '7px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e0e7ff', borderRadius: '11px', boxShadow: '0 12px 24px rgba(30, 41, 59, 0.17)', animation: 'reviewActionMenuIn 0.16s ease-out' }}>
                          <div style={{ padding: '2px 6px 4px', color: '#64748b', fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Share & export</div>
                          <div style={{ display: 'grid', gap: '4px', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              title="Share the complete product review PDF using your device's share options"
                              onClick={() => { setShowReviewActions(false); void shareProductReviewPdf(getCurrentFormProduct(), groups, brands); }}
                              style={{
                                background: 'linear-gradient(135deg, #059669, #16a34a)',
                                color: '#ffffff',
                                padding: '5px 8px',
                                borderRadius: '7px',
                                fontSize: '0.74rem',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 3px 8px rgba(5, 150, 105, 0.2)',
                                transition: 'transform 0.15s ease, filter 0.15s ease'
                              }}
                              onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateX(2px)'; event.currentTarget.style.filter = 'brightness(1.06)'; }}
                              onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateX(0)'; event.currentTarget.style.filter = 'none'; }}
                            >
                              <Share2 size={15} /> Share PDF
                            </button>
                            <button
                              type="button"
                              title="Download product details as an Excel-compatible spreadsheet"
                              onClick={() => { setShowReviewActions(false); downloadProductDetailsExcel(getCurrentFormProduct(), groups, brands); }}
                              style={{
                                background: 'linear-gradient(135deg, #0f766e, #059669)',
                                color: '#ffffff',
                                padding: '5px 8px',
                                borderRadius: '7px',
                                fontSize: '0.74rem',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 3px 8px rgba(15, 118, 110, 0.2)',
                                transition: 'transform 0.15s ease, filter 0.15s ease'
                              }}
                              onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateX(2px)'; event.currentTarget.style.filter = 'brightness(1.06)'; }}
                              onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateX(0)'; event.currentTarget.style.filter = 'none'; }}
                            >
                              <FileSpreadsheet size={15} /> Export (Excel)
                            </button>
                            <button
                              type="button"
                              title="Share the exported product spreadsheet; choose WhatsApp in the share sheet"
                              onClick={() => { setShowReviewActions(false); void shareProductDetailsExcel(getCurrentFormProduct(), groups, brands); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', border: 'none', borderRadius: '7px', backgroundColor: '#047857', color: '#ffffff', fontSize: '0.74rem', fontWeight: '600', textAlign: 'left', cursor: 'pointer' }}
                            >
                              <Share2 size={14} /> WhatsApp Excel
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowReviewActions(false); handleSubmit(); }}
                              style={{
                                backgroundColor: '#16a34a',
                                color: 'white',
                                padding: '7px 18px',
                                borderRadius: '8px',
                                fontSize: '0.88rem',
                                fontWeight: '700',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                visibility: 'hidden',
                                height: 0,
                                padding: 0,
                                margin: 0
                              }}
                              onMouseOver={e => e.currentTarget.style.backgroundColor = '#15803d'}
                              onMouseOut={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                            >
                              ✓ Save Product
                            </button>
                          </div>
                          </div>
                          )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingName(!isEditingName)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#4338ca',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            <Edit2 size={13} /> {isEditingName ? 'Close Edit' : 'Edit Name'}
                          </button>
                        </div>
                      </div>

                      {/* 1. Basic Info */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Element Info</h4>
                          <button type="button" onClick={() => setActiveTab('info')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', fontSize: '0.9rem' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SKU</span>
                            <strong style={{ color: '#0f172a' }}>{internalSku || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>GROUP</span>
                            <strong style={{ color: '#0f172a' }}>{groups.find(g => g.id == groupId)?.name || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>BASE NAME</span>
                            <strong style={{ color: '#0f172a' }}>{baseProductName || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>COMPANY / BRAND</span>
                            <strong style={{ color: '#0f172a' }}>{companyName || '-'} {brandId ? `/ ${brands.find(b => b.id == brandId)?.name || ''}` : ''}</strong>
                          </div>
                          <div style={{ gridColumn: 'span 3' }}>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>DESCRIPTION (PRODUCT USES)</span>
                            <span style={{ color: '#334155' }}>{productDescription || '-'}</span>
                          </div>
                          <div style={{ gridColumn: 'span 3' }}>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>PRODUCT INFORMATION / DETAILS</span>
                            {productInfo ? (
                              <span style={{ color: '#334155', whiteSpace: 'pre-line', lineHeight: '1.5' }}>{productInfo}</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>No detailed information provided</span>
                            )}
                          </div>
                          {productAliases.filter(a => ((typeof a === 'object' ? a.alias_name : a) || '').trim()).length > 0 && (
                            <div style={{ gridColumn: 'span 3' }}>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>ALIASES</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {productAliases
                                  .filter(a => ((typeof a === 'object' ? a.alias_name : a) || '').trim())
                                  .map((a, i) => {
                                    const typeName = typeof a === 'object' ? a.alias_type_name : (i === 0 ? aliasTypeName : '');
                                    const name = typeof a === 'object' ? a.alias_name : a;
                                    return (
                                      <span key={i} style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                                        {typeName ? `${typeName}: ` : ''}{name}
                                      </span>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                          {attributes.filter(a => ((a?.name || a?.Attribute?.name || '') + '').trim() && ((a?.value || a?.attribute_value || '') + '').trim()).length > 0 && (
                            <div style={{ gridColumn: 'span 3' }}>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>ATTRIBUTES</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {attributes.filter(a => ((a?.name || a?.Attribute?.name || '') + '').trim() && ((a?.value || a?.attribute_value || '') + '').trim()).map((a, i) => {
                                  const aName = a?.name || a?.Attribute?.name || '';
                                  const aVal = a?.value || a?.attribute_value || '';
                                  return (
                                    <span key={i} style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem' }}><strong>{aName}:</strong> {aVal}</span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* VARIANTS MATRIX REVIEW SECTION */}
                          {hasVariants === 'Yes' && (
                            <div style={{ gridColumn: 'span 4', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700' }}>
                                  <Layers size={16} /> CONFIGURED VARIANTS MATRIX ({productVariants.length} Variants)
                                </span>
                                <button type="button" onClick={() => setActiveTab('variants')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                                  Edit Matrix →
                                </button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                                {productVariants.map((v, i) => (
                                  <div key={i} style={{ padding: '10px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <QRCodeSVG value={v.barcode || v.sku} size={38} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {v.variant_name}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                                        SKU: {v.sku}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{currency} {v.selling_price || '0.00'}</span>
                                        <span style={{ color: '#6366f1', fontWeight: '600' }}>
                                          {Array.isArray(v.packaging) && v.packaging.length > 0 ? `${v.packaging.length} Pack(s)` : 'No Packs'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ gridColumn: 'span 3', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '6px' }}>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>OCCASION BASED</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600',
                                backgroundColor: isOccasionBased === 'Yes' ? '#ede9fe' : '#f1f5f9',
                                color: isOccasionBased === 'Yes' ? '#4338ca' : '#64748b'
                              }}>
                                {isOccasionBased === 'Yes' ? 'Yes' : 'No'}
                              </span>
                              {isOccasionBased === 'Yes' && selectedOccasionIds.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {selectedOccasionIds.map(id => {
                                    const occ = occasionsList.find(o => String(o.id) === String(id));
                                    if (!occ) return null;
                                    const typeColors = {
                                      Festival: { bg: '#fef3c7', text: '#b45309' },
                                      Season: { bg: '#dcfce7', text: '#15803d' },
                                      Event: { bg: '#e0e7ff', text: '#4338ca' },
                                      Other: { bg: '#f3e8ff', text: '#7e22ce' }
                                    };
                                    const colors = typeColors[occ.occasion_type] || { bg: '#f1f5f9', text: '#475569' };
                                    return (
                                      <span
                                        key={id}
                                        style={{
                                          fontSize: '0.75rem',
                                          fontWeight: '600',
                                          padding: '3px 8px',
                                          borderRadius: '12px',
                                          backgroundColor: colors.bg,
                                          color: colors.text
                                        }}
                                      >
                                        {occ.occasion_name} ({occ.occasion_type})
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Physical Details */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Physical Details</h4>
                          <button type="button" onClick={() => setActiveTab('physical')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', fontSize: '0.9rem' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>ELEMENT TYPE</span>
                            <strong style={{ color: '#0f172a' }}>{productType || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PHYSICAL APPEARANCE</span>
                            <strong style={{ color: '#0f172a' }}>{physicalAppearance || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SIZE</span>
                            <strong style={{ color: '#0f172a' }}>{size || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PACKAGING</span>
                            <strong style={{ color: '#0f172a' }}>{packaging || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>DIMENSIONS (L × B × T)</span>
                            <strong style={{ color: '#0f172a' }}>{[length, breadth, thickness].filter(Boolean).length > 0 ? `${[length, breadth, thickness].filter(Boolean).join(' × ')} ${dimensionUnit === 'custom' ? (customDimensionUnit || '') : dimensionUnit}` : '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>VOLUME</span>
                            <strong style={{ color: '#0f172a' }}>{volume ? `${volume} ${volumeUnit === 'custom' ? (customVolumeUnit || '') : volumeUnit}` : '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>NET WEIGHT</span>
                            <strong style={{ color: '#0f172a' }}>{netWeight ? `${netWeight} ${weightUnit === 'custom' ? (customWeightUnit || '') : weightUnit}` : '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>GROSS WEIGHT</span>
                            <strong style={{ color: '#0f172a' }}>{grossWeight ? `${grossWeight} ${weightUnit === 'custom' ? (customWeightUnit || '') : weightUnit}` : '-'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* 3. Pricing & Inventory */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Pricing & Tracking</h4>
                          <button type="button" onClick={() => setActiveTab('pricing')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', fontSize: '0.9rem' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>COSTING METHOD</span>
                            <strong style={{ color: '#4338ca' }}>
                              {costingMethod === 'AVCO' ? 'Average Cost (AVCO)' :
                                costingMethod === 'BATCH' ? 'Batch / Lot Tracking' :
                                  costingMethod === 'FIFO' ? 'FIFO' : 'None (Fixed Cost)'}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PURCHASE PRICE</span>
                            <strong style={{ color: '#0f172a' }}>{currency} {purchasePrice || 0}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>ATTACHED EXPENSES ({attachedExpenses.length})</span>
                            <strong style={{ color: '#0f172a' }}>
                              {attachedExpenses.length > 0
                                ? attachedExpenses.map(e => `${e.expense_name || 'Expense'}: ${currency} ${parseFloat(e.amount || 0).toFixed(2)}`).join(', ')
                                : (expenseName ? `${expenseName} (${currency} ${parseFloat(expenseAmount || 0).toFixed(2)})` : 'None')}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: '#166534', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>BASE UNIT COST (LANDED)</span>
                            <strong style={{ color: '#15803d', fontWeight: '800' }}>{currency} {landedPurchaseCost.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SELLING PRICE</span>
                            <strong style={{ color: '#16a34a' }}>{currency} {sellingPrice || 0}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>MRP</span>
                            <strong style={{ color: '#0f172a' }}>{currency} {mrp || 0}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>DISTRIBUTOR PRICE</span>
                            <strong style={{ color: '#0f172a' }}>{currency} {distributorPrice || 0}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>DISTRIBUTOR PROFIT</span>
                            <strong style={{ color: '#0f172a' }}>{distributorProfitPercent ? `${distributorProfitPercent}%` : '0%'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SELLING (WHOLESALE)</span>
                            <strong style={{ color: '#0f172a' }}>{currency} {sellingPriceWholesale || 0}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>WHOLESALE PROFIT</span>
                            <strong style={{ color: '#0f172a' }}>{wholesaleProfitPercent ? `${wholesaleProfitPercent}%` : '0%'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SELLING (RETAIL / MRP)</span>
                            <strong style={{ color: '#0f172a' }}>{currency} {sellingPriceRetail || 0}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>RETAIL PROFIT</span>
                            <strong style={{ color: '#0f172a' }}>{retailProfitPercent ? `${retailProfitPercent}%` : '0%'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PROFIT PERCENT</span>
                            <strong style={{ color: '#0f172a' }}>{profitPercent ? `${profitPercent}%` : '0%'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>GST RATE</span>
                            <strong style={{ color: '#0f172a' }}>{gstRate ? `${gstRate}%` : '0%'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>BARCODE / UPC</span>
                            <strong style={{ color: '#0f172a' }}>{barcode || '-'}</strong>
                            {barcodeImageUrl && (
                              <div style={{ marginTop: '6px' }}>
                                <a href={barcodeImageUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                                  <img src={barcodeImageUrl} alt="Barcode" style={{ height: '32px', maxWidth: '80px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', padding: '2px' }} />
                                  <span style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: '600' }}>View Barcode</span>
                                </a>
                              </div>
                            )}
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>HSN CODE</span>
                            <strong style={{ color: '#0f172a' }}>{hsnCode || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PURCHASE QTY</span>
                            <strong style={{ color: '#0f172a' }}>{purchaseQuantity || 0}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>LOT NO</span>
                            <strong style={{ color: '#0f172a' }}>{lotNumber || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>BATCH NO</span>
                            <strong style={{ color: '#0f172a' }}>{batchNumber || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>MFG DATE</span>
                            <strong style={{ color: '#0f172a' }}>{manufacturingDate || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>EXPIRY DATE</span>
                            <strong style={{ color: expiryDate ? '#b91c1c' : '#0f172a' }}>{expiryDate || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>BEST BEFORE DATE</span>
                            <strong style={{ color: '#0f172a' }}>{bestBeforeDate || '-'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* 4. Warehouse Review */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Warehouse (Rackbin)</h4>
                          <button type="button" onClick={() => setActiveTab('racking')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', fontSize: '0.9rem' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>WAREHOUSE NAME</span>
                            <strong style={{ color: '#0f172a' }}>{warehouseLocation || (warehouses.find(w => String(w.id) === String(warehouseId))?.name) || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>RACK NUMBER</span>
                            <strong style={{ color: '#0f172a' }}>{rackNumber || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SHELF NUMBER</span>
                            <strong style={{ color: '#0f172a' }}>{shelfNumber || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>BIN LOCATION</span>
                            <strong style={{ color: '#0f172a' }}>{binLocation || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>OPENING STOCK</span>
                            <strong style={{ color: '#16a34a' }}>{openingStock || purchaseQuantity || 0}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SAFETY STOCK</span>
                            <strong style={{ color: '#0f172a' }}>{safetyStock || '-'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Reorder & Inventory Buffers Review */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder & Stock Buffers</h4>
                          <button type="button" onClick={() => setActiveTab('reorder')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', fontSize: '0.9rem' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>REORDER LEVEL (TRIGGER)</span>
                            <strong style={{ color: '#4338ca' }}>{reorderLevel || 0} units</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>REORDER QUANTITY (BATCH)</span>
                            <strong style={{ color: '#0f172a' }}>{reorderQty ? `${reorderQty} units` : '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SAFETY STOCK BUFFER</span>
                            <strong style={{ color: '#0f172a' }}>{safetyStock ? `${safetyStock} units` : '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SUPPLIER LEAD TIME</span>
                            <strong style={{ color: '#0f172a' }}>{leadTimeDays ? `${leadTimeDays} days` : '7 days'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>MIN / MAX STOCK LEVEL</span>
                            <strong style={{ color: '#0f172a' }}>{minStockLevel || 0} / {maxStockLevel || '∞'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>AUTO-REORDER AUTOMATION</span>
                            <span style={{
                              display: 'inline-block',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: autoReorder ? '#dcfce7' : '#f1f5f9',
                              color: autoReorder ? '#15803d' : '#64748b'
                            }}>
                              {autoReorder ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>REORDER & PURCHASING NOTE</span>
                            <span style={{ color: '#334155', fontSize: '0.85rem' }}>{reorderNote || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 5. Schemes & Targets Review */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>5. Schemes & Targets</h4>
                          <button type="button" onClick={() => setActiveTab('schemes')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', fontSize: '0.9rem' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PRODUCT PE PRODUCT</span>
                            <strong style={{ color: '#0f172a' }}>{productPeProduct || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>DISCOUNT ON PRODUCT</span>
                            <strong style={{ color: '#0f172a' }}>{discountOnProduct || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PRODUCT TARGET SCHEME</span>
                            <strong style={{ color: '#0f172a' }}>{productTargetScheme || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>DISCOUNT ON BILL AMOUNT</span>
                            <strong style={{ color: '#0f172a' }}>{discountOnBillAmount || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>QUARTERLY DISCOUNT (TURNOVER)</span>
                            <strong style={{ color: '#0f172a' }}>{quarterlyDiscountOnTurnover || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>YEARLY DISCOUNT (TURNOVER)</span>
                            <strong style={{ color: '#0f172a' }}>{yearlyDiscountOnTurnover || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SEASON NAME</span>
                            <strong style={{ color: '#0f172a' }}>{seasonalSchemeName || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SEASON FREQUENCY</span>
                            <strong style={{ color: '#0f172a' }}>{seasonalFrequency || '-'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>SEASON APPLICABILITY</span>
                            <strong style={{ color: '#0f172a' }}>{seasonalApplicability || '-'}</strong>
                          </div>
                          {seasonalPeriodStart && (
                            <div>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PERIOD START</span>
                              <strong style={{ color: '#0f172a' }}>{seasonalPeriodStart}</strong>
                            </div>
                          )}
                          {seasonalPeriodEnd && (
                            <div>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>PERIOD END</span>
                              <strong style={{ color: '#0f172a' }}>{seasonalPeriodEnd}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 5. Product Media Review */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>5. Uploaded Photos</h4>
                          <button type="button" onClick={() => setActiveTab('info')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit Photos</button>
                        </div>
                        {productImages.length > 0 ? (
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {productImages.map((img, i) => (
                              <div key={i} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: i === 0 ? '2px solid #4338ca' : '1px solid #cbd5e1' }}>
                                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {i === 0 && (
                                  <span style={{ position: 'absolute', bottom: '2px', left: '2px', right: '2px', backgroundColor: 'rgba(67, 56, 202, 0.9)', color: 'white', fontSize: '0.55rem', fontWeight: '700', textAlign: 'center', borderRadius: '4px' }}>
                                    MAIN
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            No photos uploaded yet. (You can add photos in Labelling tab)
                          </div>
                        )}
                      </div>

                      {/* 6. Element Video Review */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>6. Element Video</h4>
                          <button type="button" onClick={() => setActiveTab('info')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit Video</button>
                        </div>
                        {productVideos.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {productVideos.map((vUrl, vi) => (
                              <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <video src={vUrl} style={{ width: '80px', height: '50px', borderRadius: '6px', objectFit: 'cover', backgroundColor: '#000' }} />
                                <div>
                                  <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a' }}>Video {vi + 1}{vi === 0 ? ' (Primary)' : ''}</strong>
                                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Ready for publishing</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            No video uploaded.
                          </div>
                        )}
                      </div>

                      {/* 7. Company Brochure Review */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#fff', marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>7. Company Brochure</h4>
                          <button type="button" onClick={() => setActiveTab('info')} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Edit Brochure</button>
                        </div>
                        {companyBrochure?.url ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a' }}>{companyBrochure.name || 'Company Brochure'}</span>
                            <a href={companyBrochure.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4338ca', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none' }}>View File</a>
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            No company brochure attached.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FOOTER BUTTONS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                        if (isFromPO) {
                          navigate('/purchases?action=new');
                        }
                      }}
                      style={{
                        padding: '10px 22px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: 'white',
                        color: '#334155',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      Cancel
                    </button>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      {activeTab !== 'info' && (
                        <button
                          type="button"
                          onClick={() => {
                            const tabOrder = ['info', ...(hasVariants === 'Yes' ? ['variants'] : []), ...(isServiceType ? [] : ['physical']), 'pricing', ...(isServiceType ? [] : ['racking']), ...(isServiceType ? [] : ['reorder']), 'schemes', 'review'];
                            const idx = tabOrder.indexOf(activeTab);
                            if (idx > 0) setActiveTab(tabOrder[idx - 1]);
                          }}
                          style={{
                            padding: '10px 20px',
                            border: 'none',
                            backgroundColor: '#ede9fe',
                            color: '#4f46e5',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = '#ddd6fe'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = '#ede9fe'}
                        >
                          <ChevronLeft size={18} /> Previous
                        </button>
                      )}

                      {activeTab !== 'review' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTab === 'pricing') {
                              if (
                                (purchasePrice !== '' && parseFloat(purchasePrice) < 0) ||
                                (sellingPrice !== '' && parseFloat(sellingPrice) < 0) ||
                                (mrp !== '' && parseFloat(mrp) < 0) ||
                                (gstRate !== '' && parseFloat(gstRate) < 0) ||
                                (purchaseQuantity !== '' && parseInt(purchaseQuantity, 10) < 0)
                              ) {
                                alert("Prices, GST, and quantities cannot be negative.");
                                return;
                              }
                            }
                            if (activeTab === 'info' && !isServiceType) {
                              if (
                                (lotNumber !== '' && !/^\d+$/.test(String(lotNumber).trim())) ||
                                (lotNumber !== '' && Number(lotNumber) < 0)
                              ) {
                                alert("Lot Number must contain only positive numbers.");
                                return;
                              }
                              if (
                                (batchNumber !== '' && !/^\d+$/.test(String(batchNumber).trim())) ||
                                (batchNumber !== '' && Number(batchNumber) < 0)
                              ) {
                                alert("Batch Number must contain only positive numbers.");
                                return;
                              }
                            }
                            if (activeTab === 'reorder') {
                              if (
                                (reorderLevel !== '' && parseInt(reorderLevel, 10) < 0) ||
                                (reorderQty !== '' && parseInt(reorderQty, 10) < 0) ||
                                (safetyStock !== '' && parseInt(safetyStock, 10) < 0) ||
                                (minStockLevel !== '' && parseInt(minStockLevel, 10) < 0) ||
                                (maxStockLevel !== '' && parseInt(maxStockLevel, 10) < 0) ||
                                (leadTimeDays !== '' && parseInt(leadTimeDays, 10) < 0)
                              ) {
                                alert("Reorder levels, quantities, and lead time cannot be negative.");
                                return;
                              }
                            }
                            const tabOrder = ['info', ...(hasVariants === 'Yes' ? ['variants'] : []), ...(isServiceType ? [] : ['physical']), 'pricing', ...(isServiceType ? [] : ['racking']), ...(isServiceType ? [] : ['reorder']), 'schemes', 'review'];
                            const idx = tabOrder.indexOf(activeTab);
                            if (idx < tabOrder.length - 1) setActiveTab(tabOrder[idx + 1]);
                          }}
                          style={{
                            padding: '10px 22px',
                            border: 'none',
                            backgroundColor: '#ede9fe',
                            color: '#4f46e5',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = '#ddd6fe'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = '#ede9fe'}
                        >
                          {activeTab === 'schemes' ? 'Proceed to Review' : 'Next'} <ChevronRight size={18} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          style={{
                            padding: '10px 28px',
                            border: 'none',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = '#15803d'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                        >
                          ✓ Save Element
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {
        showAddAliasTypeModal && (
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
                  <SuggestionInput id="new-alias-type-name" value={newAliasTypeName} onChange={setNewAliasTypeName} suggestions={catalogAliases} itemType="Alias Type" placeholder="e.g. Botanical Name, Regional Name, Trade Name" required onRedirect={() => { setShowAddAliasTypeModal(false); setShowForm(false); navigate('/alias-catalog'); }} inputStyle={{ padding: '10px 12px', borderRadius: '8px' }} />
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
        )
      }

      {
        showAddExpenseModal && (
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
        )
      }

      {
        showTypeForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '500px', position: 'relative' }}>
              <button type="button" onClick={() => setShowTypeForm(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>&times;</button>
              <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#2c3e50', fontSize: '1.25rem' }}>Add Product Type</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newTypeName.trim()) return;
                try {
                  const res = await api.post('/admin/product-types', { name: newTypeName.trim(), status: 'Active' });
                  const created = res.data?.data || res.data || { id: Date.now(), name: newTypeName.trim(), status: 'Active' };
                  setProductTypesList(prev => [...prev, created]);
                  setProductTypes(prev => [...prev, created.name]);
                  setProductTypeId(created.id);
                  setProductType(created.name);
                } catch (err) {
                  const fallback = { id: Date.now(), name: newTypeName.trim(), status: 'Active' };
                  setProductTypesList(prev => [...prev, fallback]);
                  setProductTypes(prev => [...prev, fallback.name]);
                  setProductTypeId(fallback.id);
                  setProductType(fallback.name);
                }
                setNewTypeName('');
                setShowTypeForm(false);
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Type Name *</label>
                  <SuggestionInput id="new-product-type-name" value={newTypeName} onChange={setNewTypeName} suggestions={productTypesList} itemType="Product Type" required onRedirect={() => { setShowTypeForm(false); setShowForm(false); navigate('/product-types'); }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid #ecf0f1', paddingTop: '16px' }}>
                  <button type="button" onClick={() => setShowTypeForm(false)} style={{ padding: '8px 16px', border: '1px solid #bdc3c7', backgroundColor: 'white', color: '#333', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                  <button type="submit" style={{ padding: '8px 16px', border: 'none', backgroundColor: '#1abc9c', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {
        showGroupForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '500px', position: 'relative' }}>
              <button type="button" onClick={() => setShowGroupForm(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>&times;</button>
              <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#2c3e50', fontSize: '1.25rem' }}>Add Product Group</h2>
              <form onSubmit={handleGroupSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Group Name *</label>
                  <SuggestionInput id="new-group-name" value={newGroupName} onChange={setNewGroupName} suggestions={groups} itemType="Group" required onRedirect={() => { setShowGroupForm(false); setShowForm(false); navigate('/groups'); }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Description</label>
                  <textarea style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', minHeight: '80px', resize: 'vertical' }} value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)}></textarea>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Parent Group (Optional)</label>
                  <select style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={newGroupParentId} onChange={(e) => setNewGroupParentId(e.target.value)}>
                    <option value="">-- None (Make this a Root Group) --</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#000', fontSize: '1rem', marginBottom: '6px' }}>Status</label>
                  <select style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px' }} value={newGroupStatus} onChange={(e) => setNewGroupStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid #ecf0f1', paddingTop: '16px' }}>
                  <button type="button" onClick={() => setShowGroupForm(false)} style={{ padding: '8px 16px', border: '1px solid #bdc3c7', backgroundColor: 'white', color: '#333', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                  <button type="submit" style={{ padding: '8px 16px', border: 'none', backgroundColor: '#1abc9c', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Save Group</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

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

      {/* MANDATORY DELETE REASON CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={!!deletingProduct}
        title="Delete Product"
        itemName={deletingProduct ? `Product "${deletingProduct.product_name || deletingProduct.name || ('#' + deletingProduct.id)}"` : 'this product'}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteLoading}
      />

      {/* ONE-CLICK GAP RECONCILIATION MODAL */}
      {reconcileModalProduct && (
        <ReconcileGapModal
          product={reconcileModalProduct}
          isOpen={!!reconcileModalProduct}
          onClose={() => setReconcileModalProduct(null)}
          onSuccess={fetchProducts}
        />
      )}

      {/* QUICK ADD RACK / SHELF / BIN MODAL */}
      {activeAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#4338ca" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  {activeAddModal === 'rack' && 'Add New Rack'}
                  {activeAddModal === 'shelf' && 'Add New Shelf'}
                  {activeAddModal === 'bin' && 'Add New Bin'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAddModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.83rem', color: '#64748b' }}>
              {activeAddModal === 'rack' && `Create a new Rack in ${warehouses.find(w => String(w.id) === String(warehouseId))?.name || 'selected warehouse'}.`}
              {activeAddModal === 'shelf' && `Create a new Shelf inside Rack "${rackNumber}".`}
              {activeAddModal === 'bin' && `Create a new Bin inside Rack "${rackNumber}" > Shelf "${shelfNumber}".`}
            </p>

            <form onSubmit={handleSaveCoordinate}>
              {activeAddModal === 'rack' && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Rack Name / Code *
                  </label>
                  <SuggestionInput id="new-rack-name" value={newRackInput} onChange={setNewRackInput} suggestions={availableRacks} itemType="Rack" placeholder="e.g. Rack A-12, R-04" required inputStyle={{ padding: '10px 12px', borderRadius: '8px' }} />
                </div>
              )}

              {activeAddModal === 'shelf' && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Shelf Name / Code *
                  </label>
                  <SuggestionInput id="new-shelf-name" value={newShelfInput} onChange={setNewShelfInput} suggestions={availableShelves} itemType="Shelf" placeholder="e.g. Shelf 03, S-2" required inputStyle={{ padding: '10px 12px', borderRadius: '8px' }} />
                </div>
              )}

              {activeAddModal === 'bin' && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Bin Name / Code *
                  </label>
                  <SuggestionInput id="new-bin-name" value={newBinInput} onChange={setNewBinInput} suggestions={availableBins} itemType="Bin" placeholder="e.g. Bin B-05, BIN-101" required inputStyle={{ padding: '10px 12px', borderRadius: '8px' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveAddModal(null)}
                  style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewCoordinate}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#4338ca', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                >
                  {isSubmittingNewCoordinate ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
