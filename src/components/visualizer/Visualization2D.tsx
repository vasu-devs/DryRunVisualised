"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { TraceStep } from "@/lib/interpreter/schema";
import { VizContext } from "@/lib/vizDetector";
import { useGraphLayout } from "@/hooks/useGraphLayout";

interface Visualization2DProps {
    step: TraceStep;
    prevStep: TraceStep | null;
    vizCtx: VizContext;
    isFullscreen?: boolean;
}

// ─── Color Palette ───────────────────────────────────────────
const COLORS = {
    bg: "transparent",
    cardBg: "var(--bg-neu)",
    cardBorder: "transparent", // Use shadows instead of borders
    text: "var(--text-main)",
    textDim: "var(--slate-500)",
    textMuted: "var(--slate-400)",
    accent: "var(--slate-700)",
    accentDim: "var(--slate-400)",
    pointer: "var(--accent-cyan)",
    pointerBg: "var(--bg-neu)",
    changed: "#f59e0b",
    changedBg: "var(--bg-neu)",
    highlight: "#10b981",
    highlightBg: "var(--bg-neu)",
    danger: "#ef4444",
    cellDefault: "var(--bg-neu)",
    cellHighlight: "var(--bg-neu)",
    cellPointer: "var(--bg-neu)",
};

