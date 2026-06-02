import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  RefreshCcw,
  PlayCircle,
  Upload as UploadIcon,
  Globe,
  Sparkles,
  Activity,
} from 'lucide-react';
import { videoService, type Video } from '../services/videoService.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { useAuthStore } from '../store/authStore.ts';

const HomePage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() ?? '';
  const user = useAuthStore((s) => s.user);

  // Keep the polling effect's identity stable across renders so a re-render
  // doesn't tear down the interval.
  const videosRef = useRef(videos);
  videosRef.current = videos;

  const fetchVideos = async () => {
    try {
      const data = await videoService.getVideos();
      setVideos(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // Poll only while at least one upload is still transcoding.
    const id = setInterval(() => {
      const hasProcessing = videosRef.current.some(
        (v) => v.status === 'processing',
      );
      if (hasProcessing) fetchVideos();
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // Apply search filter client-side. Backend has no /search endpoint yet,
  // so we filter the already-fetched feed on title + creator.
  const filtered = useMemo(() => {
    if (!query) return videos;
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(query) ||
        v.uploadedBy.toLowerCase().includes(query),
    );
  }, [videos, query]);

  const featured = filtered.find((v) => v.status === 'ready') ?? null;
  const rest = featured
    ? filtered.filter((v) => v.id !== featured.id)
    : filtered;

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading && videos.length === 0) {
    return (
      <div className="px-6 sm:px-10 py-10 max-w-screen-2xl mx-auto">
        <div className="h-72 skeleton mb-12" />
        <div className="h-6 w-48 skeleton mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-video skeleton" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  if (error && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-4">
        <div className="rounded-full bg-danger/10 p-4">
          <AlertCircle className="h-10 w-10 text-danger" />
        </div>
        <h2 className="text-2xl font-display font-bold">
          Couldn't reach the feed
        </h2>
        <p className="text-muted max-w-sm">{error}</p>
        <button onClick={fetchVideos} className="btn-secondary mt-2">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state (no uploads yet, no search) ──────────────────────
  if (filtered.length === 0 && !query) {
    return <EmptyFeed loggedIn={!!user} />;
  }

  // ── Search hit nothing ───────────────────────────────────────────
  if (filtered.length === 0 && query) {
    return (
      <div className="px-6 sm:px-10 py-12 max-w-screen-2xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-2">
          No results for{' '}
          <span className="text-brand-gradient">"{query}"</span>
        </h1>
        <p className="text-muted mb-6">
          Try a different keyword or clear the search to see everything.
        </p>
        <Link to="/" className="btn-secondary">
          Clear search
        </Link>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-screen-2xl mx-auto space-y-12">
      {featured && !query && <FeaturedHero video={featured} />}

      <section>
        <div className="flex items-end justify-between mb-5 px-1">
          <div>
            <span className="label-eyebrow text-muted">
              {query ? `Search results · "${query}"` : 'On the platform'}
            </span>
            <h2 className="mt-1 text-2xl font-display font-bold tracking-tight">
              {query ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''}` : 'Latest uploads'}
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ok opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
            Live · {videos.filter((v) => v.status === 'ready').length} ready
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {rest.map((v, i) => (
            <div
              key={v.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <VideoCard video={v} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────
 * Featured hero card — pulled from the most recent "ready" video.
 * Renders nothing if there's no ready video to feature.
 * ──────────────────────────────────────────────────────────────────── */
const FeaturedHero: React.FC<{ video: Video }> = ({ video }) => (
  <section className="relative overflow-hidden rounded-3xl border border-white/5 group">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-brand-gradient opacity-30 transition-opacity duration-500 group-hover:opacity-40" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(124,58,237,0.45),transparent_60%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(7,7,8,0.85)_100%)]" />
    {/* Scan lines */}
    <div
      className="absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 18px)',
      }}
    />

    <div className="relative z-10 grid lg:grid-cols-[1.4fr_1fr] gap-8 p-8 sm:p-12 lg:p-16">
      <div className="space-y-5 animate-fade-up">
        <span className="label-eyebrow text-white/70 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Featured · live now
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold leading-[1.05] tracking-tight max-w-2xl">
          {video.title}
        </h1>
        <p className="text-white/80 max-w-xl text-base sm:text-lg leading-relaxed">
          {video.description ||
            'A new upload from the edge network. Click play to start streaming through the nearest healthy node.'}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            to={`/video/${video.id}`}
            className="btn-primary py-3 px-6 text-sm"
          >
            <PlayCircle className="h-5 w-5" />
            Watch now
          </Link>
          <Link to="/health" className="btn-secondary py-3 px-5 text-sm">
            <Activity className="h-4 w-4 text-ok" />
            Cluster status
          </Link>
        </div>

        <div className="flex items-center gap-5 pt-4 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {video.storageNodes.length} replicas active
          </span>
          <span className="hidden sm:inline">
            Uploaded by{' '}
            <span className="text-white font-medium">{video.uploadedBy}</span>
          </span>
          <span className="hidden md:inline">
            {new Date(video.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Right-side mock player poster */}
      <Link
        to={`/video/${video.id}`}
        className="relative hidden lg:block aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black/40 backdrop-blur"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,62,87,0.35),transparent_60%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-white/10 backdrop-blur-md p-5 transition-transform duration-300 group-hover:scale-110">
            <PlayCircle className="h-12 w-12 text-white" />
          </span>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-brand-gradient" />
      </Link>
    </div>
  </section>
);

/* ────────────────────────────────────────────────────────────────────
 * Empty state — shown when the feed has zero videos and no search query.
 * Pitches uploading + ties it to the actual storage architecture so the
 * page never feels blank.
 * ──────────────────────────────────────────────────────────────────── */
const EmptyFeed: React.FC<{ loggedIn: boolean }> = ({ loggedIn }) => (
  <div className="px-6 sm:px-10 py-12 max-w-screen-2xl mx-auto">
    <section className="relative overflow-hidden rounded-3xl border border-white/5">
      <div className="absolute inset-0 bg-brand-gradient opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(124,58,237,0.45),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(7,7,8,0.9)_100%)]" />

      <div className="relative z-10 grid lg:grid-cols-[1.4fr_1fr] gap-10 p-10 sm:p-14 lg:p-20">
        <div className="space-y-6 animate-fade-up">
          <span className="label-eyebrow text-white/70">
            The feed is empty
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.05]">
            Be the first to publish to the{' '}
            <span className="text-brand-gradient">edge.</span>
          </h1>
          <p className="text-white/75 max-w-xl text-lg leading-relaxed">
            Drop an MP4, MKV, or AVI in. We'll transcode it to adaptive HLS,
            replicate every segment across 3 regions, and archive the
            original to durable cold storage — all before you finish your
            coffee.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={loggedIn ? '/upload' : '/register'}
              className="btn-primary py-3 px-6 text-sm"
            >
              <UploadIcon className="h-4 w-4" />
              {loggedIn ? 'Upload your first video' : 'Join free to upload'}
            </Link>
            <Link to="/health" className="btn-secondary py-3 px-5 text-sm">
              <Activity className="h-4 w-4 text-ok" />
              View cluster
            </Link>
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-3">
          <Pillar
            icon={<Globe className="h-4 w-4" />}
            title="3-region replication"
            body="Every chunk lives on Asia, EU, and US edge nodes. Quorum keeps you live."
          />
          <Pillar
            icon={<Sparkles className="h-4 w-4" />}
            title="Adaptive HLS"
            body="10-second segments served by the closest healthy replica."
          />
          <Pillar
            icon={<RefreshCcw className="h-4 w-4" />}
            title="Self-healing"
            body="Detect a missing chunk? Repair runs automatically in the background."
          />
        </div>
      </div>
    </section>
  </div>
);

const Pillar: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
}> = ({ icon, title, body }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5">
    <div className="flex items-center gap-2.5 mb-2">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white">
        {icon}
      </span>
      <h3 className="text-sm font-display font-bold tracking-tight">
        {title}
      </h3>
    </div>
    <p className="text-sm text-white/70 leading-relaxed">{body}</p>
  </div>
);

export default HomePage;
