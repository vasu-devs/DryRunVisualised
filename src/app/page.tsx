"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen relative font-sans flex flex-col items-center justify-center p-6 bg-[var(--bg-neu)] overflow-hidden">

            {/* Top Bar (Minimalist) */}
            <nav className="absolute top-8 left-8 right-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 neu-extruded neu-base-pill flex items-center justify-center overflow-hidden">
                        <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-full" />
                    </div>
                </div>
                <div className="flex gap-6">
                    <Link href="/visualizer" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-dark)] transition-colors">Workspace</Link>
                    <a href="https://github.com" target="_blank" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-dark)] transition-colors">GitHub</a>
                </div>
            </nav>

            {/* Hyper-Minimalist Central Hero Card */}
            <main className="w-full max-w-4xl neu-extruded neu-base-card p-16 sm:p-24 flex flex-col items-center text-center relative z-10">

                {/* Status Indicator */}
                <div className="inline-flex items-center gap-3 neu-inset neu-base-pill px-6 py-2 mb-12">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-dark)] opacity-40"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-dark)]"></span>
                    </span>
                    <span className="text-xs font-semibold text-[var(--accent-dark)] tracking-widest uppercase">Engine Online</span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-7xl font-light text-[var(--text-primary)] tracking-tight leading-[1.1] mb-8">
                    Data Structures.<br />
                    <span className="font-semibold text-[var(--text-secondary)]">Physicalized.</span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-xl text-[var(--text-secondary)] font-medium max-w-2xl leading-relaxed mb-16">
                    A strictly tactile environment for algorithmic execution. Write code, step through memory, and feel the objects react in a premium 3D space.
                </p>

                {/* Pill CTA - Extruded that turns Inset on active */}
                <Link
                    href="/visualizer"
                    className="group flex items-center gap-4 neu-extruded neu-base-pill px-10 py-5 text-lg font-bold text-[var(--accent-dark)] hover:scale-[1.02] transition-all cursor-pointer"
                >
                    Launch Visualizer
                    <div className="w-8 h-8 neu-inset neu-base-pill flex items-center justify-center group-active:scale-95 transition-transform">
                        <ArrowRight size={18} className="text-[var(--accent-dark)]" />
                    </div>
                </Link>

            </main>

            {/* Background elements to ground the card */}
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
                <div className="w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,var(--shadow-light)_0%,transparent_70%)] opacity-30"></div>
            </div>

        </div>
    );
}
