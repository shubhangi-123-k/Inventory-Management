import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock } from 'lucide-react';
import { MODULE_CONFIG } from '../utils/permissions';

export const AccessDenied = ({ moduleKey = '', action = 'view' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const moduleDef = MODULE_CONFIG.find((m) => m.key === moduleKey);
  const moduleLabel = moduleDef?.label || moduleKey.replace(/_/g, ' ') || 'Requested Page';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)',
        padding: '32px 20px',
        backgroundColor: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          padding: '40px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #ef4444 100%)',
          }}
        />

        {/* Shield Icon Badge */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 0 0 8px #fef2f2',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        {/* Status Badge */}
        <div style={{ marginBottom: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '0.78rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <Lock size={12} /> 403 Forbidden
          </span>
        </div>

        <h1
          style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 8px 0',
          }}
        >
          Access Denied
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: '#64748b',
            lineHeight: '1.5',
            margin: '0 0 24px 0',
          }}
        >
          Your account does not have permission to <strong>{action}</strong> the{' '}
          <span style={{ color: '#0f172a', fontWeight: '700' }}>{moduleLabel}</span> module.
        </p>

        {/* Context Information Box */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '28px',
            textAlign: 'left',
            fontSize: '0.85rem',
            color: '#475569',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Account:</span>
            <span style={{ fontWeight: '600', color: '#0f172a' }}>{user?.email || user?.name || 'Sub-Admin'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Assigned Role:</span>
            <span style={{ fontWeight: '600', color: '#3b82f6' }}>{user?.role || 'ADMIN'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Required Permission:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#dc2626' }}>
              {moduleKey}.{action} = true
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <ArrowLeft size={16} /> Go Back
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
          >
            <LayoutDashboard size={16} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

const PermissionRoute = ({ module, action = 'view', children }) => {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
        Verifying permissions...
      </div>
    );
  }

  const isAllowed = hasPermission(module, action);

  if (!isAllowed) {
    return <AccessDenied moduleKey={module} action={action} />;
  }

  return children;
};

export default PermissionRoute;
