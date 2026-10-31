import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { Plus, Edit2, Trash2, Eye, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchAutocomplete from '../components/SearchAutocomplete';
import SuggestionInput from '../components/SuggestionInput';
import PhotoUploader from '../components/PhotoUploader';
import Pagination from '../components/Pagination';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { extractGroupMedia } from '../utils/mediaUtils';

const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/groups');
      const raw = response.data?.data || response.data || [];
      setGroups(Array.isArray(raw) ? raw.map(extractGroupMedia) : []);
      setLoading(false);
    } catch (error) {
      console.error("Groups fetch error", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedName = name.trim().toLocaleLowerCase();
    const duplicateGroup = groups.find(group =>
      String(group.id) !== String(editId || '') &&
      String(group.name || group.group_name || '').trim().toLocaleLowerCase() === normalizedName
    );
    if (normalizedName && duplicateGroup) {
      alert(`Group "${duplicateGroup.name || duplicateGroup.group_name}" already exists. Select it from the suggestions to view it.`);
      return;
    }
    try {
      const payload = { 
        name: name.trim(), 
        description,
        images,
        image_url: images.length > 0 ? images[0] : null,
        image: images.length > 0 ? images[0] : null
      };
      if (editId) {
        await api.put(`/admin/groups/${editId}`, payload);
      } else {
        await api.post('/admin/groups', payload);
      }
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error("Failed to save group", error);
      alert(error.response?.data?.error || "Failed to save group");
    }
  };

  const handleEdit = (group) => {
    const norm = extractGroupMedia(group);
    setEditId(norm.id);
    setName(norm.name || '');
    setDescription(norm.description || '');
    setImages(norm.images || []);
    setShowForm(true);
  };

  const handleConfirmDeleteGroup = async (reason) => {
    if (!deletingGroup) return;
    try {
      setDeleteGroupLoading(true);
      await api.delete(`/admin/groups/${deletingGroup.id}`, {
        data: { reason }
      });
      setDeletingGroup(null);
      fetchGroups();
    } catch (error) {
      console.error("Failed to delete group:", error);
      alert(error.response?.data?.error || "Failed to delete group");
    } finally {
      setDeleteGroupLoading(false);
    }
  };

  const handleStatusToggle = async (group) => {
    try {
      const newStatus = group.status === 'Active' ? 'Inactive' : 'Active';
      await api.put(`/admin/groups/${group.id}`, {
        name: group.name,
        description: group.description,
        status: newStatus
      });
      fetchGroups();
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status");
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setImages([]);
    setShowForm(false);
  };

  const redirectToSuggestedGroup = (field, value) => {
    const normalizedValue = value.trim().toLowerCase();
    const matchedGroup = groups.find(group =>
      group[field]?.trim().toLowerCase() === normalizedValue
    );
    if (matchedGroup) {
      resetForm();
      navigate(`/groups/${matchedGroup.id}`);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination for 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Groups</h1>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => showForm ? resetForm() : setShowForm(true)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Add Group'}
        </button>
      </div>

      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--surface)', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                {editId ? 'Edit Group' : 'Create New Group'}
              </h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Group Name <span style={{ color: 'red' }}>*</span></label>
                <SuggestionInput
                  id="group-name-input"
                  value={name}
                  onChange={setName}
      suggestions={groups.map(group => group.name || group.group_name).filter(Boolean)}
                  itemType="Group"
                  onRedirect={(value) => redirectToSuggestedGroup('name', value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <SuggestionInput
                  id="group-description-input"
                  value={description}
                  onChange={setDescription}
                  suggestions={groups.map(group => group.description).filter(Boolean)}
                  itemType="Group Description"
                  onRedirect={(value) => redirectToSuggestedGroup('description', value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Group Images (Optional)</label>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{images.length} photo(s) selected</span>
                </div>
                <PhotoUploader images={images} onChange={setImages} maxFiles={5} compact={true} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <SearchAutocomplete
          placeholder="Search groups..."
          className="form-control"
          style={{ maxWidth: '300px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative' }}>
        <table>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <th style={{ width: '60px', textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white' }}>Sr. No.</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white' }}>ID</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white' }}>Image</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white' }}>Group Code</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white' }}>Name</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white' }}>Description</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white' }}>Status</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50', color: 'white' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center' }}>Loading groups...</td></tr>
            ) : paginatedGroups.length > 0 ? (
              paginatedGroups.map((group, index) => (
                <tr key={group.id}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>{(currentPage - 1) * 10 + index + 1}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>#{group.id}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    {((group.images && group.images.length > 0) || group.image_url || group.image) ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                          src={(group.images && group.images[0]) || group.image_url || group.image} 
                          alt={group.name} 
                          style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                        />
                        {group.images && group.images.length > 1 && (
                          <span style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            fontSize: '0.62rem',
                            fontWeight: '700',
                            borderRadius: '8px',
                            padding: '1px 4px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            lineHeight: 1
                          }}>
                            +{group.images.length - 1}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ width: '38px', height: '38px', borderRadius: '6px', backgroundColor: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '600', color: '#64748b' }}>{group.group_code || '-'}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>{group.name}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', color: 'var(--text-muted)' }}>{group.description || '-'}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div
                        onClick={() => handleStatusToggle(group)}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: group.status === 'Active' ? 'flex-end' : 'flex-start',
                          width: '40px',
                          height: '22px',
                          background: group.status === 'Active' ? 'var(--primary)' : '#cbd5e1',
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
                      <span style={{ verticalAlign: 'middle', fontSize: '0.875rem', color: group.status === 'Active' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {group.status || 'Active'}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button onClick={() => navigate(`/groups/${group.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }} title="View"><Eye size={16} color="#3498db" /></button>
                      <button onClick={() => handleEdit(group)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }} title="Edit"><Edit2 size={16} color="var(--primary)" /></button>
                      <button onClick={() => setDeletingGroup(group)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Delete"><Trash2 size={16} color="var(--danger)" /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="8" style={{ textAlign: 'center' }}>No groups found.</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredGroups.length}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </div>

      <DeleteConfirmationModal
        isOpen={!!deletingGroup}
        title="Delete Group"
        itemName={deletingGroup ? `Group "${deletingGroup.name}"` : ''}
        onClose={() => setDeletingGroup(null)}
        onConfirm={handleConfirmDeleteGroup}
        isLoading={deleteGroupLoading}
      />
    </div>
  );
};

export default Groups;
