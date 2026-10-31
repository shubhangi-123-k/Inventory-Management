import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, X, ChevronDown, Tag, Building2, ArrowUpRight } from 'lucide-react';

/**
 * SuggestionInput
 * A smart autocomplete & combobox input component that provides live suggestions
 * as the user types, supports keyboard navigation, click-to-select, and a dropdown toggle.
 */
const SuggestionInput = ({
  id,
  name,
  value = '',
  onChange,
  type = 'text',
  suggestions = [],
  placeholder = '',
  maxLength,
  itemType = 'Item',
  required = false,
  autoComplete = 'off',
  disabled = false,
  allowDropdownToggle = true,
  inputStyle = {},
  containerStyle = {},
  onSelect,
  onRedirect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Clean and deduplicate suggestions list
  const uniqueSuggestions = useMemo(() => {
    if (!Array.isArray(suggestions)) return [];
    const seen = new Set();
    const result = [];
    suggestions.forEach(item => {
      const name = typeof item === 'string' ? item.trim() : (item?.name || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        result.push(name);
      }
    });
    return result;
  }, [suggestions]);

  // Compute matching suggestions based on typed input
  const filteredSuggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) {
      // If empty query, show all available unique suggestions up to 25 items
      return uniqueSuggestions.slice(0, 25);
    }

    const exactMatches = [];
    const startsWithMatches = [];
    const containsMatches = [];

    uniqueSuggestions.forEach(item => {
      const lower = item.toLowerCase();
      if (lower === query) {
        exactMatches.push(item);
      } else if (lower.startsWith(query)) {
        startsWithMatches.push(item);
      } else if (lower.includes(query)) {
        containsMatches.push(item);
      }
    });

    return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 15);
  }, [value, uniqueSuggestions]);

  // Exact duplicate / existing detection
  const queryTrimmed = (value || '').trim();
  const exactDuplicateMatch = useMemo(() => {
    if (!queryTrimmed) return null;
    return uniqueSuggestions.find(s => s.toLowerCase() === queryTrimmed.toLowerCase()) || null;
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
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
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
        e.stopPropagation();
        handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelectSuggestion = (selectedName) => {
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
        <strong style={{ color: '#4338ca', backgroundColor: 'rgba(99, 102, 241, 0.12)', borderRadius: '2px', padding: '0 2px' }}>
          {match}
        </strong>
        {after}
      </>
    );
  };

  const IconComponent = itemType.toLowerCase().includes('company') ? Building2 : Tag;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...containerStyle }}>
      {/* Input wrapper */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            const newVal = e.target.value;
            onChange(newVal);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: `10px ${onRedirect ? (allowDropdownToggle ? '84px' : '60px') : (allowDropdownToggle ? '56px' : '32px')} 10px 12px`,
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
            color: '#1e293b',
            outline: 'none',
            fontSize: '0.9rem',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            ...inputStyle
          }}
        />

        {/* Action icons on right */}
        <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(true);
                if (inputRef.current) inputRef.current.focus();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                borderRadius: '50%'
              }}
              title="Clear"
            >
              <X size={14} />
            </button>
          )}

          {onRedirect && exactDuplicateMatch && !disabled && (
            <button
              type="button"
              onClick={() => onRedirect(exactDuplicateMatch)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                borderRadius: '4px'
              }}
              title={`View ${itemType} details`}
            >
              <ArrowUpRight size={14} />
            </button>
          )}

          {allowDropdownToggle && !disabled && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(prev => !prev);
                if (inputRef.current) inputRef.current.focus();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                borderRadius: '4px'
              }}
              title={`View ${itemType} suggestions`}
            >
              <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          )}
        </div>

        {/* Floating Suggestions Dropdown */}
        {isOpen && filteredSuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              width: '100%',
              minWidth: '220px',
              zIndex: 1050,
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.18), 0 6px 12px -4px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
              maxHeight: '220px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Dropdown Header */}
            <div style={{
              padding: '6px 10px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.68rem',
              fontWeight: '700',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={12} color="#6366f1" /> {itemType} Suggestions ({filteredSuggestions.length})
              </span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'none', fontWeight: '500' }}>
                Click to select
              </span>
            </div>

            {/* Suggestions List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
              {filteredSuggestions.map((item, index) => {
                const isExact = queryTrimmed.toLowerCase() === item.toLowerCase();
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={index}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      backgroundColor: isHighlighted ? '#f1f5f9' : (isExact ? '#eff6ff' : '#ffffff'),
                      border: isExact ? '1px solid #dbeafe' : '1px solid transparent',
                      transition: 'background-color 0.1s ease',
                      fontSize: '0.86rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: isExact ? 'rgba(59, 130, 246, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                        color: isExact ? '#2563eb' : '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <IconComponent size={12} />
                      </div>
                      <span style={{ fontWeight: isExact ? '700' : '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {renderHighlighted(item, queryTrimmed)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {isExact && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8',
                          flexShrink: 0
                        }}>
                          Existing {itemType}
                        </span>
                      )}
                      {onRedirect && (
                        <button
                          type="button"
                          title={`View ${itemType} details`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRedirect(item);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3px 5px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#2563eb',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Duplicate / Existing Indicator Pill */}
      {queryTrimmed.length > 0 && exactDuplicateMatch && (
        <div style={{ marginTop: '4px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '2px 7px',
            borderRadius: '5px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '0.7rem',
            fontWeight: '600',
            lineHeight: 1.2
          }}>
            <CheckCircle2 size={12} color="#2563eb" style={{ flexShrink: 0 }} />
            <span>Existing {itemType} (<strong>{exactDuplicateMatch}</strong>)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionInput;
