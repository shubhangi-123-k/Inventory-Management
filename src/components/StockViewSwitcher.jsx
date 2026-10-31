import React from 'react';
import { useStockView, STOCK_VIEWS } from '../context/StockViewContext';
import { Building2, Package, Scale } from 'lucide-react';

const StockViewSwitcher = ({ compact = false }) => {
  const { stockView, setStockView } = useStockView();

  const options = [
    {
      id: STOCK_VIEWS.GOVERNMENT,
      label: 'Gov Stock (Virtual Stock)',
      shortLabel: 'Gov Stock (Virtual Stock)',
      icon: <Building2 size={compact ? 14 : 16} />,
      desc: 'Official tax-registered quantities & book valuations',
      activeColor: '#7c3aed',
      activeBg: '#f3e8ff',
      activeBorder: '#c4b5fd'
    },
    {
      id: STOCK_VIEWS.PHYSICAL,
      label: 'Physical Stock',
      shortLabel: 'Physical Stock',
      icon: <Package size={compact ? 14 : 16} />,
      desc: 'Floor quantities for packing and warehouse picking',
      activeColor: '#0284c7',
      activeBg: '#e0f2fe',
      activeBorder: '#7dd3fc'
    },
    {
      id: STOCK_VIEWS.CONSOLIDATED_GAP,
      label: 'Between Stock',
      shortLabel: 'Between Stock',
      icon: <Scale size={compact ? 14 : 16} />,
      desc: 'Both meters side-by-side with discrepancy badges',
      activeColor: '#059669',
      activeBg: '#d1fae5',
      activeBorder: '#6ee7b7'
    }
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: '10px',
        padding: '3px',
        border: '1px solid #e2e8f0',
        gap: '2px',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
      }}
      role="group"
      aria-label="Stock Track View Switcher"
    >
      {options.map((opt) => {
        const isActive = stockView === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStockView(opt.id)}
            title={opt.desc}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: compact ? '4px 10px' : '6px 14px',
              borderRadius: '7px',
              fontSize: compact ? '0.78rem' : '0.84rem',
              fontWeight: isActive ? '700' : '600',
              border: isActive ? `1px solid ${opt.activeBorder}` : '1px solid transparent',
              backgroundColor: isActive ? '#ffffff' : 'transparent',
              color: isActive ? opt.activeColor : '#64748b',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ display: 'inline-flex', color: isActive ? opt.activeColor : '#94a3b8' }}>
              {opt.icon}
            </span>
            <span>{compact ? opt.shortLabel : opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default StockViewSwitcher;
