import React from 'react';

const SearchAutocomplete = ({ value, onChange, placeholder, style, className }) => {
  return (
    <div style={{ flex: style?.flex || '1 1 200px', ...style }}>
      <input 
        type="text" 
        className={className || "form-control"} 
        placeholder={placeholder || "Search..."}
        style={{ width: '100%', boxSizing: 'border-box' }} 
        value={value} 
        onChange={onChange}
      />
    </div>
  );
};

export default SearchAutocomplete;
