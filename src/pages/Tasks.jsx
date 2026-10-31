import { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Calendar, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  ExternalLink,
  X,
  Package
} from 'lucide-react';
import { 
  getTasks, 
  getTaskStats, 
  getAssignees, 
  createTask, 
  updateTask, 
  updateTaskStatus, 
  deleteTask 
} from '../api/taskApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const TASK_TYPES = [
  { value: 'GENERAL', label: 'General To-Do', color: '#64748b', bg: '#f1f5f9' },
  { value: 'RESTOCK', label: 'Restock Alert', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'APPROVAL', label: 'Approval Required', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'INSPECTION', label: 'QC & Inspection', color: '#06b6d4', bg: '#cffafe' },
  { value: 'FOLLOW_UP', label: 'Vendor Follow-Up', color: '#3b82f6', bg: '#dbeafe' },
  { value: 'TODO', label: 'Operational To-Do', color: '#10b981', bg: '#d1fae5' }
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#64748b', bg: '#f1f5f9' },
  { value: 'MEDIUM', label: 'Medium', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'HIGH', label: 'High', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'URGENT', label: 'Urgent', color: '#ef4444', bg: '#fef2f2' }
];

export default function Tasks() {
  const { user, hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  const canCreate = hasPermission('tasks', 'create');
  const canEdit = hasPermission('tasks', 'edit');
  const canDelete = hasPermission('tasks', 'delete');

  const currentUserId = user?.id || user?.userId;
  const canUpdateTaskStatus = (task) => {
    if (canEdit) return true;
    if (!task || !currentUserId) return false;
    return task.assigned_to && Number(task.assigned_to) === Number(currentUserId);
  };

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    urgent: 0,
    overdue: 0,
    my_pending: 0
  });
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Controls
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my' | 'restock' | 'approvals' | 'overdue'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'GENERAL',
    priority: 'MEDIUM',
    status: 'PENDING',
    due_date: '',
    assigned_to: '',
    entity_type: '',
    entity_id: ''
  });

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [tasksRes, statsRes, assigneesRes] = await Promise.all([
        getTasks({ limit: 100 }),
        getTaskStats(),
        getAssignees()
      ]);

      if (tasksRes?.success) setTasks(tasksRes.data || []);
      if (statsRes?.success) setStats(statsRes.stats || {});
      if (assigneesRes?.success) setAssignees(assigneesRes.assignees || []);
    } catch (err) {
      console.error('Error fetching task data:', err);
      showError('Failed to load tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const currentUserId = user?.id || user?.userId;

    return tasks.filter((t) => {
      // Tab filter
      if (activeTab === 'my') {
        const isMyTask = t.assigned_to === currentUserId || (!t.assigned_to && t.status !== 'COMPLETED');
        if (!isMyTask) return false;
      } else if (activeTab === 'restock') {
        if (t.task_type !== 'RESTOCK') return false;
      } else if (activeTab === 'approvals') {
        if (t.task_type !== 'APPROVAL') return false;
      } else if (activeTab === 'overdue') {
        const isOverdue = t.due_date && t.due_date < today && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
        if (!isOverdue) return false;
      }

      // Priority filter
      if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false;

      // Type filter
      if (selectedType !== 'ALL' && t.task_type !== selectedType) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchEntity = t.entity_type?.toLowerCase().includes(q) || String(t.entity_id || '').includes(q);
        const matchAssignee = t.assignee?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchEntity && !matchAssignee) return false;
      }

      return true;
    });
  }, [tasks, activeTab, selectedPriority, selectedType, searchQuery, user]);

  // Grouped for Kanban
  const kanbanColumns = useMemo(() => {
    return {
      PENDING: filteredTasks.filter((t) => t.status === 'PENDING'),
      IN_PROGRESS: filteredTasks.filter((t) => t.status === 'IN_PROGRESS'),
      COMPLETED: filteredTasks.filter((t) => t.status === 'COMPLETED')
    };
  }, [filteredTasks]);

  // Handle Quick Status Transition
  const handleStatusChange = async (taskId, newStatus) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!canUpdateTaskStatus(targetTask)) {
      showError('You can only update the status of tasks assigned to you or if you have task edit permission');
      return;
    }
    try {
      const res = await updateTaskStatus(taskId, newStatus);
      if (res?.success) {
        showSuccess(`Task moved to ${newStatus.replace('_', ' ')}`);
        // Optimistic local update
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        // Refresh stats
        getTaskStats().then((s) => s?.success && setStats(s.stats));
        // Broadcast badge update
        window.dispatchEvent(new CustomEvent('tasks:updated'));
      }
    } catch (err) {
      showError('Failed to update task status');
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    if (!canCreate) {
      showError('You do not have permission to create tasks');
      return;
    }
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      task_type: 'GENERAL',
      priority: 'MEDIUM',
      status: 'PENDING',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assigned_to: '',
      entity_type: '',
      entity_id: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (task) => {
    if (!canEdit) {
      showError('You do not have permission to edit tasks');
      return;
    }
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      task_type: task.task_type || 'GENERAL',
      priority: task.priority || 'MEDIUM',
      status: task.status || 'PENDING',
      due_date: task.due_date || '',
      assigned_to: task.assigned_to ? String(task.assigned_to) : '',
      entity_type: task.entity_type || '',
      entity_id: task.entity_id || ''
    });
    setIsModalOpen(true);
  };

  // Submit Modal
  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showError('Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      if (editingTask) {
        const res = await updateTask(editingTask.id, formData);
        if (res?.success) {
          showSuccess('Task updated successfully');
          setIsModalOpen(false);
          fetchData();
        }
      } else {
        const res = await createTask(formData);
        if (res?.success) {
          showSuccess('Task created successfully');
          setIsModalOpen(false);
          fetchData();
        }
      }
      window.dispatchEvent(new CustomEvent('tasks:updated'));
    } catch (err) {
      showError('Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!canDelete) {
      showError('You do not have permission to delete tasks');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await deleteTask(taskId);
      if (res?.success) {
        showSuccess('Task deleted');
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        getTaskStats().then((s) => s?.success && setStats(s.stats));
        window.dispatchEvent(new CustomEvent('tasks:updated'));
      }
    } catch (err) {
      showError('Failed to delete task');
    }
  };

  const getEntityLink = (entityType, entityId) => {
    if (!entityType || !entityId) return null;
    const type = entityType.toUpperCase();
    if (type === 'PRODUCT') return `/products/${entityId}`;
    if (type === 'PURCHASE_ORDER') return `/purchases/${entityId}`;
    if (type === 'APPROVAL') return `/admin/approvals`;
    if (type === 'SALES_ORDER') return `/sales/${entityId}`;
    if (type === 'WAREHOUSE') return `/warehouses`;
    return null;
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'COMPLETED' || status === 'CANCELLED') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  return (
    <div style={{ padding: '0 0 24px 0', maxWidth: '1600px', margin: '0 auto' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Task & Activity Hub
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Universal to-dos, low-stock restock triggers, and maker-checker approval assignments.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={fetchData}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.15s'
            }}
            title="Refresh tasks"
          >
            <RefreshCw size={16} className={refreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={handleOpenCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                transition: 'background-color 0.15s'
              }}
            >
              <Plus size={18} />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CARD HOVER ANIMATIONS ── */}
      <style>{`
        .task-kpi-card {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease !important;
          will-change: transform, box-shadow;
          cursor: pointer;
        }
        .task-kpi-card:hover {
          transform: translateY(-5px) !important;
        }
        .task-kpi-total:hover {
          border-color: #818cf8 !important;
          box-shadow: 0 12px 24px -4px rgba(79, 70, 229, 0.2), 0 4px 8px -2px rgba(79, 70, 229, 0.08) !important;
        }
        .task-kpi-pending:hover {
          border-color: #f59e0b !important;
          box-shadow: 0 12px 24px -4px rgba(245, 158, 11, 0.25), 0 4px 8px -2px rgba(245, 158, 11, 0.08) !important;
        }
        .task-kpi-progress:hover {
          border-color: #0ea5e9 !important;
          box-shadow: 0 12px 24px -4px rgba(2, 132, 199, 0.25), 0 4px 8px -2px rgba(2, 132, 199, 0.08) !important;
        }
        .task-kpi-completed:hover {
          border-color: #10b981 !important;
          box-shadow: 0 12px 24px -4px rgba(16, 185, 129, 0.25), 0 4px 8px -2px rgba(16, 185, 129, 0.08) !important;
        }
        .task-kpi-overdue:hover {
          border-color: #ef4444 !important;
          box-shadow: 0 12px 24px -4px rgba(239, 68, 68, 0.25), 0 4px 8px -2px rgba(239, 68, 68, 0.08) !important;
        }
      `}</style>

      {/* 2. KPI Metrics Bar - Sleek & Compact Design */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Total Tasks */}
        <div
          className="task-kpi-card task-kpi-total"
          onClick={() => { setActiveTab('all'); }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            padding: '10px 14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#eef2ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckSquare size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
              Total Tasks
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1, marginTop: '2px' }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Pending Action */}
        <div 
          className="task-kpi-card task-kpi-pending"
          onClick={() => { setActiveTab('all'); }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            padding: '10px 14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
              Pending Action
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#b45309', lineHeight: 1.1, marginTop: '2px' }}>
              {stats.pending}
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div
          className="task-kpi-card task-kpi-progress"
          onClick={() => { setActiveTab('all'); }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            padding: '10px 14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Flame size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
              In Progress
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0369a1', lineHeight: 1.1, marginTop: '2px' }}>
              {stats.in_progress}
            </div>
          </div>
        </div>

        {/* Completed */}
        <div
          className="task-kpi-card task-kpi-completed"
          onClick={() => { setActiveTab('all'); }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            padding: '10px 14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
              Completed
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#047857', lineHeight: 1.1, marginTop: '2px' }}>
              {stats.completed}
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div 
          className="task-kpi-card task-kpi-overdue"
          onClick={() => setActiveTab('overdue')}
          style={{
            backgroundColor: stats.overdue > 0 ? '#fff1f2' : '#ffffff',
            borderRadius: '10px',
            padding: '10px 14px',
            border: stats.overdue > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: stats.overdue > 0 ? '#ffe4e6' : '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
              Overdue
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#b91c1c', lineHeight: 1.1, marginTop: '2px' }}>
              {stats.overdue}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        padding: '12px 18px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0'
      }}>
        {/* Left Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Tasks' },
            { id: 'my', label: `My Tasks (${stats.my_pending})` },
            { id: 'restock', label: 'Restock Alerts' },
            { id: 'approvals', label: 'Approvals' },
            { id: 'overdue', label: `Overdue (${stats.overdue})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: activeTab === tab.id ? '600' : '500',
                backgroundColor: activeTab === tab.id ? '#4f46e5' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Search & Selects */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                fontSize: '0.84rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none'
              }}
            />
          </div>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              padding: '7px 10px',
              fontSize: '0.84rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">🔥 Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '7px 10px',
              fontSize: '0.84rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="ALL">All Types</option>
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* View Toggle */}
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '6px 10px',
                border: 'none',
                backgroundColor: viewMode === 'kanban' ? '#f1f5f9' : '#ffffff',
                color: viewMode === 'kanban' ? '#4f46e5' : '#64748b',
                cursor: 'pointer'
              }}
              title="Kanban Board View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 10px',
                border: 'none',
                backgroundColor: viewMode === 'list' ? '#f1f5f9' : '#ffffff',
                color: viewMode === 'list' ? '#4f46e5' : '#64748b',
                cursor: 'pointer'
              }}
              title="Table List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Body: Kanban View or List View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw size={28} className="spin-animation" style={{ margin: '0 auto 12px auto' }} />
          <div>Loading tasks and activities...</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <CheckSquare size={48} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 6px 0' }}>
            No tasks found
          </h3>
          <p style={{ fontSize: '0.875rem', margin: '0 0 16px 0' }}>
            {searchQuery || activeTab !== 'all' ? 'Try adjusting your filters or search query.' : 'Get started by creating your first task.'}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={handleOpenCreate}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              + Create New Task
            </button>
          )}
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}>
          {/* Column: PENDING */}
          <KanbanColumn
            title="To Do / Pending"
            count={kanbanColumns.PENDING.length}
            tasks={kanbanColumns.PENDING}
            color="#f59e0b"
            bg="#fffbeb"
            canUpdateTaskStatus={canUpdateTaskStatus}
            onMoveForward={(id) => handleStatusChange(id, 'IN_PROGRESS')}
            onComplete={(id) => handleStatusChange(id, 'COMPLETED')}
            onEdit={canEdit ? handleOpenEdit : null}
            onDelete={canDelete ? handleDeleteTask : null}
            getEntityLink={getEntityLink}
            isOverdue={isOverdue}
          />

          {/* Column: IN_PROGRESS */}
          <KanbanColumn
            title="In Progress"
            count={kanbanColumns.IN_PROGRESS.length}
            tasks={kanbanColumns.IN_PROGRESS}
            color="#0284c7"
            bg="#f0f9ff"
            canUpdateTaskStatus={canUpdateTaskStatus}
            onMoveBack={(id) => handleStatusChange(id, 'PENDING')}
            onMoveForward={(id) => handleStatusChange(id, 'COMPLETED')}
            onComplete={(id) => handleStatusChange(id, 'COMPLETED')}
            onEdit={canEdit ? handleOpenEdit : null}
            onDelete={canDelete ? handleDeleteTask : null}
            getEntityLink={getEntityLink}
            isOverdue={isOverdue}
          />

          {/* Column: COMPLETED */}
          <KanbanColumn
            title="Completed"
            count={kanbanColumns.COMPLETED.length}
            tasks={kanbanColumns.COMPLETED}
            color="#10b981"
            bg="#f0fdf4"
            canUpdateTaskStatus={canUpdateTaskStatus}
            onMoveBack={(id) => handleStatusChange(id, 'IN_PROGRESS')}
            onEdit={canEdit ? handleOpenEdit : null}
            onDelete={canDelete ? handleDeleteTask : null}
            getEntityLink={getEntityLink}
            isOverdue={isOverdue}
          />
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <div className="custom-scroll-x" style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <table style={{ width: '100%', minWidth: '1350px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 16px', width: '50px' }}>Done</th>
                <th style={{ padding: '12px 16px' }}>Task Title & Type</th>
                <th style={{ padding: '12px 16px' }}>Priority</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Assignee</th>
                <th style={{ padding: '12px 16px' }}>Due Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => {
                const overdue = isOverdue(t.due_date, t.status);
                const typeObj = TASK_TYPES.find((x) => x.value === t.task_type) || TASK_TYPES[0];
                const priorityObj = PRIORITIES.find((x) => x.value === t.priority) || PRIORITIES[1];
                const entityUrl = getEntityLink(t.entity_type, t.entity_id);
                const canChangeStatus = canUpdateTaskStatus(t);

                return (
                  <tr 
                    key={t.id} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: overdue ? '#fffbfb' : '#ffffff',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    {/* Checkbox Complete */}
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="checkbox"
                        checked={t.status === 'COMPLETED'}
                        disabled={!canChangeStatus}
                        onChange={(e) => handleStatusChange(t.id, e.target.checked ? 'COMPLETED' : 'PENDING')}
                        style={{
                          cursor: canChangeStatus ? 'pointer' : 'not-allowed',
                          opacity: canChangeStatus ? 1 : 0.6,
                          width: '16px',
                          height: '16px',
                          accentColor: '#10b981'
                        }}
                        title={canChangeStatus ? 'Toggle status' : 'Only assignee or editor can change status'}
                      />
                    </td>

                    {/* Title & Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          backgroundColor: typeObj.bg,
                          color: typeObj.color
                        }}>
                          {typeObj.label}
                        </span>
                        {entityUrl && (
                          <Link
                            to={entityUrl}
                            style={{
                              fontSize: '0.75rem',
                              color: '#6366f1',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              backgroundColor: '#eef2ff',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            <span>{t.entity_type} #{t.entity_id}</span>
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                      <div style={{
                        fontWeight: '600',
                        color: t.status === 'COMPLETED' ? '#94a3b8' : '#0f172a',
                        textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none',
                        marginTop: '4px'
                      }}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          {t.description}
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: priorityObj.bg,
                        color: priorityObj.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {t.priority === 'URGENT' && <Flame size={12} />}
                        {priorityObj.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          backgroundColor: t.status === 'COMPLETED' ? '#ecfdf5' : t.status === 'IN_PROGRESS' ? '#f0f9ff' : '#fffbeb',
                          color: t.status === 'COMPLETED' ? '#065f46' : t.status === 'IN_PROGRESS' ? '#075985' : '#92400e',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="PENDING">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </td>

                    {/* Assignee */}
                    <td style={{ padding: '12px 16px' }}>
                      {t.assignee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#6366f1',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: '700'
                          }}>
                            {t.assignee.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span style={{ fontSize: '0.84rem', color: '#334155' }}>
                            {t.assignee.name}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '12px 16px' }}>
                      {t.due_date ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: overdue ? '#ef4444' : '#64748b',
                          fontWeight: overdue ? '600' : '400',
                          fontSize: '0.82rem'
                        }}>
                          <Calendar size={14} />
                          <span>{t.due_date}</span>
                          {overdue && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>(Overdue)</span>}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#475569',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Edit Task"
                          >
                            <Edit3 size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Delete Task"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                            View only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitModal} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inspect Batch #104 or Reorder Item X"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Description / Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detailed steps, criteria, or context..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Type & Priority Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Task Type
                    </label>
                    <select
                      value={formData.task_type}
                      onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      {TASK_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assignee & Due Date Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Assignee
                    </label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">Unassigned (Open Queue)</option>
                      {assignees.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                </div>

                {/* Related Entity Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Related Module (Optional)
                    </label>
                    <select
                      value={formData.entity_type}
                      onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">None / Standalone</option>
                      <option value="PRODUCT">Product / Inventory</option>
                      <option value="PURCHASE_ORDER">Purchase Order</option>
                      <option value="SALES_ORDER">Sales Order</option>
                      <option value="APPROVAL">Change Request Approval</option>
                      <option value="WAREHOUSE">Warehouse Zone</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Record ID / Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 104 or PO-2026-001"
                      value={formData.entity_id}
                      onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Kanban Column Component
 */
function KanbanColumn({
  title,
  count,
  tasks,
  color,
  bg,
  canUpdateTaskStatus,
  onMoveBack,
  onMoveForward,
  onComplete,
  onEdit,
  onDelete,
  getEntityLink,
  isOverdue
}) {
  return (
    <div style={{
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      minHeight: '500px'
    }}>
      {/* Column Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        paddingBottom: '10px',
        borderBottom: '2px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            {title}
          </h2>
        </div>
        <span style={{
          backgroundColor: bg,
          color: color,
          fontSize: '0.78rem',
          fontWeight: '700',
          padding: '2px 8px',
          borderRadius: '9999px'
        }}>
          {count}
        </span>
      </div>

      {/* Task Cards Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.length === 0 ? (
          <div style={{
            padding: '30px 10px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.82rem',
            fontStyle: 'italic'
          }}>
            No tasks in this lane
          </div>
        ) : (
          tasks.map((task) => {
            const overdue = isOverdue(task.due_date, task.status);
            const typeObj = TASK_TYPES.find((x) => x.value === task.task_type) || TASK_TYPES[0];
            const priorityObj = PRIORITIES.find((x) => x.value === task.priority) || PRIORITIES[1];
            const entityUrl = getEntityLink(task.entity_type, task.entity_id);

            return (
              <div
                key={task.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  padding: '14px',
                  border: overdue ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.15s, transform 0.15s'
                }}
              >
                {/* Header: Type & Priority */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    backgroundColor: typeObj.bg,
                    color: typeObj.color
                  }}>
                    {typeObj.label}
                  </span>

                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    backgroundColor: priorityObj.bg,
                    color: priorityObj.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    {task.priority === 'URGENT' && <Flame size={11} />}
                    {priorityObj.label}
                  </span>
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: task.status === 'COMPLETED' ? '#94a3b8' : '#0f172a',
                  textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none',
                  margin: '0 0 6px 0',
                  lineHeight: '1.3'
                }}>
                  {task.title}
                </h3>

                {/* Description snippet */}
                {task.description && (
                  <p style={{
                    fontSize: '0.78rem',
                    color: '#64748b',
                    margin: '0 0 10px 0',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {task.description}
                  </p>
                )}

                {/* Linked Entity Pill */}
                {entityUrl && (
                  <div style={{ marginBottom: '10px' }}>
                    <Link
                      to={entityUrl}
                      style={{
                        fontSize: '0.72rem',
                        color: '#4f46e5',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        backgroundColor: '#eef2ff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}
                    >
                      <Package size={11} />
                      <span>{task.entity_type} #{task.entity_id}</span>
                      <ExternalLink size={10} />
                    </Link>
                  </div>
                )}

                {/* Metadata details (e.g. recommended qty) */}
                {task.metadata?.recommended_qty && (
                  <div style={{
                    fontSize: '0.74rem',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    fontWeight: '500'
                  }}>
                    Recommended Order: {task.metadata.recommended_qty} units
                  </div>
                )}

                {/* Footer: Due date, Assignee, Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.75rem',
                  color: '#64748b'
                }}>
                  {/* Left: Assignee */}
                  <div>
                    {task.assignee ? (
                      <span title={task.assignee.email} style={{ fontWeight: '600', color: '#334155' }}>
                        👤 {task.assignee.name.split(' ')[0]}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Open</span>
                    )}
                  </div>

                  {/* Middle: Due Date */}
                  {task.due_date && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: overdue ? '#ef4444' : '#64748b',
                      fontWeight: overdue ? '700' : '500'
                    }}>
                      <Clock size={12} />
                      <span>{task.due_date}</span>
                    </div>
                  )}

                  {/* Right: Quick Advance / Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {canUpdateTaskStatus && canUpdateTaskStatus(task) && (
                      <>
                        {onMoveBack && (
                          <button
                            type="button"
                            onClick={() => onMoveBack(task.id)}
                            style={{
                              background: '#f1f5f9',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 5px',
                              cursor: 'pointer',
                              color: '#475569'
                            }}
                            title="Move Back"
                          >
                            <ArrowLeft size={13} />
                          </button>
                        )}

                        {onMoveForward && (
                          <button
                            type="button"
                            onClick={() => onMoveForward(task.id)}
                            style={{
                              background: '#e0e7ff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 5px',
                              cursor: 'pointer',
                              color: '#4338ca'
                            }}
                            title="Advance Lane"
                          >
                            <ArrowRight size={13} />
                          </button>
                        )}

                        {onComplete && task.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => onComplete(task.id)}
                            style={{
                              background: '#dcfce7',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 5px',
                              cursor: 'pointer',
                              color: '#15803d'
                            }}
                            title="Mark Complete"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                        )}
                      </>
                    )}

                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(task)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '3px',
                          cursor: 'pointer',
                          color: '#64748b'
                        }}
                        title="Edit"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(task.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '3px',
                          cursor: 'pointer',
                          color: '#ef4444'
                        }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
