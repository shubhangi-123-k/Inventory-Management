import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ExpenseMasterTab from '../components/masters/ExpenseMasterTab';
import ProductTypesTab from '../components/masters/ProductTypesTab';
import AliasCatalogTab from '../components/masters/AliasCatalogTab';
import {
  Receipt,
  Boxes,
  Tag,
  SlidersHorizontal,
  Layers,
  ChevronRight,
  Database,
  Building,
  CheckCircle2,
  ShieldCheck,
  Package
} from 'lucide-react';

const MasterSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active tab: 'expenses' | 'types' | 'aliases'
  const activeTabFromUrl = searchParams.get('tab') || 'expenses';
  const [activeTab, setActiveTab] = useState(
    ['expenses', 'types', 'aliases'].includes(activeTabFromUrl) ? activeTabFromUrl : 'expenses'
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['expenses', 'types', 'aliases'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    {
      id: 'expenses',
      label: 'Expense Masters',
      subtitle: 'Operational Charges & Freight Heads',
      icon: <Receipt size={18} />,
      badge: 'Tally Pattern'
    },
    {
      id: 'types',
      label: 'Product Types',
      subtitle: 'Goods, Service & Combo Item Rules',
      icon: <Boxes size={18} />,
      badge: 'Odoo Standard'
    },
    {
      id: 'aliases',
      label: 'Alias Catalog',
      subtitle: 'Alternative Names & Shorthand Codes',
      icon: <Tag size={18} />,
      badge: 'Cross-Reference'
    }
  ];

  return (
    <div style={{ padding: '0 0 24px 0', maxWidth: '1440px', margin: '0 auto' }}>
      {/* BREADCRUMB & PAGE HEADER */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748b', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Dashboard</span>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: '600' }}>Master Settings</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
                }}
              >
                <SlidersHorizontal size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Master Management
                </h1>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                  Configure core inventory classifications, standard expense heads, and product aliases (Tally & Odoo style).
                </p>
              </div>
            </div>
          </div>

          {/* Quick Help / System Info Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: '#ffffff',
              borderRadius: '999px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <ShieldCheck size={16} color="#16a34a" />
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#334155' }}>
              Enterprise ERP Ready
            </span>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION BAR (TALLY & ODOO PATTERN) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
          marginBottom: '26px'
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                backgroundColor: isActive ? '#ffffff' : '#f8fafc',
                border: isActive ? '2px solid #6366f1' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                position: 'relative',
                boxShadow: isActive ? '0 8px 16px -4px rgba(99, 102, 241, 0.12)' : 'none',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#ffffff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? '#e0e7ff' : '#f1f5f9',
                  color: isActive ? '#4338ca' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {tab.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.98rem', color: isActive ? '#4338ca' : '#0f172a' }}>
                    {tab.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: isActive ? '#e0e7ff' : '#f1f5f9',
                      color: isActive ? '#4338ca' : '#64748b',
                      textTransform: 'uppercase'
                    }}
                  >
                    {tab.badge}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tab.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        {activeTab === 'expenses' && <ExpenseMasterTab />}
        {activeTab === 'types' && <ProductTypesTab />}
        {activeTab === 'aliases' && <AliasCatalogTab />}
      </div>
    </div>
  );
};

export default MasterSettings;
