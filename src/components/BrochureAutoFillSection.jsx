import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Eye,
  Trash2,
  AlertCircle,
  FileDown,
  RotateCcw,
  Sliders,
  ExternalLink,
  ClipboardPaste,
  X
} from 'lucide-react';
import api from '../api/axios';
import { extractTextFromBrochure, parseBrochureData } from '../utils/brochureParser';

const BrochureAutoFillSection = ({
  companyBrochure,
  onBrochureChange,
  onAutoFill,
  contextData = {},
  currentFormValues = {}
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [lastAutoFilled, setLastAutoFilled] = useState(null);
  const [showRawTextModal, setShowRawTextModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [rawText, setRawText] = useState('');
  const [pasteTextInput, setPasteTextInput] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [previousValues, setPreviousValues] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  // Helper to read file as data url for instant preview
  const readFileAsDataUrl = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  };

  // Main file processing handler
  const processFile = async (file) => {
    if (!file) return;

    setErrorMessage('');
    setIsProcessing(true);
    setProcessingStep('Reading brochure & extracting text...');

    // Save previous values for undo
    setPreviousValues({ ...currentFormValues });

    try {
      const fileName = file.name || 'Brochure.pdf';

      // 1. Generate local preview immediately
      const localDataUrl = await readFileAsDataUrl(file);
      onBrochureChange({
        url: localDataUrl,
        name: fileName,
        isInherited: false,
        file: file
      });

      // 2. Extract text from PDF / text file
      let text = '';
      try {
        text = await extractTextFromBrochure(file);
        setRawText(text);
      } catch (extractErr) {
        console.warn('Text extraction warning:', extractErr);
      }

      setProcessingStep('Analyzing specifications & matching data...');

      // 3. Parse brochure text and extract fields
      const parseResult = parseBrochureData(text, fileName, contextData);

      // 4. Upload file to backend storage in background
      setProcessingStep('Uploading brochure file to server...');
      try {
        const formData = new FormData();
        formData.append('brochure', file);
        formData.append('image', file);
        formData.append('folder', 'brochures');

        let uploadRes;
        try {
          uploadRes = await api.post('/upload/brochure', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 10000
          });
        } catch {
          uploadRes = await api.post('/upload/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 10000
          });
        }

        if (uploadRes?.data?.url) {
          onBrochureChange({
            url: uploadRes.data.url,
            name: fileName,
            isInherited: false,
            file: file
          });
        }
      } catch (uploadErr) {
        console.warn('Backend upload timed out or failed; local preview preserved:', uploadErr);
      }

      // 5. Apply extracted data to form
      if (parseResult.fieldCount > 0) {
        onAutoFill(parseResult.extracted);
        setLastAutoFilled({
          count: parseResult.fieldCount,
          fields: parseResult.filledFields,
          fileName: fileName
        });
      } else {
        setErrorMessage(
          'Could not find text fields automatically. You can paste the specification text manually or fill details directly.'
        );
      }
    } catch (err) {
      console.error('Brochure auto-fill processing error:', err);
      setErrorMessage(err.message || 'Error parsing brochure. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
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
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Manual re-scan
  const handleRescan = async () => {
    if (!rawText && !companyBrochure?.url) return;
    setIsProcessing(true);
    setProcessingStep('Re-analyzing brochure data...');
    try {
      const parseResult = parseBrochureData(rawText, companyBrochure?.name || '', contextData);
      if (parseResult.fieldCount > 0) {
        onAutoFill(parseResult.extracted);
        setLastAutoFilled({
          count: parseResult.fieldCount,
          fields: parseResult.filledFields,
          fileName: companyBrochure?.name || 'Brochure'
        });
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Process pasted text
  const handleProcessPastedText = () => {
    if (!pasteTextInput.trim()) return;
    setIsProcessing(true);
    setProcessingStep('Analyzing pasted specification text...');
    try {
      setRawText(pasteTextInput);
      const parseResult = parseBrochureData(pasteTextInput, companyBrochure?.name || 'Manual_Spec', contextData);
      if (parseResult.fieldCount > 0) {
        onAutoFill(parseResult.extracted);
        setLastAutoFilled({
          count: parseResult.fieldCount,
          fields: parseResult.filledFields,
          fileName: companyBrochure?.name || 'Manual Spec'
        });
        setShowPasteModal(false);
        setPasteTextInput('');
      } else {
        alert('No recognized attributes found in the pasted text. Please check format.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Undo Auto-Fill
  const handleUndo = () => {
    if (!previousValues) return;
    onAutoFill(previousValues);
    setLastAutoFilled(null);
    setPreviousValues(null);
  };

  // Remove brochure
  const handleRemoveBrochure = () => {
    onBrochureChange({ url: '', name: '', isInherited: false });
    setLastAutoFilled(null);
    setRawText('');
    setErrorMessage('');
  };

  const hasBrochure = Boolean(companyBrochure?.url);
  const brochureName = companyBrochure?.name || 'Uploaded_Brochure.pdf';
  const isPdf = brochureName.toLowerCase().endsWith('.pdf') || companyBrochure?.url?.includes('.pdf');

  return (
    <div
      style={{
        marginBottom: '20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1.5px solid #c7d2fe',
        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.08)',
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: 'linear-gradient(90deg, #eef2ff 0%, #e0e7ff 100%)',
          borderBottom: '1px solid #c7d2fe'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1e1b4b', letterSpacing: '-0.01em' }}>
                Brochure & Spec Sheet Auto-Fill
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4338ca',
                  backgroundColor: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #c7d2fe'
                }}
              >
                Smart Auto-Fill
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#475569' }}>
              Upload product brochure or catalog to automatically extract and populate element details.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#ffffff',
              color: '#4338ca',
              border: '1px solid #c7d2fe',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
            title="Paste raw specification text to auto-fill"
          >
            <ClipboardPaste size={13} /> Paste Spec Text
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ padding: '16px 18px' }}>
        {/* Processing Indicator */}
        {isProcessing && (
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '14px'
            }}
          >
            <RefreshCw size={22} className="animate-spin" color="#2563eb" />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e3a8a' }}>
                {processingStep || 'Processing Brochure...'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '2px' }}>
                Extracting element name, SKU, price, HSN, dimensions & specifications...
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} color="#ef4444" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* CASE 1: NO BROCHURE ATTACHED YET */}
        {!hasBrochure && !isProcessing && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed',
              borderColor: dragActive ? '#4f46e5' : '#cbd5e1',
              borderRadius: '10px',
              padding: '24px 20px',
              textAlign: 'center',
              backgroundColor: dragActive ? '#eef2ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: dragActive ? '#e0e7ff' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: dragActive ? '#4338ca' : '#64748b'
              }}
            >
              <UploadCloud size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1e293b' }}>
                Click to browse or drag & drop product brochure here
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                Supports <strong>PDF, PNG, JPG, WEBP, DOC, TXT</strong> (Max 25MB)
              </div>
            </div>
            <button
              type="button"
              style={{
                padding: '7px 18px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
              }}
            >
              <Sparkles size={14} /> Upload & Auto-Fill
            </button>
          </div>
        )}

        {/* CASE 2: BROCHURE ATTACHED */}
        {hasBrochure && (
          <div>
            {/* File Info Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: isPdf ? '#fee2e2' : '#e0e7ff',
                    color: isPdf ? '#dc2626' : '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', wordBreak: 'break-all' }}>
                    {brochureName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: isPdf ? '#b91c1c' : '#4338ca',
                        backgroundColor: isPdf ? '#fef2f2' : '#eef2ff',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {isPdf ? 'PDF DOCUMENT' : 'DOCUMENT'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                      <CheckCircle2 size={12} /> Brochure Attached
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Preview document"
                >
                  <Eye size={13} /> View
                </button>

                <button
                  type="button"
                  onClick={handleRescan}
                  disabled={isProcessing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #c7d2fe',
                    backgroundColor: '#eef2ff',
                    color: '#4338ca',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Re-extract specifications"
                >
                  <RefreshCw size={13} className={isProcessing ? 'animate-spin' : ''} /> Re-scan
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Upload a different brochure"
                >
                  <UploadCloud size={13} /> Replace
                </button>

                <button
                  type="button"
                  onClick={handleRemoveBrochure}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Remove brochure"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Auto-Fill Results Banner */}
            {lastAutoFilled && lastAutoFilled.count > 0 && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#166534' }}>
                      ✨ {lastAutoFilled.count} fields auto-filled from brochure!
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {rawText && (
                      <button
                        type="button"
                        onClick={() => setShowRawTextModal(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#15803d',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        View Extracted Text →
                      </button>
                    )}
                    {previousValues && (
                      <button
                        type="button"
                        onClick={handleUndo}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <RotateCcw size={12} /> Undo Fill
                      </button>
                    )}
                  </div>
                </div>

                {/* Populated Fields Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {lastAutoFilled.fields.map((f, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #86efac',
                        fontSize: '0.74rem',
                        color: '#14532d',
                        fontWeight: '600'
                      }}
                    >
                      <strong style={{ color: '#166534' }}>{f.label}:</strong> {String(f.value).slice(0, 30)}
                      {String(f.value).length > 30 ? '...' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: VIEW EXTRACTED TEXT */}
      {showRawTextModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowRawTextModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#4f46e5" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                  Extracted Brochure Text
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRawTextModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: '#334155',
                  backgroundColor: '#f8fafc',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace'
                }}
              >
                {rawText || 'No plain text extracted from document.'}
              </pre>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowRawTextModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASTE RAW SPECIFICATION TEXT */}
      {showPasteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowPasteModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardPaste size={18} color="#4f46e5" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                  Paste Product Specification / Catalog Text
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#64748b' }}>
                Paste raw product description, pricing table, or specifications from supplier email/catalog. The parser will extract Element Name, SKU, MRP, Weight, HSN, etc.
              </p>
              <textarea
                rows={10}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="Example:&#10;Product Name: Basmati Rice 5kg&#10;Brand: Fortune&#10;SKU: FORT-BAS-5KG&#10;MRP: 450&#10;HSN: 1006.30&#10;Net Wt: 5 kg&#10;GST: 5%&#10;Packaging: Pouch"
                value={pasteTextInput}
                onChange={(e) => setPasteTextInput(e.target.value)}
              />
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPastedText}
                disabled={!pasteTextInput.trim() || isProcessing}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} /> Parse & Auto-Fill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW DOCUMENT */}
      {showPreviewModal && companyBrochure?.url && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px'
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color="#4f46e5" />
                <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1e293b' }}>
                  {brochureName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href={companyBrochure.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#4f46e5',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={14} /> Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {isPdf ? (
                <iframe
                  src={companyBrochure.url}
                  title="Brochure PDF Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <img
                  src={companyBrochure.url}
                  alt="Brochure Preview"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrochureAutoFillSection;
