import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowUpRight, ChevronDown, X } from 'lucide-react';

/**
 * CustomSelectWithArrow
 * A clean, accessible searchable combobox dropdown:
 * - Searchable directly inside the input field (no search bar below in popup!)
 * - Arrow button (↗) inside each dropdown row to redirect to details/view page
 * - Quick redirect button (↗) inside the field when an item is selected
 * - Live filtering and text highlighting as user types
 */
const CustomSelectWithArrow = ({
  options = [],
  value = '',
  onChange,
  placeholder = '-- Select --',
  onRedirect,
  zIndex = 30,
  borderColor = '#cbd5e1',
  backgroundColor = '#ffffff',
  disabled = false,
  emptyMessage = 'No options available',
  valueKey = 'id',
  labelKey = 'name'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hoveredId, setHoveredId] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return options.find(o => {
      const val = o[valueKey];
      return val !== undefined && val !== null && val.toString() === value.toString();
    }) || null;
  }, [value, options, valueKey]);

  // Sync input text with external value when not actively typing
  useEffect(() => {
    if (!isTyping) {
      if (selectedOption) {
        setInputValue(selectedOption.fullDisplay || selectedOption[labelKey] || selectedOption.name || '');
      } else {
        setInputValue('');
      }
    }
  }, [selectedOption, isTyping, labelKey]);

  // Filter options based on typed input
  const filteredOptions = useMemo(() => {
    if (!isTyping || !searchQuery.trim()) {
      return options;
    }
    const q = searchQuery.toLowerCase().trim();
    return options.filter(o => {
      const name = String(o?.[labelKey] ?? o?.name ?? '').toLowerCase();
      const code = String(o?.group_code ?? o?.code ?? '').toLowerCase();
      const full = String(o?.fullDisplay ?? '').toLowerCase();
      return name.includes(q) || code.includes(q) || full.includes(q);
    });
  }, [options, isTyping, searchQuery, labelKey]);

  // Close dropdown on click outside and revert unselected typing
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchQuery('');
        if (selectedOption) {
          setInputValue(selectedOption.fullDisplay || selectedOption[labelKey] || selectedOption.name || '');
        } else {
          setInputValue('');
        }
        setHighlightedIndex(-1);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, selectedOption, labelKey]);

  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    setIsTyping(false);
    setSearchQuery('');
    setTimeout(() => {
      inputRef.current?.select();
    }, 10);
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    setSearchQuery(text);
    setIsTyping(true);
    if (!isOpen) setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleSelectOption = (opt) => {
    const optVal = opt ? opt[valueKey] : '';
    if (onChange) {
      onChange(optVal);
    }
    if (opt) {
      setInputValue(opt.fullDisplay || opt[labelKey] || opt.name || '');
    } else {
      setInputValue('');
    }
    setIsTyping(false);
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    if (e) e.stopPropagation();
    if (onChange) {
      onChange('');
    }
    setInputValue('');
    setIsTyping(false);
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      setIsTyping(false);
      setSearchQuery('');
      setInputValue(selectedOption ? (selectedOption.fullDisplay || selectedOption[labelKey] || selectedOption.name || '') : '');
    } else {
      setIsOpen(true);
      setIsTyping(false);
      setSearchQuery('');
      inputRef.current?.focus();
      setTimeout(() => {
        inputRef.current?.select();
      }, 10);
    }
  };

  const handleRedirectClick = (e, item) => {
    e.stopPropagation();
    setIsOpen(false);
    setIsTyping(false);
    if (onRedirect) {
      onRedirect(item);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length > 0) {
          handleSelectOption(filteredOptions[0]);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsTyping(false);
      setSearchQuery('');
      setInputValue(selectedOption ? (selectedOption.fullDisplay || selectedOption[labelKey] || selectedOption.name || '') : '');
      setHighlightedIndex(-1);
    }
  };

  // Helper to highlight matching text
  const renderHighlighted = (text, query) => {
    if (!query || !query.trim()) return text;
    const str = String(text || '');
    const lowerText = str.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return str;

    const before = str.substring(0, index);
    const match = str.substring(index, index + lowerQuery.length);
    const after = str.substring(index + lowerQuery.length);

    return (
      <>
        {before}
        <strong style={{ color: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.12)', borderRadius: '2px', padding: '0 1px' }}>
          {match}
        </strong>
        {after}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        zIndex: isOpen ? (zIndex + 50) : zIndex
      }}
    >
      {/* ── SEARCHABLE INPUT FIELD CONTAINER ── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minHeight: '42px',
          border: `1.5px solid ${isOpen ? '#3b82f6' : borderColor}`,
          borderRadius: '8px',
          backgroundColor: disabled ? '#f1f5f9' : backgroundColor,
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          boxSizing: 'border-box'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={() => {
            if (!disabled && !isOpen) {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.select(), 10);
            }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            padding: '9px 12px',
            fontSize: '0.88rem',
            color: disabled ? '#94a3b8' : '#0f172a',
            fontWeight: selectedOption && !isTyping ? '500' : '400',
            cursor: disabled ? 'not-allowed' : 'text',
            width: '100%',
            boxSizing: 'border-box'
          }}
        />

        {/* ── ACTION BUTTONS ON THE RIGHT ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '8px', flexShrink: 0 }}>
          {/* Clear button if text or value is present */}
          {(inputValue || value) && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              title="Clear selection"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
            >
              <X size={14} />
            </button>
          )}

          {/* Quick redirect button if value selected */}
          {selectedOption && onRedirect && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              title={`View ${selectedOption[labelKey] || selectedOption.name} details page`}
              onClick={(e) => handleRedirectClick(e, selectedOption)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff';
                e.currentTarget.style.color = '#2563eb';
              }}
            >
              <ArrowUpRight size={14} />
            </button>
          )}

          {/* Chevron dropdown toggle */}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={handleToggleDropdown}
            style={{
              background: 'none',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b'
            }}
          >
            <ChevronDown
              size={18}
              style={{
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            />
          </button>
        </div>
      </div>

      {/* ── DROPDOWN POPUP MENU (ONLY OPTIONS, NO REDUNDANT SEARCH BAR) ── */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Options List */}
          <div ref={listRef} style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {/* Clear / Placeholder Row */}
            <div
              onClick={() => handleSelectOption(null)}
              style={{
                padding: '8px 12px',
                fontSize: '0.86rem',
                color: '#64748b',
                cursor: 'pointer',
                backgroundColor: !value ? '#f1f5f9' : 'transparent',
                borderBottom: '1px solid #f1f5f9',
                fontStyle: 'italic'
              }}
              onMouseEnter={(e) => {
                if (value) e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                if (value) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {placeholder}
            </div>

            {filteredOptions.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                {isTyping && searchQuery.trim() ? `No options matching "${searchQuery}"` : emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optVal = opt[valueKey];
                const isSelected = value && optVal !== undefined && optVal !== null && optVal.toString() === value.toString();
                const isHighlighted = highlightedIndex === index;
                const isHover = hoveredId === (opt.id || opt.name || optVal);
                const optLabel = opt.fullDisplay || opt[labelKey] || opt.name || '';

                return (
                  <div
                    key={opt.id || opt.name || optVal}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => {
                      setHoveredId(opt.id || opt.name || optVal);
                      setHighlightedIndex(index);
                    }}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      backgroundColor: isSelected
                        ? '#2563eb'
                        : (isHighlighted || isHover ? '#f1f5f9' : '#ffffff'),
                      color: isSelected ? '#ffffff' : '#1e293b',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background-color 0.1s ease'
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginRight: '8px',
                        fontWeight: isSelected ? '600' : '400'
                      }}
                    >
                      {isSelected ? optLabel : renderHighlighted(optLabel, searchQuery)}
                      {opt.group_code && !opt.fullDisplay ? ` (${opt.group_code})` : ''}
                    </span>

                    {/* Arrow redirect icon right in the dropdown row */}
                    {onRedirect && (
                      <button
                        type="button"
                        tabIndex={-1}
                        title={`View ${opt[labelKey] || opt.name} page`}
                        onClick={(e) => handleRedirectClick(e, opt)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          border: isSelected ? '1px solid rgba(255,255,255,0.7)' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#2563eb',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.color = '#2563eb';
                          e.currentTarget.style.borderColor = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isSelected ? 'rgba(255,255,255,0.2)' : '#ffffff';
                          e.currentTarget.style.color = isSelected ? '#ffffff' : '#2563eb';
                          e.currentTarget.style.borderColor = isSelected ? 'rgba(255,255,255,0.7)' : '#cbd5e1';
                        }}
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelectWithArrow;
