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
        <div className="flex items-center gap-4 p-2 bg-slate-900 border-b border-slate-800">
            {/* Single Run & Visualize button — executes code and auto-starts animation */}
            <button
                onClick={onExecute}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-md text-sm font-medium transition-colors"
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

            <div className="h-6 w-[1px] bg-slate-700 mx-2" />

            {/* Step controls — manual stepping */}
            <div className="flex items-center gap-1">
                <button
                    onClick={prevStep}
                    disabled={trace.length === 0}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors disabled:opacity-40"
                    title="Step Back"
                >
                    <SkipBack size={18} />
                </button>

                <button
                    onClick={nextStep}
                    disabled={trace.length === 0}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors disabled:opacity-40"
                    title="Step Forward"
                >
                    <SkipForward size={18} />
                </button>
            </div>

            <button
                onClick={reset}
                disabled={trace.length === 0}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors ml-auto disabled:opacity-40"
                title="Reset"
            >
                <RotateCcw size={18} />
            </button>
        </div>
    );
}
