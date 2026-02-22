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
        <div className="flex items-center gap-4 p-3 bg-transparent border-b border-glass-border-light">
            {/* Single Run & Visualize button — executes code and auto-starts animation */}
            <button
                onClick={onExecute}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 glass-button bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 border-blue-500/30 disabled:opacity-50 font-semibold tracking-wide transition-all duration-300"
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

            <div className="h-6 w-px bg-glass-border-strong mx-2" />

            {/* Step controls — manual stepping */}
            <div className="flex items-center gap-2 bg-glass-100 p-1 rounded-lg border border-glass-border-light backdrop-blur-md">
                <button
                    onClick={prevStep}
                    disabled={trace.length === 0}
                    className="p-1.5 rounded hover:bg-glass-200 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
                    title="Step Back"
                >
                    <SkipBack size={18} />
                </button>

                <button
                    onClick={nextStep}
                    disabled={trace.length === 0}
                    className="p-1.5 rounded hover:bg-glass-200 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
                    title="Step Forward"
                >
                    <SkipForward size={18} />
                </button>
            </div>

            <button
                onClick={reset}
                disabled={trace.length === 0}
                className="p-2 ml-auto rounded glass-button bg-glass-100 text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 disabled:opacity-40 transition-all"
                title="Reset"
            >
                <RotateCcw size={16} />
            </button>
        </div >
    );
}
