"use client";

import { useMemo } from "react";
import { TraceStep } from "@/lib/interpreter/schema";
import { VizContext } from "@/lib/vizDetector";

interface Visualization2DProps {
    step: TraceStep;
    prevStep: TraceStep | null;
    vizCtx: VizContext;
}

// ─── Color Palette ───────────────────────────────────────────
const COLORS = {
    bg: "#0f172a",
    cardBg: "#1e293b",
    cardBorder: "#334155",
    text: "#e2e8f0",
    textDim: "#94a3b8",
    textMuted: "#64748b",
    accent: "#3b82f6",
    accentDim: "#1d4ed8",
    pointer: "#f59e0b",
    pointerBg: "#78350f",
    changed: "#22c55e",
    changedBg: "#052e16",
    highlight: "#a855f7",
    highlightBg: "#3b0764",
    danger: "#ef4444",
    cellDefault: "#1e293b",
    cellHighlight: "#7c3aed",
    cellPointer: "#d97706",
};

/**
 * Classifies a value for rendering
 */
function classifyValue(val: unknown): "array" | "dict" | "scalar" | "none" {
    if (val === undefined || val === null) return "none";
    if (Array.isArray(val)) return "array";
    if (typeof val === "object") return "dict";
    return "scalar";
}

/**
 * Check if a value looks like an adjacency list
 */
function isAdjList(val: unknown): boolean {
    if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
    const entries = Object.entries(val as Record<string, unknown>);
    return entries.length >= 2 && entries.every(([, v]) => Array.isArray(v));
}

/**
 * Get all variables from the step, sorted by type priority
 */
function getSortedVariables(step: TraceStep, vizCtx: VizContext): Array<{ name: string; value: unknown; type: string }> {
    const vars: Array<{ name: string; value: unknown; type: string; priority: number }> = [];

    for (const [name, val] of Object.entries(step.stack)) {
        const type = classifyValue(val);
        let priority = 50;

        // Primary variable first
        if (name === vizCtx.primaryVar) priority = 0;
        // Arrays second
        else if (type === "array") priority = 10;
        // Dicts/graphs third
        else if (type === "dict") priority = 20;
        // Pointer-like scalars
        else if (vizCtx.pointerVars.includes(name)) priority = 30;
        // Other scalars
        else if (type === "scalar") priority = 40;

        vars.push({ name, value: val, type, priority });
    }

    vars.sort((a, b) => a.priority - b.priority);
    return vars;
}

