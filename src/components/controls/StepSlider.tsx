"use client";

import { useEffect, useRef, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { useTraceStore } from "@/lib/store/traceStore";

const SPEED_OPTIONS = [
    { label: "1x", value: 500 },
    { label: "2x", value: 250 },
    { label: "5x", value: 100 },
    { label: "10x", value: 50 },
    { label: "25x", value: 20 },
];

/**
 * Checks if step `b` has any meaningful visual change vs step `a`.
 * If not, we can skip `b` during auto-play.
 */
function hasVisualChange(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return true;

    for (const key of keysB) {
        const va = a[key];
        const vb = b[key];
        if (va === undefined) return true;
        if (va !== vb) {
            if (typeof va === "object" || typeof vb === "object") {
                try {
                    if (JSON.stringify(va) !== JSON.stringify(vb)) return true;
                } catch {
                    return true;
                }
            } else {
                return true;
            }
        }
    }
    return false;
}

export function StepSlider() {
    const { trace, currentStepIndex, setStep, isPlaying, togglePlay, playSpeed, setPlaySpeed } = useTraceStore();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const smartStep = useCallback(() => {
        const state = useTraceStore.getState();
        const { currentStepIndex: idx, trace: t } = state;
        if (idx >= t.length - 1) {
            state.togglePlay();
            return;
        }

        // At high speeds (≤100ms), skip non-visual steps
        if (state.playSpeed <= 100) {
            let next = idx + 1;
            while (next < t.length - 1 && next - idx < 5) {
                if (hasVisualChange(t[idx].stack, t[next].stack)) break;
                next++;
            }
            state.setStep(next);
        } else {
            state.nextStep();
        }
    }, []);

    // Auto-play timer
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (isPlaying && trace.length > 0) {
            intervalRef.current = setInterval(smartStep, playSpeed);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPlaying, playSpeed, trace.length, smartStep]);

    if (trace.length === 0) return null;

    return (
        <div className="px-6 py-4 bg-glass-100/30 border-t border-glass-border-light flex items-center gap-4 z-10 relative backdrop-blur-md rounded-b-xl">
            {/* Play/Pause button — integrated into slider bar */}
            <button
                onClick={togglePlay}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${isPlaying
                    ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    : "glass-button bg-glass-200 text-slate-300 hover:text-white"
                    }`}
                title={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>

            <span className="text-sm font-sans text-slate-400 whitespace-nowrap min-w-[80px] font-medium tracking-wide">
                Step <span className="text-slate-200 font-bold">{currentStepIndex + 1}</span> / {trace.length}
            </span>
            <input
                type="range"
                min={0}
                max={trace.length - 1}
                value={currentStepIndex}
                onChange={(e) => setStep(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-glass-200 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
            />
            {/* Speed selector */}
            <div className="flex items-center gap-1 bg-glass-100 p-1 rounded-lg border border-glass-border-light">
                {SPEED_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setPlaySpeed(opt.value)}
                        className={`px-2 py-1 text-xs font-semibold font-sans rounded transition-colors ${playSpeed === opt.value
                            ? "bg-blue-600/30 text-blue-300 font-bold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-glass-200"
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
