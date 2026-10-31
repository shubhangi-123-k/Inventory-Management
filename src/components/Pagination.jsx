import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalItems === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          padding: '14px 24px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #eaecf0',
          fontSize: '0.85rem',
          color: '#64748b'
        }}
      >
        <span>0 to 0 of 0</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" disabled style={disabledBtnStyle}>
            <ChevronsLeft size={16} />
          </button>
          <button type="button" disabled style={disabledBtnStyle}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ color: '#475569', fontSize: '0.85rem' }}>Page 1 of 1</span>
          <button type="button" disabled style={disabledBtnStyle}>
            <ChevronRight size={16} />
          </button>
          <button type="button" disabled style={disabledBtnStyle}>
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const isFirstDisabled = currentPage <= 1;
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;
  const isLastDisabled = currentPage >= totalPages;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        padding: '14px 24px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #eaecf0',
        fontSize: '0.85rem'
      }}
    >
      {/* "1 to 5 of 12" */}
      <span style={{ color: '#475569', fontSize: '0.86rem', userSelect: 'none' }}>
        {startItem} to {endItem} of {totalItems}
      </span>

      {/* Navigation Controls: |<  <  Page 1 of 3  >  >| */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* First Page Button |< */}
        <button
          type="button"
          onClick={() => !isFirstDisabled && onPageChange && onPageChange(1)}
          disabled={isFirstDisabled}
          title="First Page"
          style={isFirstDisabled ? disabledBtnStyle : activeBtnStyle}
          onMouseEnter={(e) => {
            if (!isFirstDisabled) e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            if (!isFirstDisabled) e.currentTarget.style.color = '#64748b';
          }}
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page Button < */}
        <button
          type="button"
          onClick={() => !isPrevDisabled && onPageChange && onPageChange(currentPage - 1)}
          disabled={isPrevDisabled}
          title="Previous Page"
          style={isPrevDisabled ? disabledBtnStyle : activeBtnStyle}
          onMouseEnter={(e) => {
            if (!isPrevDisabled) e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            if (!isPrevDisabled) e.currentTarget.style.color = '#64748b';
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page text: Page 1 of 3 */}
        <span
          style={{
            color: '#334155',
            fontSize: '0.86rem',
            margin: '0 4px',
            userSelect: 'none'
          }}
        >
          Page <strong style={{ fontWeight: '600' }}>{currentPage}</strong> of{' '}
          <strong style={{ fontWeight: '600' }}>{totalPages}</strong>
        </span>

        {/* Next Page Button > */}
        <button
          type="button"
          onClick={() => !isNextDisabled && onPageChange && onPageChange(currentPage + 1)}
          disabled={isNextDisabled}
          title="Next Page"
          style={isNextDisabled ? disabledBtnStyle : activeBtnStyle}
          onMouseEnter={(e) => {
            if (!isNextDisabled) e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            if (!isNextDisabled) e.currentTarget.style.color = '#64748b';
          }}
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page Button >| */}
        <button
          type="button"
          onClick={() => !isLastDisabled && onPageChange && onPageChange(totalPages)}
          disabled={isLastDisabled}
          title="Last Page"
          style={isLastDisabled ? disabledBtnStyle : activeBtnStyle}
          onMouseEnter={(e) => {
            if (!isLastDisabled) e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            if (!isLastDisabled) e.currentTarget.style.color = '#64748b';
          }}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

const activeBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  padding: '6px',
  borderRadius: '4px',
  color: '#64748b',
  cursor: 'pointer',
  transition: 'color 0.15s ease',
  outline: 'none'
};

const disabledBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  padding: '6px',
  borderRadius: '4px',
  color: '#cbd5e1',
  cursor: 'not-allowed',
  outline: 'none'
};

export default Pagination;
