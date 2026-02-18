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
function formatCellValue(val: unknown): string {
    if (typeof val === "number") return String(val);
    if (typeof val === "boolean") return val ? "T" : "F";
    if (typeof val === "string") return val;
    if (val === null || val === undefined) return "—";
    return JSON.stringify(val);
}

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
    const baseFontSize = isPrimary ? 13 : 11;

    // Compute cell widths based on content
    const cellWidths = data.map(val => {
        const text = formatCellValue(val);
        // Approximate: 8px per char + 16px padding, minimum 40px
        return Math.max(40, text.length * 8 + 16);
    });
    const cellHeight = isPrimary ? 42 : 36;

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
                    const changed = prevData && idx < prevData.length &&
                        JSON.stringify(prevData[idx]) !== JSON.stringify(val);
                    const pointedBy = pointers.filter(p => p.index === idx);
                    const isPointed = pointedBy.length > 0;
                    const cellW = cellWidths[idx];
                    const displayText = formatCellValue(val);

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
                                minWidth: cellW,
                                height: cellHeight,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0 6px",
                                background: isPointed
                                    ? `${pointedBy[0].color}30`
                                    : changed
                                        ? COLORS.changedBg
                                        : COLORS.cellDefault,
                                border: `2px solid ${isPointed
                                    ? pointedBy[0].color
                                    : changed
                                        ? COLORS.changed
                                        : COLORS.cardBorder
                                    }`,
                                borderRadius: 6,
                                transition: "all 0.2s ease",
                            }}>
                                <span style={{
                                    color: changed ? COLORS.changed : COLORS.text,
                                    fontSize: baseFontSize,
                                    fontWeight: changed ? 700 : 500,
                                    fontFamily: "monospace",
                                    whiteSpace: "nowrap",
                                }}>
                                    {displayText}
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
            border: `1px solid ${changed
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

// ─── Helper: detect serialized linked list ────────────────────
function isLinkedListValue2D(val: unknown): val is { __type__: "linked_list"; values: unknown[] } {
    return (
        val !== null &&
        typeof val === "object" &&
        (val as Record<string, unknown>).__type__ === "linked_list" &&
        Array.isArray((val as Record<string, unknown>).values)
    );
}

// ─── Linked List View (2D) ────────────────────────────────────
function LinkedListView2D({ name, values }: { name: string; values: unknown[] }) {
    const n = values.length;
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
            }}>
                <span style={{
                    color: "#4ade80",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: "0.5px",
                }}>
                    {name}
                </span>
                <span style={{
                    color: COLORS.textMuted,
                    fontSize: 10,
                }}>
                    linked list [{n}]
                </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
                {/* HEAD label */}
                <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#22c55e",
                    fontFamily: "monospace",
                    marginRight: 6,
                    padding: "2px 5px",
                    background: "#052e16",
                    borderRadius: 4,
                    border: "1px solid #166534",
                }}>
                    HEAD
                </span>
                {values.map((val, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center" }}>
                        {/* Node box */}
                        <div style={{
                            display: "flex",
                            alignItems: "stretch",
                            border: `2px solid ${idx === 0 ? "#22c55e" : "#166534"}`,
                            borderRadius: 6,
                            overflow: "hidden",
                            background: idx === 0 ? "#052e16" : COLORS.cardBg,
                        }}>
                            {/* val compartment */}
                            <div style={{
                                padding: "6px 10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 36,
                                borderRight: "1px solid #16653480",
                            }}>
                                <span style={{
                                    color: "white",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    fontFamily: "monospace",
                                }}>
                                    {formatCellValue(val)}
                                </span>
                            </div>
                            {/* next pointer compartment */}
                            <div style={{
                                padding: "6px 6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 20,
                            }}>
                                <span style={{
                                    color: idx === n - 1 ? "#ef4444" : "#4ade80",
                                    fontSize: 11,
                                    fontWeight: 700,
                                }}>
                                    {idx === n - 1 ? "∅" : "→"}
                                </span>
                            </div>
                        </div>
                        {/* Arrow connecting to next */}
                        {idx < n - 1 && (
                            <span style={{
                                color: "#4ade80",
                                fontSize: 14,
                                fontWeight: 700,
                                margin: "0 2px",
                            }}>
                                →
                            </span>
                        )}
                    </div>
                ))}
                {/* NULL label */}
                <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#ef4444",
                    fontFamily: "monospace",
                    marginLeft: 6,
                    padding: "2px 5px",
                    background: "#1c0a0a",
                    borderRadius: 4,
                    border: "1px solid #7f1d1d",
                }}>
                    NULL
                </span>
            </div>
        </div>
    );
}

// ─── Dictionary / Object View ─────────────────────────────────
function DictView({ name, data, visited, queue, current }: { name: string; data: Record<string, unknown>; visited?: unknown[]; queue?: unknown[]; current?: unknown }) {
    const entries = Object.entries(data);
    const isGraph = entries.every(([, v]) => Array.isArray(v));

    if (isGraph) {
        return (
            <GraphView2D
                name={name}
                adj={data as Record<string, number[]>}
                visited={visited}
                queue={queue}
                current={current}
            />
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

// ─── SVG Graph Visualization (2D) ────────────────────────────
function GraphView2D({
    name,
    adj,
    visited,
    queue,
    current,
}: {
    name: string;
    adj: Record<string, number[]>;
    visited?: unknown[];
    queue?: unknown[];
    current?: unknown;
}) {
    const nodeIds = Object.keys(adj);
    const n = nodeIds.length;
    const visitedSet = new Set((visited || []).map(String));
    const queueSet = new Set((queue || []).map(String));
    const currentStr = current !== undefined ? String(current) : null;

    // Force-directed layout
    const layout = useMemo(() => {
        if (n === 0) return new Map<string, { x: number; y: number }>();

        const SCALE = 100;
        const positions: Record<string, { x: number; y: number }> = {};
        nodeIds.forEach((id, i) => {
            const angle = (2 * Math.PI * i) / n - Math.PI / 2;
            positions[id] = {
                x: Math.cos(angle) * SCALE,
                y: Math.sin(angle) * SCALE,
            };
        });

        // Build edges
        const edgeSet = new Set<string>();
        const edgeList: [string, string][] = [];
        for (const [node, neighbors] of Object.entries(adj)) {
            for (const neighbor of neighbors) {
                const key = [node, String(neighbor)].sort().join("-");
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    edgeList.push([node, String(neighbor)]);
                }
            }
        }

        // Force simulation
        const REPULSION = 3000;
        const SPRING_K = 0.05;
        const IDEAL_LENGTH = SCALE * 0.8;
        const DAMPING = 0.85;
        const ITERATIONS = 150;

        for (let iter = 0; iter < ITERATIONS; iter++) {
            const forces: Record<string, { fx: number; fy: number }> = {};
            for (const id of nodeIds) forces[id] = { fx: 0, fy: 0 };

            // Repulsion
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const a = nodeIds[i], b = nodeIds[j];
                    const dx = positions[b].x - positions[a].x;
                    const dy = positions[b].y - positions[a].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
                    const force = REPULSION / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    forces[a].fx -= fx; forces[a].fy -= fy;
                    forces[b].fx += fx; forces[b].fy += fy;
                }
            }

            // Spring attraction
            for (const [a, b] of edgeList) {
                const dx = positions[b].x - positions[a].x;
                const dy = positions[b].y - positions[a].y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
                const displacement = dist - IDEAL_LENGTH;
                const force = SPRING_K * displacement;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                forces[a].fx += fx; forces[a].fy += fy;
                forces[b].fx -= fx; forces[b].fy -= fy;
            }

            // Center gravity
            for (const id of nodeIds) {
                forces[id].fx -= positions[id].x * 0.005;
                forces[id].fy -= positions[id].y * 0.005;
            }

            const cooling = 1 - iter / ITERATIONS;
            for (const id of nodeIds) {
                positions[id].x += forces[id].fx * DAMPING * cooling;
                positions[id].y += forces[id].fy * DAMPING * cooling;
            }
        }

        const result = new Map<string, { x: number; y: number }>();
        for (const id of nodeIds) result.set(id, positions[id]);
        return result;
    }, [nodeIds, adj, n]);

    // Compute bounding box
    const bounds = useMemo(() => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        layout.forEach(pos => {
            minX = Math.min(minX, pos.x); maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y); maxY = Math.max(maxY, pos.y);
        });
        const padding = 30;
        return {
            x: minX - padding, y: minY - padding,
            w: maxX - minX + padding * 2, h: maxY - minY + padding * 2,
        };
    }, [layout]);

    // Edges with deduplication
    const edges = useMemo(() => {
        const e: { from: string; to: string }[] = [];
        const seen = new Set<string>();
        for (const [node, neighbors] of Object.entries(adj)) {
            for (const neighbor of neighbors) {
                const key = [node, String(neighbor)].sort().join("-");
                if (!seen.has(key)) {
                    seen.add(key);
                    e.push({ from: node, to: String(neighbor) });
                }
            }
        }
        return e;
    }, [adj]);

    // Graph center for edge curving
    const graphCenter = useMemo(() => {
        let cx = 0, cy = 0;
        layout.forEach(pos => { cx += pos.x; cy += pos.y; });
        const count = layout.size || 1;
        return { x: cx / count, y: cy / count };
    }, [layout]);

    const NODE_R = 18;

    const getEdgePath = (fromPos: { x: number; y: number }, toPos: { x: number; y: number }): string => {
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return "";

        const ux = dx / dist, uy = dy / dist;
        const sx = fromPos.x + ux * NODE_R, sy = fromPos.y + uy * NODE_R;
        const ex = toPos.x - ux * NODE_R, ey = toPos.y - uy * NODE_R;

        // Perpendicular away from center
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const perpX = -uy, perpY = ux;
        const cdx = midX - graphCenter.x, cdy = midY - graphCenter.y;
        const dot = cdx * perpX + cdy * perpY;
        const sign = dot >= 0 ? 1 : -1;
        const curvature = Math.min(dist * 0.12, 25);
        const ctrlX = midX + perpX * curvature * sign;
        const ctrlY = midY + perpY * curvature * sign;

        return `M ${sx} ${sy} Q ${ctrlX} ${ctrlY} ${ex} ${ey}`;
    };

    if (n === 0) return null;

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
            <svg
                viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
                style={{
                    width: "100%",
                    maxWidth: 420,
                    height: "auto",
                    maxHeight: 300,
                    marginTop: 6,
                    display: "block",
                }}
            >
                {/* Edges */}
                {edges.map(({ from, to }) => {
                    const fromPos = layout.get(from);
                    const toPos = layout.get(to);
                    if (!fromPos || !toPos) return null;
                    const isTraversed = visitedSet.has(from) && visitedSet.has(to);
                    return (
                        <path
                            key={`${from}-${to}`}
                            d={getEdgePath(fromPos, toPos)}
                            fill="none"
                            stroke={isTraversed ? COLORS.changed : "#475569"}
                            strokeWidth={isTraversed ? 2.5 : 1.5}
                            opacity={isTraversed ? 1 : 0.45}
                        />
                    );
                })}
                {/* Nodes */}
                {nodeIds.map(id => {
                    const pos = layout.get(id);
                    if (!pos) return null;
                    let fill = "#475569";
                    let stroke = "#64748b";
                    if (id === currentStr) { fill = "#d97706"; stroke = "#f59e0b"; }
                    else if (visitedSet.has(id)) { fill = "#16a34a"; stroke = "#22c55e"; }
                    else if (queueSet.has(id)) { fill = "#2563eb"; stroke = "#3b82f6"; }
                    return (
                        <g key={id}>
                            <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={2} />
                            <text
                                x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                                fill="white" fontSize={12} fontFamily="monospace" fontWeight={600}
                            >
                                {id}
                            </text>
                        </g>
                    );
                })}
            </svg>
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
    const linkedLists: Array<{ name: string; values: unknown[] }> = [];
    const dicts: Array<{ name: string; value: Record<string, unknown> }> = [];
    const scalars: Array<{ name: string; value: unknown }> = [];

    for (const v of sortedVars) {
        if (v.type === "array") {
            arrays.push({ name: v.name, value: v.value as unknown[] });
        } else if (v.type === "dict") {
            // Check for serialized linked list first
            if (isLinkedListValue2D(v.value)) {
                linkedLists.push({ name: v.name, values: (v.value as { __type__: string; values: unknown[] }).values });
            } else {
                dicts.push({ name: v.name, value: v.value as Record<string, unknown> });
            }
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

            {/* Linked Lists — rendered as node chains */}
            {linkedLists.length > 0 && (
                <div>
                    <div style={{
                        fontSize: 10,
                        color: COLORS.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: 6,
                        fontWeight: 600,
                    }}>
                        Linked Lists
                    </div>
                    {linkedLists.map(ll => (
                        <LinkedListView2D
                            key={ll.name}
                            name={ll.name}
                            values={ll.values}
                        />
                    ))}
                </div>
            )}

            {/* Dictionaries / Graphs */}
            {dicts.length > 0 && (
                <div>
                    {dicts.map(d => {
                        // Extract graph traversal state from step stack
                        const graphVisited = step.stack["visited"] as unknown[] | undefined;
                        const graphQueue = step.stack["queue"] as unknown[] | undefined;
                        const graphCurrent = step.stack["current"] ?? step.stack["node"] ?? step.stack["curr"];
                        return (
                            <DictView
                                key={d.name}
                                name={d.name}
                                data={d.value}
                                visited={graphVisited}
                                queue={graphQueue}
                                current={graphCurrent}
                            />
                        );
                    })}
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
