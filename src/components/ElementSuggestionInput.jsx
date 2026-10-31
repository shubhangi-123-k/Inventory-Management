import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, CheckCircle2, Search, X, Layers, Check, ArrowUpRight } from 'lucide-react';

/**
 * ElementSuggestionInput
 * A smart autocomplete input component that provides live suggestions
 * of existing base element names as the user types, specifically engineered
 * to avoid element name duplication in the inventory catalog.
 */
const ElementSuggestionInput = ({
  value = '',
  onChange,
  suggestions = [],
  products = [],
  placeholder = 'e.g. Milk',
  id = 'base-element-name-input',
  disabled = false,
  inputStyle = {},
  onSelect,
  onBeforeRedirect,
  onRedirectProduct
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Clean and deduplicate suggestions list
  const uniqueSuggestions = useMemo(() => {
    if (!Array.isArray(suggestions)) return [];
    const seen = new Set();
    const result = [];
    suggestions.forEach(item => {
      const name = typeof item === 'string' ? item.trim() : (item?.name || item?.product_name || '').trim();
      const productId = typeof item === 'object' ? (item?.productId || item?.id || null) : null;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        result.push({ name, productId, raw: item });
      }
    });
    return result;
  }, [suggestions]);

  // Compute matching suggestions based on typed input
  const filteredSuggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) {
      // Do not show suggestions before typing
      return [];
    }

    const exactMatches = [];
    const startsWithMatches = [];
    const containsMatches = [];

    uniqueSuggestions.forEach(item => {
      const lower = item.name.toLowerCase();
      if (lower === query) {
        exactMatches.push(item);
      } else if (lower.startsWith(query)) {
        startsWithMatches.push(item);
      } else if (lower.includes(query)) {
        containsMatches.push(item);
      }
    });

    return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 8);
  }, [value, uniqueSuggestions]);

  // Exact duplicate detection
  const queryTrimmed = (value || '').trim();
  const exactDuplicateMatch = useMemo(() => {
    if (!queryTrimmed) return null;
    return uniqueSuggestions.find(s => s.name.toLowerCase() === queryTrimmed.toLowerCase()) || null;
  }, [queryTrimmed, uniqueSuggestions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation inside dropdown
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelectSuggestion = (item) => {
    const selectedName = typeof item === 'string' ? item : (item?.name || '');
    if (onChange) {
      onChange(selectedName);
    }
    if (onSelect) {
      onSelect(selectedName);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRedirect = (e, item) => {
    e.stopPropagation();
    setIsOpen(false);

    let targetId = item.productId;
    if (!targetId && products && Array.isArray(products)) {
      const nameLower = item.name.toLowerCase();
      const matched = products.find(p =>
        (p.base_product_name && p.base_product_name.trim().toLowerCase() === nameLower) ||
        (p.product_name && p.product_name.trim().toLowerCase() === nameLower) ||
        (p.name && p.name.trim().toLowerCase() === nameLower) ||
        (p.product_name && p.product_name.toLowerCase().includes(nameLower))
      );
      if (matched) targetId = matched.id;
    }

    if (targetId) {
      if (onBeforeRedirect) onBeforeRedirect();
      if (onRedirectProduct) {
        onRedirectProduct(targetId, item.name);
      } else {
        navigate(`/products/${targetId}`);
      }
    } else {
      alert(`Product "${item.name}" is a catalog suggestion and has not been created as a product yet.`);
    }
  };

  // Helper to highlight matching text
  const renderHighlighted = (text, query) => {
    if (!query) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
      <>
        {before}
        <strong style={{ color: '#4f46e5', backgroundColor: 'rgba(99, 102, 241, 0.12)', borderRadius: '2px', padding: '0 1px' }}>
          {match}
        </strong>
        {after}
      </>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input wrapper with clear button */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            const newVal = e.target.value;
            onChange(newVal);
            if (newVal.trim().length > 0) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if ((value || '').trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 36px 10px 14px',
            border: exactDuplicateMatch ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: disabled ? '#f1f5f9' : '#f8fafc',
            color: '#1e293b',
            outline: 'none',
            fontSize: '0.9rem',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: exactDuplicateMatch ? '0 0 0 3px rgba(245, 158, 11, 0.15)' : 'none',
            ...inputStyle
          }}
        />

        {/* Clear button when typed */}
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              if (inputRef.current) inputRef.current.focus();
            }}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              borderRadius: '50%'
            }}
            title="Clear text"
          >
            <X size={15} />
          </button>
        )}

        {/* ── FLOATING SUGGESTIONS DROPDOWN MENU (Only shows when user types) ── */}
        {isOpen && queryTrimmed.length > 0 && filteredSuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 5px)',
              left: 0,
              minWidth: '320px',
              width: 'max(100%, 320px)',
              zIndex: 1050,
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.2), 0 6px 12px -4px rgba(15, 23, 42, 0.1)',
              overflow: 'hidden',
              maxHeight: '270px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Dropdown Header */}
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.7rem',
              fontWeight: '700',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#6366f1" /> Suggestions ({filteredSuggestions.length})
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'none', fontWeight: '500' }}>
                Click to reuse (avoid duplicates)
              </span>
            </div>

          {/* Suggestions List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item, index) => {
                const isExact = queryTrimmed.toLowerCase() === item.name.toLowerCase();
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={index}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      backgroundColor: isHighlighted ? '#f1f5f9' : (isExact ? '#fffbeb' : '#ffffff'),
                      border: isExact ? '1px solid #fef3c7' : '1px solid transparent',
                      transition: 'background-color 0.1s ease',
                      fontSize: '0.86rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '5px',
                        backgroundColor: isExact ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                        color: isExact ? '#d97706' : '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Layers size={13} />
                      </div>
                      <span style={{ fontWeight: isExact ? '700' : '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {renderHighlighted(item.name, queryTrimmed)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {isExact && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          flexShrink: 0
                        }}>
                          Already Exists
                        </span>
                      )}

                      {/* Arrow redirect icon right in the suggestions list row! */}
                      <button
                        type="button"
                        title={`View ${item.name} product page`}
                        onClick={(e) => handleRedirect(e, item)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#2563eb',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.borderColor = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.color = '#2563eb';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                <CheckCircle2 size={18} color="#16a34a" style={{ margin: '0 auto 4px', display: 'block' }} />
                <span style={{ fontWeight: '600', color: '#1e293b', display: 'block' }}>
                  No duplicate found for "{queryTrimmed}"
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  This will be added as a brand-new base element in your inventory.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* ── REAL-TIME DUPLICATE AVOIDANCE STATUS PILL ── */}
      {queryTrimmed.length > 0 && (
        <div style={{ marginTop: '5px' }}>
          {exactDuplicateMatch ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#b45309',
              fontSize: '0.72rem',
              fontWeight: '600',
              lineHeight: 1.2
            }}>
              <AlertCircle size={13} color="#d97706" style={{ flexShrink: 0 }} />
              <span>
                Existing Base Element found (<strong>{exactDuplicateMatch.name || exactDuplicateMatch}</strong>). Avoids duplicate entry.
              </span>
            </div>
          ) : filteredSuggestions.length > 0 ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '0.72rem',
              fontWeight: '600',
              lineHeight: 1.2
            }}>
              <CheckCircle2 size={13} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>
                Unique name ({filteredSuggestions.length} catalog suggestion{filteredSuggestions.length > 1 ? 's' : ''})
              </span>
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '0.72rem',
              fontWeight: '600',
              lineHeight: 1.2
            }}>
              <CheckCircle2 size={13} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>Unique base element name. No duplicates in catalog.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ElementSuggestionInput;
