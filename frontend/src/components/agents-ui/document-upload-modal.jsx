import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import {
  UploadCloud,
  FileText,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000');

export function DocumentUploadModal({ isOpen, onClose, onDocumentsChange }) {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', text: '' }
  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        if (onDocumentsChange) onDocumentsChange(data.documents || []);
      }
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
      setUploadStatus(null);
    }
  }, [isOpen]);

  const handleUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus({ type: 'error', text: 'Please select a valid .pdf document.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus({
          type: 'success',
          text: `Indexed "${file.name}" (${data.chunks} chunks stored).`,
        });
        fetchDocuments();
      } else {
        setUploadStatus({
          type: 'error',
          text: data.detail || 'Failed to upload document.',
        });
      }
    } catch (e) {
      setUploadStatus({
        type: 'error',
        text: 'Network error connecting to backend.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all indexed documents?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/documents`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments([]);
        if (onDocumentsChange) onDocumentsChange([]);
        setUploadStatus({ type: 'success', text: 'Knowledge base cleared.' });
      }
    } catch (e) {
      console.error('Error clearing documents:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#0c0e12] border border-white/15 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-neutral-100 select-none animate-in zoom-in-95 duration-150"
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 font-outfit">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-200">
              RAG Knowledge Base
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-mono text-[10px]">
              {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drag & Drop Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150 text-center',
            dragActive
              ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
              : 'border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/[0.07]'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUpload(e.target.files[0]);
              }
            }}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-cyan-300 py-2">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs font-mono">Parsing & Embedding with FastEmbed...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="w-8 h-8 text-neutral-400" />
              <p className="text-xs font-medium text-neutral-200">
                Click or drag & drop a <span className="text-cyan-400">.PDF document</span> here
              </p>
              <p className="text-[10px] text-neutral-500 font-mono">
                Indexed in ChromaDB with LangChain & BAAI/bge-base-en-v1.5
              </p>
            </div>
          )}
        </div>

        {/* Upload Status Notification */}
        {uploadStatus && (
          <div
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl text-xs',
              uploadStatus.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/70 border border-rose-800/80 text-rose-300'
            )}
          >
            {uploadStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-mono text-[11px] truncate">{uploadStatus.text}</span>
          </div>
        )}

        {/* Active Documents List */}
        <div className="flex flex-col gap-2 min-h-0 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-neutral-400 px-1">
            <span>Indexed Documents</span>
            {documents.length > 0 && (
              <button
                onClick={handleClear}
                className="text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                title="Clear all documents"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-neutral-500 font-mono">
              No documents uploaded yet. Upload a PDF above to enable Voice RAG.
            </div>
          ) : (
            documents.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-200"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate font-mono text-[11px]">{doc}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/50 shrink-0">
                  Ready
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Voice RAG Active in conversation</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
