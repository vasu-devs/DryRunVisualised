"use client";

import { SkipBack, SkipForward, RotateCcw, Zap, Loader2 } from "lucide-react";
import { useTraceStore } from "@/lib/store/traceStore";

interface ToolbarProps {
    onExecute: () => void;
    isExecuting: boolean;
}

export function Toolbar({ onExecute, isExecuting }: ToolbarProps) {
    const { nextStep, prevStep, reset, trace } = useTraceStore();

    return (
        <div className="flex items-center gap-4 p-2 bg-transparent">
            {/* Single Run & Visualize button — executes code and auto-starts animation */}
            <button
                onClick={onExecute}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 neu-raised text-sm font-bold text-[var(--accent-cyan)] transition-all disabled:opacity-40"
            >
                {isExecuting ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Running...
                    </>
                ) : (
                    <>
                        <Zap size={16} fill="currentColor" />
                        Run &amp; Visualize
                    </>
                )}
            </button>

            <div className="h-6 w-[2px] rounded-full neu-pressed mx-2" />

            {/* Step controls — manual stepping */}
            <div className="flex items-center gap-1">
                <button
                    onClick={prevStep}
                    disabled={trace.length === 0}
                    className="p-2 neu-raised transition-all disabled:opacity-40 text-slate-500 hover:text-slate-800"
                    title="Step Back"
                >
                    <SkipBack size={18} />
                </button>

                <button
                    onClick={nextStep}
                    disabled={trace.length === 0}
                    className="p-2 neu-raised transition-all disabled:opacity-40 text-slate-500 hover:text-slate-800"
                    title="Step Forward"
                >
                    <SkipForward size={18} />
                </button>
            </div>

            <button
                onClick={reset}
                disabled={trace.length === 0}
                className="p-2 neu-raised transition-all ml-auto disabled:opacity-40 text-slate-500 hover:text-slate-800"
                title="Reset"
            >
                <RotateCcw size={18} />
            </button>
        </div>
    );
}
