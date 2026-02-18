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
        <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 flex items-center gap-3">
            {/* Play/Pause button — integrated into slider bar */}
            <button
                onClick={togglePlay}
                className={`p-1.5 rounded-md transition-colors ${isPlaying
                        ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                        : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                    }`}
                title={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>

            <span className="text-xs font-mono text-slate-500 whitespace-nowrap min-w-[80px]">
                Step {currentStepIndex + 1} / {trace.length}
            </span>
            <input
                type="range"
                min={0}
                max={trace.length - 1}
                value={currentStepIndex}
                onChange={(e) => setStep(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            {/* Speed selector */}
            <div className="flex items-center gap-1">
                {SPEED_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setPlaySpeed(opt.value)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${playSpeed === opt.value
                            ? "bg-blue-600 text-white"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
