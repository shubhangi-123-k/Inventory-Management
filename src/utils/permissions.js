/**
 * Role-Based Access Control (RBAC) & Permissions Engine
 * Granular permissions structure for Sub-Admins and Super Admins
 */

// All Modules managed under RBAC
export const MODULE_KEYS = {
  PRODUCTS: 'products',
  SALES_ORDERS: 'sales_orders',
  PURCHASE_ORDERS: 'purchase_orders',
  WAREHOUSES: 'warehouses',
  INVENTORY: 'inventory',
  CUSTOMERS: 'customers',
  GROUPS: 'groups',
  COMPANIES: 'companies',
  BRANDS: 'brands',
  PRODUCT_TYPES: 'product_types',
  ALIASES: 'aliases',
  OCCASIONS: 'occasions',
  DASHBOARD: 'dashboard',
  ACTIVITY_LOGS: 'activity_logs',
  TASKS: 'tasks',
};

// Module definitions with human-friendly labels and icons
export const MODULE_CONFIG = [
  {
    key: MODULE_KEYS.PRODUCTS,
    label: 'Products / Elements',
    description: 'Catalog products, items, variants, and product types',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.SALES_ORDERS,
    label: 'Sales Orders',
    description: 'Customer sales orders, invoices, and fulfillment',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.PURCHASE_ORDERS,
    label: 'Purchase Orders',
    description: 'Supplier purchases, PR conversion, and shipment receiving',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.WAREHOUSES,
    label: 'Warehouses',
    description: 'Warehouses, locations, zones, and facilities',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.INVENTORY,
    label: 'Inventory',
    description: 'Stock levels, stock movements, and inventory adjustments',
    actions: ['view', 'edit', 'adjust'],
  },
  {
    key: MODULE_KEYS.CUSTOMERS,
    label: 'Customers',
    description: 'Customer directory, companies, and contact management',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.GROUPS,
    label: 'Groups / Categories',
    description: 'Product category taxonomy, hierarchies, and sub-groups',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.COMPANIES,
    label: 'Companies',
    description: 'Supplier and corporate partner entities',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.BRANDS,
    label: 'Brands',
    description: 'Brand catalog and manufacturer tags',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.PRODUCT_TYPES,
    label: 'Product Types',
    description: 'Element types, goods, services, and stock tracking configurations',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.ALIASES,
    label: 'Alias Master',
    description: 'Product aliases, scientific, local, and vernacular classifications',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.OCCASIONS,
    label: 'Occasions',
    description: 'Festival, seasonal, and celebration-based element tags',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.TASKS,
    label: 'Task Management',
    description: 'Operational tasks, to-dos, assignments, and restock alerts',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: MODULE_KEYS.DASHBOARD,
    label: 'Dashboard',
    description: 'Analytics, revenue KPI summaries, and chart metrics',
    actions: ['view'],
  },
  {
    key: MODULE_KEYS.ACTIVITY_LOGS,
    label: 'Activity Logs',
    description: 'System-wide audit trail and security event logs',
    actions: ['view'],
  },
];

// Default blank permissions template
export const getDefaultPermissions = () => ({
  [MODULE_KEYS.PRODUCTS]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.SALES_ORDERS]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.PURCHASE_ORDERS]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.WAREHOUSES]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.INVENTORY]: { view: false, edit: false, adjust: false },
  [MODULE_KEYS.CUSTOMERS]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.GROUPS]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.COMPANIES]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.BRANDS]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.PRODUCT_TYPES]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.ALIASES]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.OCCASIONS]: { view: false, create: false, edit: false, delete: false },
  [MODULE_KEYS.TASKS]: { view: true, create: false, edit: false, delete: false },
  [MODULE_KEYS.DASHBOARD]: { view: true },
  [MODULE_KEYS.ACTIVITY_LOGS]: { view: false },
});