// ─── Array Cell Row Component ─────────────────────────────────
function ArrayRow({
    name,
    data,
    prevData,
    pointers,
    isPrimary,
}: {
    name: string;
    data: unknown[];
    prevData?: unknown[];
    pointers: Array<{ name: string; index: number; color: string }>;
    isPrimary: boolean;
}) {
    const cellSize = isPrimary ? 48 : 40;
    const fontSize = isPrimary ? 14 : 12;

    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
            }}>
                <span style={{
                    color: isPrimary ? COLORS.accent : COLORS.textDim,
                    fontSize: 12,
                    fontWeight: isPrimary ? 700 : 500,
                    fontFamily: "monospace",
                    letterSpacing: "0.5px",
                }}>
                    {name}
                </span>
                <span style={{
                    color: COLORS.textMuted,
                    fontSize: 10,
                }}>
                    [{data.length}]
                </span>
            </div>

            {/* Cells */}
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
                {data.map((val, idx) => {
                    const changed = prevData && idx < prevData.length && prevData[idx] !== val;
                    const pointedBy = pointers.filter(p => p.index === idx);
                    const isPointed = pointedBy.length > 0;

                    return (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            {/* Pointer labels above */}
                            {isPointed && (
                                <div style={{ display: "flex", gap: 2, minHeight: 18 }}>
                                    {pointedBy.map(p => (
                                        <span key={p.name} style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: p.color,
                                            fontFamily: "monospace",
                                            padding: "1px 4px",
                                            borderRadius: 3,
                                            background: `${p.color}20`,
                                        }}>
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {!isPointed && <div style={{ minHeight: 18 }} />}

                            {/* Cell */}
                            <div style={{
                                width: cellSize,
                                height: cellSize,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: isPointed
                                    ? `${pointedBy[0].color}30`
                                    : changed
                                        ? COLORS.changedBg
                                        : COLORS.cellDefault,
                                border: `2px solid ${
                                    isPointed
                                        ? pointedBy[0].color
                                        : changed
                                            ? COLORS.changed
                                            : COLORS.cardBorder
                                }`,
                                borderRadius: 6,
                                transition: "all 0.2s ease",
                                position: "relative",
                            }}>
                                <span style={{
                                    color: changed ? COLORS.changed : COLORS.text,
                                    fontSize,
                                    fontWeight: changed ? 700 : 500,
                                    fontFamily: "monospace",
                                }}>
                                    {typeof val === "number" ? val : JSON.stringify(val)}
                                </span>
                            </div>

                            {/* Index below */}
                            <span style={{
                                fontSize: 9,
                                color: COLORS.textMuted,
                                fontFamily: "monospace",
                            }}>
                                {idx}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Scalar Variable Badge ────────────────────────────────────
function ScalarBadge({
    name,
    value,
    prevValue,
    isPointer,
}: {
    name: string;
    value: unknown;
    prevValue?: unknown;
    isPointer: boolean;
}) {
    const changed = prevValue !== undefined && prevValue !== value;
    const displayVal = typeof value === "number" || typeof value === "string" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);

    return (
        <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 6,
            background: changed
                ? COLORS.changedBg
                : isPointer
                    ? COLORS.pointerBg
                    : COLORS.cardBg,
            border: `1px solid ${
                changed
                    ? COLORS.changed
                    : isPointer
                        ? COLORS.pointer
                        : COLORS.cardBorder
            }`,
            transition: "all 0.2s ease",
        }}>
            <span style={{
                fontSize: 11,
                color: isPointer ? COLORS.pointer : COLORS.textDim,
                fontFamily: "monospace",
                fontWeight: 600,
            }}>
                {name}
            </span>
            <span style={{
                fontSize: 10,
                color: COLORS.textMuted,
            }}>=</span>
            <span style={{
                fontSize: 12,
                color: changed ? COLORS.changed : COLORS.text,
                fontFamily: "monospace",
                fontWeight: changed ? 700 : 500,
            }}>
                {displayVal}
            </span>
            {changed && prevValue !== undefined && (
                <span style={{
                    fontSize: 9,
                    color: COLORS.textMuted,
                    fontFamily: "monospace",
                    textDecoration: "line-through",
                }}>
                    {String(prevValue)}
                </span>
            )}
        </div>
    );
}

// ─── Dictionary / Object View ─────────────────────────────────
function DictView({ name, data }: { name: string; data: Record<string, unknown> }) {
    const entries = Object.entries(data);
    const isGraph = entries.every(([, v]) => Array.isArray(v));

    if (isGraph) {
        return (
            <div style={{ marginBottom: 12 }}>
                <span style={{
                    color: COLORS.highlight,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "monospace",
                }}>
                    {name} <span style={{ color: COLORS.textMuted, fontWeight: 400 }}>(graph)</span>
                </span>
                <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginTop: 4,
                }}>
                    {entries.map(([k, v]) => (
                        <div key={k} style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: COLORS.cardBg,
                            border: `1px solid ${COLORS.cardBorder}`,
                            fontSize: 11,
                            fontFamily: "monospace",
                            color: COLORS.textDim,
                        }}>
                            <span style={{ color: COLORS.accent }}>{k}</span>
                            <span style={{ color: COLORS.textMuted }}> → </span>
                            <span style={{ color: COLORS.text }}>{JSON.stringify(v)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Generic dict
    return (
        <div style={{ marginBottom: 12 }}>
            <span style={{
                color: COLORS.textDim,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "monospace",
            }}>
                {name}
            </span>
            <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                marginTop: 4,
            }}>
                {entries.map(([k, v]) => (
                    <div key={k} style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: COLORS.cardBg,
                        border: `1px solid ${COLORS.cardBorder}`,
                        fontSize: 11,
                        fontFamily: "monospace",
                    }}>
                        <span style={{ color: COLORS.accent }}>{k}</span>
                        <span style={{ color: COLORS.textMuted }}>: </span>
                        <span style={{ color: COLORS.text }}>{JSON.stringify(v)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Pointer Color Generator ──────────────────────────────────
const POINTER_COLORS = [
    "#f59e0b", "#ef4444", "#22c55e", "#a855f7",
    "#06b6d4", "#ec4899", "#84cc16", "#f97316",
];

function getPointerColor(idx: number): string {
    return POINTER_COLORS[idx % POINTER_COLORS.length];
}

// ─── Main 2D Visualization ────────────────────────────────────
export function Visualization2D({ step, prevStep, vizCtx }: Visualization2DProps) {
    const sortedVars = useMemo(() => getSortedVariables(step, vizCtx), [step, vizCtx]);

    // Build pointer map for the primary array
    const pointerMap = useMemo(() => {
        const pointers: Array<{ name: string; index: number; color: string }> = [];
        let colorIdx = 0;

        for (const v of sortedVars) {
            if (v.type !== "scalar") continue;
            const val = v.value;
            if (typeof val !== "number" || !Number.isInteger(val) || val < 0) continue;

            // Check if this could be an index into the primary array
            const primaryArr = vizCtx.primaryVar ? step.stack[vizCtx.primaryVar] : null;
            if (Array.isArray(primaryArr) && val < primaryArr.length) {
                // Is it explicitly a pointer var or does it look like one (i, j, k, idx, left, right, etc)?
                const isLikelyPointer = vizCtx.pointerVars.includes(v.name) ||
                    /^(i|j|k|l|r|m|idx|index|left|right|low|high|mid|start|end|top|bottom|cur|ptr|head|tail|lo|hi|cut\d?)$/i.test(v.name);
                if (isLikelyPointer) {
                    pointers.push({ name: v.name, index: val, color: getPointerColor(colorIdx++) });
                }
            }
        }
        return pointers;
    }, [sortedVars, vizCtx, step]);

    // Separate variables by type for rendering
    const arrays: Array<{ name: string; value: unknown[] }> = [];
    const dicts: Array<{ name: string; value: Record<string, unknown> }> = [];
    const scalars: Array<{ name: string; value: unknown }> = [];

    for (const v of sortedVars) {
        if (v.type === "array") {
            arrays.push({ name: v.name, value: v.value as unknown[] });
        } else if (v.type === "dict") {
            dicts.push({ name: v.name, value: v.value as Record<string, unknown> });
        } else if (v.type === "scalar") {
            scalars.push({ name: v.name, value: v.value });
        }
    }

    return (
        <div style={{
            width: "100%",
            height: "100%",
            overflow: "auto",
            padding: 20,
            background: COLORS.bg,
            fontFamily: "'Inter', system-ui, sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: 16,
        }}>
            {/* Step Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${COLORS.cardBorder}`,
            }}>
                <span style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    fontFamily: "monospace",
                }}>
                    Line {step.line}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                }}>
                    {Object.keys(step.stack).length} variables in scope
                </span>
            </div>

            {/* Scalar Variables — shown first as badges */}
            {scalars.length > 0 && (
                <div>
                    <div style={{
                        fontSize: 10,
                        color: COLORS.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: 6,
                        fontWeight: 600,
                    }}>
                        Variables
                    </div>
                    <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                    }}>
                        {scalars.map(s => (
                            <ScalarBadge
                                key={s.name}
                                name={s.name}
                                value={s.value}
                                prevValue={prevStep?.stack[s.name]}
                                isPointer={vizCtx.pointerVars.includes(s.name)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Arrays — rendered as cell rows */}
            {arrays.length > 0 && (
                <div>
                    <div style={{
                        fontSize: 10,
                        color: COLORS.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: 6,
                        fontWeight: 600,
                    }}>
                        Data Structures
                    </div>
                    {arrays.map(arr => {
                        const isPrimary = arr.name === vizCtx.primaryVar;
                        const prevArr = prevStep?.stack[arr.name] as unknown[] | undefined;
                        // Only show pointers for the primary array
                        const arrPointers = isPrimary ? pointerMap : [];
                        return (
                            <ArrayRow
                                key={arr.name}
                                name={arr.name}
                                data={arr.value}
                                prevData={prevArr}
                                pointers={arrPointers}
                                isPrimary={isPrimary}
                            />
                        );
                    })}
                </div>
            )}

            {/* Dictionaries / Graphs */}
            {dicts.length > 0 && (
                <div>
                    {dicts.map(d => (
                        <DictView key={d.name} name={d.name} data={d.value} />
                    ))}
                </div>
            )}

            {/* Stdout */}
            {step.stdout && (
                <div style={{
                    padding: 8,
                    borderRadius: 6,
                    background: "#020617",
                    border: `1px solid ${COLORS.cardBorder}`,
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: COLORS.textDim,
                    whiteSpace: "pre-wrap",
                    maxHeight: 80,
                    overflow: "auto",
                }}>
                    <div style={{
                        fontSize: 9,
                        color: COLORS.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: 4,
                    }}>
                        stdout
                    </div>
                    {step.stdout}
                </div>
            )}
        </div>
    );
}