const NEU_SHADOW_RAISED = "5px 5px 12px var(--shadow-dark), -5px -5px 12px var(--shadow-light)";
const NEU_SHADOW_PRESSED = "inset 3px 3px 8px var(--shadow-dark), inset -3px -3px 8px var(--shadow-light)";
const NEU_RADIUS_SMALL = "10px";
const NEU_RADIUS_MD = "16px";

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
    if ((val as any).__type__ === "structured_graph") return true;
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
                                background: COLORS.cellDefault,
                                boxShadow: isPointed || changed ? NEU_SHADOW_PRESSED : NEU_SHADOW_RAISED,
                                border: `2px solid ${isPointed
                                    ? pointedBy[0].color
                                    : changed
                                        ? COLORS.changed
                                        : "transparent"
                                    }`,
                                borderRadius: NEU_RADIUS_SMALL,
                                transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
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
            padding: "8px 14px",
            borderRadius: NEU_RADIUS_MD,
            background: COLORS.cardBg,
            boxShadow: NEU_SHADOW_RAISED,
            border: `2px solid ${changed
                ? COLORS.changed
                : isPointer
                    ? COLORS.pointer
                    : "transparent"
                }`,
            transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
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
                    color: "#16a34a",
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
                    color: "#15803d",
                    fontFamily: "monospace",
                    marginRight: 6,
                    padding: "2px 5px",
                    background: "#dcfce7",
                    borderRadius: 4,
                    border: "1px solid #86efac",
                }}>
                    HEAD
                </span>
                {values.map((val, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center" }}>
                        {/* Node box */}
                        <div style={{
                            display: "flex",
                            alignItems: "stretch",
                            border: `2px solid ${idx === 0 ? "#22c55e" : "transparent"}`,
                            borderRadius: NEU_RADIUS_SMALL,
                            overflow: "hidden",
                            background: idx === 0 ? COLORS.changedBg : COLORS.cardBg,
                            boxShadow: idx === 0 ? NEU_SHADOW_PRESSED : NEU_SHADOW_RAISED,
                            transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                        }}>
                            {/* val compartment */}
                            <div style={{
                                padding: "6px 10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 36,
                                borderRight: `1px solid var(--shadow-dark)`,
                            }}>
                                <span style={{
                                    color: COLORS.text,
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
                                    color: idx === n - 1 ? "#dc2626" : "#16a34a",
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
                                color: "#16a34a",
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
                    color: "#dc2626",
                    fontFamily: "monospace",
                    marginLeft: 6,
                    padding: "2px 5px",
                    background: "#fee2e2",
                    borderRadius: 4,
                    border: "1px solid #fca5a5",
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
                gap: 8,
                marginTop: 8,
            }}>
                {entries.map(([k, v]) => (
                    <div key={k} style={{
                        padding: "6px 12px",
                        borderRadius: NEU_RADIUS_SMALL,
                        background: COLORS.cardBg,
                        boxShadow: NEU_SHADOW_RAISED,
                        border: `1px solid transparent`,
                        fontSize: 12,
                        fontFamily: "monospace",
                        transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
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
    const visitedSet = new Set((visited || []).map(String));
    const queueSet = new Set((queue || []).map(String));
    const currentStr = current !== undefined ? String(current) : null;

    // Use shared layout engine
    const { layout, edges, nodes: nodeIds } = useGraphLayout(adj, 100, 200);

    // Compute bounding box based on shared layout
    const bounds = useMemo(() => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        layout.forEach(pos => {
            minX = Math.min(minX, pos.x); maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y); maxY = Math.max(maxY, pos.y);
        });
        // Handle empty graph gracefully
        if (minX === Infinity) return { x: 0, y: 0, w: 100, h: 100 };
        const padding = 50;
        return {
            x: minX - padding, y: minY - padding,
            w: maxX - minX + padding * 2, h: maxY - minY + padding * 2,
        };
    }, [layout]);

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

    if (nodeIds.length === 0) return null;

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
                    maxHeight: 320,
                    marginTop: 6,
                    display: "block",
                    overflow: "visible",
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
                            stroke={isTraversed ? COLORS.changed : "#94a3b8"}
                            strokeWidth={isTraversed ? 2.5 : 1.5}
                            opacity={isTraversed ? 1 : 0.45}
                        />
                    );
                })}
                {/* Nodes */}
                {nodeIds.map(id => {
                    const pos = layout.get(id);
                    if (!pos) return null;
                    let fill = "var(--bg-neu)";
                    let stroke = "var(--shadow-dark)";
                    let strokeWidth = 2;
                    let filter = "none";

                    // A simple drop shadow for SVG nodes to mimic Neumorphism
                    const dropShadow = "drop-shadow(3px 3px 4px var(--shadow-dark)) drop-shadow(-3px -3px 4px var(--shadow-light))";

                    if (id === currentStr) { fill = "var(--bg-neu)"; stroke = "#db2777"; strokeWidth = 3; filter = dropShadow; }
                    else if (visitedSet.has(id)) { fill = "var(--bg-neu)"; stroke = "#22c55e"; strokeWidth = 3; filter = dropShadow; }
                    else if (queueSet.has(id)) { fill = "var(--bg-neu)"; stroke = "#3b82f6"; strokeWidth = 3; filter = dropShadow; }
                    else { filter = dropShadow; fill = "var(--bg-neu)"; }

                    return (
                        <g key={id}>
                            <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={strokeWidth} style={{ filter }} />
                            <text
                                x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                                fill={COLORS.text} fontSize={12} fontFamily="monospace" fontWeight={700}
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

// ─── Bitmask Variable Detection ──────────────────────────────
const BITMASK_VAR_NAMES = new Set([
    'cols', 'ld', 'rd', 'pos', 'p', 'mask', 'bits', 'used',
    'diag1', 'diag2', 'col_mask', 'row_mask', 'left_diag', 'right_diag',
    'avail', 'available', 'blocked', 'queen',
]);

const BITMASK_COLORS: Record<string, string> = {
    cols: '#ef4444',    // red — columns taken
    ld: '#f97316',      // orange — left diagonal
    rd: '#eab308',      // yellow — right diagonal
    pos: '#22c55e',     // green — available positions
    p: '#3b82f6',       // blue — current pick
    mask: '#8b5cf6',    // purple
    bits: '#8b5cf6',
    used: '#ef4444',
    queen: '#3b82f6',
};

function getBitMaskColor(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, color] of Object.entries(BITMASK_COLORS)) {
        if (lower.includes(key)) return color;
    }
    return '#6b7280'; // gray default
}

/** Detect the bit-width from scope: look for upper_bound = (1<<n)-1, or n itself */
function detectBitWidth(stack: Record<string, unknown>): number | null {
    const n = stack['n'] ?? stack['N'] ?? stack['num_bits'] ?? stack['size'];
    const ub = stack['upper_bound'] ?? stack['upperBound'] ?? stack['all_ones'];

    if (typeof ub === 'number' && ub > 0) {
        // upper_bound = (1 << n) - 1 means it's all 1s of width n
        const w = Math.round(Math.log2(ub + 1));
        if ((1 << w) - 1 === ub && w >= 2 && w <= 32) return w;
    }
    if (typeof n === 'number' && n >= 2 && n <= 32 && Number.isInteger(n)) return n;
    return null;
}

/** Identifies which scalars in scope are likely bitmask values */
function getBitMaskVars(
    scalars: Array<{ name: string; value: unknown }>,
    bitWidth: number
): Array<{ name: string; value: number; bits: boolean[] }> {
    const result: Array<{ name: string; value: number; bits: boolean[] }> = [];
    const maxVal = (1 << bitWidth) - 1;

    for (const s of scalars) {
        const v = s.value;
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) continue;

        // Include if name is a known bitmask name OR if the value fits within the bit width
        const isKnown = BITMASK_VAR_NAMES.has(s.name.toLowerCase());
        const fitsRange = v <= maxVal && s.name !== 'n' && s.name !== 'N'
            && s.name !== 'count' && s.name !== 'row' && s.name !== 'upper_bound'
            && s.name !== 'num_bits' && s.name !== 'size';

        if (isKnown || fitsRange) {
            // Skip if the variable IS the bit width itself or a counter
            if (s.name === 'n' || s.name === 'N' || s.name === 'count'
                || s.name === 'upper_bound' || s.name === 'row') continue;

            const bits: boolean[] = [];
            for (let i = bitWidth - 1; i >= 0; i--) {
                bits.push(((v >> i) & 1) === 1);
            }
            result.push({ name: s.name, value: v, bits });
        }
    }
    return result;
}

/** Visual bitmask strip — renders a single value as a row of bit cells */
function BitMaskStrip({
    name,
    value,
    bits,
    bitWidth,
    prevValue,
}: {
    name: string;
    value: number;
    bits: boolean[];
    bitWidth: number;
    prevValue?: unknown;
}) {
    const color = getBitMaskColor(name);
    const changed = prevValue !== undefined && prevValue !== value;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 0',
        }}>
            {/* Label */}
            <div style={{
                minWidth: 60,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'monospace',
                color: changed ? COLORS.changed : color,
                textAlign: 'right',
            }}>
                {name}
            </div>

            {/* Bit cells */}
            <div style={{ display: 'flex', gap: 2 }}>
                {bits.map((bit, i) => (
                    <div
                        key={i}
                        style={{
                            width: Math.max(20, Math.min(32, 280 / bitWidth)),
                            height: Math.max(20, Math.min(32, 280 / bitWidth)),
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: Math.max(9, Math.min(12, 180 / bitWidth)),
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            background: bit ? color + '22' : 'rgba(24,24,27,0.5)',
                            border: `1.5px solid ${bit ? color : 'rgba(255,255,255,0.1)'}`,
                            color: bit ? color : '#94a3b8',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {bit ? '1' : '0'}
                    </div>
                ))}
            </div>

            {/* Decimal value */}
            <span style={{
                fontSize: 10,
                fontFamily: 'monospace',
                color: COLORS.textMuted,
                marginLeft: 4,
            }}>
                = {value}
            </span>
        </div>
    );
}

/** Combined N-Queens board view — overlays cols, ld, rd into an NxN grid */
function BitMaskBoardView({
    row,
    bitWidth,
    maskVars,
}: {
    row: number;
    bitWidth: number;
    maskVars: Array<{ name: string; value: number; bits: boolean[] }>;
}) {
    // Build an NxN board showing blocked/available cells for the current row
    const colsMask = maskVars.find(v => v.name === 'cols')?.value ?? 0;
    const ldMask = maskVars.find(v => v.name === 'ld')?.value ?? 0;
    const rdMask = maskVars.find(v => v.name === 'rd')?.value ?? 0;
    const posMask = maskVars.find(v => v.name === 'pos')?.value ?? 0;
    const pMask = maskVars.find(v => v.name === 'p')?.value ?? 0;

    const cellSize = Math.max(18, Math.min(28, 240 / bitWidth));

    return (
        <div style={{ marginTop: 8 }}>
            <div style={{
                fontSize: 10,
                color: COLORS.textMuted,
                marginBottom: 4,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
            }}>
                Board (Row {row}) — Blocked vs Available
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: bitWidth }, (_, i) => {
                    const bitIdx = bitWidth - 1 - i;
                    const isCol = (colsMask >> bitIdx) & 1;
                    const isLD = (ldMask >> bitIdx) & 1;
                    const isRD = (rdMask >> bitIdx) & 1;
                    const isBlocked = isCol || isLD || isRD;
                    const isPos = (posMask >> bitIdx) & 1;
                    const isPick = (pMask >> bitIdx) & 1;

                    let bg = 'rgba(24,24,27,0.5)';
                    let border = 'rgba(255,255,255,0.1)';
                    let label = '';
                    let textColor = '#94a3b8';

                    if (isPick) {
                        bg = '#3b82f620'; border = '#3b82f6'; label = '♛'; textColor = '#3b82f6';
                    } else if (isPos && !isBlocked) {
                        bg = '#22c55e15'; border = '#22c55e'; label = '✓'; textColor = '#22c55e';
                    } else if (isCol) {
                        bg = '#ef444415'; border = '#ef4444'; label = '×'; textColor = '#ef4444';
                    } else if (isLD) {
                        bg = '#f9731615'; border = '#f97316'; label = '╲'; textColor = '#f97316';
                    } else if (isRD) {
                        bg = '#eab30815'; border = '#eab308'; label = '╱'; textColor = '#eab308';
                    }

                    return (
                        <div
                            key={i}
                            style={{
                                width: cellSize,
                                height: cellSize,
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isPick ? cellSize * 0.6 : cellSize * 0.4,
                                fontWeight: 700,
                                background: bg,
                                border: `1.5px solid ${border}`,
                                color: textColor,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {label}
                        </div>
                    );
                })}
            </div>
            {/* Legend */}
            <div style={{
                display: 'flex',
                gap: 10,
                marginTop: 4,
                fontSize: 9,
                color: COLORS.textMuted,
            }}>
                <span>♛ = <span style={{ color: '#3b82f6' }}>pick</span></span>
                <span>✓ = <span style={{ color: '#22c55e' }}>available</span></span>
                <span>× = <span style={{ color: '#ef4444' }}>col blocked</span></span>
                <span>╲ = <span style={{ color: '#f97316' }}>left diag</span></span>
                <span>╱ = <span style={{ color: '#eab308' }}>right diag</span></span>
            </div>
        </div>
    );
}

/** Full bitmask panel — shows all detected bitmask vars as bit strips + board overlay */
function BitMaskPanel({
    scalars,
    stack,
    prevStack,
}: {
    scalars: Array<{ name: string; value: unknown }>;
    stack: Record<string, unknown>;
    prevStack?: Record<string, unknown>;
}) {
    const bitWidth = detectBitWidth(stack);
    if (!bitWidth) return null;

    const maskVars = getBitMaskVars(scalars, bitWidth);
    if (maskVars.length === 0) return null;

    const row = typeof stack['row'] === 'number' ? (stack['row'] as number) : null;

    return (
        <div style={{
            padding: 10,
            borderRadius: 8,
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.cardBorder}`,
        }}>
            <div style={{
                fontSize: 10,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 8,
                fontWeight: 600,
            }}>
                Bitmask State ({bitWidth}-bit)
            </div>

            {/* Individual bit strips */}
            {maskVars.map(mv => (
                <BitMaskStrip
                    key={mv.name}
                    name={mv.name}
                    value={mv.value}
                    bits={mv.bits}
                    bitWidth={bitWidth}
                    prevValue={prevStack?.[mv.name]}
                />
            ))}

            {/* Combined board view */}
            {row !== null && maskVars.some(v => v.name === 'cols') && (
                <BitMaskBoardView
                    row={row}
                    bitWidth={bitWidth}
                    maskVars={maskVars}
                />
            )}
        </div>
    );
}

// ─── Pointer Color Generator ──────────────────────────────────
const POINTER_COLORS = [
    "#ea580c", "#dc2626", "#16a34a", "#9333ea",
    "#0891b2", "#db2777", "#65a30d", "#d97706",
];

function getPointerColor(idx: number): string {
    return POINTER_COLORS[idx % POINTER_COLORS.length];
}

// ─── Main 2D Visualization ────────────────────────────────────
export function Visualization2D({ step, prevStep, vizCtx, isFullscreen = false }: Visualization2DProps) {
    const sortedVars = useMemo(() => getSortedVariables(step, vizCtx), [step, vizCtx]);

    // ─── Auto-scale to fit viewport in fullscreen mode ───
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    const computeScale = useCallback(() => {
        if (!isFullscreen || !containerRef.current || !contentRef.current) {
            setScale(1);
            return;
        }
        const containerH = containerRef.current.clientHeight;
        const contentH = contentRef.current.scrollHeight;
        if (contentH > containerH && containerH > 0) {
            setScale(Math.max(0.4, containerH / contentH));
        } else {
            setScale(1);
        }
    }, [isFullscreen]);

    useEffect(() => {
        computeScale();
        // Re-compute on window resize
        window.addEventListener('resize', computeScale);
        return () => window.removeEventListener('resize', computeScale);
    }, [computeScale, step]);

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
    const adjLists: Array<{ name: string; value: Record<string, unknown[]> }> = [];
    const structuredGraphs: Array<{ name: string; value: any }> = [];
    const scalars: Array<{ name: string; value: unknown }> = [];

    for (const v of sortedVars) {
        if (v.type === "array") {
            arrays.push({ name: v.name, value: v.value as unknown[] });
        } else if (v.type === "dict") {
            // Check for serialized linked list first
            if (isLinkedListValue2D(v.value)) {
                linkedLists.push({ name: v.name, values: (v.value as { __type__: string; values: unknown[] }).values });
            } else if (isAdjList(v.value)) {
                if ((v.value as any).__type__ === "structured_graph") {
                    structuredGraphs.push({ name: v.name, value: v.value });
                } else {
                    adjLists.push({ name: v.name, value: v.value as Record<string, unknown[]> });
                }
            } else {
                dicts.push({ name: v.name, value: v.value as Record<string, unknown> });
            }
        } else if (v.type === "scalar") {
            scalars.push({ name: v.name, value: v.value });
        }
    }

    return (
        <div ref={containerRef} style={{
            width: "100%",
            height: "100%",
            overflow: isFullscreen ? "hidden" : "auto",
            background: COLORS.bg,
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            <div ref={contentRef} style={{
                padding: isFullscreen ? 12 : 20,
                display: "flex",
                flexDirection: "column",
                gap: isFullscreen ? 8 : 16,
                transform: isFullscreen && scale < 1 ? `scale(${scale})` : undefined,
                transformOrigin: "top left",
                width: isFullscreen && scale < 1 ? `${100 / scale}%` : "100%",
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

                {/* Bitmask Visualization — auto-detected */}
                <BitMaskPanel
                    scalars={scalars}
                    stack={step.stack}
                    prevStack={prevStep?.stack}
                />

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

                {/* Graph Visualizations (adjacency lists from trees/graphs) */}
                {adjLists.length > 0 && (
                    <div>
                        <div style={{
                            fontSize: 10,
                            color: COLORS.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            marginBottom: 6,
                            fontWeight: 600,
                        }}>
                            Graphs
                        </div>
                        {adjLists.map(g => {
                            const graphVisited = step.stack["visited"] as unknown[] | undefined;
                            const graphQueue = step.stack["queue"] as unknown[] | undefined;
                            const graphCurrent = step.stack["current"] ?? step.stack["node"] ?? step.stack["curr"];
                            return (
                                <GraphView2D
                                    key={g.name}
                                    name={g.name}
                                    adj={g.value as Record<string, number[]>}
                                    visited={graphVisited}
                                    queue={graphQueue}
                                    current={graphCurrent}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Structured Graphs (Tries, custom objects) */}
                {structuredGraphs.length > 0 && (
                    <div>
                        <div style={{
                            fontSize: 10,
                            color: COLORS.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            marginBottom: 6,
                            fontWeight: 600,
                        }}>
                            Structured Graphs (Tries)
                        </div>
                        {structuredGraphs.map(g => {
                            const graphVisited = step.stack["visited"] as unknown[] | undefined;
                            const graphQueue = step.stack["queue"] as unknown[] | undefined;
                            const graphCurrent = step.stack["current"] ?? step.stack["node"] ?? step.stack["curr"];
                            return (
                                <GraphView2D
                                    key={g.name}
                                    name={g.name}
                                    adj={g.value.adjList as Record<string, number[]>}
                                    visited={graphVisited}
                                    queue={graphQueue}
                                    current={graphCurrent}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Structured Graphs (Tries, custom objects) */}
                {structuredGraphs.length > 0 && (
                    <div>
                        <div style={{
                            fontSize: 10,
                            color: COLORS.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            marginBottom: 6,
                            fontWeight: 600,
                        }}>
                            Structured Graphs (Tries)
                        </div>
                        {structuredGraphs.map(g => {
                            const graphVisited = step.stack["visited"] as unknown[] | undefined;
                            const graphQueue = step.stack["queue"] as unknown[] | undefined;
                            const graphCurrent = step.stack["current"] ?? step.stack["node"] ?? step.stack["curr"];
                            return (
                                <GraphView2D
                                    key={g.name}
                                    name={g.name}
                                    adj={g.value.adjList as Record<string, number[]>}
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
        </div>
    );
}
