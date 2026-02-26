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
        <div className="flex-1 min-w-[260px] p-5 overflow-auto neu-inset neu-base-card mx-2 mb-2 custom-scrollbar">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Variables (Stack)</h3>
            <div className="space-y-2">
                {Object.entries(currentStep.stack).map(([name, value]) => {
                    const isLinkedList = value !== null && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).__type__ === "linked_list";
                    return (
                        <div key={name} className="flex items-baseline gap-2 font-mono text-sm py-2 border-b border-[var(--shadow-dark)]/10 last:border-0">
                            <span className={isLinkedList ? "text-brand-pink font-bold" : "text-brand-blue font-bold"}>{name}</span>
                            <span className="text-[var(--text-secondary)]">=</span>
                            <span className={`truncate ${isLinkedList ? "text-[var(--accent-dark)] font-medium" : "text-[var(--text-primary)] font-medium"}`}>
                                {formatVariableValue(value)}
                            </span>
                        </div>
                    );
                })}
                {Object.keys(currentStep.stack).length === 0 && (
                    <div className="text-slate-500 italic text-xs">No variables in scope</div>
                )}
            </div>
        </div>
    );
}

export function StdoutPanel() {
    const currentStep = useTraceStore((state) => state.getCurrentStep());

    return (
        <div className="flex-1 p-5 overflow-auto neu-inset neu-base-card mx-2 mb-2 custom-scrollbar">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Console Output</h3>
            <pre className="text-sm font-mono text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {currentStep?.stdout || "Program output will appear here..."}
            </pre>
        </div>
    );
}
