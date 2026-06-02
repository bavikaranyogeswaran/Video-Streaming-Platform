import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Globe, ShieldCheck, Zap } from 'lucide-react';

/**
 * Shared chrome for /login and /register — split-screen cinematic layout.
 *
 *   ┌──────────────────────────────┬─────────────────────────┐
 *   │  brand wordmark              │                         │
 *   │                              │   eyebrow + headline    │
 *   │  {children: form}            │   bullet points         │
 *   │                              │   tiny stat footer      │
 *   │  © footer                    │                         │
 *   └──────────────────────────────┴─────────────────────────┘
 *
 * The right half is a marketing pane that gives the page weight on wide
 * screens. It collapses to nothing under md so the form stays focused
 * on mobile.
 */
export const AuthShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="min-h-screen grid lg:grid-cols-[1fr_minmax(0,520px)] bg-background">
    {/* ── Form side ────────────────────────────────────────────────── */}
    <div className="relative flex flex-col px-6 sm:px-10 py-8 sm:py-12 min-h-screen">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 self-start">
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-primary">
          <Play className="h-4 w-4 fill-white text-white translate-x-[1px]" />
        </span>
        <span className="text-xl font-display font-bold tracking-tight">
          Stream<span className="text-brand-gradient">Flix</span>
        </span>
      </Link>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      <div className="text-xs text-muted">
        © {new Date().getFullYear()} StreamFlix · Edge-distributed video
      </div>
    </div>

    {/* ── Marketing pane (lg+) ─────────────────────────────────────── */}
    <aside className="hidden lg:flex relative overflow-hidden border-l border-white/5">
      {/* Layered backdrop */}
      <div className="absolute inset-0 bg-brand-gradient opacity-[0.18]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,62,87,0.45),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_80%,rgba(124,58,237,0.35),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(7,7,8,0.85)_100%)]" />

      {/* Diagonal scan lines */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 18px)',
        }}
      />

      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        <div className="space-y-6 animate-fade-up">
          <span className="label-eyebrow text-white/60">
            Built for resilience
          </span>
          <h2 className="text-4xl font-display font-bold leading-tight">
            Stream from a self-healing edge — never goes dark.
          </h2>
          <p className="text-white/70 leading-relaxed">
            StreamFlix replicates every upload across three regional edge nodes
            and a durable cold archive. If one falls over, traffic reroutes in
            milliseconds.
          </p>

          <ul className="space-y-3 pt-4">
            <FeatureBullet
              icon={<Globe className="h-4 w-4" />}
              text="3-region edge replication (Asia · EU · US)"
            />
            <FeatureBullet
              icon={<ShieldCheck className="h-4 w-4" />}
              text="Durable S3 cold archive of every original"
            />
            <FeatureBullet
              icon={<Zap className="h-4 w-4" />}
              text="HLS adaptive segments, served by the nearest healthy node"
            />
          </ul>
        </div>

        <div className="flex items-center gap-6 text-white/60 text-xs uppercase tracking-widest font-bold pt-12">
          <Stat label="Replicas" value="3" />
          <Divider />
          <Stat label="Quorum" value="2/3" />
          <Divider />
          <Stat label="Uptime" value="99.99%" />
        </div>
      </div>
    </aside>
  </div>
);

const FeatureBullet: React.FC<{ icon: React.ReactNode; text: string }> = ({
  icon,
  text,
}) => (
  <li className="flex items-start gap-3 text-white/85">
    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
      {icon}
    </span>
    <span className="text-sm leading-relaxed">{text}</span>
  </li>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col leading-tight">
    <span className="text-white text-2xl font-display font-bold">{value}</span>
    <span>{label}</span>
  </div>
);

const Divider: React.FC = () => <span className="h-8 w-px bg-white/15" />;
