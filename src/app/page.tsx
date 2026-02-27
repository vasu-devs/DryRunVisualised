"use client";

import Link from "next/link";
import { ArrowRight, Github, Code2, BarChart3, GitFork } from "lucide-react";

/* ─── Engraved Data Structure SVG Components ─── */

function DSArray({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="180" height="50" viewBox="0 0 180 50">
            {[0, 1, 2, 3, 4].map(i => (
                <rect key={i} x={i * 36} y="5" width="32" height="38" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
            ))}
            {["3", "7", "1", "9", "4"].map((v, i) => (
                <text key={i} x={i * 36 + 16} y="30" textAnchor="middle" fill="currentColor" fontSize="14" fontFamily="monospace" fontWeight="bold">{v}</text>
            ))}
        </svg>
    );
}

function DSTree({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="140" height="120" viewBox="0 0 140 120">
            <line x1="70" y1="20" x2="35" y2="55" stroke="currentColor" strokeWidth="2.5" />
            <line x1="70" y1="20" x2="105" y2="55" stroke="currentColor" strokeWidth="2.5" />
            <line x1="35" y1="55" x2="18" y2="90" stroke="currentColor" strokeWidth="2.5" />
            <line x1="35" y1="55" x2="52" y2="90" stroke="currentColor" strokeWidth="2.5" />
            <line x1="105" y1="55" x2="88" y2="90" stroke="currentColor" strokeWidth="2.5" />
            <line x1="105" y1="55" x2="122" y2="90" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="70" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.8" />
            <circle cx="35" cy="52" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="105" cy="52" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="18" cy="88" r="11" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="52" cy="88" r="11" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="88" cy="88" r="11" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="122" cy="88" r="11" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <text x="70" y="21" textAnchor="middle" fill="currentColor" fontSize="12" fontFamily="monospace" fontWeight="bold">5</text>
            <text x="35" y="57" textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="monospace">3</text>
            <text x="105" y="57" textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="monospace">8</text>
        </svg>
    );
}

function DSLinkedList({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="240" height="46" viewBox="0 0 240 46">
            <defs><marker id="lla" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="none" stroke="currentColor" strokeWidth="1.8" /></marker></defs>
            {[0, 1, 2].map(i => (
                <g key={i}>
                    <rect x={i * 78} y="5" width="55" height="34" rx="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <line x1={i * 78 + 27} y1="5" x2={i * 78 + 27} y2="39" stroke="currentColor" strokeWidth="1.5" />
                    <text x={i * 78 + 14} y="27" textAnchor="middle" fill="currentColor" fontSize="13" fontFamily="monospace" fontWeight="bold">{["1", "4", "2"][i]}</text>
                    <text x={i * 78 + 41} y="25" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace">→</text>
                </g>
            ))}
            <line x1="211" y1="22" x2="228" y2="22" stroke="currentColor" strokeWidth="2" markerEnd="url(#lla)" />
            <text x="234" y="26" fill="currentColor" fontSize="13" fontFamily="monospace" fontWeight="bold">∅</text>
        </svg>
    );
}

function DSGraph({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="140" height="130" viewBox="0 0 140 130">
            <line x1="35" y1="28" x2="105" y2="28" stroke="currentColor" strokeWidth="2.5" />
            <line x1="35" y1="28" x2="20" y2="100" stroke="currentColor" strokeWidth="2.5" />
            <line x1="105" y1="28" x2="120" y2="100" stroke="currentColor" strokeWidth="2.5" />
            <line x1="20" y1="100" x2="120" y2="100" stroke="currentColor" strokeWidth="2.5" />
            <line x1="35" y1="28" x2="120" y2="100" stroke="currentColor" strokeWidth="1.8" strokeDasharray="5,4" />
            <line x1="105" y1="28" x2="20" y2="100" stroke="currentColor" strokeWidth="1.8" strokeDasharray="5,4" />
            <circle cx="35" cy="25" r="14" fill="none" stroke="currentColor" strokeWidth="2.8" />
            <circle cx="105" cy="25" r="14" fill="none" stroke="currentColor" strokeWidth="2.8" />
            <circle cx="20" cy="100" r="14" fill="none" stroke="currentColor" strokeWidth="2.8" />
            <circle cx="120" cy="100" r="14" fill="none" stroke="currentColor" strokeWidth="2.8" />
            <text x="35" y="30" textAnchor="middle" fill="currentColor" fontSize="12" fontFamily="monospace" fontWeight="bold">A</text>
            <text x="105" y="30" textAnchor="middle" fill="currentColor" fontSize="12" fontFamily="monospace" fontWeight="bold">B</text>
            <text x="20" y="105" textAnchor="middle" fill="currentColor" fontSize="12" fontFamily="monospace" fontWeight="bold">C</text>
            <text x="120" y="105" textAnchor="middle" fill="currentColor" fontSize="12" fontFamily="monospace" fontWeight="bold">D</text>
        </svg>
    );
}

