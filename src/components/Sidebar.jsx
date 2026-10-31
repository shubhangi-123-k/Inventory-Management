import { useState, useEffect } from 'react';
import { NavLink as RouterNavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import LogoutModal from './LogoutModal';
import { 
  Users as UsersIcon, 
  LayoutDashboard, 
  Package, 
  LogOut, 
  Tags, 
  Home, 
  Globe, 
  Shield, 
  Folder, 
  FileText, 
  Briefcase, 
  ShoppingCart, 
  Users, 
  Sparkles,
  Activity,
  Boxes,
  Receipt,
  Tag,
  ClipboardCheck,
  ListTodo,
  SlidersHorizontal,
  ChevronDown,
  Scale,
  CheckSquare,
  Layers
} from 'lucide-react';

const isRoleSuperAdmin = (user) => {
  const role = String(user?.role || user?.user_role || '').toUpperCase().replace(/[^A-Z]/g, '');
  return role === 'SUPERADMIN' || user?.is_super_admin === true || user?.isSuperAdmin === true;
};

const NavLink = ({ to, ...props }) => {
  const { user } = useAuth();
  const rolePrefix = isRoleSuperAdmin(user) ? 'superadmin' : 'admin';
  const normalizedTo = to.replace(/^\/(admin|superadmin)(?=\/|$)/, '') || '/';
  const destination = normalizedTo === '/' ? `/${rolePrefix}` : `/${rolePrefix}${normalizedTo}`;
  return <RouterNavLink to={destination} {...props} />;
};

const Sidebar = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const normalizedPathname = location.pathname.replace(/^\/(admin|superadmin)(?=\/|$)/, '') || '/';

  const isSuperAdmin = isRoleSuperAdmin(user);

  // Grouped Master Routes (excluding Companies and Brands which are top-level)
  const masterRoutes = [
    { path: '/racking', label: 'Rack & Bin Master', icon: <Layers size={16} />, permission: hasPermission('warehouses', 'view') || hasPermission('inventory', 'view') || isSuperAdmin },
    { path: '/product-types', label: 'Product Types', icon: <Boxes size={16} />, permission: hasPermission('product_types', 'view') },
    { path: '/groups', label: 'Groups', icon: <Folder size={16} />, permission: hasPermission('groups', 'view') },
    { path: '/aliases', label: 'Alias Master', icon: <Tag size={16} />, permission: hasPermission('aliases', 'view') },
    { path: '/occasions', label: 'Occasions', icon: <Sparkles size={16} />, permission: hasPermission('occasions', 'view') },
    { path: '/expenses', label: 'Expense Master', icon: <Receipt size={16} />, permission: hasPermission('purchase_orders', 'view') || isSuperAdmin },
    { path: '/countries', label: 'Countries', icon: <Globe size={16} />, permission: hasPermission('warehouses', 'view') || isSuperAdmin },
    { path: '/customs', label: 'Customs/Tariffs', icon: <Shield size={16} />, permission: hasPermission('warehouses', 'view') || isSuperAdmin },
  ];

  const visibleMasterRoutes = masterRoutes.filter((r) => r.permission);
  const isAnyMasterActive = masterRoutes.some((r) => normalizedPathname === r.path || normalizedPathname.startsWith(`${r.path}/`));
  const [isMastersOpen, setIsMastersOpen] = useState(() => isAnyMasterActive);

  // Auto-expand Masters submenu when visiting any master path
  useEffect(() => {
    if (isAnyMasterActive) {
      setIsMastersOpen(true);
    }
  }, [normalizedPathname, isAnyMasterActive]);

  // Real-Time Approval Queue Stats Polling and Window Focus Refresh
  useEffect(() => {
    if (!isSuperAdmin) return;

    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const res = await api.get('/admin/approval-requests/stats');
        if (isMounted && res.data?.success && res.data?.stats) {
          setPendingApprovalsCount(Number(res.data.stats.pending) || 0);
        }
      } catch (err) {
        // Silently retain current count if request fails
      }
    };

    fetchPendingCount();

    const handleFocus = () => fetchPendingCount();
    window.addEventListener('focus', handleFocus);

    const handleStatsUpdate = () => fetchPendingCount();
    window.addEventListener('approval:stats_updated', handleStatsUpdate);

    const interval = setInterval(fetchPendingCount, 30000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('approval:stats_updated', handleStatsUpdate);
      clearInterval(interval);
    };
  }, [isSuperAdmin]);

  // Real-Time Task Queue Stats Polling and Window Focus Refresh
  useEffect(() => {
    let isMounted = true;
    const fetchTasksCount = async () => {
      if (!hasPermission('tasks', 'view')) return;
      try {
        const res = await api.get('/tasks/stats');
        if (isMounted && res.data?.success && res.data?.stats) {
          setPendingTasksCount(Number(res.data.stats.my_pending || res.data.stats.pending) || 0);
        }
      } catch (err) {
        // Silently retain current count
      }
    };

    fetchTasksCount();

    const handleFocus = () => fetchTasksCount();
    window.addEventListener('focus', handleFocus);

    const handleTasksUpdate = () => fetchTasksCount();
    window.addEventListener('tasks:updated', handleTasksUpdate);

    const interval = setInterval(fetchTasksCount, 30000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('tasks:updated', handleTasksUpdate);
      clearInterval(interval);
    };
  }, [hasPermission]);

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
      navigate('/login');
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const userInitial = (user?.name || user?.username || 'A')[0].toUpperCase();
  const displayName = user?.name || user?.username || 'Admin User';
  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role || 'Admin';

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <Package color="var(--primary)" size={28} />
          <span>Inventory OS</span>
        </div>

        <nav className="sidebar-nav">
          {hasPermission('dashboard', 'view') && (
            <NavLink
              to="/"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          )}

          {user?.role === 'SUPER_ADMIN' && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <UsersIcon size={20} />
              <span>User Management</span>
            </NavLink>
          )}

          {/* Universal Task & Activity Hub */}
          {hasPermission('tasks', 'view') && (
            <NavLink
              to="/tasks"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <CheckSquare size={20} />
              <span style={{ flex: 1 }}>Task Management</span>
              {pendingTasksCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    boxShadow: '0 0 8px rgba(99, 102, 241, 0.45)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1.2
                  }}
                  title={`${pendingTasksCount} pending tasks`}
                >
                  {pendingTasksCount}
                </span>
              )}
            </NavLink>
          )}

          {/* Super Admin Approval Queue with Live Badge */}
          {user?.role === 'SUPER_ADMIN' && (
            <NavLink
              to="/admin/approvals"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ClipboardCheck size={20} />
              <span style={{ flex: 1 }}>Approval Queue</span>
              {pendingApprovalsCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.45)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1.2
                  }}
                  title={`${pendingApprovalsCount} pending change requests awaiting review`}
                >
                  {pendingApprovalsCount}
                </span>
              )}
            </NavLink>
          )}

          {/* Sub-Admin My Submissions */}
          {user?.role !== 'SUPER_ADMIN' && (
            <NavLink
              to="/my-approvals"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ListTodo size={20} />
              <span>My Submissions</span>
            </NavLink>
          )}


          {hasPermission('products', 'view') && (
            <NavLink
              to="/products"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Package size={20} />
              <span>Elements</span>
            </NavLink>
          )}

          {hasPermission('companies', 'view') && (
            <NavLink
              to="/companies"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Briefcase size={20} />
              <span>Companies</span>
            </NavLink>
          )}

          {hasPermission('brands', 'view') && (
            <NavLink
              to="/brands"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Tags size={20} />
              <span>Brands</span>
            </NavLink>
          )}

          {/* CONSOLIDATED MASTERS TAB (ALL MASTER TABS INSIDE) */}
          {visibleMasterRoutes.length > 0 && (
            <div style={{ marginBottom: '2px' }}>
              <button
                type="button"
                onClick={() => setIsMastersOpen(!isMastersOpen)}
                className={`nav-item nav-parent-item ${isAnyMasterActive ? 'has-active-child' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  cursor: 'pointer',
                  borderLeft: isAnyMasterActive ? '4px solid var(--primary)' : '4px solid transparent'
                }}
                title="Masters"
              >
                <SlidersHorizontal size={20} color={isAnyMasterActive ? 'var(--primary)' : 'currentColor'} />
                <span style={{ flex: 1, fontWeight: isAnyMasterActive ? '700' : '600' }}>Masters</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isMastersOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s ease',
                    opacity: 0.75
                  }}
                >
                  <ChevronDown size={16} />
                </span>
              </button>

              {isMastersOpen && (
                <div className="nav-sub-menu">
                  {visibleMasterRoutes.map((route) => (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      className={({ isActive }) => `nav-sub-item ${isActive ? 'active' : ''}`}
                    >
                      {route.icon}
                      <span>{route.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasPermission('purchase_orders', 'view') && (
            <NavLink
              to="/purchases"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <FileText size={20} />
              <span>Purchases</span>
            </NavLink>
          )}

          {hasPermission('sales_orders', 'view') && (
            <NavLink
              to="/sales"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ShoppingCart size={20} />
              <span>Sales</span>
            </NavLink>
          )}

          {hasPermission('customers', 'view') && (
            <NavLink
              to="/customers"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={20} />
              <span>Customers</span>
            </NavLink>
          )}

          {hasPermission('inventory', 'view') && (
            <NavLink
              to="/inventory"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Boxes size={20} />
              <span>Stock & Reorders</span>
            </NavLink>
          )}

          {hasPermission('inventory', 'view') && (
            <NavLink
              to="/inventory/gap-analysis"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Scale size={20} />
              <span>Gap Analysis</span>
            </NavLink>
          )}

          {hasPermission('warehouses', 'view') && (
            <NavLink
              to="/warehouses"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Home size={20} />
              <span>Warehouses</span>
            </NavLink>
          )}





          {hasPermission('activity_logs', 'view') && (
            <NavLink
              to="/activity-logs"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Activity size={20} />
              <span>Activity Logs</span>
            </NavLink>
          )}
        </nav>

        {/* Pinned Sticky Footer with User Profile and Logout */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.9rem',
                flexShrink: 0
              }}
            >
              {userInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={displayName}
              >
                {displayName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {roleLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
              e.currentTarget.style.color = '#f87171';
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        loading={loggingOut}
      />
    </>
  );
};

export default Sidebar;
