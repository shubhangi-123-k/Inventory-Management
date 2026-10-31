import { useState, useRef } from 'react';
import { Upload, X, Loader2, Video, Play, Trash2, AlertCircle, Plus } from 'lucide-react';
import api from '../api/axios';

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB Max Size
const MAX_VIDEOS = 5; // Max 5 videos

const VideoUploader = ({
  videos = [],
  onChange,
  disabled = false,
  // Legacy single-video support
  videoUrl,
  // detect legacy mode: if videoUrl prop passed, use single mode
}) => {
  // If old single-video props used, adapt
  const isLegacyMode = videoUrl !== undefined && onChange && !Array.isArray(videos);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewVideo, setPreviewVideo] = useState(null); // { url, label }
  const [pastedUrl, setPastedUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const getEmbedVideoUrl = (url) => {
    if (!url) return null;
    const ytMatch = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = String(url).match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
    return null;
  };

  // Normalize to array for internal use
  const videoList = isLegacyMode
    ? (videoUrl ? [videoUrl] : [])
    : (Array.isArray(videos) ? videos : []);

  const notifyChange = (newList) => {
    if (isLegacyMode) {
      onChange(newList.length > 0 ? newList[0] : '');
    } else {
      onChange(newList);
    }
  };

  const handleAddUrl = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const url = pastedUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setErrorMsg('Please enter a valid HTTP/HTTPS video URL (e.g. YouTube, Vimeo, or CDN MP4)');
      return;
    }
    if (videoList.includes(url)) {
      setErrorMsg('This video link has already been added.');
      return;
    }
    if (videoList.length >= MAX_VIDEOS) {
      setErrorMsg(`Maximum of ${MAX_VIDEOS} videos already added.`);
      return;
    }
    notifyChange([...videoList, url]);
    setPastedUrl('');
    setShowUrlInput(false);
    setErrorMsg('');
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setErrorMsg('');

    const validFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
    if (validFiles.length === 0) {
      setErrorMsg('Please select valid video files (MP4, WebM, MOV, AVI)');
      return;
    }

    const slotsAvailable = MAX_VIDEOS - videoList.length;
    if (slotsAvailable <= 0) {
      setErrorMsg(`Maximum of ${MAX_VIDEOS} videos already added.`);
      return;
    }

    const filesToUpload = validFiles.slice(0, slotsAvailable);
    if (validFiles.length > slotsAvailable) {
      setErrorMsg(`Only ${slotsAvailable} slot(s) remaining. Added first ${slotsAvailable} video(s).`);
    }

    // Validate sizes
    for (const file of filesToUpload) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        setErrorMsg(`"${file.name}" is ${sizeInMb} MB. Max allowed is 50 MB.`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);

    const uploadedUrls = [];
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const formData = new FormData();
        formData.append('video', file);
        formData.append('folder', 'product-videos');

        try {
          const res = await api.post('/upload/video', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const fileProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const overall = Math.round(((i + fileProgress / 100) / filesToUpload.length) * 100);
                setUploadProgress(overall);
              }
            }
          });
          if (res.data?.url) {
            uploadedUrls.push(res.data.url);
            continue;
          }
        } catch (_) { /* fallback below */ }

        // Fallback: local object URL
        uploadedUrls.push(URL.createObjectURL(file));
      }

      notifyChange([...videoList, ...uploadedUrls]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (idx) => {
    const updated = videoList.filter((_, i) => i !== idx);
    notifyChange(updated);
  };

  const canAddMore = videoList.length < MAX_VIDEOS;

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
        disabled={disabled}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
          Product Videos (Max {MAX_VIDEOS}, 50 MB each or external link)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4338ca',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            {showUrlInput ? '✕ Cancel Link' : '🔗 Paste Video URL (YouTube / Vimeo / CDN)'}
          </button>
          <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '600' }}>
            {videoList.length}/{MAX_VIDEOS} added
          </span>
        </div>
      </div>

      {/* Direct URL input bar */}
      {showUrlInput && (
        <form onSubmit={handleAddUrl} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="url"
            placeholder="Paste YouTube, Vimeo, or MP4 video URL (e.g. https://www.youtube.com/watch?v=...)"
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          />
          <button
            type="submit"
            disabled={!pastedUrl.trim()}
            style={{
              padding: '8px 14px',
              backgroundColor: '#4338ca',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: !pastedUrl.trim() ? 'not-allowed' : 'pointer',
              opacity: !pastedUrl.trim() ? 0.6 : 1
            }}
          >
            + Add Link
          </button>
        </form>
      )}

      {/* Upload Dropzone — shown when no videos or when can add more */}
      {canAddMore && (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '20px 16px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: videoList.length > 0 ? '14px' : '0',
          }}
          onMouseOver={(e) => !disabled && (e.currentTarget.style.borderColor = '#4338ca')}
          onMouseOut={(e) => !disabled && (e.currentTarget.style.borderColor = '#cbd5e1')}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '280px' }}>
              <Loader2 size={32} style={{ color: '#4338ca', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                Uploading Video(s)... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
              </span>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#4338ca', transition: 'width 0.2s' }} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ backgroundColor: '#ede9fe', padding: '10px', borderRadius: '50%', color: '#4338ca' }}>
                {videoList.length > 0 ? <Plus size={22} /> : <Video size={24} />}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                {videoList.length > 0 ? 'Add More Videos' : 'Click to Upload Product Video(s)'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                MP4, WebM, MOV, AVI • Max 50 MB per file • Up to {MAX_VIDEOS} videos
              </p>
            </>
          )}
        </div>
      )}

      {/* Video List */}
      {videoList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {videoList.map((url, idx) => {
            const isEmbed = Boolean(getEmbedVideoUrl(url));
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {/* Video thumbnail */}
                  <div
                    onClick={() => setPreviewVideo({ url, label: `Video ${idx + 1}` })}
                    style={{
                      width: '64px',
                      height: '48px',
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Click to preview"
                  >
                    {!isEmbed && <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '5px', display: 'flex' }}>
                      <Play size={12} fill="white" />
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                      Video {idx + 1}
                      {idx === 0 && (
                        <span style={{ fontSize: '0.65rem', backgroundColor: '#4338ca', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                          PRIMARY
                        </span>
                      )}
                      {isEmbed && (
                        <span style={{ fontSize: '0.65rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                          ONLINE LINK
                        </span>
                      )}
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.72rem', color: '#4338ca', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}
                    >
                      {url.startsWith('blob:') ? 'Local preview' : url}
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setPreviewVideo({ url, label: `Video ${idx + 1}` })}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#ede9fe',
                      color: '#4338ca',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Play size={11} fill="#4338ca" /> Play
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.8rem', marginTop: '10px' }}>
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div
          onClick={() => setPreviewVideo(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '720px',
              width: '95%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: '600' }}>
                {previewVideo.label} Preview
              </h4>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'black' }}>
              {getEmbedVideoUrl(previewVideo.url) ? (
                <iframe
                  src={getEmbedVideoUrl(previewVideo.url)}
                  title={previewVideo.label}
                  style={{ width: '100%', height: '420px', border: 'none', display: 'block' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={previewVideo.url}
                  controls
                  autoPlay
                  style={{ width: '100%', maxHeight: '450px', display: 'block' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
