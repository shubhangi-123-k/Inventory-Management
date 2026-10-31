import { useState } from 'react';
import { Plus, X, Sparkles, Check, Filter, ArrowUpRight } from 'lucide-react';

const OccasionSelector = ({
  occasionsList = [],
  occasionTypes = ['Festival', 'Season', 'Event', 'Other'],
  selectedOccasionIds = [],
  onChange,
  onOpenAddModal,
  onRedirect
}) => {
  const [activeTypeTab, setActiveTypeTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize IDs to numbers/strings
  const isSelected = (id) => {
    return selectedOccasionIds.some(selId => String(selId) === String(id));
  };

  const handleToggle = (id) => {
    if (isSelected(id)) {
      onChange(selectedOccasionIds.filter(selId => String(selId) !== String(id)));
    } else {
      onChange([...selectedOccasionIds, id]);
    }
  };

  const handleRemove = (id) => {
    onChange(selectedOccasionIds.filter(selId => String(selId) !== String(id)));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Filter occasions by type tab and search
  const filteredOccasions = occasionsList.filter(o => {
    const matchesType = activeTypeTab === 'All' || o.occasion_type === activeTypeTab;
    const matchesSearch = !searchQuery.trim() || 
      o.occasion_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.occasion_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.occasion_code && o.occasion_code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Selected occasions objects
  const selectedObjects = occasionsList.filter(o => isSelected(o.id));

  // Count by type
  const getCountForType = (type) => {
    if (type === 'All') return selectedOccasionIds.length;
    return selectedObjects.filter(o => o.occasion_type === type).length;
  };

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
      {/* Header with Search and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', color: '#475569', fontSize: '0.9rem', fontWeight: '700' }}>
            Select Occasions & Events ({selectedOccasionIds.length} Selected)
          </label>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            You can tag multiple Festivals (e.g. Diwali + Eid) and Events (e.g. Wedding + Anniversary)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectedOccasionIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: '1px solid #fca5a5',
                color: '#ef4444',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}

          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              style={{
                backgroundColor: '#ede9fe',
                color: '#4338ca',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={14} /> Add New Occasion
            </button>
          )}
        </div>
      </div>

      {/* Selected Tags Display */}
      {selectedObjects.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Tagged Occasions:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {selectedObjects.map(occ => {
              const badgeColors = {
                Festival: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
                Season: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
                Event: { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' },
                Other: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
              }[occ.occasion_type] || { bg: '#ede9fe', text: '#4338ca', border: '#ddd6fe' };

              return (
                <span
                  key={occ.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    backgroundColor: badgeColors.bg,
                    color: badgeColors.text,
                    border: `1px solid ${badgeColors.border}`,
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}
                >
                  <span style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase' }}>
                    [{occ.occasion_type}]
                  </span>
                  <span>{occ.occasion_name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(occ.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: badgeColors.text,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Type Filter Pills & Quick Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['All', ...occasionTypes].map(type => {
            const count = getCountForType(type);
            const isActive = activeTypeTab === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTypeTab(type)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid #4338ca' : '1px solid #cbd5e1',
                  backgroundColor: isActive ? '#4338ca' : '#fff',
                  color: isActive ? '#fff' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <span>{type}</span>
                {count > 0 && (
                  <span
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#ede9fe',
                      color: isActive ? '#fff' : '#4338ca',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontSize: '0.7rem'
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="Filter occasions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.8rem',
            backgroundColor: '#fff',
            outline: 'none',
            minWidth: '160px'
          }}
        />
      </div>

      {/* Multi-Select Checkbox Pills Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '10px',
          maxHeight: '260px',
          overflowY: 'auto',
          padding: '12px',
          backgroundColor: '#fff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}
      >
        {filteredOccasions.length > 0 ? (
          filteredOccasions.map(occ => {
            const checked = isSelected(occ.id);
            return (
              <div
                key={occ.id}
                onClick={() => handleToggle(occ.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: checked ? '1.5px solid #4338ca' : '1px solid #e2e8f0',
                  backgroundColor: checked ? '#f5f3ff' : '#fafafa',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s'
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: checked ? 'none' : '1.5px solid #cbd5e1',
                    backgroundColor: checked ? '#4338ca' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0
                  }}
                >
                  {checked && <Check size={13} strokeWidth={3} />}
                </div>

                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: checked ? '#4338ca' : '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {occ.occasion_name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {occ.occasion_type} {occ.occasion_code ? `• ${occ.occasion_code}` : ''}
                  </div>
                </div>
                {onRedirect && (
                  <button
                    type="button"
                    title={`Open ${occ.occasion_name} in Occasion Master`}
                    aria-label={`Open ${occ.occasion_name} in Occasion Master`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRedirect(occ);
                    }}
                    style={{ marginLeft: 'auto', flexShrink: 0, border: 'none', borderRadius: '5px', background: '#eff6ff', color: '#2563eb', padding: '4px', display: 'inline-flex', cursor: 'pointer' }}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: '0.85rem' }}>
            No occasions found matching current filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default OccasionSelector;
