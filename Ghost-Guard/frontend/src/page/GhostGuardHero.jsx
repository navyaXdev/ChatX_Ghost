
import React from "react";

export default function GhostGuardHero() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white flex flex-col">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0 opacity-70"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2000&auto=format&fit=crop')",
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80 z-0" />

      {/* Header / Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <span className="text-xl lg:text-2xl font-serif tracking-wider font-semibold">
            GHOST GUARD
          </span>
        </div>


        {/* Open Dashboard */}
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-medium bg-white text-black hover:bg-stone-200 transition-all shadow-lg"
        >
          Open dashboard
        </a>
      </header>

      {/* Main Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto py-12">
        {/* Sub-tagline */}
        <div className="text-xs lg:text-sm tracking-[0.25em] text-stone-300 uppercase font-semibold mb-4">
          Adaptive API Defense
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-white mb-6 leading-[1.1]">
          See the signal before it becomes a threat.
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-stone-300 max-w-xl mx-auto mb-10 leading-relaxed font-light">
          GHOST GUARD observes abnormal API behavior, adapts to suspicious
          sessions, and contains threats before they become incidents.
        </p>

        {/* CTA */}
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-medium bg-black text-white border border-stone-800 hover:bg-stone-950 hover:border-stone-700 transition-all shadow-2xl tracking-wide"
        >
          Enter GHOST GUARD
        </a>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center text-xs text-stone-400 tracking-wide font-light">
        A calmer way to watch the edge.
      </footer>
    </div>
  );
}
