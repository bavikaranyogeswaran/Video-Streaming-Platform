import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  User,
  Calendar,
  Share2,
  MoreVertical,
  Globe,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { videoService, type Video } from '../services/videoService.ts';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { VideoCard } from '../components/VideoCard.tsx';

const VideoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    setError(null);
    setVideo(null);
    setRelated([]);

    Promise.all([videoService.getVideo(id), videoService.getVideos()])
      .then(([primary, list]) => {
        if (cancelled) return;
        setVideo(primary);
        setRelated(
          list
            .filter((v) => v.id !== primary.id && v.status === 'ready')
            .slice(0, 8),
        );
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load video');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const onShare = async () => {
    if (!video) return;
    const url = `${window.location.origin}/video/${video.id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: video.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled native share; ignore */
    }
  };

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-screen-2xl mx-auto">
        <div className="h-8 w-32 skeleton mb-6" />
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="aspect-video skeleton" />
          <div className="hidden lg:flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video skeleton" />
            ))}
          </div>
        </div>
        <div className="mt-6 h-8 w-3/4 skeleton" />
        <div className="mt-3 h-4 w-1/4 skeleton" />
      </div>
    );
  }

  // ── Error / not found ──────────────────────────────────────────
  if (error || !video) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="rounded-full bg-danger/10 p-4">
          <AlertCircle className="h-10 w-10 text-danger" />
        </div>
        <h2 className="text-2xl font-display font-bold">Video not found</h2>
        <p className="text-muted max-w-sm">
          {error ||
            "We couldn't locate this video. It may have been removed or the link is wrong."}
        </p>
        <Link to="/" className="btn-secondary">
          Back to feed
        </Link>
      </div>
    );
  }

  // ── Processing placeholder ─────────────────────────────────────
  if (video.status === 'processing') {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-4xl mx-auto">
        <BackLink />
        <div className="aspect-video rounded-3xl border border-white/5 bg-surface-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-display font-bold">
              Replicating to the edge…
            </h2>
            <p className="text-muted max-w-md">
              We're transcoding to HLS and replicating across A · B · C. This
              page will refresh automatically when the stream is ready.
            </p>
          </div>
        </div>
        <h1 className="mt-8 text-3xl font-display font-bold tracking-tight">
          {video.title}
        </h1>
      </div>
    );
  }

  // Error state
  if (video.status === 'error') {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-4xl mx-auto">
        <BackLink />
        <div className="aspect-video rounded-3xl border border-danger/30 bg-danger/5 flex flex-col items-center justify-center gap-3 text-center px-6">
          <AlertCircle className="h-10 w-10 text-danger" />
          <h2 className="text-xl font-display font-bold">
            Replication failed
          </h2>
          <p className="text-muted max-w-md">
            Quorum wasn't met when this video was uploaded. The original is
            still in the durable archive — an admin can re-trigger replication.
          </p>
        </div>
      </div>
    );
  }

  // ── Ready / main render ────────────────────────────────────────
  const streamUrl = `${
    import.meta.env.VITE_STREAM_URL || '/stream'
  }/${video.id}/playlist.m3u8`;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-screen-2xl mx-auto">
      <BackLink />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
        {/* ── Primary column ────────────────────────────────────── */}
        <div className="space-y-6 min-w-0">
          <VideoPlayer url={streamUrl} />

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-3 min-w-0">
              <h1 className="text-3xl font-display font-bold tracking-tight break-words">
                {video.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="text-white/85 font-medium">
                    {video.uploadedBy}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(video.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-ok/30 bg-ok/10 text-ok text-xs font-bold">
                  <Globe className="h-3 w-3" />
                  {video.storageNodes.length}× replicated
                </span>
                {video.s3Key && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-accent/30 bg-accent/10 text-accent text-xs font-bold">
                    <ShieldCheck className="h-3 w-3" />
                    Archived
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onShare}
                className="btn-secondary py-2 px-4 text-sm"
                aria-label="Copy share link"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-ok" />
                    Copied
                  </>
                ) : (
                  <>
                    {(navigator as any).share ? (
                      <Share2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Share
                  </>
                )}
              </button>
              <button
                className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                aria-label="More"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
            <span className="label-eyebrow">Description</span>
            <p className="mt-2 text-white/85 leading-relaxed">
              {video.description ||
                'No description provided for this upload.'}
            </p>
          </div>

          {/* Replica detail row */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="label-eyebrow">Edge replicas</span>
              <Link
                to="/health"
                className="text-xs text-muted hover:text-white"
              >
                Cluster status →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['A', 'B', 'C'] as const).map((label) => {
                const hot = video.storageNodes.includes(label);
                return (
                  <span
                    key={label}
                    className={
                      hot
                        ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ok/30 bg-ok/10 text-ok text-xs font-bold'
                        : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-muted text-xs font-bold line-through'
                    }
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${hot ? 'bg-ok' : 'bg-muted/50'}`}
                    />
                    Node {label}
                    {label === 'A'
                      ? ' · Asia'
                      : label === 'B'
                        ? ' · EU'
                        : ' · US'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Related rail (right column on lg+, below on smaller) ── */}
        <aside className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <span className="label-eyebrow">Up next on the edge</span>
            {related.length > 0 && (
              <Link to="/" className="text-xs text-muted hover:text-white">
                See all →
              </Link>
            )}
          </div>
          {related.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-6 text-center text-muted text-sm">
              No other videos to recommend yet.{' '}
              <Link to="/upload" className="text-white font-semibold">
                Upload one
              </Link>{' '}
              and it'll show up here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {related.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const BackLink: React.FC = () => (
  <Link
    to="/"
    className="inline-flex items-center gap-1.5 text-muted hover:text-white mb-6 transition-colors group text-sm"
  >
    <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
    Back to feed
  </Link>
);

export default VideoPage;
