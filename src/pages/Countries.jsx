import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus } from 'lucide-react';
import Pagination from '../components/Pagination';
import SuggestionInput from '../components/SuggestionInput';

const Countries = () => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [iso2, setIso2] = useState('');
  const [iso3, setIso3] = useState('');
  const [countryName, setCountryName] = useState('');
  const [region, setRegion] = useState('');
  const [currency, setCurrency] = useState('');

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/admin/countries/${id}`, { status: newStatus });
      fetchCountries();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/countries');
      setCountries(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Countries fetch error", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/countries', { 
        iso2, 
        iso3, 
        country_name: countryName, 
        region, 
        currency,
        status: 'Active' 
      });
      setIso2(''); setIso3(''); setCountryName(''); setRegion(''); setCurrency('');
      setShowForm(false);
      fetchCountries();
    } catch (error) {
      console.error("Failed to create country", error);
      alert("Failed to create country");
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Countries & Regions</h1>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Add Country'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.125rem', fontWeight: '600' }}>Create New Country</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label className="form-label">Country Name</label>
              <SuggestionInput id="country-name-input" value={countryName} onChange={setCountryName} suggestions={countries.map(country => country.country_name || country.name).filter(Boolean)} itemType="Country" required inputStyle={{ padding: '10px 12px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px' }}>
              <label className="form-label">ISO2</label>
              <SuggestionInput id="country-iso2-input" value={iso2} onChange={setIso2} suggestions={countries.map(country => country.iso2).filter(Boolean)} itemType="ISO2 Code" placeholder="US" maxLength={2} required inputStyle={{ padding: '10px 12px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px' }}>
              <label className="form-label">ISO3</label>
              <SuggestionInput id="country-iso3-input" value={iso3} onChange={setIso3} suggestions={countries.map(country => country.iso3).filter(Boolean)} itemType="ISO3 Code" placeholder="USA" maxLength={3} required inputStyle={{ padding: '10px 12px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
              <label className="form-label">Region</label>
              <SuggestionInput id="country-region-input" value={region} onChange={setRegion} suggestions={[...new Set(countries.map(country => country.region).filter(Boolean))]} itemType="Region" placeholder="North America" inputStyle={{ padding: '10px 12px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px' }}>
              <label className="form-label">Currency</label>
              <SuggestionInput id="country-currency-input" value={currency} onChange={setCurrency} suggestions={[...new Set(countries.map(country => country.currency).filter(Boolean))]} itemType="Currency" placeholder="USD" inputStyle={{ padding: '10px 12px' }} />
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
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Name</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>ISO2/ISO3</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Region</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Currency</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading countries...</td></tr>
            ) : countries.length > 0 ? (
              countries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((c, idx) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>{c.country_name}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{c.iso2} / {c.iso3}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{c.region || '-'}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', color: 'var(--text-muted)' }}>{c.currency || '-'}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div 
                        onClick={() => handleToggleStatus(c.id, c.status)}
                        style={{ 
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: c.status === 'Active' ? 'flex-end' : 'flex-start',
                          width: '40px',
                          height: '22px',
                          background: c.status === 'Active' ? 'var(--primary)' : '#cbd5e1',
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
                      <span style={{ verticalAlign: 'middle', fontSize: '0.875rem', color: c.status === 'Active' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {c.status || 'Active'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No countries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={countries.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default Countries;
