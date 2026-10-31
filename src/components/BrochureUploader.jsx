import React, { useState, useRef, useEffect } from 'react';
import { FileText, X, Download, Plus, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';

const MAX_FILES = 5;

const readFileAsDataUrl = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });

const BrochureUploader = ({
  brochureUrl = '',
  brochureName = '',
  onChange,
  label = 'Product Brochure',
  hideLabel = false,
  brochures,
  onBrochuresChange,
}) => {
  const isMulti = Array.isArray(brochures) && typeof onBrochuresChange === 'function';

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [zoomItem, setZoomItem] = useState(null);

  const fileInputRef = useRef(null);

  const uploadFile = async (file) => {
    const fileName = file.name || 'Brochure.pdf';
    const localUrl = await readFileAsDataUrl(file);
    try {
      const formData = new FormData();
      formData.append('brochure', file);
      formData.append('image', file);
      formData.append('folder', 'brochures');
      let res;
      try {
        res = await api.post('/upload/brochure', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 8000 });
      } catch {
        res = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 8000 });
      }
      if (res?.data?.url) return { url: res.data.url, name: fileName };
    } catch (err) {
      console.warn('Backend upload failed, using local preview:', err);
    }
    return { url: localUrl, name: fileName };
  };

  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) return;
    const current = isMulti ? brochures : (brochureUrl ? [{ url: brochureUrl, name: brochureName }] : []);
    const remaining = MAX_FILES - current.length;
    if (remaining <= 0) return;
    setUploading(true);
    const filesToProcess = Array.from(files).slice(0, remaining);
    const results = await Promise.all(filesToProcess.map(uploadFile));
    setUploading(false);
    if (isMulti) {
      onBrochuresChange([...current, ...results]);
    } else {
      if (results[0]) onChange(results[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAt = (idx) => {
    if (isMulti) {
      onBrochuresChange(brochures.filter((_, i) => i !== idx));
    } else {
      onChange({ url: '', name: '' });
    }
  };

  const downloadItem = (item) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.name || 'Brochure';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isPdf = (item) =>
    item?.name?.toLowerCase().endsWith('.pdf') ||
    item?.url?.includes('.pdf') ||
    item?.url?.startsWith('data:application/pdf');

  const isImageFile = (item) =>
    item?.url?.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(item?.url || '');

  const items = isMulti
    ? brochures
    : brochureUrl
    ? [{ url: brochureUrl, name: brochureName }]
    : [];

  const canAddMore = items.length < MAX_FILES;

  return (
    <div>
      <style>{`
        @keyframes brochureZoomFadeIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
        .brochure-thumb:hover .brochure-overlay { background-color: rgba(0,0,0,0.28) !important; }
        .brochure-thumb:hover .brochure-zoom-icon { opacity: 1 !important; }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {!hideLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
            {label}
          </label>
          <span style={{ fontSize: '0.72rem', color: items.length > 0 ? '#16a34a' : '#94a3b8', fontWeight: '600' }}>
            {items.length}/{MAX_FILES} added
          </span>
        </div>
      )}

      {/* Grid of uploaded items + Add More tile */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          {items.map((item, idx) => {
            const isImg = isImageFile(item);
            const isPd = isPdf(item);
            return (
              <div
                key={idx}
                className="brochure-thumb"
                style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '10px', border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'transform 0.15s ease, box-shadow 0.15s ease', flexShrink: 0 }}
                title="Click to preview · Double-click to zoom"
                onClick={() => { setPreviewIdx(idx); setShowPreviewModal(true); }}
                onDoubleClick={(e) => { e.stopPropagation(); setZoomItem(item); }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.14)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'; }}
              >
                {isImg ? (
                  <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: '#eff6ff' }}>
                    <FileText size={26} color="#2563eb" />
                    <span style={{ fontSize: '0.6rem', color: '#2563eb', fontWeight: '700', textTransform: 'uppercase' }}>{isPd ? 'PDF' : 'DOC'}</span>
                  </div>
                )}

                {/* Hover overlay with zoom icon */}
                <div className="brochure-overlay" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0)', transition: 'background-color 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ZoomIn className="brochure-zoom-icon" size={22} color="#fff" style={{ opacity: 0, transition: 'opacity 0.15s ease', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                </div>

                {/* Remove × */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeAt(idx); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239,68,68,0.92)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
                  title="Remove"
                >
                  <X size={11} />
                </button>

                {/* Name strip */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.54rem', padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>
                  {item.name || 'Brochure'}
                </div>
              </div>
            );
          })}

          {/* Add More tile */}
          {canAddMore && (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFilesSelected(e.dataTransfer.files); }}
              style={{ width: '90px', height: '90px', borderRadius: '10px', border: dragActive ? '2px dashed #4338ca' : '2px dashed #c7d2fe', backgroundColor: dragActive ? '#eef2ff' : '#f5f3ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', flexShrink: 0 }}
              title={`Add more (max ${MAX_FILES})`}
            >
              {uploading ? (
                <div style={{ fontSize: '0.62rem', color: '#6366f1', fontWeight: '700', textAlign: 'center', padding: '0 6px' }}>Uploading…</div>
              ) : (
                <>
                  <Plus size={22} color="#6366f1" />
                  <span style={{ fontSize: '0.62rem', color: '#6366f1', fontWeight: '700' }}>Add More</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty drop zone */}
      {items.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFilesSelected(e.dataTransfer.files); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{ border: dragActive ? '2px dashed #4338ca' : '2px dashed #cbd5e1', borderRadius: '12px', padding: '28px 16px', backgroundColor: dragActive ? '#eef2ff' : '#f8fafc', textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ backgroundColor: '#ede9fe', padding: '10px', borderRadius: '50%', color: '#4338ca' }}>
              <FileText size={24} />
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#1e293b' }}>
              {uploading ? 'Uploading…' : `Click to upload Brochure (up to ${MAX_FILES} files)`}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              PDF, PNG, JPG, DOC · Max 25MB each · Double-click thumbnail to zoom
            </div>
          </div>
        </div>
      )}

      {/* ── ZOOM MODAL ── */}
      {zoomItem && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'brochureZoomFadeIn 0.18s ease' }}
          onClick={() => setZoomItem(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <button type="button" onClick={() => setZoomItem(null)}
              style={{ position: 'absolute', top: '-14px', right: '-14px', background: '#fff', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
              <X size={16} />
            </button>

            {isImageFile(zoomItem) ? (
              <img src={zoomItem.url} alt={zoomItem.name} style={{ maxWidth: '88vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
            ) : isPdf(zoomItem) ? (
              <iframe src={zoomItem.url} title="PDF Zoom" style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: '10px' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#fff', padding: '40px' }}>
                <FileText size={60} style={{ marginBottom: '16px', opacity: 0.8 }} />
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{zoomItem.name}</p>
                <button type="button" onClick={() => downloadItem(zoomItem)}
                  style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#4338ca', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={15} /> Download File
                </button>
              </div>
            )}

            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem' }}>
              {zoomItem.name} &nbsp;·&nbsp; Click outside or × to close
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW CAROUSEL MODAL ── */}
      {showPreviewModal && items.length > 0 && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderRadius: '16px', maxWidth: '860px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>
                  {items[previewIdx]?.name || 'Brochure Preview'}
                </h3>
                {items.length > 1 && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({previewIdx + 1} / {items.length})</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button type="button" onClick={() => downloadItem(items[previewIdx])}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                  <Download size={14} /> Download
                </button>
                <button type="button" onClick={() => { setZoomItem(items[previewIdx]); setShowPreviewModal(false); }}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                  <ZoomIn size={14} /> Zoom
                </button>
                <button type="button" onClick={() => setShowPreviewModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isImageFile(items[previewIdx]) ? (
                <img src={items[previewIdx].url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              ) : isPdf(items[previewIdx]) ? (
                <iframe src={items[previewIdx].url} title="PDF Preview" style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '8px' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <FileText size={48} color="#dc2626" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ margin: 0, fontWeight: '600', color: '#1e293b' }}>{items[previewIdx]?.name}</p>
                  <button type="button" onClick={() => downloadItem(items[previewIdx])}
                    style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#4338ca', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                    <Download size={15} /> Download File
                  </button>
                </div>
              )}
            </div>

            {/* Navigation */}
            {items.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                <button type="button" onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))} disabled={previewIdx === 0}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: previewIdx === 0 ? 'not-allowed' : 'pointer', opacity: previewIdx === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#334155', fontSize: '0.82rem' }}>
                  <ChevronLeft size={15} /> Prev
                </button>
                {items.map((_, i) => (
                  <button key={i} type="button" onClick={() => setPreviewIdx(i)}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: i === previewIdx ? '#4338ca' : '#e2e8f0', cursor: 'pointer', color: i === previewIdx ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: '700' }}>
                    {i + 1}
                  </button>
                ))}
                <button type="button" onClick={() => setPreviewIdx(Math.min(items.length - 1, previewIdx + 1))} disabled={previewIdx === items.length - 1}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: previewIdx === items.length - 1 ? 'not-allowed' : 'pointer', opacity: previewIdx === items.length - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#334155', fontSize: '0.82rem' }}>
                  Next <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrochureUploader;