function DSStack({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="70" height="130" viewBox="0 0 70 130">
            {[0, 1, 2, 3].map(i => (
                <rect key={i} x="5" y={5 + i * 30} width="60" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
            ))}
            <text x="35" y="22" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace" fontWeight="bold">TOP</text>
            {["8", "3", "1"].map((v, i) => (
                <text key={i} x="35" y={52 + i * 30} textAnchor="middle" fill="currentColor" fontSize="13" fontFamily="monospace" fontWeight="bold">{v}</text>
            ))}
            {/* Stack bracket */}
            <line x1="2" y1="2" x2="2" y2="128" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="68" y1="2" x2="68" y2="128" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

function DSQueue({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="200" height="50" viewBox="0 0 200 50">
            {[0, 1, 2, 3, 4].map(i => (
                <rect key={i} x={i * 38 + 4} y="6" width="34" height="36" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
            ))}
            {["9", "2", "5", "7", "6"].map((v, i) => (
                <text key={i} x={i * 38 + 21} y="30" textAnchor="middle" fill="currentColor" fontSize="13" fontFamily="monospace" fontWeight="bold">{v}</text>
            ))}
            {/* Front/Back markers */}
            <line x1="4" y1="3" x2="4" y2="46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="196" y1="3" x2="196" y2="46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <text x="14" y="48" fill="currentColor" fontSize="7" fontFamily="monospace">F</text>
            <text x="186" y="48" fill="currentColor" fontSize="7" fontFamily="monospace">B</text>
        </svg>
    );
}

function DSMatrix({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="110" height="110" viewBox="0 0 110 110">
            {[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => (
                <rect key={`${r}-${c}`} x={3 + c * 26} y={3 + r * 26} width="23" height="23" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
            )))}
            {["1", "0", "1", "0", "0", "1", "0", "1", "1", "0", "0", "1", "0", "1", "1", "0"].map((v, i) => (
                <text key={i} x={14 + (i % 4) * 26} y={19 + Math.floor(i / 4) * 26} textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace" fontWeight="bold">{v}</text>
            ))}
        </svg>
    );
}

function DSHashMap({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="130" height="110" viewBox="0 0 130 110">
            {[0, 1, 2, 3].map(i => (
                <g key={i}>
                    <rect x="3" y={3 + i * 26} width="30" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="2.2" />
                    <text x="18" y={18 + i * 26} textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace" fontWeight="bold">{i}</text>
                    <line x1="36" y1={14 + i * 26} x2="52" y2={14 + i * 26} stroke="currentColor" strokeWidth="2" />
                    <rect x="55" y={3 + i * 26} width="40" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="2.2" />
                    <text x="75" y={18 + i * 26} textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace">{["cat", "dog", "ant", "fox"][i]}</text>
                    {i < 2 && <>
                        <line x1="98" y1={14 + i * 26} x2="108" y2={14 + i * 26} stroke="currentColor" strokeWidth="1.5" />
                        <rect x="110" y={3 + i * 26} width="16" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </>}
                </g>
            ))}
        </svg>
    );
}

function DSHeap({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="150" height="110" viewBox="0 0 150 110">
            <line x1="75" y1="18" x2="38" y2="48" stroke="currentColor" strokeWidth="2.5" />
            <line x1="75" y1="18" x2="112" y2="48" stroke="currentColor" strokeWidth="2.5" />
            <line x1="38" y1="48" x2="18" y2="82" stroke="currentColor" strokeWidth="2.5" />
            <line x1="38" y1="48" x2="55" y2="82" stroke="currentColor" strokeWidth="2.5" />
            <line x1="112" y1="48" x2="95" y2="82" stroke="currentColor" strokeWidth="2.5" />
            <line x1="112" y1="48" x2="132" y2="82" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="75" cy="15" r="13" fill="none" stroke="currentColor" strokeWidth="2.8" />
            <circle cx="38" cy="46" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="112" cy="46" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="18" cy="82" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="55" cy="82" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="95" cy="82" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="132" cy="82" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <text x="75" y="20" textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="monospace" fontWeight="bold">1</text>
            <text x="38" y="51" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace">3</text>
            <text x="112" y="51" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace">2</text>
            <text x="18" y="86" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace">7</text>
            <text x="55" y="86" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace">5</text>
            <text x="95" y="86" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace">4</text>
            <text x="132" y="86" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace">6</text>
        </svg>
    );
}

function DSTrie({ style }: { style: React.CSSProperties }) {
    return (
        <svg style={style} className="absolute" width="130" height="110" viewBox="0 0 130 110">
            <line x1="65" y1="16" x2="30" y2="45" stroke="currentColor" strokeWidth="2.2" />
            <line x1="65" y1="16" x2="100" y2="45" stroke="currentColor" strokeWidth="2.2" />
            <line x1="30" y1="45" x2="15" y2="75" stroke="currentColor" strokeWidth="2.2" />
            <line x1="30" y1="45" x2="45" y2="75" stroke="currentColor" strokeWidth="2.2" />
            <line x1="100" y1="45" x2="85" y2="75" stroke="currentColor" strokeWidth="2.2" />
            <line x1="100" y1="45" x2="115" y2="75" stroke="currentColor" strokeWidth="2.2" />
            <line x1="15" y1="75" x2="15" y2="98" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="65" cy="13" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="30" cy="43" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="100" cy="43" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="15" cy="73" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="45" cy="73" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="85" cy="73" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="115" cy="73" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="15" cy="96" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <text x="65" y="17" textAnchor="middle" fill="currentColor" fontSize="8" fontFamily="monospace" fontWeight="bold">◊</text>
            <text x="30" y="47" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace" fontWeight="bold">c</text>
            <text x="100" y="47" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace" fontWeight="bold">d</text>
            <text x="15" y="77" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace">a</text>
            <text x="45" y="77" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace">o</text>
            <text x="85" y="77" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace">o</text>
            <text x="115" y="77" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace">a</text>
            <text x="15" y="100" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace">t</text>
        </svg>
    );
}

/* ─── Background scatter positions ─── */
const BG_ITEMS: { Comp: React.FC<{ style: React.CSSProperties }>; x: string; y: string; r: number; s: number }[] = [
    // Row 1
    { Comp: DSLinkedList, x: "1%", y: "2%", r: -2, s: 1 },
    { Comp: DSTree, x: "25%", y: "1%", r: 3, s: 0.95 },
    { Comp: DSGraph, x: "50%", y: "3%", r: -4, s: 0.9 },
    { Comp: DSHashMap, x: "75%", y: "1%", r: 2, s: 1 },
    // Row 2
    { Comp: DSHeap, x: "2%", y: "16%", r: 1, s: 0.9 },
    { Comp: DSMatrix, x: "22%", y: "18%", r: -3, s: 1 },
    { Comp: DSStack, x: "42%", y: "15%", r: 4, s: 0.85 },
    { Comp: DSQueue, x: "55%", y: "17%", r: -1, s: 0.9 },
    { Comp: DSTrie, x: "80%", y: "16%", r: 3, s: 0.95 },
    // Row 3
    { Comp: DSArray, x: "0%", y: "33%", r: -1, s: 0.95 },
    { Comp: DSGraph, x: "24%", y: "35%", r: 5, s: 0.85 },
    { Comp: DSLinkedList, x: "48%", y: "32%", r: -2, s: 0.9 },
    { Comp: DSHeap, x: "76%", y: "34%", r: 1, s: 0.85 },
    // Row 4
    { Comp: DSTrie, x: "3%", y: "50%", r: 2, s: 1 },
    { Comp: DSStack, x: "20%", y: "48%", r: -4, s: 0.9 },
    { Comp: DSHashMap, x: "34%", y: "52%", r: 3, s: 0.85 },
    { Comp: DSTree, x: "58%", y: "50%", r: -2, s: 0.9 },
    { Comp: DSMatrix, x: "80%", y: "49%", r: 4, s: 0.95 },
    // Row 5
    { Comp: DSQueue, x: "1%", y: "66%", r: -3, s: 0.9 },
    { Comp: DSArray, x: "26%", y: "68%", r: 2, s: 0.85 },
    { Comp: DSGraph, x: "48%", y: "65%", r: -1, s: 1 },
    { Comp: DSLinkedList, x: "72%", y: "67%", r: 3, s: 0.9 },
    // Row 6
    { Comp: DSTree, x: "4%", y: "82%", r: 4, s: 0.85 },
    { Comp: DSHeap, x: "22%", y: "84%", r: -2, s: 0.9 },
    { Comp: DSStack, x: "44%", y: "80%", r: 1, s: 1 },
    { Comp: DSHashMap, x: "55%", y: "83%", r: -3, s: 0.85 },
    { Comp: DSTrie, x: "72%", y: "82%", r: 2, s: 0.95 },
    { Comp: DSMatrix, x: "88%", y: "84%", r: -4, s: 0.9 },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen relative font-sans flex flex-col items-center justify-center p-6 bg-[var(--bg-neu)] overflow-hidden">

            {/* ─── Dense engraved background ─── */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{
                filter: "drop-shadow(-1.5px -1.5px 1px var(--shadow-dark)) drop-shadow(1.5px 1.5px 1px var(--shadow-light))",
            }}>
                <div className="text-[var(--bg-neu)]" style={{ opacity: 1 }}>
                    {BG_ITEMS.map(({ Comp, x, y, r, s }, i) => (
                        <Comp key={i} style={{ left: x, top: y, transform: `rotate(${r}deg) scale(${s})` }} />
                    ))}
                </div>
            </div>

            {/* Center fade so hero card is readable */}
            <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,var(--bg-neu)_20%,transparent_65%)] opacity-90" />

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
