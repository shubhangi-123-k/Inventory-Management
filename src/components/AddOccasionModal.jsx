import { useState, useEffect } from 'react';
import { X, Calendar, Sparkles } from 'lucide-react';
import api from '../api/axios';
import SuggestionInput from './SuggestionInput';

const AddOccasionModal = ({ isOpen, onClose, onOccasionAdded, defaultType = 'Festival', availableTypes = [] }) => {
  const [occasionType, setOccasionType] = useState(defaultType);
  const [types, setTypes] = useState(availableTypes.length > 0 ? availableTypes : ['Festival', 'Season', 'Event', 'Other']);
  const [existingOccasions, setExistingOccasions] = useState([]);
  const [occasionName, setOccasionName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (availableTypes && availableTypes.length > 0) {
      setTypes(availableTypes);
    } else {
      api.get('/admin/occasions/types')
        .then(res => {
          const list = res.data?.data || res.data || [];
          if (Array.isArray(list) && list.length > 0) setTypes(list);
        })
        .catch(() => {});
    }
  }, [availableTypes, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    api.get('/admin/occasions')
      .then(res => {
        const list = res.data?.data || res.data || [];
        setExistingOccasions(Array.isArray(list) ? list : []);
      })
      .catch(() => setExistingOccasions([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations: Required fields
    if (!occasionType || !occasionType.trim()) {
      setErrorMsg('Occasion Type is required');
      return;
    }
    if (!occasionName || !occasionName.trim()) {
      setErrorMsg('Occasion Name is required');
      return;
    }

    // Validation: Start Date <= End Date
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        setErrorMsg('Start Date must be before or equal to End Date');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await api.post('/admin/occasions', {
        occasion_type: occasionType.trim(),
        occasion_name: occasionName.trim(),
        description: description ? description.trim() : null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: status || 'Active',
      });

      const newOccasion = res.data?.data || res.data;
      if (onOccasionAdded) {
        onOccasionAdded(newOccasion);
      }
      onClose();
      // Reset form
      setOccasionName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setStatus('Active');
    } catch (err) {
      console.error('Failed to create occasion:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create occasion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '520px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 16px 28px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <X size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#ede9fe', padding: '8px', borderRadius: '10px', color: '#4338ca' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Add New Occasion</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Create festival, season, or event</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="custom-modal-scroll" style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Occasion Type */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Occasion Type *
              </label>
              <select
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                value={occasionType}
                onChange={(e) => setOccasionType(e.target.value)}
              >
                {types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Occasion Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Occasion Name *
              </label>
              <SuggestionInput id="occasion-name-input" value={occasionName} onChange={setOccasionName} suggestions={existingOccasions.filter(occasion => !occasionType || occasion.occasion_type === occasionType).map(occasion => occasion.occasion_name || occasion.name).filter(Boolean)} itemType="Occasion" required placeholder="e.g. Diwali, Winter, Wedding, New Year..." inputStyle={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc' }} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                placeholder="Optional description..."
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', minHeight: '65px', resize: 'vertical', fontSize: '0.9rem' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Dates: Start Date & End Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Status
              </label>
              <select
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.9rem' }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '9px 18px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '9px 24px',
                  border: 'none',
                  backgroundColor: '#4338ca',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.3)',
                }}
              >
                {saving ? 'Saving...' : 'Save Occasion'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddOccasionModal;
