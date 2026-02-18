"use client";

import { useTraceStore } from "@/lib/store/traceStore";

/** Format a variable value for display — special-casing linked lists and trees */
function formatVariableValue(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return JSON.stringify(value);

    const obj = value as Record<string, unknown>;

    // Linked list: {"__type__": "linked_list", "values": [...]}
    if (obj.__type__ === "linked_list" && Array.isArray(obj.values)) {
        const vals = (obj.values as unknown[]).map(v => String(v));
        if (vals.length === 0) return "∅ (empty)";
        return vals.join(" → ") + " → NULL";
    }

    // Tree: {"__type__": "tree", "root": {...}}
    if (obj.__type__ === "tree") {
        return "tree(...)";
    }

    return JSON.stringify(value);
}

export function VariablePanel() {
    const currentStep = useTraceStore((state) => state.getCurrentStep());

    if (!currentStep) return null;

    return (
        <div className="flex-1 min-w-[300px] border-r border-slate-800 p-4 overflow-auto bg-slate-900/50">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Variables (Stack)</h3>
            <div className="space-y-2">
                {Object.entries(currentStep.stack).map(([name, value]) => {
                    const isLinkedList = value !== null && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).__type__ === "linked_list";
                    return (
                        <div key={name} className="flex items-baseline gap-2 font-mono text-sm">
                            <span className={isLinkedList ? "text-emerald-400" : "text-blue-400"}>{name}</span>
                            <span className="text-slate-500">=</span>
                            <span className={`truncate ${isLinkedList ? "text-emerald-300" : "text-slate-300"}`}>
                                {formatVariableValue(value)}
                            </span>
                        </div>
                    );
                })}
                {Object.keys(currentStep.stack).length === 0 && (
                    <div className="text-slate-600 italic text-xs">No variables in scope</div>
                )}
            </div>
        </div>
    );
}

export function StdoutPanel() {
    const currentStep = useTraceStore((state) => state.getCurrentStep());

    return (
        <div className="flex-1 p-4 overflow-auto bg-slate-950">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Console Output</h3>
            <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                {currentStep?.stdout || "Program output will appear here..."}
            </pre>
        </div>
    );
}
