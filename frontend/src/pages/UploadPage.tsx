import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  FileVideo,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Globe,
  ShieldCheck,
  PlayCircle,
} from 'lucide-react';
import { videoService } from '../services/videoService.ts';
import { cn } from '../lib/utils.ts';

type Stage = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

const ACCEPT = 'video/mp4,video/x-matroska,video/x-msvideo';
const ALLOWED_EXT = /\.(mp4|mkv|avi)$/i;
const MAX_BYTES = 600 * 1024 * 1024; // matches nginx client_max_body_size

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{
    videoId: string;
    deduped?: boolean;
  } | null>(null);

  // ── File handling ──────────────────────────────────────────────
  const acceptFile = (f: File) => {
    setError(null);
    if (!ALLOWED_EXT.test(f.name)) {
      setError('Only .mp4, .mkv, and .avi files are accepted.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(
        `That file is ${(f.size / 1024 / 1024).toFixed(0)} MB. Max upload is 600 MB.`,
      );
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) acceptFile(picked);
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setProgress(0);
    setStage('idle');
    setError(null);
    setResult(null);
  };

  // ── Submit ─────────────────────────────────────────────────────
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setStage('uploading');
    setProgress(0);
    setError(null);

    try {
      const res = await videoService.uploadVideo(
        file,
        title.trim(),
        (pct) => {
          setProgress(pct);
          // When bytes are fully sent, server starts transcoding —
          // flip into a determinate-then-indeterminate state.
          if (pct >= 100) setStage('processing');
        },
      );
      setResult({ videoId: res.videoId, deduped: !!res.deduped });
      setStage('done');
      // Auto-bounce to the video page after a short victory beat.
      setTimeout(() => navigate(`/video/${res.videoId}`), 2200);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Upload failed. Please try again.',
      );
      setStage('error');
    }
  };

  // ── Success screen ─────────────────────────────────────────────
  if (stage === 'done' && result) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center gap-6 animate-fade-up">
        <div className="rounded-full bg-ok/15 p-6">
          <CheckCircle2 className="h-12 w-12 text-ok" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-3xl font-display font-bold">
            {result.deduped ? 'Already on the platform' : 'Upload successful'}
          </h1>
          <p className="text-muted">
            {result.deduped
              ? 'We detected this exact file already exists — opening the existing record.'
              : 'Replicating across three regional edge nodes and archiving the original. Taking you to the watch page…'}
          </p>
        </div>
        <Link to={`/video/${result.videoId}`} className="btn-primary py-3 px-6">
          <PlayCircle className="h-5 w-5" />
          Open video
        </Link>
      </div>
    );
  }

  // ── Main upload form ────────────────────────────────────────────
  return (
    <div className="px-4 sm:px-8 py-10 max-w-3xl mx-auto">
      <header className="mb-10 space-y-3">
        <span className="label-eyebrow">Publish</span>
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
          Drop a video on the{' '}
          <span className="text-brand-gradient">edge.</span>
        </h1>
        <p className="text-muted max-w-xl">
          We'll transcode it to HLS, replicate every chunk across A · B · C,
          and stash the original in durable cold storage.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-7">
        {/* Drop zone */}
        <label
          htmlFor="file"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            'group block cursor-pointer relative aspect-video rounded-3xl border-2 border-dashed transition-all duration-200 overflow-hidden',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.005]'
              : 'border-white/10 hover:border-white/25 bg-white/[0.025]',
            file && !isDragging && 'border-ok/60 bg-ok/5 border-solid',
            stage === 'uploading' && 'pointer-events-none',
          )}
        >
          <input
            id="file"
            type="file"
            className="sr-only"
            accept={ACCEPT}
            onChange={onPick}
            disabled={stage === 'uploading'}
          />

          {file ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-6">
              <div className="h-16 w-16 rounded-2xl bg-ok/15 flex items-center justify-center">
                <FileVideo className="h-8 w-8 text-ok" />
              </div>
              <div>
                <p className="font-semibold text-lg max-w-md truncate">
                  {file.name}
                </p>
                <p className="text-muted text-sm">
                  {(file.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                  {file.type || 'video'}
                </p>
              </div>
              {stage === 'idle' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    reset();
                  }}
                  className="text-muted hover:text-danger text-sm font-medium inline-flex items-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  Choose a different file
                </button>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-6">
              <div className="h-16 w-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow-primary transition-transform group-hover:scale-110">
                <UploadIcon className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xl font-display font-bold">
                  Drop a video, or click to browse
                </p>
                <p className="text-muted text-sm">
                  MP4 · MKV · AVI · up to 600 MB
                </p>
              </div>
            </div>
          )}
        </label>

        {/* Title field */}
        <div className="space-y-2">
          <label htmlFor="title" className="label-eyebrow">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My distributed stream"
            className="input-field text-lg py-3"
            required
            disabled={stage === 'uploading'}
          />
        </div>

        {/* Progress + status */}
        {(stage === 'uploading' || stage === 'processing') && (
          <ProgressPanel stage={stage} progress={progress} fileName={file?.name} />
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!file || !title.trim() || stage === 'uploading' || stage === 'processing'}
          className="btn-primary w-full py-4 text-base"
        >
          {stage === 'uploading' || stage === 'processing' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {stage === 'uploading' ? 'Uploading…' : 'Replicating to edge…'}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Publish to StreamFlix
            </>
          )}
        </button>

        {/* Trust strip */}
        <ul className="grid sm:grid-cols-3 gap-3 pt-2">
          <TrustItem
            icon={<Globe className="h-4 w-4" />}
            text="3-region replication"
          />
          <TrustItem
            icon={<ShieldCheck className="h-4 w-4" />}
            text="Durable cold archive"
          />
          <TrustItem
            icon={<Sparkles className="h-4 w-4" />}
            text="Adaptive HLS at the edge"
          />
        </ul>
      </form>
    </div>
  );
};

const ProgressPanel: React.FC<{
  stage: Stage;
  progress: number;
  fileName?: string;
}> = ({ stage, progress, fileName }) => (
  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-3">
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium truncate max-w-[60%]">
        {fileName || 'your file'}
      </span>
      <span className="text-muted tabular-nums">
        {stage === 'uploading' ? `${progress}%` : 'Transcoding…'}
      </span>
    </div>
    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
      {stage === 'uploading' ? (
        <div
          className="h-full bg-brand-gradient transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      ) : (
        <div className="h-full w-1/3 bg-brand-gradient rounded-full animate-flow-right" />
      )}
    </div>
    <p className="text-xs text-muted">
      {stage === 'uploading'
        ? 'Streaming bytes to the ingestion gateway…'
        : 'Server is transcoding to HLS and replicating across A · B · C. This continues in the background — you can leave this page.'}
    </p>
  </div>
);

const TrustItem: React.FC<{ icon: React.ReactNode; text: string }> = ({
  icon,
  text,
}) => (
  <li className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-white/70">
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white">
      {icon}
    </span>
    <span className="font-medium">{text}</span>
  </li>
);

export default UploadPage;
