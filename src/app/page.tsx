"use client";

import Link from "next/link";
import { ArrowRight, Github, Code2, BarChart3, GitFork } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen relative font-sans flex flex-col items-center justify-center p-6 bg-[var(--bg-neu)] overflow-hidden">

            {/* Animated background grid */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Dot grid */}
                <div className="absolute inset-0" style={{
                    backgroundImage: "radial-gradient(circle, var(--text-secondary) 0.6px, transparent 0.6px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.08,
                }} />
                {/* Radial glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--shadow-light)_0%,transparent_60%)] opacity-40" />
                {/* Floating shapes */}
                <div className="absolute top-[15%] left-[10%] w-40 h-40 neu-extruded rounded-[40px] opacity-[0.04] animate-[float_12s_ease-in-out_infinite]" />
                <div className="absolute bottom-[20%] right-[12%] w-28 h-28 neu-extruded rounded-full opacity-[0.05] animate-[float_10s_ease-in-out_infinite_reverse]" />
                <div className="absolute top-[60%] left-[75%] w-20 h-20 neu-inset rounded-3xl opacity-[0.05] animate-[float_14s_ease-in-out_infinite]" />
                <div className="absolute top-[25%] right-[25%] w-16 h-16 neu-inset rounded-full opacity-[0.04] animate-[float_11s_ease-in-out_infinite_reverse]" />
            </div>

            {/* Top Bar */}
            <nav className="absolute top-8 left-8 right-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 neu-extruded rounded-2xl flex items-center justify-center overflow-hidden p-1.5">
                        <img src="/favicon.png" alt="Visual DSA" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-sm font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                        Visual DSA
                    </span>
                </div>
                <a href="https://github.com/vasu-devs/DryRunVisualised" target="_blank" rel="noopener noreferrer" className="neu-extruded neu-base-pill px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] hover:text-[var(--accent-dark)] transition-all flex items-center gap-2">
                    <Github size={13} />
                    GitHub
                </a>
            </nav>

            {/* Hero Card */}
            <main className="w-full max-w-2xl neu-extruded neu-base-card p-12 sm:p-16 flex flex-col items-center text-center relative z-10">

                <h1 className="text-4xl md:text-6xl font-light text-[var(--text-primary)] tracking-tight leading-[1.1] mb-4">
                    Data Structures.<br />
                    <span className="font-semibold text-[var(--text-secondary)]">Visualized.</span>
                </h1>

                <p className="text-base text-[var(--text-secondary)] font-medium max-w-md leading-relaxed mb-10">
                    Write code, step through execution, and watch algorithms come alive in 2D & 3D.
                </p>

                <Link
                    href="/visualizer"
                    className="group flex items-center gap-3 neu-extruded neu-base-pill px-8 py-4 text-base font-bold text-[var(--accent-dark)] hover:scale-[1.02] transition-all cursor-pointer"
                >
                    Launch Visualizer
                    <div className="w-7 h-7 neu-inset neu-base-pill flex items-center justify-center group-active:scale-95 transition-transform">
                        <ArrowRight size={16} className="text-[var(--accent-dark)]" />
                    </div>
                </Link>

            </main>

            {/* Feature Highlights */}
            <div className="w-full max-w-2xl grid grid-cols-3 gap-4 mt-6 relative z-10">
                <div className="neu-extruded neu-base-card p-5 flex flex-col items-center text-center gap-2">
                    <div className="w-9 h-9 neu-inset rounded-xl flex items-center justify-center">
                        <Code2 size={16} className="text-[var(--accent-dark)]" />
                    </div>
                    <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide">Python & C++</span>
                    <span className="text-[10px] text-[var(--text-secondary)] leading-snug">Write in your language, execute instantly</span>
                </div>
                <div className="neu-extruded neu-base-card p-5 flex flex-col items-center text-center gap-2">
                    <div className="w-9 h-9 neu-inset rounded-xl flex items-center justify-center">
                        <BarChart3 size={16} className="text-[var(--accent-dark)]" />
                    </div>
                    <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide">2D & 3D Views</span>
                    <span className="text-[10px] text-[var(--text-secondary)] leading-snug">Dual visualization with step-by-step control</span>
                </div>
                <div className="neu-extruded neu-base-card p-5 flex flex-col items-center text-center gap-2">
                    <div className="w-9 h-9 neu-inset rounded-xl flex items-center justify-center">
                        <GitFork size={16} className="text-[var(--accent-dark)]" />
                    </div>
                    <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide">50+ Algorithms</span>
                    <span className="text-[10px] text-[var(--text-secondary)] leading-snug">Sorting, graphs, DP, backtracking & more</span>
                </div>
            </div>

            {/* Credit */}
            <a
                href="https://vasudev.live"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-6 z-50 text-[10px] font-medium text-[var(--text-secondary)] opacity-40 hover:opacity-100 hover:text-[var(--accent-dark)] transition-all"
            >
                Made with ❤️ by vasu-devs
            </a>

        </div>
    );
}
