/**
 * vizDetector.ts — Auto-detect the best visualization type from trace data.
 *
 * Detection priority:
 *  1. Search  — left/right or low/high + array present
 *  2. Graph   — adjacency list (dict-of-lists) + visited/queue/stack
 *  3. Grid    — 2D rectangular array
 *  4. Array   — any 1D numeric array (universal fallback)
 *  5. None    — only scalars, no data structures
 */

import { Trace, TraceStep } from "./interpreter/schema";

export type VizType = "search" | "graph" | "grid" | "array" | "none";

export interface VizContext {
    type: VizType;
    /** Name of the primary data variable (e.g., "nums", "graph", "board") */
    primaryVar: string | null;
    /** Names of auxiliary variables (e.g., "visited", "queue", "current") */
    auxVars: string[];
    /** Auto-detected pointer-like scalar variable names */
    pointerVars: string[];
    /** Scalar variables worth displaying as labels */
    scalarVars: string[];
}

// Variable names that are "auxiliary" data structures, not primary data
const AUX_NAMES = new Set([
    "stack", "queue", "visited", "path", "result", "seen",
    "temp", "output", "ans", "res", "memo", "cache", "dp",
    "parent", "prev", "next", "current", "node",
]);

/**
 * Checks if a value looks like an adjacency list: { key: [list], ... }
 */
function isAdjacencyList(val: unknown): boolean {
    if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length < 2) return false;
    let arrayCount = 0;
    for (const [, v] of entries) {
        if (Array.isArray(v)) arrayCount++;
    }
    return arrayCount / entries.length >= 0.6;
}

/**
 * Checks if a value is a 2D rectangular array (matrix/grid).
 */
function is2DGrid(val: unknown): boolean {
    if (!Array.isArray(val) || val.length < 2) return false;
    if (!Array.isArray(val[0])) return false;
    const rowLen = val[0].length;
    if (rowLen < 1) return false;
    return val.every((row: unknown) => Array.isArray(row) && row.length === rowLen);
}

/**
 * Checks if a value is a 1D numeric array (for bar visualization).
 */
function is1DNumericArray(val: unknown): boolean {
    if (!Array.isArray(val) || val.length < 2) return false;
    return val.every((v: unknown) => typeof v === "number");
}

/**
 * Detect visualization type from the entire trace.
 * Uses smart ranking to pick the best primary variable.
 */
export function detectVizType(trace: Trace): VizContext {
    if (trace.length === 0) return { type: "none", primaryVar: null, auxVars: [], pointerVars: [], scalarVars: [] };

    // Aggregate variable names and values across all steps
    const allVarNames = new Set<string>();
    const varSamples = new Map<string, { value: unknown; maxLen: number }>();

    for (const step of trace) {
        for (const [key, val] of Object.entries(step.stack)) {
            allVarNames.add(key);
            const existing = varSamples.get(key);
            const len = Array.isArray(val) ? val.length : 0;
            if (!existing || len > existing.maxLen) {
                varSamples.set(key, { value: val, maxLen: len });
            }
        }
    }

    // 1. Search detection — left/right OR low/high + array
    const hasLeftRight = allVarNames.has("left") && allVarNames.has("right");
    const hasLowHigh = allVarNames.has("low") && allVarNames.has("high");
    if (hasLeftRight || hasLowHigh) {
        const arrayVar = findBestArray(trace, varSamples);
        if (arrayVar) {
            const searchAux = [
                "left", "right", "low", "high", "mid",
                "target", "water", "left_max", "right_max",
                "cut1", "cut2", "result", "current_sum",
            ].filter(v => allVarNames.has(v));
            return {
                type: "search",
                primaryVar: arrayVar,
                auxVars: searchAux,
                pointerVars: [],
                scalarVars: findScalarVars(trace, allVarNames, [arrayVar]),
            };
        }
    }

    // 2. Graph detection — adjacency list pattern
    const graphVar = findVariableByPredicate(trace, isAdjacencyList);
    if (graphVar) {
        const auxVars: string[] = [];
        for (const name of ["visited", "queue", "stack", "current", "node", "path", "result", "distances"]) {
            if (allVarNames.has(name)) auxVars.push(name);
        }
        return { type: "graph", primaryVar: graphVar, auxVars, pointerVars: [], scalarVars: [] };
    }

    // 3. Grid detection — 2D array
    const gridVar = findVariableByPredicate(trace, is2DGrid);
    if (gridVar) {
        const auxVars: string[] = [];
        for (const name of ["row", "col", "r", "c", "i", "j", "queens", "path", "visited"]) {
            if (allVarNames.has(name)) auxVars.push(name);
        }
        return { type: "grid", primaryVar: gridVar, auxVars, pointerVars: [], scalarVars: [] };
    }

    // 4. Array detection (UNIVERSAL FALLBACK) — any 1D numeric array
    const arrayVar = findBestArray(trace, varSamples);
    if (arrayVar) {
        // Auto-detect pointer-like scalars: integers that could be array indices
        const sample = varSamples.get(arrayVar);
        const arrLen = sample?.maxLen ?? 0;
        const pointerVars = findPointerVars(trace, allVarNames, arrLen);
        const scalarVars = findScalarVars(trace, allVarNames, [arrayVar]);

        return {
            type: "array",
            primaryVar: arrayVar,
            auxVars: pointerVars,
            pointerVars,
            scalarVars,
        };
    }

    return { type: "none", primaryVar: null, auxVars: [], pointerVars: [], scalarVars: [] };
}

