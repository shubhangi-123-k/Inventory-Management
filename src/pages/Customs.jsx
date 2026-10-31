import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus } from 'lucide-react';
import Pagination from '../components/Pagination';

const Customs = () => {
  const [customs, setCustoms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [globalHs6, setGlobalHs6] = useState('');
  const [localTariffHsn, setLocalTariffHsn] = useState('');
  const [importDuty, setImportDuty] = useState('');
  
  const [countries, setCountries] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customsRes, countriesRes] = await Promise.all([
        api.get('/admin/customs'),
        api.get('/admin/countries')
      ]);
      setCustoms(customsRes.data.data || []);
      setCountries(countriesRes.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Customs fetch error", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/customs', { 
        country_code: countryCode, 
        global_hs6: globalHs6, 
        local_tariff_hsn_code: localTariffHsn, 
        import_duty_percentage: importDuty,
        status: 'Active' 
      });
      setCountryCode(''); setGlobalHs6(''); setLocalTariffHsn(''); setImportDuty('');
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error("Failed to create customs record", error);
      alert("Failed to create customs record");
    }
  };

  const getCountryName = (id) => countries.find(c => c.id === id)?.country_name || `Country #${id}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Customs & Tariffs</h1>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Add Tariff'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.125rem', fontWeight: '600' }}>Create New Tariff Record</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
              <label className="form-label">Country</label>
              <select className="form-control" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} required>
                <option value="">Select...</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.country_name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
              <label className="form-label">Global HS6</label>
              <input type="text" className="form-control" placeholder="1234.56" value={globalHs6} onChange={(e) => setGlobalHs6(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
              <label className="form-label">Local Tariff HSN</label>
              <input type="text" className="form-control" placeholder="1234.56.78" value={localTariffHsn} onChange={(e) => setLocalTariffHsn(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px' }}>
              <label className="form-label">Duty %</label>
              <input type="number" step="0.01" className="form-control" placeholder="10.0" value={importDuty} onChange={(e) => setImportDuty(e.target.value)} />
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
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Country</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Global HS6</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Local HSN</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Import Duty</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: '#ffffff' }}>Verification</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading customs records...</td></tr>
            ) : customs.length > 0 ? (
              customs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((c, idx) => (
                <tr key={c.record_id}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>{getCountryName(c.country_code)}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{c.global_hs6}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{c.local_tariff_hsn_code}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{c.import_duty_percentage ? `${c.import_duty_percentage}%` : '-'}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <span className="badge" style={{ background: c.verification_status === 'Verified' ? '#dcfce7' : '#fef3c7', color: c.verification_status === 'Verified' ? '#166534' : '#b45309' }}>
                      {c.verification_status || 'Needs Verification'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No customs records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={customs.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default Customs;
