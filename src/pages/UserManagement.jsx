import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Check,
  X,
  Search,
  RefreshCw,
  KeyRound,
  LogOut,
  Edit2,
  Power,
  Eye,
  EyeOff,
  Sparkles,
  Boxes,
  Package,
  ShoppingCart,
  FileText,
  Home,
  Briefcase,
  Folder,
  Tag,
  Activity,
  LayoutDashboard,
  CheckCircle2,
  CheckSquare
} from 'lucide-react';
import {
  MODULE_CONFIG,
  MODULE_KEYS,
  PRESETS,
  getDefaultPermissions,
  normalizePermissions,
  cacheUserPermissions,
  getCachedUserPermissions,
  getUserActiveModulesList
} from '../utils/permissions';
import Pagination from '../components/Pagination';
import SuggestionInput from '../components/SuggestionInput';

const UserManagement = () => {
  const { user: currentUser, updateCurrentUser } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPermDetailModal, setShowPermDetailModal] = useState(null);
  const [forceLogoutTargetUser, setForceLogoutTargetUser] = useState(null);
  const [submittingForceLogout, setSubmittingForceLogout] = useState(false);

  // Form State for Create Sub-Admin
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
    permissions: getDefaultPermissions(),
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Form State for Edit Sub-Admin
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'ADMIN',
    permissions: getDefaultPermissions(),
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Form State for Reset Password
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);

  // Form State for Status Toggle
  const [statusTargetUser, setStatusTargetUser] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Fetch Users
  const fetchUsers = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      // Bypass browser or proxy caches so Refresh always requests the latest directory.
      const res = await api.get('/users', {
        params: isManualRefresh ? { _refresh: Date.now() } : undefined,
      });
      const rawUsers = res.data?.users || res.data?.data || (Array.isArray(res.data) ? res.data : []);

      // Enrich users with cached permissions if missing from remote payload
      const enrichedUsers = rawUsers.map((u) => {
        let perms = u.permissions;
        if (!perms && (u.role || '').toUpperCase() === 'ADMIN') {
          perms = getCachedUserPermissions(u.id, u.email);
        }
        return {
          ...u,
          permissions: perms ? normalizePermissions(perms) : null,
        };
      });

      setUsers(enrichedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      showError(err.response?.data?.error || 'Failed to fetch users list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase().trim();
      const nameMatch = (u.name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const roleMatch = (u.role || '').toLowerCase().includes(q);
      const matchesSearch = !q || nameMatch || emailMatch || roleMatch;

      const userRole = (u.role || '').toUpperCase();
      const matchesRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'SUPER_ADMIN' && userRole === 'SUPER_ADMIN') ||
        (roleFilter === 'ADMIN' && userRole === 'ADMIN');

      const matchesStatus =
        statusFilter === 'ALL' ||
        (u.status || 'Active').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => (u.role || '').toUpperCase() === 'SUPER_ADMIN').length;
    const activeSubAdmins = users.filter(
      (u) => (u.role || '').toUpperCase() === 'ADMIN' && (u.status || 'Active').toLowerCase() === 'active'
    ).length;
    const inactive = users.filter((u) => (u.status || '').toLowerCase() === 'inactive').length;
    return { total, superAdmins, activeSubAdmins, inactive };
  }, [users]);

  // Handle Preset Application for Create
  const handleApplyPresetCreate = (preset) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: preset.apply(),
    }));
  };

  // Handle Preset Application for Edit
  const handleApplyPresetEdit = (preset) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: preset.apply(),
    }));
  };

  // Permission Checkbox Toggle Helpers
  const handleTogglePerm = (setForm, modKey, action) => {
    setForm((prev) => {
      const currentMod = prev.permissions[modKey] || {};
      const nextVal = !currentMod[action];
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [modKey]: {
            ...currentMod,
            [action]: nextVal,
          },
        },
      };
    });
  };

  const handleToggleRowAll = (setForm, modDef, currentPerms) => {
    const modPerms = currentPerms[modDef.key] || {};
    const allChecked = modDef.actions.every((act) => Boolean(modPerms[act]));
    const nextVal = !allChecked;

    const updatedRow = {};
    modDef.actions.forEach((act) => {
      updatedRow[act] = nextVal;
    });

    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [modDef.key]: {
          ...prev.permissions[modDef.key],
          ...updatedRow,
        },
      },
    }));
  };

  const handleToggleColumnAll = (setForm, action) => {
    setForm((prev) => {
      const applicableModules = MODULE_CONFIG.filter((m) => m.actions.includes(action));
      const allCurrentlyChecked = applicableModules.every((m) => Boolean(prev.permissions[m.key]?.[action]));
      const nextVal = !allCurrentlyChecked;

      const nextPermissions = { ...prev.permissions };
      applicableModules.forEach((m) => {
        nextPermissions[m.key] = {
          ...nextPermissions[m.key],
          [action]: nextVal,
        };
      });

      return {
        ...prev,
        permissions: nextPermissions,
      };
    });
  };

  // Check if a specific column is completely checked
  const isColumnAllChecked = (permissions, action) => {
    if (!permissions) return false;
    const applicable = MODULE_CONFIG.filter((m) => m.actions.includes(action));
    return applicable.length > 0 && applicable.every((m) => Boolean(permissions[m.key]?.[action]));
  };

  // Check if a specific column is partially checked
  const isColumnSomeChecked = (permissions, action) => {
    if (!permissions) return false;
    const applicable = MODULE_CONFIG.filter((m) => m.actions.includes(action));
    const all = isColumnAllChecked(permissions, action);
    const some = applicable.some((m) => Boolean(permissions[m.key]?.[action]));
    return some && !all;
  };

  // Check if entire matrix is checked
  const isEntireMatrixAllChecked = (permissions) => {
    if (!permissions) return false;
    return MODULE_CONFIG.every((m) => m.actions.every((act) => Boolean(permissions[m.key]?.[act])));
  };

  // Check if entire matrix is partially checked
  const isEntireMatrixSomeChecked = (permissions) => {
    if (!permissions) return false;
    const all = isEntireMatrixAllChecked(permissions);
    const some = MODULE_CONFIG.some((m) => m.actions.some((act) => Boolean(permissions[m.key]?.[act])));
    return some && !all;
  };

  // Select all or deselect all across entire matrix
  const handleSelectAllGlobal = (setForm, enable = true) => {
    setForm((prev) => {
      const nextPerms = {};
      MODULE_CONFIG.forEach((m) => {
        nextPerms[m.key] = {};
        m.actions.forEach((act) => {
          nextPerms[m.key][act] = enable;
        });
      });
      return { ...prev, permissions: nextPerms };
    });
  };

  // Read-only (View all)
  const handleSelectReadOnly = (setForm) => {
    setForm((prev) => {
      const nextPerms = {};
      MODULE_CONFIG.forEach((m) => {
        nextPerms[m.key] = {};
        m.actions.forEach((act) => {
          nextPerms[m.key][act] = act === 'view';
        });
      });
      return { ...prev, permissions: nextPerms };
    });
  };

  // Read & Write (View, Create, Edit)
  const handleSelectReadWrite = (setForm) => {
    setForm((prev) => {
      const nextPerms = {};
      MODULE_CONFIG.forEach((m) => {
        nextPerms[m.key] = {};
        m.actions.forEach((act) => {
          nextPerms[m.key][act] = ['view', 'create', 'edit'].includes(act);
        });
      });
      return { ...prev, permissions: nextPerms };
    });
  };

  // Execute / Full Control
  const handleSelectExecute = (setForm) => {
    handleSelectAllGlobal(setForm, true);
  };

  // Toggle master matrix
  const handleToggleMasterMatrix = (setForm, permissions) => {
    const all = isEntireMatrixAllChecked(permissions);
    handleSelectAllGlobal(setForm, !all);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setCreateForm({
      name: '',
      email: '',
      password: '',
      role: 'ADMIN',
      permissions: getDefaultPermissions(),
    });
    setShowCreatePassword(false);
    setShowCreateModal(true);
  };

  // Submit Create Sub-Admin
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      showError('Please fill in all required profile fields.');
      return;
    }

    try {
      setSubmittingCreate(true);
      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        permissions: createForm.permissions,
      };

      const res = await api.post('/users', payload);
      const createdUser = res.data?.user || res.data;

      // Cache permissions locally
      cacheUserPermissions(createdUser?.id, payload.email, payload.permissions);

      showSuccess(`Sub-Admin "${payload.name}" created successfully!`);
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to create Sub-Admin');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (targetUser) => {
    const rawPerms = targetUser.permissions || getCachedUserPermissions(targetUser.id, targetUser.email) || getDefaultPermissions();
    setEditUser(targetUser);
    setEditForm({
      name: targetUser.name || '',
      role: targetUser.role || 'ADMIN',
      permissions: normalizePermissions(rawPerms),
    });
    setShowEditModal(true);
  };

  // Submit Edit Sub-Admin
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      setSubmittingEdit(true);
      const payload = {
        name: editForm.name.trim(),
        role: editForm.role,
        permissions: editForm.permissions,
      };

      await api.put(`/users/${editUser.id}`, payload);

      // Cache permissions locally
      cacheUserPermissions(editUser.id, editUser.email, payload.permissions);

      // If current logged-in user edited themselves, sync in AuthContext
      if (currentUser?.id === editUser.id) {
        updateCurrentUser({
          name: payload.name,
          role: payload.role,
          permissions: payload.permissions,
        });
      }

      showSuccess(`User "${editForm.name}" updated successfully!`);
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Reset Password Modal
  const openResetModal = (targetUser) => {
    setResetTargetUser(targetUser);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowResetModal(true);
  };

  // Submit Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetTargetUser) return;

    if (!newPassword || newPassword.length < 6) {
      showError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    try {
      setSubmittingReset(true);
      await api.post(`/users/${resetTargetUser.id}/reset-password`, {
        newPassword,
      });

      showSuccess(`Password for "${resetTargetUser.name}" has been reset successfully!`);
      setShowResetModal(false);
    } catch (err) {
      console.error('Error resetting password:', err);
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmittingReset(false);
    }
  };

  // Open Status Toggle Modal
  const openStatusModal = (targetUser) => {
    if (currentUser?.id === targetUser.id) {
      showWarning("You cannot change the status of your own currently active account.");
      return;
    }
    setStatusTargetUser(targetUser);
    setShowStatusModal(true);
  };

  // Submit Status Toggle
  const handleStatusToggle = async () => {
    if (!statusTargetUser) return;
    const nextStatus = (statusTargetUser.status || 'Active').toLowerCase() === 'active' ? 'Inactive' : 'Active';

    try {
      setSubmittingStatus(true);
      await api.patch(`/users/${statusTargetUser.id}/status`, {
        status: nextStatus,
      });

      showSuccess(`User status changed to "${nextStatus}"!`);
      setShowStatusModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating status:', err);
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleForceLogout = async () => {
    if (!forceLogoutTargetUser) return;
    try {
      setSubmittingForceLogout(true);
      await api.post(`/users/${forceLogoutTargetUser.id}/force-logout`);
      showSuccess(`Successfully logged out ${forceLogoutTargetUser.name || 'user'}.`);
      setForceLogoutTargetUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error forcing user logout:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to force logout user');
    } finally {
      setSubmittingForceLogout(false);
    }
  };

  // Module Icon Helper
  const getModuleIcon = (key) => {
    switch (key) {
      case MODULE_KEYS.PRODUCTS:
        return <Package size={16} color="#4f46e5" />;
      case MODULE_KEYS.SALES_ORDERS:
        return <ShoppingCart size={16} color="#0284c7" />;
      case MODULE_KEYS.PURCHASE_ORDERS:
        return <FileText size={16} color="#059669" />;
      case MODULE_KEYS.WAREHOUSES:
        return <Home size={16} color="#d97706" />;
      case MODULE_KEYS.INVENTORY:
        return <Boxes size={16} color="#8b5cf6" />;
      case MODULE_KEYS.CUSTOMERS:
        return <Users size={16} color="#2563eb" />;
      case MODULE_KEYS.GROUPS:
        return <Folder size={16} color="#e11d48" />;
      case MODULE_KEYS.COMPANIES:
        return <Briefcase size={16} color="#0d9488" />;
      case MODULE_KEYS.BRANDS:
        return <Tag size={16} color="#ea580c" />;
      case MODULE_KEYS.PRODUCT_TYPES:
        return <Boxes size={16} color="#0284c7" />;
      case MODULE_KEYS.ALIASES:
        return <Tag size={16} color="#7c3aed" />;
      case MODULE_KEYS.OCCASIONS:
        return <Sparkles size={16} color="#f59e0b" />;
      case MODULE_KEYS.DASHBOARD:
        return <LayoutDashboard size={16} color="#6366f1" />;
      case MODULE_KEYS.ACTIVITY_LOGS:
        return <Activity size={16} color="#475569" />;
      case MODULE_KEYS.TASKS:
        return <CheckSquare size={16} color="#059669" />;
      default:
        return <Shield size={16} color="#64748b" />;
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Page Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                }}
              >
                <Users size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  User & Sub-Admin Management
                </h1>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                  Create sub-administrators, govern granular JSON permission matrices, and enforce RBAC access.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => { void fetchUsers(true); }}
              disabled={refreshing}
              aria-label={refreshing ? 'Refreshing users' : 'Refresh users'}
              aria-busy={refreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.35)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 14px rgba(99, 102, 241, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(99, 102, 241, 0.35)';
              }}
            >
              <UserPlus size={18} />
              <span>+ Add New Sub-Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="user-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="user-stat-card user-stat-total" style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>Total Directory Users</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1, marginTop: '2px' }}>{stats.total}</div>
          </div>
        </div>

        <div className="user-stat-card user-stat-admins" style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>Super Admins</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#6b21a8', lineHeight: 1.1, marginTop: '2px' }}>{stats.superAdmins}</div>
          </div>
        </div>

        <div className="user-stat-card user-stat-active" style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserPlus size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>Active Sub-Admins</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#15803d', lineHeight: 1.1, marginTop: '2px' }}>{stats.activeSubAdmins}</div>
          </div>
        </div>

        <div className="user-stat-card user-stat-inactive" style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Power size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>Inactive Accounts</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#64748b', lineHeight: 1.1, marginTop: '2px' }}>{stats.inactive}</div>
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Table Filter Topbar */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#334155',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="ADMIN">ADMIN (Sub-Admin)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#334155',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#64748b', marginLeft: '6px' }}>
              Showing <strong>{filteredUsers.length}</strong> {filteredUsers.length === 1 ? 'user' : 'users'}
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
                <th style={{ width: '70px', padding: '14px 10px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                  Sr. No.
                </th>
                <th style={{ padding: '14px 24px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                  User & Identity
                </th>
                <th style={{ padding: '14px 16px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                  Role
                </th>
                <th style={{ padding: '14px 16px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', minWidth: '130px' }}>
                  Status
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '280px', textAlign: 'center' }}>
                  Permissions Summary
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <RefreshCw size={24} className="spin-anim" color="#6366f1" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={36} color="#94a3b8" />
                      <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>No users found</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '380px' }}>
                        {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'No users match your filter criteria. Try adjusting or clearing search terms.'
                          : 'Get started by creating your first Sub-Administrator.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((targetUser, index) => {
                  const isSuper = (targetUser.role || '').toUpperCase() === 'SUPER_ADMIN';
                  const isActive = (targetUser.status || 'Active').toLowerCase() === 'active';
                  const initial = (targetUser.name || targetUser.email || 'U')[0].toUpperCase();
                  const activeModules = getUserActiveModulesList(targetUser);

                  return (
                    <tr
                      key={targetUser.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Sr. No. */}
                      <td style={{ padding: '16px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700', color: '#64748b', fontSize: '0.84rem' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      {/* Name & Email - Left aligned so all avatar circles line up in a straight vertical column */}
                      <td style={{ padding: '14px 24px', verticalAlign: 'middle', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '14px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: isSuper
                                ? 'linear-gradient(135deg, #8b5cf6 0%, #d97706 100%)'
                                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '0.95rem',
                              flexShrink: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                          >
                            {initial}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{targetUser.name || 'Unnamed User'}</span>
                              {currentUser?.id === targetUser.id && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    backgroundColor: '#e0e7ff',
                                    color: '#4338ca',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                              {targetUser.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge: SUPER_ADMIN (Purple/Gold), ADMIN (Blue) */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {isSuper ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: '800',
                              background: 'linear-gradient(135deg, #f3e8ff 0%, #fef3c7 100%)',
                              color: '#6b21a8',
                              border: '1px solid #e9d5ff',
                              boxShadow: '0 1px 2px rgba(107, 33, 168, 0.08)',
                            }}
                          >
                            <Sparkles size={13} color="#d97706" />
                            SUPER_ADMIN
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                            }}
                          >
                            <Shield size={13} color="#0284c7" />
                            ADMIN / Sub-Admin
                          </span>
                        )}
                      </td>

                      {/* Status Toggle Switch: Active (Green) vs Inactive (Gray) */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => openStatusModal(targetUser)}
                            disabled={currentUser?.id === targetUser.id}
                            title={
                              currentUser?.id === targetUser.id
                                ? 'Cannot toggle your own active account'
                                : `Click to ${isActive ? 'deactivate' : 'activate'} ${targetUser.name || 'this user'}`
                            }
                            style={{
                              position: 'relative',
                              width: '38px',
                              height: '22px',
                              borderRadius: '9999px',
                              backgroundColor: isActive ? '#10b981' : '#cbd5e1',
                              border: 'none',
                              cursor: currentUser?.id === targetUser.id ? 'not-allowed' : 'pointer',
                              opacity: currentUser?.id === targetUser.id ? 0.5 : 1,
                              padding: '2px',
                              transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                              outline: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              boxShadow: isActive ? '0 0 8px rgba(16, 185, 129, 0.35)' : 'none'
                            }}
                          >
                            <span
                              style={{
                                display: 'block',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                                transform: isActive ? 'translateX(16px)' : 'translateX(0px)',
                                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                            />
                          </button>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              color: isActive ? '#15803d' : '#64748b',
                              minWidth: '48px',
                              textAlign: 'left'
                            }}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Permissions Summary Chips */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {isSuper ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                backgroundColor: '#faf5ff',
                                color: '#7e22ce',
                                border: '1px solid #f3e8ff',
                              }}
                            >
                              <ShieldCheck size={14} color="#7e22ce" />
                              Full Unrestricted Access (All Modules)
                            </span>
                          </div>
                        ) : activeModules.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No active permissions assigned
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {activeModules.slice(0, 3).map((mod) => (
                              <span
                                key={mod.key}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  backgroundColor: '#f1f5f9',
                                  color: '#334155',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                {getModuleIcon(mod.key)}
                                <span>{mod.label.split('/')[0].trim()}</span>
                              </span>
                            ))}

                            {activeModules.length > 3 && (
                              <button
                                type="button"
                                onClick={() => setShowPermDetailModal(targetUser)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  backgroundColor: '#eef2ff',
                                  color: '#4f46e5',
                                  border: '1px solid #c7d2fe',
                                  cursor: 'pointer',
                                }}
                                title="Click to view full permission matrix"
                              >
                                +{activeModules.length - 3} more
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions Menu */}
                      <td style={{ padding: '16px 20px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {/* Manage Permissions */}
                          <button
                            type="button"
                            onClick={() => openEditModal(targetUser)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.82rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f1f5f9';
                              e.currentTarget.style.borderColor = '#94a3b8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            title="Edit profile & permissions"
                          >
                            <Edit2 size={13} color="#4f46e5" />
                            <span>Edit</span>
                          </button>

                          {/* Toggle Status */}
                          <button
                            type="button"
                            onClick={() => openStatusModal(targetUser)}
                            disabled={currentUser?.id === targetUser.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: `1px solid ${isActive ? '#fca5a5' : '#86efac'}`,
                              backgroundColor: isActive ? '#fff1f2' : '#f0fdf4',
                              color: isActive ? '#b91c1c' : '#15803d',
                              fontSize: '0.82rem',
                              fontWeight: '600',
                              cursor: currentUser?.id === targetUser.id ? 'not-allowed' : 'pointer',
                              opacity: currentUser?.id === targetUser.id ? 0.5 : 1,
                              transition: 'all 0.15s ease',
                            }}
                            title={
                              currentUser?.id === targetUser.id
                                ? 'Cannot toggle your own active account'
                                : isActive
                                  ? 'Deactivate this user account'
                                  : 'Activate this user account'
                            }
                          >
                            <Power size={13} />
                            <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => openResetModal(targetUser)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#475569',
                              fontSize: '0.82rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f1f5f9';
                              e.currentTarget.style.borderColor = '#94a3b8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            title="Reset user's password"
                          >
                            <KeyRound size={13} color="#d97706" />
                            <span>Reset Password</span>
                          </button>

                          {(targetUser.role || '').toUpperCase() === 'ADMIN' &&
                            String(currentUser?.id) !== String(targetUser.id) && (
                              <button
                                type="button"
                                onClick={() => setForceLogoutTargetUser(targetUser)}
                                disabled={!isActive}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #fca5a5',
                                  backgroundColor: isActive ? '#fff1f2' : '#f1f5f9',
                                  color: isActive ? '#b91c1c' : '#94a3b8',
                                  fontSize: '0.82rem',
                                  fontWeight: '600',
                                  cursor: isActive ? 'pointer' : 'not-allowed',
                                  opacity: isActive ? 1 : 0.6,
                                }}
                                title={isActive ? 'Terminate all active sessions' : 'User is inactive'}
                              >
                                <LogOut size={13} />
                                <span>Force Logout</span>
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredUsers.length > itemsPerPage && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE SUB-ADMIN & PERMISSION MATRIX FORM                         */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '980px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '24px 28px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    Create Sub-Admin & Configure Access
                  </h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                    Enter profile credentials and construct a granular module permission matrix.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="custom-modal-scroll" style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                {/* Section 1: Profile Information */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Sub-Admin Profile Details
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <SuggestionInput id="subadmin-name-input" value={createForm.name} onChange={(name) => setCreateForm(prev => ({ ...prev, name }))} suggestions={users.map(user => user.name).filter(Boolean)} itemType="Sub-Admin" placeholder="e.g. Sarah Jenkins" required inputStyle={{ padding: '10px 14px', borderRadius: '8px' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Email Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <SuggestionInput id="subadmin-email-input" name="new-subadmin-email" autoComplete="off" type="email" value={createForm.email} onChange={(email) => setCreateForm(prev => ({ ...prev, email }))} suggestions={users.map(user => user.email).filter(Boolean)} itemType="Email" placeholder="subadmin@inventory.com" required inputStyle={{ padding: '10px 14px', borderRadius: '8px' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Temporary Password <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          name="new-subadmin-temporary-password"
                          autoComplete="new-password"
                          required
                          placeholder="Password123"
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 40px 10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword(!showCreatePassword)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Assigned Role
                      </label>
                      <select
                        value={createForm.role}
                        onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="ADMIN">ADMIN (Sub-Admin with RBAC)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (Full System Owner)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Quick Presets */}
                <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                        ⚡ Quick Presets (1-Click Auto Fill):
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>
                        Select a role template to automatically configure checkboxes below.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, permissions: getDefaultPermissions() })}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      Clear All
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {PRESETS.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => handleApplyPresetCreate(pr)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eef2ff';
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.color = '#4338ca';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.color = '#1e293b';
                        }}
                        title={pr.description}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pr.badgeColor }} />
                        <span>{pr.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 3: Interactive Permission Matrix Checklist Grid */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Granular Module Permission Matrix
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        Batch toggle permissions by category tabs, column headers, or row controls.
                      </p>
                    </div>

                    {/* Quick Permission Action Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectAllGlobal(setCreateForm, true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #10b981',
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(16, 185, 129, 0.1)'
                        }}
                        title="Select ALL permissions across all modules"
                      >
                        <CheckCircle2 size={13} />
                        <span>Select All (Full Access)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectReadOnly(setCreateForm)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#1e40af',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(59, 130, 246, 0.1)'
                        }}
                        title="Grant Read-Only (View) across all modules"
                      >
                        <Eye size={13} />
                        <span>Read Only (View All)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectReadWrite(setCreateForm)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #6366f1',
                          backgroundColor: '#eef2ff',
                          color: '#4338ca',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(99, 102, 241, 0.1)'
                        }}
                        title="Grant Read & Write (View, Create, Edit) across all modules"
                      >
                        <Edit2 size={13} />
                        <span>Read & Write</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectExecute(setCreateForm)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #8b5cf6',
                          backgroundColor: '#f5f3ff',
                          color: '#6d28d9',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(139, 92, 246, 0.1)'
                        }}
                        title="Grant Full Control (Read, Write, Delete & Adjust)"
                      >
                        <Sparkles size={13} />
                        <span>Execute / Full Control</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectAllGlobal(setCreateForm, false)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#64748b',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Deselect all permissions"
                      >
                        <X size={13} />
                        <span>Deselect All</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'center' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                          <th style={{ padding: '12px 14px', width: '60px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                            Sr. No.
                          </th>
                          <th style={{ padding: '12px 18px', textAlign: 'left', minWidth: '220px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                            Module
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(createForm.permissions, 'view')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(createForm.permissions, 'view'); }}
                                onChange={() => handleToggleColumnAll(setCreateForm, 'view')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                title="Toggle all View (Read) permissions"
                              />
                              <span>View</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(createForm.permissions, 'create')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(createForm.permissions, 'create'); }}
                                onChange={() => handleToggleColumnAll(setCreateForm, 'create')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                title="Toggle all Create (Write) permissions"
                              />
                              <span>Create</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(createForm.permissions, 'edit')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(createForm.permissions, 'edit'); }}
                                onChange={() => handleToggleColumnAll(setCreateForm, 'edit')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                title="Toggle all Edit (Write) permissions"
                              />
                              <span>Edit</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(createForm.permissions, 'delete')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(createForm.permissions, 'delete'); }}
                                onChange={() => handleToggleColumnAll(setCreateForm, 'delete')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ef4444' }}
                                title="Toggle all Delete permissions"
                              />
                              <span>Delete</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(createForm.permissions, 'adjust')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(createForm.permissions, 'adjust'); }}
                                onChange={() => handleToggleColumnAll(setCreateForm, 'adjust')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#8b5cf6' }}
                                title="Toggle all Adjust (Execute) permissions"
                              />
                              <span>Adjust</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 16px', textAlign: 'center', minWidth: '110px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isEntireMatrixAllChecked(createForm.permissions)}
                                ref={(el) => { if (el) el.indeterminate = isEntireMatrixSomeChecked(createForm.permissions); }}
                                onChange={() => handleToggleMasterMatrix(setCreateForm, createForm.permissions)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#059669' }}
                                title="Toggle ALL permissions across entire matrix"
                              />
                              <span>Select All</span>
                            </label>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULE_CONFIG.map((mod, idx) => {
                          const currentModPerms = createForm.permissions[mod.key] || {};
                          const allRowChecked = mod.actions.every((act) => Boolean(currentModPerms[act]));
                          const someRowChecked = mod.actions.some((act) => Boolean(currentModPerms[act]));

                          return (
                            <tr
                              key={mod.key}
                              style={{
                                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                              }}
                            >
                              {/* Sr. No. */}
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                                {idx + 1}
                              </td>

                              {/* Module Name & Icon */}
                              <td style={{ padding: '12px 18px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      backgroundColor: '#f1f5f9',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {getModuleIcon(mod.key)}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>
                                      {mod.label}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                      {mod.description}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* View */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('view') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.view)}
                                    onChange={() => handleTogglePerm(setCreateForm, mod.key, 'view')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              {/* Create */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('create') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.create)}
                                    onChange={() => handleTogglePerm(setCreateForm, mod.key, 'create')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              {/* Edit */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('edit') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.edit)}
                                    onChange={() => handleTogglePerm(setCreateForm, mod.key, 'edit')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              {/* Delete */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('delete') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.delete)}
                                    onChange={() => handleTogglePerm(setCreateForm, mod.key, 'delete')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              {/* Adjust (Inventory) */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('adjust') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.adjust)}
                                    onChange={() => handleTogglePerm(setCreateForm, mod.key, 'adjust')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#8b5cf6' }}
                                    title="Allow stock adjustments"
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              {/* Row Control: Select All */}
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={allRowChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someRowChecked && !allRowChecked;
                                  }}
                                  onChange={() => handleToggleRowAll(setCreateForm, mod, createForm.permissions)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                                  title="Toggle all permissions for this module"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '18px 28px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  backgroundColor: '#ffffff',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submittingCreate}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: submittingCreate ? 'not-allowed' : 'pointer',
                    opacity: submittingCreate ? 0.7 : 1,
                    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)',
                  }}
                >
                  <Check size={16} />
                  <span>{submittingCreate ? 'Creating Sub-Admin...' : 'Save & Create Sub-Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT SUB-ADMIN & PERMISSION MATRIX FORM                           */}
      {/* ========================================================================= */}
      {showEditModal && editUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '980px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '24px 28px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#ede9fe',
                    color: '#6b21a8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Edit2 size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    Edit User & Manage Permissions
                  </h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                    Editing: <strong style={{ color: '#0f172a' }}>{editUser.name}</strong> ({editUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="custom-modal-scroll" style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                {/* Profile Fields */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Profile & Role Settings
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Email (Read-only)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={editUser.email}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                          fontSize: '0.9rem',
                          cursor: 'not-allowed',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Assigned Role
                      </label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="ADMIN">ADMIN (Sub-Admin with RBAC)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (Full System Owner)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Presets for Edit */}
                <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                        ⚡ Quick Presets (1-Click Auto Fill):
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>
                        Replace current matrix with a standard preset.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, permissions: getDefaultPermissions() })}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      Clear All
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {PRESETS.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => handleApplyPresetEdit(pr)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eef2ff';
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.color = '#4338ca';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.color = '#1e293b';
                        }}
                        title={pr.description}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pr.badgeColor }} />
                        <span>{pr.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matrix Table for Edit */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Configured Module Permissions
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        Batch toggle permissions by category tabs, column headers, or row controls.
                      </p>
                    </div>

                    {/* Quick Permission Action Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectAllGlobal(setEditForm, true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #10b981',
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(16, 185, 129, 0.1)'
                        }}
                        title="Select ALL permissions across all modules"
                      >
                        <CheckCircle2 size={13} />
                        <span>Select All (Full Access)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectReadOnly(setEditForm)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#1e40af',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(59, 130, 246, 0.1)'
                        }}
                        title="Grant Read-Only (View) across all modules"
                      >
                        <Eye size={13} />
                        <span>Read Only (View All)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectReadWrite(setEditForm)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #6366f1',
                          backgroundColor: '#eef2ff',
                          color: '#4338ca',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(99, 102, 241, 0.1)'
                        }}
                        title="Grant Read & Write (View, Create, Edit) across all modules"
                      >
                        <Edit2 size={13} />
                        <span>Read & Write</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectExecute(setEditForm)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #8b5cf6',
                          backgroundColor: '#f5f3ff',
                          color: '#6d28d9',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(139, 92, 246, 0.1)'
                        }}
                        title="Grant Full Control (Read, Write, Delete & Adjust)"
                      >
                        <Sparkles size={13} />
                        <span>Execute / Full Control</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectAllGlobal(setEditForm, false)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#64748b',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Deselect all permissions"
                      >
                        <X size={13} />
                        <span>Deselect All</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'center' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                          <th style={{ padding: '12px 14px', width: '60px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                            Sr. No.
                          </th>
                          <th style={{ padding: '12px 18px', textAlign: 'left', minWidth: '220px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                            Module
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(editForm.permissions, 'view')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(editForm.permissions, 'view'); }}
                                onChange={() => handleToggleColumnAll(setEditForm, 'view')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                title="Toggle all View (Read) permissions"
                              />
                              <span>View</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(editForm.permissions, 'create')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(editForm.permissions, 'create'); }}
                                onChange={() => handleToggleColumnAll(setEditForm, 'create')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                title="Toggle all Create (Write) permissions"
                              />
                              <span>Create</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(editForm.permissions, 'edit')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(editForm.permissions, 'edit'); }}
                                onChange={() => handleToggleColumnAll(setEditForm, 'edit')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                title="Toggle all Edit (Write) permissions"
                              />
                              <span>Edit</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(editForm.permissions, 'delete')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(editForm.permissions, 'delete'); }}
                                onChange={() => handleToggleColumnAll(setEditForm, 'delete')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ef4444' }}
                                title="Toggle all Delete permissions"
                              />
                              <span>Delete</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', minWidth: '95px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isColumnAllChecked(editForm.permissions, 'adjust')}
                                ref={(el) => { if (el) el.indeterminate = isColumnSomeChecked(editForm.permissions, 'adjust'); }}
                                onChange={() => handleToggleColumnAll(setEditForm, 'adjust')}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#8b5cf6' }}
                                title="Toggle all Adjust (Execute) permissions"
                              />
                              <span>Adjust</span>
                            </label>
                          </th>
                          <th style={{ padding: '10px 16px', textAlign: 'center', minWidth: '110px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                              <input
                                type="checkbox"
                                checked={isEntireMatrixAllChecked(editForm.permissions)}
                                ref={(el) => { if (el) el.indeterminate = isEntireMatrixSomeChecked(editForm.permissions); }}
                                onChange={() => handleToggleMasterMatrix(setEditForm, editForm.permissions)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#059669' }}
                                title="Toggle ALL permissions across entire matrix"
                              />
                              <span>Select All</span>
                            </label>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULE_CONFIG.map((mod, idx) => {
                          const currentModPerms = editForm.permissions[mod.key] || {};
                          const allRowChecked = mod.actions.every((act) => Boolean(currentModPerms[act]));
                          const someRowChecked = mod.actions.some((act) => Boolean(currentModPerms[act]));

                          return (
                            <tr
                              key={mod.key}
                              style={{
                                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                              }}
                            >
                              {/* Sr. No. */}
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                                {idx + 1}
                              </td>

                              <td style={{ padding: '12px 18px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      backgroundColor: '#f1f5f9',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {getModuleIcon(mod.key)}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>
                                      {mod.label}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                      {mod.description}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('view') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.view)}
                                    onChange={() => handleTogglePerm(setEditForm, mod.key, 'view')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('create') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.create)}
                                    onChange={() => handleTogglePerm(setEditForm, mod.key, 'create')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('edit') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.edit)}
                                    onChange={() => handleTogglePerm(setEditForm, mod.key, 'edit')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('delete') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.delete)}
                                    onChange={() => handleTogglePerm(setEditForm, mod.key, 'delete')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {mod.actions.includes('adjust') ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentModPerms.adjust)}
                                    onChange={() => handleTogglePerm(setEditForm, mod.key, 'adjust')}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#8b5cf6' }}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>

                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={allRowChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someRowChecked && !allRowChecked;
                                  }}
                                  onChange={() => handleToggleRowAll(setEditForm, mod, editForm.permissions)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '18px 28px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  backgroundColor: '#ffffff',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={submittingEdit}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: submittingEdit ? 'not-allowed' : 'pointer',
                    opacity: submittingEdit ? 0.7 : 1,
                    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)',
                  }}
                >
                  <Check size={16} />
                  <span>{submittingEdit ? 'Saving Changes...' : 'Save & Update Permissions'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD MODAL                                              */}
      {/* ========================================================================= */}
      {showResetModal && resetTargetUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <KeyRound size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                  Reset User Password
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  For: <strong>{resetTargetUser.name}</strong> ({resetTargetUser.email})
                </p>
              </div>
            </div>

            <form onSubmit={handleResetSubmit}>
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    New Password (min 6 characters)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={submittingReset}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: submittingReset ? 'not-allowed' : 'pointer',
                    opacity: submittingReset ? 0.7 : 1,
                  }}
                >
                  {submittingReset ? 'Resetting...' : 'Confirm Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TOGGLE STATUS CONFIRMATION                                        */}
      {/* ========================================================================= */}
      {showStatusModal && statusTargetUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              padding: '28px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: (statusTargetUser.status || 'Active').toLowerCase() === 'active' ? '#fee2e2' : '#dcfce7',
                color: (statusTargetUser.status || 'Active').toLowerCase() === 'active' ? '#dc2626' : '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Power size={28} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
              {(statusTargetUser.status || 'Active').toLowerCase() === 'active'
                ? 'Deactivate User Account?'
                : 'Activate User Account?'}
            </h3>

            <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#64748b', lineHeight: '1.45' }}>
              {(statusTargetUser.status || 'Active').toLowerCase() === 'active' ? (
                <>
                  Are you sure you want to deactivate <strong>{statusTargetUser.name}</strong>? This user will be barred from signing in until re-activated.
                </>
              ) : (
                <>
                  Are you sure you want to restore and activate <strong>{statusTargetUser.name}</strong>?
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                disabled={submittingStatus}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusToggle}
                disabled={submittingStatus}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor:
                    (statusTargetUser.status || 'Active').toLowerCase() === 'active' ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: submittingStatus ? 'not-allowed' : 'pointer',
                  opacity: submittingStatus ? 0.7 : 1,
                }}
              >
                {submittingStatus
                  ? 'Updating...'
                  : (statusTargetUser.status || 'Active').toLowerCase() === 'active'
                    ? 'Yes, Deactivate'
                    : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Logout Confirmation */}
      {forceLogoutTargetUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="force-logout-title"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '28px',
              textAlign: 'center',
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <LogOut size={26} />
            </div>
            <h3 id="force-logout-title" style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
              Force Logout User
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to terminate all active sessions for <strong>{forceLogoutTargetUser.name || 'this user'}</strong>? They will be immediately logged out and must sign in again.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setForceLogoutTargetUser(null)}
                disabled={submittingForceLogout}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.88rem', fontWeight: '600', cursor: submittingForceLogout ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForceLogout}
                disabled={submittingForceLogout}
                style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontSize: '0.88rem', fontWeight: '700', cursor: submittingForceLogout ? 'not-allowed' : 'pointer', opacity: submittingForceLogout ? 0.7 : 1 }}
              >
                {submittingForceLogout ? 'Logging Out...' : 'Confirm Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: FULL PERMISSION MATRIX DETAIL VIEWER                              */}
      {/* ========================================================================= */}
      {showPermDetailModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                  Permissions for {showPermDetailModal.name}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {showPermDetailModal.email} &bull; {showPermDetailModal.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPermDetailModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="custom-modal-scroll" style={{ padding: '20px 24px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {MODULE_CONFIG.map((m) => {
                  const modPerms = showPermDetailModal.permissions?.[m.key] || {};
                  const activeActions = Object.entries(modPerms)
                    .filter(([_, val]) => Boolean(val))
                    .map(([act]) => act);

                  return (
                    <div
                      key={m.key}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: activeActions.length > 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {getModuleIcon(m.key)}
                        <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>{m.label}</span>
                      </div>
                      {activeActions.length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No access</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {activeActions.map((act) => (
                            <span
                              key={act}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                backgroundColor: act === 'delete' ? '#fee2e2' : act === 'adjust' ? '#ede9fe' : '#e0e7ff',
                                color: act === 'delete' ? '#dc2626' : act === 'adjust' ? '#6b21a8' : '#4338ca',
                                textTransform: 'uppercase',
                              }}
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowPermDetailModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
