import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import LogoutModal from './LogoutModal';
import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, User, Shield, Settings, Users, Bell, CheckSquare, Clock, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/users': 'User Management',
  '/tasks': 'Task Management',
  '/approvals': 'Approval Queue',
  '/admin/approvals': 'Approval Queue',
  '/my-approvals': 'My Approvals',
  '/products': 'Elements & Products',
  '/companies': 'Companies',
  '/brands': 'Brands',
  '/purchases': 'Purchase Orders',
  '/sales': 'Sales Orders',
  '/customers': 'Customers',
  '/inventory': 'Inventory & Valuation',
  '/warehouses': 'Warehouses',
  '/settings': 'System Settings',
  '/expenses': 'Expenses',
  '/occasions': 'Occasions',
  '/racking': 'Racking & Storage',
  '/groups': 'Groups',
  '/countries': 'Countries',
  '/customs': 'Customs',
  '/product-types': 'Product Types',
  '/aliases': 'Aliases',
  '/activity-logs': 'Activity Logs'
};

const Layout = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [taskStats, setTaskStats] = useState({ pending: 0, overdue: 0, my_pending: 0 });
  const [recentTasks, setRecentTasks] = useState([]);

  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const taskDropdownRef = useRef(null);
  const roleTitle = (user?.role || user?.user_role || '').toUpperCase().replace(/[^A-Z]/g, '') === 'SUPERADMIN' || user?.is_super_admin === true || user?.isSuperAdmin === true
    ? 'Super Admin'
    : 'Admin';

  useEffect(() => {
    document.title = `${roleTitle} | Inventory OS`;
  }, [roleTitle]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(e.target)) {
        setIsTaskDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch task stats & recent tasks for topbar
  const fetchTaskSummary = async () => {
    if (!hasPermission('tasks', 'view')) return;
    try {
      const [statsRes, tasksRes] = await Promise.all([
        api.get('/tasks/stats'),
        api.get('/tasks', { params: { status: 'PENDING', limit: 4 } })
      ]);
      if (statsRes.data?.success && statsRes.data?.stats) {
        setTaskStats(statsRes.data.stats);
      }
      if (tasksRes.data?.success && tasksRes.data?.data) {
        setRecentTasks(tasksRes.data.data);
      }
    } catch {
      // Ignore background fetch error
    }
  };

  const handleTaskSummaryUpdate = () => fetchTaskSummary();

  useEffect(() => {
    fetchTaskSummary();
    const handleFocus = () => fetchTaskSummary();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('tasks:updated', handleTaskSummaryUpdate);

    const interval = setInterval(fetchTaskSummary, 30000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('tasks:updated', handleTaskSummaryUpdate);
      clearInterval(interval);
    };
  }, [hasPermission]);

  const handleQuickCompleteTask = async (taskId, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: 'COMPLETED' });
      setRecentTasks((prev) => prev.filter((t) => t.id !== taskId));
      fetchTaskSummary();
      window.dispatchEvent(new CustomEvent('tasks:updated'));
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

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
      setIsDropdownOpen(false);
    }
  };

  const userInitial = (user?.name || user?.username || 'A')[0].toUpperCase();
  const displayName = user?.name || user?.username || 'Admin User';
  const displayEmail = user?.email || 'admin@inventory.com';
  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role || 'Admin';

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <header
          className="topbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 40,
            height: '50px',
            padding: '0 20px'
          }}
        >
          {/* Left: Active Section / Breadcrumb Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b', letterSpacing: '-0.01em' }}>
              {ROUTE_TITLES[location.pathname] || (
                location.pathname.startsWith('/products/') ? 'Product Details' :
                location.pathname.startsWith('/purchases/') ? 'Purchase Details' :
                location.pathname.startsWith('/customers/') ? 'Customer Details' :
                location.pathname.startsWith('/sales/') ? 'Sales Order' :
                location.pathname.startsWith('/groups/') ? 'Group Details' :
                'Inventory OS'
              )}
            </span>
          </div>

          {/* Right: Actions & User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Task & Activity Bell Dropdown */}
            {hasPermission('tasks', 'view') && (
              <div style={{ position: 'relative' }} ref={taskDropdownRef}>
                <button
                  type="button"
                onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: isTaskDropdownOpen ? '#e0e7ff' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: isTaskDropdownOpen ? '#4f46e5' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Tasks & Activities"
              >
                <Bell size={18} />
                {(taskStats.my_pending > 0 || taskStats.pending > 0) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: taskStats.overdue > 0 ? '#ef4444' : '#6366f1',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      boxShadow: '0 0 6px rgba(99, 102, 241, 0.4)'
                    }}
                  >
                    {taskStats.my_pending || taskStats.pending}
                  </span>
                )}
              </button>

              {/* Task Dropdown Menu */}
              {isTaskDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '340px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0',
                    zIndex: 100,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckSquare size={16} color="#4f46e5" />
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>
                        Tasks & Activities
                      </span>
                    </div>
                    <Link
                      to="/tasks"
                      onClick={() => setIsTaskDropdownOpen(false)}
                      style={{ fontSize: '0.78rem', color: '#4f46e5', textDecoration: 'none', fontWeight: '600' }}
                    >
                      View All
                    </Link>
                  </div>

                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {recentTasks.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                        No pending tasks! All caught up.
                      </div>
                    ) : (
                      recentTasks.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '8px',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: t.priority === 'URGENT' ? '#fef2f2' : '#f1f5f9',
                                color: t.priority === 'URGENT' ? '#ef4444' : '#475569'
                              }}>
                                {t.priority}
                              </span>
                              <span style={{
                                fontSize: '0.82rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {t.title}
                              </span>
                            </div>
                            {t.due_date && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={11} />
                                <span>Due: {t.due_date}</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleQuickCompleteTask(t.id, e)}
                            style={{
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              padding: '4px 6px',
                              cursor: 'pointer',
                              color: '#16a34a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              flexShrink: 0
                            }}
                            title="Mark Done"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    textAlign: 'center'
                  }}>
                    <Link
                      to="/tasks"
                      onClick={() => setIsTaskDropdownOpen(false)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '6px 0',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#4f46e5',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#eef2ff'
                      }}
                    >
                      Open Task Board &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Profile Dropdown Trigger */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: isDropdownOpen ? '#f1f5f9' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '10px',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!isDropdownOpen) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isDropdownOpen) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Avatar Initial Circle */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {userInitial}
                </div>

                {/* Name & Role Text */}
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.88rem', color: '#0f172a', lineHeight: '1.2' }}>
                    {displayName}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {roleLabel}
                  </span>
                </div>

                <ChevronDown
                  size={16}
                  style={{
                    color: '#64748b',
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '240px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease'
                  }}
                >
                  {/* User summary */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
                      {displayEmail}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: user?.role === 'SUPER_ADMIN' ? '#ede9fe' : '#e0e7ff',
                          color: user?.role === 'SUPER_ADMIN' ? '#6d28d9' : '#3730a3'
                        }}
                      >
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links (If Super Admin) */}
                  {user?.role === 'SUPER_ADMIN' && (
                    <div style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <Link
                        to="/users"
                        onClick={() => setIsDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 16px',
                          color: '#334155',
                          textDecoration: 'none',
                          fontSize: '0.86rem',
                          fontWeight: '500',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Users size={16} color="#6366f1" />
                        <span>User Management</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 16px',
                          color: '#334155',
                          textDecoration: 'none',
                          fontSize: '0.86rem',
                          fontWeight: '500',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Settings size={16} color="#6366f1" />
                        <span>Settings</span>
                      </Link>
                    </div>
                  )}

                  {/* Logout Item */}
                  <div style={{ padding: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setShowLogoutModal(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontWeight: '600',
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <LogOut size={16} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        loading={loggingOut}
      />
    </div>
  );
};

export default Layout;