// Quick Presets matching specification
export const PRESETS = [
  {
    id: 'full_access',
    label: 'Full Access',
    description: 'Checks all boxes across all modules',
    badgeColor: '#6366f1',
    apply: () => ({
      [MODULE_KEYS.PRODUCTS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.SALES_ORDERS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.PURCHASE_ORDERS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.WAREHOUSES]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.INVENTORY]: { view: true, edit: true, adjust: true },
      [MODULE_KEYS.CUSTOMERS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.GROUPS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.COMPANIES]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.BRANDS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.PRODUCT_TYPES]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.ALIASES]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.OCCASIONS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.TASKS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.DASHBOARD]: { view: true },
      [MODULE_KEYS.ACTIVITY_LOGS]: { view: true },
    }),
  },
  {
    id: 'store_keeper',
    label: 'Store Keeper',
    description: 'Warehouses (all), Inventory (all), Products (view), POs (view/receive)',
    badgeColor: '#0ea5e9',
    apply: () => ({
      [MODULE_KEYS.PRODUCTS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.SALES_ORDERS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.PURCHASE_ORDERS]: { view: true, create: false, edit: true, delete: false },
      [MODULE_KEYS.WAREHOUSES]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.INVENTORY]: { view: true, edit: true, adjust: true },
      [MODULE_KEYS.CUSTOMERS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.GROUPS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.COMPANIES]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.BRANDS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.PRODUCT_TYPES]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.ALIASES]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.OCCASIONS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.TASKS]: { view: true, create: true, edit: true, delete: false },
      [MODULE_KEYS.DASHBOARD]: { view: true },
      [MODULE_KEYS.ACTIVITY_LOGS]: { view: false },
    }),
  },
  {
    id: 'billing_operator',
    label: 'Billing Operator',
    description: 'Sales Orders (all), Customers (all), Products (view)',
    badgeColor: '#10b981',
    apply: () => ({
      [MODULE_KEYS.PRODUCTS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.SALES_ORDERS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.PURCHASE_ORDERS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.WAREHOUSES]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.INVENTORY]: { view: true, edit: false, adjust: false },
      [MODULE_KEYS.CUSTOMERS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.GROUPS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.COMPANIES]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.BRANDS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.PRODUCT_TYPES]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.ALIASES]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.OCCASIONS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.TASKS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.DASHBOARD]: { view: true },
      [MODULE_KEYS.ACTIVITY_LOGS]: { view: false },
    }),
  },
  {
    id: 'catalog_manager',
    label: 'Catalog Manager',
    description: 'Products (all), Categories/Groups (all), Companies & Brands (all), Masters (all)',
    badgeColor: '#f59e0b',
    apply: () => ({
      [MODULE_KEYS.PRODUCTS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.SALES_ORDERS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.PURCHASE_ORDERS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.WAREHOUSES]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.INVENTORY]: { view: false, edit: false, adjust: false },
      [MODULE_KEYS.CUSTOMERS]: { view: false, create: false, edit: false, delete: false },
      [MODULE_KEYS.GROUPS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.COMPANIES]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.BRANDS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.PRODUCT_TYPES]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.ALIASES]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.OCCASIONS]: { view: true, create: true, edit: true, delete: true },
      [MODULE_KEYS.TASKS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.DASHBOARD]: { view: true },
      [MODULE_KEYS.ACTIVITY_LOGS]: { view: false },
    }),
  },
  {
    id: 'readonly_auditor',
    label: 'Read-Only Auditor',
    description: 'Checks view across all modules; unchecks all create/edit/delete/adjust',
    badgeColor: '#8b5cf6',
    apply: () => ({
      [MODULE_KEYS.PRODUCTS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.SALES_ORDERS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.PURCHASE_ORDERS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.WAREHOUSES]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.INVENTORY]: { view: true, edit: false, adjust: false },
      [MODULE_KEYS.CUSTOMERS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.GROUPS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.COMPANIES]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.BRANDS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.PRODUCT_TYPES]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.ALIASES]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.OCCASIONS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.TASKS]: { view: true, create: false, edit: false, delete: false },
      [MODULE_KEYS.DASHBOARD]: { view: true },
      [MODULE_KEYS.ACTIVITY_LOGS]: { view: true },
    }),
  },
];

/**
 * Safely parse permissions from whatever format the backend returns
 */
export const normalizePermissions = (permissions) => {
  if (!permissions) return getDefaultPermissions();
  if (typeof permissions === 'string') {
    try {
      return { ...getDefaultPermissions(), ...JSON.parse(permissions) };
    } catch {
      return getDefaultPermissions();
    }
  }
  if (typeof permissions === 'object') {
    return { ...getDefaultPermissions(), ...permissions };
  }
  return getDefaultPermissions();
};

/**
 * Core Permission Check Function
 * - If user.role === 'SUPER_ADMIN', always returns true
 * - If user.role === 'ADMIN', return Boolean(user.permissions?.[module]?.[action])
 */
export const hasPermission = (user, moduleKey, action = 'view') => {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN') return true;

  if (role === 'ADMIN') {
    const perms = normalizePermissions(user.permissions || getCachedUserPermissions(user.id, user.email));
    if (perms?.[moduleKey] && perms[moduleKey][action] !== undefined) {
      return Boolean(perms[moduleKey][action]);
    }
    // Backward compatibility fallback for masters previously grouped under products
    if (['product_types', 'aliases', 'occasions'].includes(moduleKey)) {
      return Boolean(perms?.products?.[action]);
    }
    return false;
  }

  return false;
};

// Local storage caching for offline/cross-session sync
const CACHE_PREFIX = 'inv_user_permissions_';

export const cacheUserPermissions = (userId, email, permissions) => {
  try {
    const cleanPerms = normalizePermissions(permissions);
    if (userId) localStorage.setItem(`${CACHE_PREFIX}id_${userId}`, JSON.stringify(cleanPerms));
    if (email) localStorage.setItem(`${CACHE_PREFIX}email_${email.toLowerCase()}`, JSON.stringify(cleanPerms));
  } catch (e) {
    console.warn('Failed to cache permissions:', e);
  }
};

export const getCachedUserPermissions = (userId, email) => {
  try {
    if (userId) {
      const cached = localStorage.getItem(`${CACHE_PREFIX}id_${userId}`);
      if (cached) return JSON.parse(cached);
    }
    if (email) {
      const cached = localStorage.getItem(`${CACHE_PREFIX}email_${email.toLowerCase()}`);
      if (cached) return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Failed to read cached permissions:', e);
  }
  return null;
};

/**
 * Get human-readable list of active modules for a user
 */
export const getUserActiveModulesList = (user) => {
  if (!user) return [];
  const role = (user.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN') {
    return ['All Modules (Full Super Admin)'];
  }

  const perms = normalizePermissions(user.permissions || getCachedUserPermissions(user.id, user.email));
  const active = [];

  MODULE_CONFIG.forEach((mod) => {
    const modPerms = perms[mod.key];
    if (modPerms && Object.values(modPerms).some(Boolean)) {
      active.push({
        key: mod.key,
        label: mod.label,
        actions: Object.entries(modPerms)
          .filter(([_, val]) => Boolean(val))
          .map(([act]) => act),
      });
    }
  });

  return active;
};
