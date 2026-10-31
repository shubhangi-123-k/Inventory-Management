import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';

const AttributeBuilder = ({ attributes, setAttributes }) => {
  const [availableLabels, setAvailableLabels] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const res = await api.get('/attributes');
      setAvailableLabels(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (_err) {
      // Attribute labels endpoint is optional or not yet deployed on backend
      setAvailableLabels([]);
    }
  };

  const handleAddAttribute = () => {
    setAttributes([...attributes, { name: '', value: '' }]);
  };

  const handleRemoveAttribute = (index) => {
    const newAttrs = attributes.filter((_, i) => i !== index);
    setAttributes(newAttrs);
  };

  const handleChange = (index, field, value) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = value;
    setAttributes(newAttrs);
  };

  const handleAddNewLabelSubmit = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    
    try {
      // Hit the backend to save it permanently!
      const res = await api.post('/attributes', { name: newLabel });
      const createdLabel = res.data;
      
      // Add the real label from the database to our dropdown
      setAvailableLabels([...availableLabels, createdLabel]);
      
      // Automatically select it for the latest attribute row if any exists
      if (attributes.length > 0) {
         handleChange(attributes.length - 1, 'name', createdLabel.name);
      } else {
         setAttributes([{ name: createdLabel.name, value: '' }]);
      }
      
      setNewLabel('');
      setIsAddingNew(false);
    } catch (err) {
      console.error('Error creating attribute label', err);
      alert('Failed to create attribute label');
    }
  };

  return (
    <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', color: '#1e293b' }}>Product Attributes</h3>
      
      {attributes.map((attr, index) => (
        <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <select
              style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px' }}
              value={attr.name}
              onChange={(e) => handleChange(index, 'name', e.target.value)}
            >
              <option value="">Select Label (e.g. Color)</option>
              {availableLabels.map((label, idx) => (
                <option key={`${label.name}-${idx}`} value={label.name}>{label.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Value (e.g. Red)"
              style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px' }}
              value={attr.value}
              onChange={(e) => handleChange(index, 'value', e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemoveAttribute(index)}
            style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={handleAddAttribute}
          style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Add Attribute
        </button>
        
        <button
          type="button"
          onClick={() => setIsAddingNew(!isAddingNew)}
          style={{ backgroundColor: '#ecf0f1', color: '#2c3e50', border: '1px solid #bdc3c7', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Can't find attribute? Create New
        </button>
      </div>

      {isAddingNew && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Type new label name..."
            style={{ flex: 1, padding: '8px', border: '1px solid #bdc3c7', borderRadius: '4px' }}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button
            type="button"
            onClick={handleAddNewLabelSubmit}
            style={{ backgroundColor: '#1abc9c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Create Label
          </button>
        </div>
      )}
    </div>
  );
};

export default AttributeBuilder;
