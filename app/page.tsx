"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-cream text-stone-900">
      <style jsx global>{`
        @keyframes drift {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        @keyframes swell {
          0% { transform: translateX(0); }
          50% { transform: translateX(8px); }
          100% { transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>

      <header className="px-6 lg:px-12 pt-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/80 border border-stone-200/70 flex items-center justify-center">
              <WaveMark />
            </div>
            <span className="text-sm tracking-wide uppercase text-stone-500">California Surf Planner</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/demo/live"
              className="surface-pill text-xs px-3 py-1.5 text-stone-700 hover:bg-white transition-all ease-soft"
            >
              View demo
            </Link>
            <Link
              href="/plan"
              className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-full hover:bg-stone-800 transition-all ease-soft"
            >
              Start planning
            </Link>
          </div>
        </nav>
      </header>

      <main className="px-6 lg:px-12 pb-16 pt-10 grid gap-16">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 surface-pill px-3 py-1.5 text-xs text-stone-600 w-fit">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live multi-agent planning
            </div>
            <h1 className="text-display text-4xl lg:text-5xl leading-tight">
              Plan a California surf run in minutes — with a live agent crew.
            </h1>
            <p className="text-meta text-stone-600 max-w-xl">
              Drop your start and end points, pick boards, and watch the vision, recon, planner,
              and narrator agents coordinate in real time. Route pins, swell picks, and narrative
              summaries land as they think.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/plan"
                className="px-6 py-3 text-sm font-medium text-white bg-stone-900 rounded-full hover:bg-stone-800 transition-all ease-soft"
              >
                Plan my trip
              </Link>
              <Link
                href="/demo/live"
                className="px-6 py-3 text-sm font-medium text-stone-700 border border-stone-200/70 rounded-full hover:bg-white transition-all ease-soft"
              >
                Watch the live demo
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-stone-500">
              <span>Forecast scoring · Drive routing · Board matching</span>
              <span>Exports · Trip summary · Shareable link</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-10 -right-8 h-24 w-24 rounded-full bg-emerald-100 blur-2xl" />
            <div className="absolute -bottom-12 left-6 h-28 w-28 rounded-full bg-sky-100 blur-2xl" />
            <div
              className="surface-glass border border-stone-200/70 rounded-2xl p-6 grid gap-4"
              style={{
                animation: "drift 6s ease-in-out infinite",
                background: "linear-gradient(120deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-stone-500">Demo overlay</div>
                <span className="text-xs text-stone-400">SF → Santa Barbara</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-stone-200/70 bg-white">
                <DemoMap />
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-stone-500">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Dawn window
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Long-period swell
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Route synced
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-3">
          <FeatureCard
            title="Swell intelligence"
            description="Recon scans the coast, scores conditions, and flags peak windows with fit scores."
            icon={<WaveIcon />}
          />
          <FeatureCard
            title="Board-to-break pairing"
            description="Vision and Planner align your quiver to each session, so every board has a purpose."
            icon={<BoardIcon />}
          />
          <FeatureCard
            title="Route + narration"
            description="Drive legs, overnight towns, and a trip write-up land as soon as the plan locks."
            icon={<RouteIcon />}
          />
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-center">
          <div className="grid gap-6">
            <h2 className="text-display text-3xl">Live planning, clean outputs</h2>
            <p className="text-meta text-stone-600">
              Follow the live feed, then share the final itinerary with session pins,
              route geometry, and a narrative summary. Everything stays on-theme with
              surf-ready visuals.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/plan"
                className="px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-full hover:bg-stone-800 transition-all ease-soft"
              >
                Build a plan
              </Link>
              <Link
                href="/demo/live"
                className="px-5 py-2.5 text-sm font-medium text-stone-700 border border-stone-200/70 rounded-full hover:bg-white transition-all ease-soft"
              >
                Explore demo
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <DemoTile title="Wave card" subtitle="4.2ft @ 14s" accent="#7dd3fc" />
              <DemoTile title="Drive leg" subtitle="1h30m · 75mi" accent="#fdba74" />
            </div>
            <div className="surface-glass border border-stone-200/70 rounded-2xl p-5 flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/80 border border-stone-200/70 flex items-center justify-center">
                <SurfVanIcon />
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-800">Exports ready</div>
                <div className="text-xs text-stone-500">GeoJSON route · summary.md · calendar</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="surface-glass border border-stone-200/70 rounded-2xl p-6 flex flex-col gap-3">
      <div className="h-12 w-12 rounded-full bg-white/80 border border-stone-200/70 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-lg font-semibold text-stone-800">{title}</div>
      <p className="text-sm text-stone-600">{description}</p>
    </div>
  );
}

function DemoTile({ title, subtitle, accent }: { title: string; subtitle: string; accent: string }) {
  return (
    <div
      className="surface-glass border border-stone-200/70 rounded-2xl p-4 flex flex-col gap-2"
      style={{
        background: `linear-gradient(120deg, rgba(255,255,255,0.85), ${accent}22)`
      }}
    >
      <div className="text-xs uppercase tracking-widest text-stone-500">{title}</div>
      <div className="text-sm font-semibold text-stone-800">{subtitle}</div>
      <div className="h-1 rounded-full" style={{ background: accent }} />
    </div>
  );
}

function WaveMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M5 20c4-6 10-7 16-4 2 1 4 2 6 1" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 24c5-4 10-4 16-1" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M6 28c6-10 16-12 26-6 3 2 6 3 10 2" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 34c7-6 16-6 26-2" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M24 6c8 0 14 10 14 18s-6 18-14 18S10 32 10 24 16 6 24 6Z" stroke="#f59e0b" strokeWidth="2.5" />
      <path d="M24 12c4 0 8 7 8 12s-4 12-8 12-8-7-8-12 4-12 8-12Z" stroke="#fbbf24" strokeWidth="2" opacity="0.8" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M12 12h10c6 0 10 4 10 10v14" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" fill="#22c55e" />
      <circle cx="32" cy="36" r="4" fill="#16a34a" />
    </svg>
  );
}

function SurfVanIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M10 38c0-8 6-14 14-14h16c8 0 14 6 14 14v8H10v-8Z" stroke="#0f172a" strokeWidth="2" />
      <path d="M18 38h28" stroke="#0f172a" strokeWidth="2" />
      <circle cx="20" cy="50" r="5" fill="#0f172a" />
      <circle cx="44" cy="50" r="5" fill="#0f172a" />
    </svg>
  );
}

function DemoMap() {
  return (
    <svg width="100%" height="200" viewBox="0 0 420 220" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>
      <rect width="420" height="220" fill="url(#ocean)" />
      <path
        d="M40 150c60-50 120-70 180-40 60 30 110 20 160-20"
        stroke="#0ea5e9"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ animation: "swell 6s ease-in-out infinite" }}
      />
      <circle cx="60" cy="150" r="7" fill="#22c55e" />
      <circle cx="220" cy="120" r="7" fill="#f59e0b" />
      <circle cx="360" cy="90" r="7" fill="#ef4444" />
      <rect x="20" y="24" width="120" height="28" rx="14" fill="#fff" opacity="0.85" />
      <text x="36" y="42" fontSize="12" fill="#0f172a">Live route</text>
    </svg>
  );
}
