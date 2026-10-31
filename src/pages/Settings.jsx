import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  ChevronRight, 
  ShieldCheck, 
  Save, 
  Building2, 
  Boxes, 
  Receipt, 
  Bell, 
  CheckCircle2,
  Lock,
  Percent,
  Sliders,
  DollarSign
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Settings = () => {
  const navigate = useNavigate();
  const { showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState('general');

  // System configuration settings state with localStorage persistence
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('inventory_system_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default
      }
    }
    return {
      companyName: 'Inventory Admin Enterprise',
      gstin: '27AABCU9603R1ZM',
      currency: 'INR (₹)',
      fiscalYear: '2026-2027',
      address: 'Plot 42, MIDC Industrial Area, Pune, Maharashtra 411018',
      supportEmail: 'admin@inventoryadmin.com',
      // Inventory defaults
      defaultGodown: 'Main Godown (Warehouse A)',
      lowStockThreshold: 15,
      gapAlertThreshold: 5,
      valuationMethod: 'FIFO',
      autoDecrementVirtual: true,
      // Billing defaults
      defaultBillingMode: 'BOTH',
      defaultGstRate: 18,
      enableRoundOff: true,
      invoicePrefix: 'INV-2026-',
      challanPrefix: 'DC-MH-',
      // Security
      requireMakerChecker: true,
      activityLogging: true
    };
  });

  const [saving, setSaving] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    localStorage.setItem('inventory_system_config', JSON.stringify(config));
    setTimeout(() => {
      setSaving(false);
      showSuccess('System settings and preferences saved successfully!', 'Settings Updated');
    }, 400);
  };

  const tabs = [
    { id: 'general', label: 'General & Organization', icon: <Building2 size={16} /> },
    { id: 'inventory', label: 'Dual-Track Inventory Rules', icon: <Boxes size={16} /> },
    { id: 'billing', label: 'Billing & GST Configuration', icon: <Receipt size={16} /> },
    { id: 'security', label: 'Security & Approvals', icon: <Lock size={16} /> }
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Dashboard</span>
        <ChevronRight size={14} />
        <span style={{ color: '#0f172a', fontWeight: '600' }}>Settings</span>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(67, 56, 202, 0.15)'
              }}
            >
              <SettingsIcon size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
              System Configuration & Preferences
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Manage core enterprise business settings, tax defaults, and dual-track stock operational rules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', backgroundColor: '#ffffff', borderRadius: '999px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <ShieldCheck size={16} color="#16a34a" />
          <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#334155' }}>Super Admin Settings</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                borderBottom: isActive ? '2px solid #4338ca' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? '#4338ca' : '#64748b',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
          
          {/* TAB 1: General & Organization */}
          {activeTab === 'general' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Enterprise Business Profile
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    value={config.companyName}
                    onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    value={config.gstin}
                    onChange={(e) => setConfig({ ...config, gstin: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Base Accounting Currency
                  </label>
                  <select
                    value={config.currency}
                    onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  >
                    <option value="INR (₹)">Indian Rupee (INR ₹)</option>
                    <option value="USD ($)">US Dollar (USD $)</option>
                    <option value="EUR (€)">Euro (EUR €)</option>
                    <option value="AED (د.إ)">UAE Dirham (AED)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Active Fiscal Financial Year
                  </label>
                  <input
                    type="text"
                    value={config.fiscalYear}
                    onChange={(e) => setConfig({ ...config, fiscalYear: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Registered Warehouse & Office Address
                </label>
                <textarea
                  rows={2}
                  value={config.address}
                  onChange={(e) => setConfig({ ...config, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Dual-Track Inventory Rules */}
          {activeTab === 'inventory' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Dual-Track Inventory & Warehouse Operational Rules
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Default Receiving Godown / Warehouse
                  </label>
                  <input
                    type="text"
                    value={config.defaultGodown}
                    onChange={(e) => setConfig({ ...config, defaultGodown: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Low Floor Stock Warning Threshold (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={config.lowStockThreshold}
                    onChange={(e) => setConfig({ ...config, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Stock Discrepancy Alert Threshold (|Physical - Virtual|)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={config.gapAlertThreshold}
                    onChange={(e) => setConfig({ ...config, gapAlertThreshold: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Inventory Valuation Method
                  </label>
                  <select
                    value={config.valuationMethod}
                    onChange={(e) => setConfig({ ...config, valuationMethod: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  >
                    <option value="FIFO">FIFO (First-In, First-Out)</option>
                    <option value="WEIGHTED_AVG">Weighted Average Cost</option>
                    <option value="STANDARD">Standard Landed Cost</option>
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '14px 18px', border: '1px solid #bbf7d0', fontSize: '0.84rem', color: '#166534' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '4px' }}>
                  <CheckCircle2 size={16} />
                  <span>Dual-Track Compliance Engine Active</span>
                </div>
                <div>
                  Physical ground stock and Government virtual stock are computed in real time. Products with discrepancies exceeding <strong>{config.gapAlertThreshold} units</strong> will trigger a pulsating ⚠️ Alert indicator.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Billing & GST Configuration */}
          {activeTab === 'billing' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Sales Order & GST Billing Defaults
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Default Sales Order Billing Mode
                  </label>
                  <select
                    value={config.defaultBillingMode}
                    onChange={(e) => setConfig({ ...config, defaultBillingMode: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  >
                    <option value="BOTH">Official GST Tax Invoice (BOTH - Decrements Physical & Virtual)</option>
                    <option value="PHYSICAL_ONLY">Delivery Challan / Gate Pass (PHYSICAL_ONLY - Floor Unbilled)</option>
                    <option value="VIRTUAL_ONLY">Advance Bill Only (VIRTUAL_ONLY - Tax Before Dispatch)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Standard GST Rate (%)
                  </label>
                  <select
                    value={config.defaultGstRate}
                    onChange={(e) => setConfig({ ...config, defaultGstRate: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  >
                    <option value="0">0% (Nil / Exempted)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard)</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Tax Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    value={config.invoicePrefix}
                    onChange={(e) => setConfig({ ...config, invoicePrefix: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Delivery Challan Prefix
                  </label>
                  <input
                    type="text"
                    value={config.challanPrefix}
                    onChange={(e) => setConfig({ ...config, challanPrefix: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                <input
                  type="checkbox"
                  id="roundOffCheck"
                  checked={config.enableRoundOff}
                  onChange={(e) => setConfig({ ...config, enableRoundOff: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="roundOffCheck" style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600', cursor: 'pointer' }}>
                  Enable automatic rounding off for invoice grand totals by default
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: Security & Approvals */}
          {activeTab === 'security' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Governance, Maker-Checker & Audit Logging
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="makerCheckerCheck"
                    checked={config.requireMakerChecker}
                    onChange={(e) => setConfig({ ...config, requireMakerChecker: e.target.checked })}
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="makerCheckerCheck" style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}>
                      Require Super Admin Approval for Critical Changes (Maker-Checker Workflow)
                    </label>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      When enabled, product edits, company modifications, and sensitive financial updates will be queued into the <strong>Approval Queue</strong>.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="loggingCheck"
                    checked={config.activityLogging}
                    onChange={(e) => setConfig({ ...config, activityLogging: e.target.checked })}
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="loggingCheck" style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}>
                      Comprehensive User Activity & Audit Trails
                    </label>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Logs all user logins, PO GRNs, stock reconciliation events, and sales order creations to the <strong>Activity Logs</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: '10px 18px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#475569',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 24px',
              backgroundColor: '#4338ca',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(67, 56, 202, 0.25)'
            }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
