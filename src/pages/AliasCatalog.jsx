import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import AliasCatalogTab from '../components/masters/AliasCatalogTab';

const AliasCatalog = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Dashboard</span>
        <ChevronRight size={14} />
        <span style={{ color: '#0f172a', fontWeight: '600' }}>Alias Master</span>
      </div>
      <AliasCatalogTab />
    </div>
  );
};

export default AliasCatalog;
