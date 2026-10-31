import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus } from 'lucide-react';
import Pagination from '../components/Pagination';
import SuggestionInput from '../components/SuggestionInput';

const Attributes = () => {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('String');
  const [uom, setUom] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/admin/attributes/${id}`, { status: newStatus });
      fetchAttributes();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/attributes');
      setAttributes(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Attributes fetch error", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/attributes', { 
        name, 
        data_type: dataType, 
        uom, 
        is_required: isRequired 
      });
      setName('');
      setDataType('String');
      setUom('');
      setIsRequired(false);
      setShowForm(false);
      fetchAttributes();
    } catch (error) {
      console.error("Failed to create attribute", error);
      alert("Failed to create attribute");
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Product Attributes</h1>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Add Attribute'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.125rem', fontWeight: '600' }}>Create New Attribute</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label className="form-label">Attribute Name</label>
              <SuggestionInput id="attribute-name-input" value={name} onChange={setName} suggestions={attributes} itemType="Attribute" required inputStyle={{ padding: '10px 12px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
              <label className="form-label">Data Type</label>
              <select className="form-control" value={dataType} onChange={(e) => setDataType(e.target.value)}>
                <option value="String">String</option>
                <option value="Number">Number</option>
                <option value="Boolean">Boolean</option>
                <option value="Date">Date</option>
                <option value="List">List</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px' }}>
              <label className="form-label">UOM (Optional)</label>
              <SuggestionInput id="attribute-uom-input" value={uom} onChange={setUom} suggestions={[...new Set(attributes.map(attribute => attribute.uom).filter(Boolean))]} itemType="Unit" placeholder="e.g. kg, cm" inputStyle={{ padding: '10px 12px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px', display: 'flex', alignItems: 'center', height: '42px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
                Required
              </label>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Save</button>
          </form>
        </div>
      )}

      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Sr. No.</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>ID</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Name</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Data Type</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>UOM</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Required</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading attributes...</td></tr>
            ) : attributes.length > 0 ? (
              attributes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((attr, idx) => (
                <tr key={attr.id}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>#{attr.id}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>{attr.name}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{attr.data_type}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', color: 'var(--text-muted)' }}>{attr.uom || '-'}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{attr.is_required ? 'Yes' : 'No'}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div 
                        onClick={() => handleToggleStatus(attr.id, attr.status)}
                        style={{ 
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: attr.status === 'Active' ? 'flex-end' : 'flex-start',
                          width: '40px',
                          height: '22px',
                          background: attr.status === 'Active' ? 'var(--primary)' : '#cbd5e1',
                          borderRadius: '11px',
                          padding: '2px',
                          transition: 'background 0.2s',
                          marginRight: '8px',
                          verticalAlign: 'middle'
                        }}
                        title="Toggle Status"
                      >
                        <div style={{ 
                          width: '18px', 
                          height: '18px', 
                          background: '#fff', 
                          borderRadius: '50%',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                      <span style={{ verticalAlign: 'middle', fontSize: '0.875rem', color: attr.status === 'Active' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {attr.status || 'Active'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>No attributes found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={attributes.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default Attributes;