/**
 * Find the BEST 1D numeric array variable — prefers larger arrays and non-aux names.
 */
function findBestArray(
    trace: Trace,
    varSamples: Map<string, { value: unknown; maxLen: number }>
): string | null {
    const candidates: { name: string; score: number }[] = [];

    for (const [name, sample] of varSamples.entries()) {
        if (is1DNumericArray(sample.value)) {
            let score = sample.maxLen; // Prefer larger arrays
            if (AUX_NAMES.has(name)) score -= 100; // Deprioritize aux names
            if (name.startsWith("test") || name === "t") score -= 50; // Deprioritize test vars
            candidates.push({ name, score });
        }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].name;
}

/**
 * Find the first variable name in the trace that matches a predicate.
 */
function findVariableByPredicate(
    trace: Trace,
    predicate: (val: unknown) => boolean
): string | null {
    for (const step of trace) {
        for (const [name, val] of Object.entries(step.stack)) {
            if (predicate(val)) return name;
        }
    }
    return null;
}

/**
 * Find scalar integer variables that look like array pointers (index into the array).
 */
function findPointerVars(
    trace: Trace,
    allVarNames: Set<string>,
    arrLen: number,
): string[] {
    if (arrLen === 0) return [];
    const pointers: string[] = [];

    // Check each scalar variable — if it's consistently an integer in [0, arrLen), it's a pointer
    for (const name of allVarNames) {
        if (AUX_NAMES.has(name)) continue;
        let isPointer = false;
        let seenAsInt = 0;
        let seenTotal = 0;

        for (const step of trace) {
            const val = step.stack[name];
            if (val === undefined) continue;
            seenTotal++;
            if (typeof val === "number" && Number.isInteger(val) && val >= 0 && val < arrLen) {
                seenAsInt++;
            }
        }

        // If the variable was an integer index in at least 50% of its appearances
        if (seenTotal > 0 && seenAsInt / seenTotal >= 0.5) {
            isPointer = true;
        }

        if (isPointer) pointers.push(name);
    }

    return pointers;
}

/**
 * Find scalar variables worth displaying as floating labels.
 */
function findScalarVars(
    trace: Trace,
    allVarNames: Set<string>,
    excludeVars: string[],
): string[] {
    const exclude = new Set(excludeVars);
    const scalars: string[] = [];

    for (const name of allVarNames) {
        if (exclude.has(name)) continue;
        if (AUX_NAMES.has(name) && name !== "result") continue;

        // Check if this variable is consistently a scalar number or string
        let isScalar = false;
        for (const step of trace) {
            const val = step.stack[name];
            if (val === undefined) continue;
            if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") {
                isScalar = true;
                break;
            }
        }

        if (isScalar) scalars.push(name);
    }

    // Limit to most interesting scalars (max 5)
    return scalars.slice(0, 5);
}
