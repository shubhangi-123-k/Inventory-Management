import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProductTypesTab from '../components/masters/ProductTypesTab';

const ProductTypes = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Dashboard</span>
        <ChevronRight size={14} />
        <span style={{ color: '#0f172a', fontWeight: '600' }}>Product Types</span>
      </div>
      <ProductTypesTab />
    </div>
  );
};

export default ProductTypes;
