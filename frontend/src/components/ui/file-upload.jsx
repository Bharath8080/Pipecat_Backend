import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle2, Sparkles, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function FileUpload({ onChange, isUploading, accept = '.pdf' }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onChange?.(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange?.(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full relative">
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'group relative flex flex-col items-center justify-center p-8 rounded-2xl cursor-pointer overflow-hidden transition-all duration-300',
          'border border-dashed',
          isDragOver
            ? 'border-cyan-400 bg-cyan-500/[0.08] shadow-[0_0_30px_rgba(6,182,212,0.2)]'
            : 'border-white/15 hover:border-cyan-500/40 bg-white/[0.02] hover:bg-white/[0.04]'
        )}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {/* Ambient Radial Gradient Glow */}
        <div
          className={cn(
            'absolute inset-0 pointer-events-none transition-opacity duration-500 -z-10',
            isDragOver
              ? 'opacity-100 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.18)_0%,transparent_70%)]'
              : 'opacity-40 group-hover:opacity-80 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)]'
          )}
        />

        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
          <svg className="w-full h-full" width="100%" height="100%">
            <pattern id="upload-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#upload-grid)" />
          </svg>
        </div>

        {/* Upload Content */}
        <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm">
          {/* Icon Badge with Pulse Aura */}
          <motion.div
            animate={{
              y: isDragOver ? -4 : [0, -3, 0],
              scale: isDragOver ? 1.1 : 1,
            }}
            transition={
              isDragOver
                ? { type: 'spring', stiffness: 300, damping: 20 }
                : { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
            }
            className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-900 border border-white/20 shadow-xl shadow-cyan-950/40"
          >
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/20 blur-md group-hover:bg-cyan-400/30 transition-all" />
            {isUploading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              >
                <Sparkles className="w-7 h-7 text-cyan-400 relative z-10" />
              </motion.div>
            ) : (
              <UploadCloud className="w-7 h-7 text-cyan-400 relative z-10 transition-transform group-hover:scale-110" />
            )}
          </motion.div>

          {/* Text Information */}
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold font-outfit text-white tracking-wide flex items-center justify-center gap-1.5">
              <span>{isUploading ? 'Indexing Knowledge Base...' : 'Upload PDF Document'}</span>
              {!isUploading && (
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-cyan-400 transition-colors" />
              )}
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-sans">
              {isUploading
                ? 'Generating dense & sparse embeddings with FastEmbed...'
                : 'Drag & drop your file here or click to browse'}
            </p>
          </div>

          {/* Badges / Specs */}
          <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-neutral-500">
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-400">
              PDF only
            </span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
              Qdrant Hybrid Vector Store
            </span>
          </div>

          {/* Animated Upload Progress Line */}
          {isUploading && (
            <div className="w-full mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
