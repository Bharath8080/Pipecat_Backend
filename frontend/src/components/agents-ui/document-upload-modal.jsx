import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { FileUpload } from '../ui/file-upload';
import {
  FileText,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Database,
  Layers,
} from 'lucide-react';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000');

export function DocumentUploadModal({ isOpen, onClose, onDocumentsChange }) {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', text: '' }

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-[#0a0c10]/95 border border-white/15 rounded-3xl p-6 shadow-[0_0_60px_-15px_rgba(6,182,212,0.25)] flex flex-col gap-5 text-neutral-100 select-none z-10 overflow-hidden"
          >
            {/* Ambient Background Gradient Orb */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm uppercase tracking-wider font-bold font-outfit text-white">
                      RAG Knowledge Base
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[10px] font-medium">
                      {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-sans">
                    Qdrant Hybrid Vector Store with BGE & BM25
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aesthetic Dropzone */}
            <FileUpload
              onChange={handleUpload}
              isUploading={isUploading}
              accept=".pdf"
            />

            {/* Upload Status Notification */}
            <AnimatePresence>
              {uploadStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-xl text-xs border backdrop-blur-md',
                    uploadStatus.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : 'bg-rose-950/60 border-rose-700/60 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                  )}
                >
                  {uploadStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span className="font-mono text-[11px] truncate flex-1">{uploadStatus.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Indexed Documents List */}
            <div className="flex flex-col gap-2.5 min-h-0">
              <div className="flex items-center justify-between text-[11px] font-outfit uppercase tracking-wider text-neutral-400 px-1 font-bold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Indexed Documents ({documents.length})</span>
                </span>
                {documents.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-mono lowercase"
                    title="Clear all documents"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                {documents.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-neutral-500 font-sans">
                    No documents uploaded yet. Upload a PDF above to enable Voice RAG.
                  </div>
                ) : (
                  documents.map((doc, idx) => (
                    <motion.div
                      key={doc || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/30 transition-all text-xs text-neutral-200"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <span className="truncate font-outfit font-medium text-[13px] text-neutral-200 group-hover:text-white transition-colors">
                          {doc}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-700/50 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Ready
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-sans text-neutral-400">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-500">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Voice RAG active in conversation</span>
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white font-outfit font-bold text-xs transition-all cursor-pointer border border-white/10 hover:border-white/20 active:scale-95"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
