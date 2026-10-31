import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  Trash2,
  Plus,
  Edit3,
  Loader2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

const MODULE_COLORS = {
  PRODUCTS: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', label: 'Products' },
  PRODUCT_TYPES: { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc', label: 'Product Types' },
  WAREHOUSES: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Warehouses' },
  CUSTOMERS: { bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe', label: 'Customers' },
  COMPANIES: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Companies' },
  BRANDS: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Brands' },
  GROUPS: { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff', label: 'Groups' },
  EXPENSES: { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3', label: 'Expenses' },
  ALIASES: { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4', label: 'Aliases' },
  OCCASIONS: { bg: '#fdf4ff', text: '#c026d3', border: '#f5d0fe', label: 'Occasions' },
  PURCHASE_ORDERS: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Purchase Orders' },
  SALES_ORDERS: { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', label: 'Sales Orders' },
};

const formatFieldName = (key) => {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatValue = (val, key = '') => {
  if (val === null || val === undefined || val === '') {
    return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>null</span>;
  }
  if (typeof val === 'boolean') {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: '700',
          backgroundColor: val ? '#dcfce7' : '#fee2e2',
          color: val ? '#166534' : '#991b1b',
        }}
      >
        {val ? 'TRUE' : 'FALSE'}
      </span>
    );
  }

  // Parse JSON string if serialized
  let parsed = val;
  if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
    try {
      parsed = JSON.parse(val);
    } catch {
      parsed = val;
    }
  }

  if (typeof parsed === 'object' && parsed !== null) {
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>;
      }

      // If array of strings/numbers/primitives
      if (parsed.every((item) => typeof item !== 'object' || item === null)) {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {parsed.map((item, idx) => (
              <span
                key={idx}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#334155',
                }}
              >
                {item === null ? 'null' : String(item)}
              </span>
            ))}
          </div>
        );
      }

      // Array of objects (e.g. officers)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          {parsed.map((item, idx) => {
            if (!item || typeof item !== 'object') {
              return <span key={idx}>{String(item)}</span>;
            }

            const isOfficer =
              'is_primary' in item ||
              'designation' in item ||
              key.toLowerCase().includes('officer') ||
              'officer_name' in item;

            if (isOfficer) {
              const officerName = item.name || item.officer_name || item.title || `Officer #${idx + 1}`;
              const isPrimary = item.is_primary === true || item.is_primary === 'true' || item.is_primary === 1;
              const designation = item.designation && item.designation.trim() ? item.designation.trim() : null;
              const phone = item.phone && item.phone.trim() ? item.phone.trim() : null;
              const email = item.email && item.email.trim() ? item.email.trim() : null;

              return (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.84rem', color: '#0f172a' }}>
                      {officerName}
                    </span>
                    {isPrimary && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        Primary
                      </span>
                    )}
                  </div>

                  {designation && (
                    <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: '500' }}>
                      {designation}
                    </div>
                  )}

                  {(phone || email) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      {phone && <span>📞 {phone}</span>}
                      {email && <span>✉️ {email}</span>}
                    </div>
                  )}
                </div>
              );
            }

            const validProps = Object.entries(item).filter(
              ([_, v]) => v !== null && v !== undefined && String(v).trim() !== '' && v !== 'null'
            );

            if (validProps.length === 0) {
              return (
                <div key={idx} style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  Item #{idx + 1} (Empty)
                </div>
              );
            }

            return (
              <div
                key={idx}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {validProps.map(([pKey, pVal], pIdx) => (
                  <div key={pIdx} style={{ fontSize: '0.74rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>{formatFieldName(pKey)}:</span>
                    <span style={{ color: '#0f172a', fontWeight: '700' }}>
                      {typeof pVal === 'object' ? JSON.stringify(pVal) : String(pVal)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    // Objects (e.g. schemes_data)
    const activeEntries = Object.entries(parsed).filter(
      ([_, v]) => v !== null && v !== undefined && String(v).trim() !== '' && v !== 'null'
    );

    if (activeEntries.length === 0) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No active schemes</span>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        {activeEntries.map(([sKey, sVal], idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              fontSize: '0.75rem',
            }}
          >
            <span style={{ color: '#475569', fontWeight: '600' }}>{formatFieldName(sKey)}:</span>
            <span style={{ color: '#0f172a', fontWeight: '700', textAlign: 'right' }}>
              {typeof sVal === 'object' ? (
                Array.isArray(sVal) ? sVal.join(', ') : JSON.stringify(sVal)
              ) : (
                String(sVal)
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(parsed)}</span>;
};

const VisualDiffModal = ({
  isOpen,
  requestId,
  requestData: initialData,
  onClose,
  onDecisionComplete,
  canApprove = true,
}) => {
  const { showSuccess, showError, showWarning } = useToast();
  const [request, setRequest] = useState(initialData || null);
  const [loading, setLoading] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Fetch full details if requestId is supplied
  useEffect(() => {
    if (!isOpen) {
      setRequest(null);
      setReviewerNotes('');
      setShowRejectPrompt(false);
      setRejectionReason('');
      setRejectError('');
      return;
    }

    if (initialData) {
      setRequest(initialData);
    }

    if (requestId) {
      const fetchDetail = async () => {
        try {
          setLoading(true);
          const endpoint = canApprove
            ? `/admin/approval-requests/${requestId}`
            : `/approval-requests/${requestId}`;
          
          let res;
          try {
            res = await api.get(endpoint);
          } catch (e) {
            // Fallback to admin endpoint if regular endpoint doesn't exist
            res = await api.get(`/admin/approval-requests/${requestId}`);
          }

          if (res.data?.request) {
            setRequest(res.data.request);
          } else if (res.data?.data) {
            setRequest(res.data.data);
          } else if (res.data) {
            setRequest(res.data);
          }
        } catch (err) {
          console.error('Error fetching approval request details:', err);
          if (!initialData) {
            showError('Failed to fetch request details.');
          }
        } finally {
          setLoading(false);
        }
      };

      fetchDetail();
    }
  }, [isOpen, requestId, initialData, canApprove, showError]);

  if (!isOpen) return null;

  const currentReq = request || initialData || {};
  const action = (currentReq.action || 'UPDATE').toUpperCase();
  const moduleName = (currentReq.module || 'PRODUCTS').toUpperCase();
  const status = (currentReq.status || 'PENDING').toUpperCase();
  const isPending = status === 'PENDING';

  const moduleConfig = MODULE_COLORS[moduleName] || {
    bg: '#f8fafc',
    text: '#475569',
    border: '#cbd5e1',
    label: moduleName,
  };

  const formattedId = currentReq.id
    ? `#CR-${String(currentReq.id).padStart(4, '0')}`
    : '#CR-PENDING';

  // Normalize payload data from backend ChangeRequest model
  const proposedPayload = currentReq.proposed_data || currentReq.data || null;
  const originalPayload = currentReq.original_data || currentReq.target_data || null;

  // Compute or extract diff entries
  let diffEntries = [];
  if (currentReq.diff && typeof currentReq.diff === 'object') {
    diffEntries = Object.entries(currentReq.diff).map(([key, val]) => ({
      field: key,
      from: val?.from,
      to: val?.to,
    }));
  } else if (action === 'UPDATE' && originalPayload && proposedPayload) {
    // Generate diff if not explicitly provided
    const allKeys = Array.from(
      new Set([...Object.keys(originalPayload), ...Object.keys(proposedPayload)])
    );
    diffEntries = allKeys
      .filter((k) => !['updated_at', 'updatedAt', 'id', 'created_at', 'createdAt'].includes(k))
      .filter((k) => JSON.stringify(originalPayload[k]) !== JSON.stringify(proposedPayload[k]))
      .map((k) => ({
        field: k,
        from: originalPayload[k],
        to: proposedPayload[k],
      }));
  }

  // Handle Approve Action
  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      const noteContent = reviewerNotes.trim() || undefined;
      await api.post(`/admin/approval-requests/${currentReq.id}/approve`, {
        notes: noteContent,
        review_notes: noteContent,
      });

      showSuccess(`Request ${formattedId} approved and committed to database!`);
      window.dispatchEvent(new CustomEvent('approval:stats_updated'));
      if (onDecisionComplete) {
        onDecisionComplete({ id: currentReq.id, status: 'APPROVED', notes: reviewerNotes.trim() });
      }
      onClose();
    } catch (err) {
      console.error('Approval failed:', err);
      showError(err.response?.data?.message || err.response?.data?.error || 'Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject Action
  const handleRejectConfirm = async () => {
    const trimmed = rejectionReason.trim();
    if (!trimmed || trimmed.length < 5) {
      setRejectError('Please provide a rejection explanation of at least 5 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalNotes = reviewerNotes.trim() || trimmed;
      await api.post(`/admin/approval-requests/${currentReq.id}/reject`, {
        review_notes: finalNotes,
        notes: finalNotes,
        rejection_reason: trimmed,
        reason: trimmed,
        reviewer_notes: finalNotes,
      });

      showSuccess(`Request ${formattedId} rejected.`);
      window.dispatchEvent(new CustomEvent('approval:stats_updated'));
      if (onDecisionComplete) {
        onDecisionComplete({ id: currentReq.id, status: 'REJECTED', reason: trimmed });
      }
      setShowRejectPrompt(false);
      onClose();
    } catch (err) {
      console.error('Rejection failed:', err);
      setRejectError(err.response?.data?.message || err.response?.data?.error || 'Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requester presentation
  const requester = currentReq.requested_by || currentReq.requester || currentReq.user || {};
  const requesterName = currentReq.requested_by_name || requester.name || currentReq.requester_name || (currentReq.requested_by_id ? `User #${currentReq.requested_by_id}` : 'Sub-Admin');
  const requesterEmail = currentReq.requested_by_email || requester.email || currentReq.requester_email || (requesterName ? `${requesterName.toLowerCase().replace(/\s+/g, '')}@system` : 'subadmin@system');
  const requesterRole = (currentReq.requested_by_role || requester.role || currentReq.requester_role || 'ADMIN').toUpperCase();
  const submissionTimestamp = currentReq.createdAt || currentReq.created_at || currentReq.timestamp;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        zIndex: 99990,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s ease-out',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '1.05rem',
                fontWeight: '800',
                color: '#1e293b',
                padding: '4px 10px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                letterSpacing: '0.5px',
              }}
            >
              {formattedId}
            </div>

            {/* Module Badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: '700',
                backgroundColor: moduleConfig.bg,
                color: moduleConfig.text,
                border: `1px solid ${moduleConfig.border}`,
              }}
            >
              <Layers size={13} />
              <span>{moduleConfig.label}</span>
            </span>

            {/* Action Badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: '800',
                backgroundColor:
                  action === 'CREATE' ? '#ecfdf5' : action === 'UPDATE' ? '#eff6ff' : '#fef2f2',
                color:
                  action === 'CREATE' ? '#059669' : action === 'UPDATE' ? '#2563eb' : '#dc2626',
                border: `1px solid ${
                  action === 'CREATE' ? '#a7f3d0' : action === 'UPDATE' ? '#bfdbfe' : '#fecaca'
                }`,
              }}
            >
              {action === 'CREATE' && <Plus size={13} />}
              {action === 'UPDATE' && <Edit3 size={13} />}
              {action === 'DELETE' && <Trash2 size={13} />}
              <span>{action}</span>
            </span>

            {/* Status Pill */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '700',
                backgroundColor:
                  status === 'PENDING'
                    ? '#fffbeb'
                    : status === 'APPROVED'
                    ? '#f0fdf4'
                    : '#fef2f2',
                color:
                  status === 'PENDING'
                    ? '#b45309'
                    : status === 'APPROVED'
                    ? '#15803d'
                    : '#b91c1c',
                border: `1px solid ${
                  status === 'PENDING'
                    ? '#fde68a'
                    : status === 'APPROVED'
                    ? '#86efac'
                    : '#fca5a5'
                }`,
              }}
            >
              {status === 'PENDING' && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#d97706',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              )}
              {status === 'APPROVED' && <CheckCircle2 size={13} />}
              {status === 'REJECTED' && <XCircle size={13} />}
              <span>{status}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                gap: '12px',
                color: '#64748b',
              }}
            >
              <Loader2 size={32} className="animate-spin" color="#6366f1" />
              <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                Fetching change request diff & audit details...
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* TARGET RECORD BANNER */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                    Target Record
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                    {currentReq.entity_name ||
                      currentReq.target_name ||
                      currentReq.data?.name ||
                      currentReq.target_data?.name ||
                      `Record ID: ${currentReq.entity_id || currentReq.target_id || 'N/A'}`}
                  </div>
                </div>

                {(currentReq.entity_id || currentReq.target_id) && (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.78rem',
                      color: '#475569',
                      backgroundColor: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    ID #{currentReq.entity_id || currentReq.target_id}
                  </span>
                )}
              </div>

              {/* REQUESTER DETAILS & JUSTIFICATION CARD */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '14px',
                }}
              >
                {/* Requester Profile */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Submitted By
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#e0e7ff',
                        color: '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        flexShrink: 0,
                      }}
                    >
                      {(requesterName || 'A')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: '700',
                          fontSize: '0.88rem',
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {requesterName}
                      </div>
                      <div
                        style={{
                          fontSize: '0.76rem',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {requesterEmail}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: '#4338ca',
                        backgroundColor: '#eef2ff',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #c7d2fe',
                      }}
                    >
                      {requesterRole}
                    </span>
                  </div>

                  {submissionTimestamp && (
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginTop: '2px',
                      }}
                    >
                      <Clock size={12} />
                      <span>{new Date(submissionTimestamp).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Requester's Business Justification */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>Requester Justification / Reason</span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: '#78350f',
                      lineHeight: '1.45',
                      fontStyle: 'italic',
                      wordBreak: 'break-word',
                    }}
                  >
                    "{currentReq.reason || currentReq.justification || 'No explicit reason provided.'}"
                  </div>
                </div>
              </div>

              {/* ACTION SPECIFIC VISUAL DIFF OR PAYLOAD VIEWER */}
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                }}
              >
                {/* View Mode Toggle Header */}
                <div
                  style={{
                    padding: '12px 18px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>
                      {action === 'UPDATE' && 'Field-by-Field Visual Diff'}
                      {action === 'CREATE' && 'New Entity Payload Review'}
                      {action === 'DELETE' && 'Record Deletion Impact'}
                    </span>
                    {action === 'UPDATE' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {diffEntries.length} {diffEntries.length === 1 ? 'field' : 'fields'} modified
                      </span>
                    )}
                  </div>

                </div>

                {/* VISUAL VIEW CONTENT */}
                <div>
                    {/* CASE 1: UPDATE (Visual Diff Table) */}
                    {action === 'UPDATE' && (
                      <div style={{ overflowX: 'auto' }}>
                        {diffEntries.length === 0 ? (
                          <div
                            style={{
                              padding: '36px 20px',
                              textAlign: 'center',
                              color: '#64748b',
                              fontSize: '0.88rem',
                            }}
                          >
                            No specific field-level differences recorded. Inspect Raw JSON tab for full payload.
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th
                                  style={{
                                    padding: '10px 16px',
                                    textAlign: 'center',
                                    fontWeight: '700',
                                    color: '#475569',
                                    width: '60px',
                                  }}
                                >
                                  Sr. No.
                                </th>
                                <th
                                  style={{
                                    padding: '10px 16px',
                                    textAlign: 'center',
                                    fontWeight: '700',
                                    color: '#475569',
                                    width: '24%',
                                  }}
                                >
                                  Field Name
                                </th>
                                <th
                                  style={{
                                    padding: '10px 16px',
                                    textAlign: 'center',
                                    fontWeight: '700',
                                    color: '#b91c1c',
                                    width: '34%',
                                    backgroundColor: '#fef2f2',
                                  }}
                                >
                                  Previous Value (Live DB)
                                </th>
                                <th style={{ width: '4%', textAlign: 'center', color: '#94a3b8' }}></th>
                                <th
                                  style={{
                                    padding: '10px 16px',
                                    textAlign: 'center',
                                    fontWeight: '700',
                                    color: '#15803d',
                                    width: '34%',
                                    backgroundColor: '#f0fdf4',
                                  }}
                                >
                                  Proposed Value (Change)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {diffEntries.map((diff, index) => (
                                <tr
                                  key={index}
                                  style={{
                                    borderBottom: index < diffEntries.length - 1 ? '1px solid #f1f5f9' : 'none',
                                    transition: 'background-color 0.1s',
                                  }}
                                >
                                  {/* Sr. No. */}
                                  <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '600', color: '#64748b' }}>
                                    {index + 1}
                                  </td>

                                  {/* Field Column */}
                                  <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <div style={{ fontWeight: '700', color: '#1e293b' }}>
                                      {formatFieldName(diff.field)}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                      {diff.field}
                                    </div>
                                  </td>

                                  {/* From (Previous) Column */}
                                  <td
                                    style={{
                                      padding: '12px 16px',
                                      backgroundColor: '#fff5f5',
                                      color: '#991b1b',
                                      verticalAlign: 'top',
                                      borderLeft: '2px solid #f87171',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                      <span
                                        style={{
                                          flexShrink: 0,
                                          fontWeight: '800',
                                          color: '#dc2626',
                                          fontSize: '0.75rem',
                                          padding: '1px 5px',
                                          backgroundColor: '#fee2e2',
                                          borderRadius: '3px',
                                        }}
                                      >
                                        -
                                      </span>
                                      <div style={{ flex: 1, textDecoration: 'line-through', opacity: 0.85 }}>
                                        {formatValue(diff.from, diff.field)}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Transition Arrow */}
                                  <td style={{ padding: '12px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <ArrowRight size={16} color="#94a3b8" />
                                  </td>

                                  {/* To (Proposed) Column */}
                                  <td
                                    style={{
                                      padding: '12px 16px',
                                      backgroundColor: '#f6fef9',
                                      color: '#166534',
                                      verticalAlign: 'top',
                                      borderLeft: '2px solid #4ade80',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                      <span
                                        style={{
                                          flexShrink: 0,
                                          fontWeight: '800',
                                          color: '#16a34a',
                                          fontSize: '0.75rem',
                                          padding: '1px 5px',
                                          backgroundColor: '#dcfce7',
                                          borderRadius: '3px',
                                        }}
                                      >
                                        +
                                      </span>
                                      <div style={{ flex: 1, fontWeight: '600' }}>
                                        {formatValue(diff.to, diff.field)}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* CASE 2: CREATE (New Record Key-Value Grid) */}
                    {action === 'CREATE' && (
                      <div style={{ padding: '20px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            color: '#065f46',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                          }}
                        >
                          <Plus size={18} color="#059669" />
                          <span>
                            This request stages the creation of a brand new {moduleConfig.label} record.
                            Review the proposed fields below:
                          </span>
                        </div>

                        {proposedPayload && typeof proposedPayload === 'object' && Object.keys(proposedPayload).length > 0 ? (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                              gap: '12px',
                            }}
                          >
                            {Object.entries(proposedPayload)
                              .filter(([k]) => !['reason', 'password'].includes(k))
                              .map(([key, val], idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      color: '#64748b',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    {formatFieldName(key)}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '600' }}>
                                    {formatValue(val, key)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                            No structured payload data available.
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE 3: DELETE (Destructive Impact Notice & Target Record) */}
                    {action === 'DELETE' && (
                      <div style={{ padding: '20px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px 18px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            color: '#991b1b',
                            marginBottom: '16px',
                          }}
                        >
                          <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '0.92rem' }}>
                              Permanent Deletion Approval Notice
                            </div>
                            <div style={{ fontSize: '0.82rem', marginTop: '2px', color: '#b91c1c' }}>
                              Approving this request will permanently remove this record from the active database.
                              Ensure this deletion aligns with business compliance.
                            </div>
                          </div>
                        </div>

                        {/* Staged Record Preview */}
                        <div
                          style={{
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              color: '#64748b',
                              marginBottom: '10px',
                              textTransform: 'uppercase',
                            }}
                          >
                            Record Scheduled for Deletion
                          </div>

                          {originalPayload || proposedPayload ? (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                gap: '10px',
                              }}
                            >
                              {Object.entries(originalPayload || proposedPayload)
                                .filter(([k]) => !['password', 'reason'].includes(k))
                                .map(([key, val], idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      backgroundColor: '#f8fafc',
                                      border: '1px solid #f1f5f9',
                                    }}
                                  >
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>
                                      {formatFieldName(key)}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: '600' }}>
                                      {formatValue(val, key)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div style={{ color: '#64748b', fontSize: '0.84rem' }}>
                              Entity ID: #{currentReq.entity_id || currentReq.target_id || 'N/A'} (Name:{' '}
                              {currentReq.entity_name || 'N/A'})
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
              </div>

              {/* AUDIT RESOLUTION (IF ALREADY REVIEWED) */}
              {!isPending && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: status === 'APPROVED' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${status === 'APPROVED' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      color: status === 'APPROVED' ? '#15803d' : '#991b1b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    {status === 'APPROVED' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    <span>Request has been {status}</span>
                  </div>

                  {(currentReq.review_notes || currentReq.rejection_reason || currentReq.notes || currentReq.reviewer_notes) && (
                    <div style={{ fontSize: '0.84rem', color: '#334155', marginTop: '6px', lineHeight: '1.4' }}>
                      <strong style={{ color: status === 'REJECTED' ? '#991b1b' : '#15803d' }}>
                        {status === 'REJECTED' ? 'Rejection Reason / Reviewer Feedback:' : 'Reviewer Feedback:'}
                      </strong>{' '}
                      <span style={{ fontWeight: '500' }}>
                        {currentReq.review_notes || currentReq.rejection_reason || currentReq.notes || currentReq.reviewer_notes}
                      </span>
                    </div>
                  )}

                  {(currentReq.reviewed_at || currentReq.reviewed_by_name) && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                      Reviewed {currentReq.reviewed_by_name ? `by ${currentReq.reviewed_by_name}` : ''}
                      {currentReq.reviewed_at ? ` on ${new Date(currentReq.reviewed_at).toLocaleString()}` : ''}
                    </div>
                  )}
                </div>
              )}

              {/* REVIEWER NOTES INPUT (FOR PENDING REVIEW BY SUPER ADMIN) */}
              {isPending && canApprove && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="reviewer-notes-textarea"
                    style={{ fontSize: '0.84rem', fontWeight: '700', color: '#1e293b' }}
                  >
                    Reviewer Notes / Feedback (Optional for Approval, Mandatory for Rejection)
                  </label>
                  <textarea
                    id="reviewer-notes-textarea"
                    rows={2}
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Enter approval comments or instructions for the Sub-Admin..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Close
          </button>

          {isPending && canApprove && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {/* Reject Button */}
              <button
                type="button"
                onClick={() => {
                  setRejectionReason(reviewerNotes || '');
                  setRejectError('');
                  setShowRejectPrompt(true);
                }}
                disabled={isSubmitting}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: '1px solid #f87171',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                  e.currentTarget.style.color = '#dc2626';
                }}
              >
                <XCircle size={16} />
                <span>Reject Request</span>
              </button>

              {/* Approve Button */}
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Approve & Apply Live</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* REJECTION PROMPT MODAL */}
      {showRejectPrompt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 99995,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              animation: 'scaleIn 0.18s ease-out',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                borderBottom: '1px solid #fee2e2',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle size={22} color="#dc2626" />
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#991b1b' }}>
                Confirm Request Rejection
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#334155', lineHeight: '1.4' }}>
                Please specify the reason for rejecting request <strong>{formattedId}</strong>. This feedback will be
                visible to the Sub-Admin.
              </p>

              <label
                htmlFor="rejection-reason-input"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '6px',
                }}
              >
                Rejection Reason (at least 5 characters) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                id="rejection-reason-input"
                rows={3}
                autoFocus
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (rejectError && e.target.value.trim().length >= 5) setRejectError('');
                }}
                placeholder="e.g., Incomplete documentation, pricing exceeds allocated budget..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: rejectError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />

              {rejectError && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#dc2626',
                    fontWeight: '600',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>{rejectError}</span>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '12px 20px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setShowRejectPrompt(false)}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={isSubmitting || rejectionReason.trim().length < 5}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  cursor: rejectionReason.trim().length < 5 ? 'not-allowed' : 'pointer',
                  opacity: rejectionReason.trim().length < 5 ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualDiffModal;
