import { useState, useRef } from 'react';
import { Upload, X, Star, Loader2, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';

const PhotoUploader = ({ images = [], onChange, maxFiles = 5, compact = false }) => {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [zoomItem, setZoomItem] = useState(null);       // url string for zoom modal
  const [zoomIdx, setZoomIdx] = useState(0);             // index for carousel nav in zoom
  const fileInputRef = useRef(null);

  const readFileAsDataUrl = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setErrorMsg('');

    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setErrorMsg('Please select valid image files (JPEG, PNG, WEBP, GIF)');
      return;
    }

    const availableSlots = maxFiles - images.length;
    if (availableSlots <= 0) {
      setErrorMsg(`Maximum limit of ${maxFiles} photos reached.`);
      return;
    }

    const filesToUpload = validFiles.slice(0, availableSlots);
    if (validFiles.length > availableSlots) {
      setErrorMsg(`Added ${availableSlots} photo(s). Maximum allowed is ${maxFiles}.`);
    }

    setUploading(true);

    try {
      // 1. Read files locally first for immediate instant preview
      const localUrls = await Promise.all(filesToUpload.map(f => readFileAsDataUrl(f)));
      const baseImages = [...images, ...localUrls];
      onChange(baseImages);

      // 2. Try uploading to backend / S3 with timeout so it never hangs indefinitely
      const uploadTimeout = 8000;
      const formData = new FormData();

      if (filesToUpload.length === 1) {
        formData.append('image', filesToUpload[0]);
        const res = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: uploadTimeout
        });
        if (res.data?.url) {
          onChange([...images, res.data.url]);
        }
      } else {
        filesToUpload.forEach(file => {
          formData.append('images', file);
        });
        const res = await api.post('/upload/images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: uploadTimeout
        });
        if (res.data?.urls && Array.isArray(res.data.urls)) {
          onChange([...images, ...res.data.urls]);
        }
      }
    } catch (err) {
      console.warn('Backend/S3 upload request error or timeout; preserved local preview:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (indexToRemove) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleSetPrimary = (indexToPrimary) => {
    if (indexToPrimary === 0) return;
    const selected = images[indexToPrimary];
    const remaining = images.filter((_, idx) => idx !== indexToPrimary);
    onChange([selected, ...remaining]);
  };

  // Double-click opens zoom
  const handleDoubleClick = (imgUrl, idx) => {
    setZoomItem(imgUrl);
    setZoomIdx(idx);
  };

  // Navigate in zoom modal
  const goZoomPrev = () => {
    if (zoomIdx > 0) {
      setZoomIdx(zoomIdx - 1);
      setZoomItem(images[zoomIdx - 1]);
    }
  };
  const goZoomNext = () => {
    if (zoomIdx < images.length - 1) {
      setZoomIdx(zoomIdx + 1);
      setZoomItem(images[zoomIdx + 1]);
    }
  };

  return (
    <div>
      <style>{`
        @keyframes photoZoomFadeIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .photo-thumb-card:hover .photo-zoom-overlay { opacity: 1 !important; }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: dragActive ? '2px dashed #4338ca' : '2px dashed #cbd5e1',
          borderRadius: compact ? '8px' : '12px',
          padding: compact ? '16px 12px' : '24px 16px',
          backgroundColor: dragActive ? '#eef2ff' : '#f8fafc',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '4px' : '8px' }}>
          {uploading ? (
            <>
              <Loader2 size={compact ? 24 : 32} color="#4338ca" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: compact ? '0.82rem' : '0.9rem', color: '#4338ca', fontWeight: '600' }}>
                Uploading photo(s)...
              </span>
            </>
          ) : (
            <>
              <div style={{ backgroundColor: '#ede9fe', padding: compact ? '7px' : '10px', borderRadius: '50%', color: '#4338ca' }}>
                <Upload size={compact ? 18 : 24} />
              </div>
              <div style={{ fontSize: compact ? '0.85rem' : '0.95rem', fontWeight: '600', color: '#1e293b' }}>
                Click to browse or drag & drop multiple photos
              </div>
              <div style={{ fontSize: compact ? '0.72rem' : '0.8rem', color: '#64748b' }}>
                Supports PNG, JPG, WEBP, GIF (Max {maxFiles} images) · Double-click to zoom
              </div>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '12px' }}>
          {errorMsg}
        </div>
      )}

      {/* Uploaded Images Gallery */}
      {images && images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(auto-fill, minmax(95px, 1fr))' : 'repeat(auto-fill, minmax(130px, 1fr))', gap: compact ? '10px' : '14px', marginTop: '10px' }}>
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              className="photo-thumb-card"
              onDoubleClick={() => handleDoubleClick(imgUrl, idx)}
              title="Double-click to zoom"
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: idx === 0 ? '2px solid #4338ca' : '1px solid #e2e8f0',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }}
            >
              <img
                src={imgUrl}
                alt={`Photo ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />

              {/* Zoom overlay on hover */}
              <div
                className="photo-zoom-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                  pointerEvents: 'none',
                }}
              >
                <ZoomIn size={24} color="#fff" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
              </div>

              {/* Primary Badge */}
              {idx === 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    backgroundColor: '#4338ca',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 1,
                  }}
                >
                  Primary
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimary(idx);
                  }}
                  title="Set as primary photo"
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 6px',
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 1,
                  }}
                >
                  <Star size={12} color="#f59e0b" /> Make Primary
                </button>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                title="Remove photo"
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: 1,
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── ZOOM MODAL with carousel ── */}
      {zoomItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.88)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'photoZoomFadeIn 0.18s ease',
          }}
          onClick={() => setZoomItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setZoomItem(null)}
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
              }}
            >
              <X size={18} />
            </button>

            {/* Zoomed image */}
            <img
              src={zoomItem}
              alt={`Photo ${zoomIdx + 1}`}
              style={{
                maxWidth: '88vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                borderRadius: '10px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />

            {/* Carousel nav (if multiple images) */}
            {images.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  type="button"
                  onClick={goZoomPrev}
                  disabled={zoomIdx === 0}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    cursor: zoomIdx === 0 ? 'not-allowed' : 'pointer',
                    opacity: zoomIdx === 0 ? 0.3 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                  }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>

                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', fontWeight: '600' }}>
                  {zoomIdx + 1} / {images.length}
                </span>

                <button
                  type="button"
                  onClick={goZoomNext}
                  disabled={zoomIdx === images.length - 1}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    cursor: zoomIdx === images.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: zoomIdx === images.length - 1 ? 0.3 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}

            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
              Double-click thumbnail to zoom · Click outside or × to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
