import { Trace, TraceStep, TraceStepSchema } from "../schema";

/**
 * Parses raw execution output from the backend.
 * Extracts lines prefixed with __TRACE__ and validates them.
 */
export const parseTrace = (stdout: string): Trace => {
    const steps: TraceStep[] = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
        if (line.startsWith("__TRACE__")) {
            try {
                const jsonStr = line.replace("__TRACE__", "");
                const rawStep = JSON.parse(jsonStr);
                const parsed = TraceStepSchema.safeParse(rawStep);
                if (parsed.success) {
                    steps.push(parsed.data);
                }
            } catch (e) {
                console.error("Failed to parse trace line:", line, e);
            }
        }
    }

    let processedSteps = transformCustomObjectGraphs(steps);
    processedSteps = transformTreeStructures(processedSteps);
    return processedSteps;
};

/**
 * Transforms {"__type__": "tree", "root": {...}} into Adjacency List {"val#id": ["val2#id2", ...]}
 */
function transformTreeStructures(steps: TraceStep[]): TraceStep[] {
    for (const step of steps) {
        for (const [varName, val] of Object.entries(step.stack)) {
            if (val && typeof val === "object" && (val as any).__type__ === "tree") {
                step.stack[varName] = buildTreeAdjacencyList((val as any).root);
            }
        }
    }
    return steps;
}

function buildTreeAdjacencyList(root: any): Record<string, string[]> {
    const adj: Record<string, string[]> = {};
    if (!root) return adj;

    // First pass: count how many times each value appears, to decide if we need suffixes
    const valueCounts = new Map<string, number>();
    function countValues(node: any) {
        if (!node) return;
        const v = String(node.v);
        valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
        countValues(node.l);
        countValues(node.r);
    }
    countValues(root);

    // Assign unique labels: use just the value, or value + index for duplicates
    const labelCache = new Map<any, string>();
    const valueUsed = new Map<string, number>(); // track usage count for disambiguation

    function assignLabel(node: any): string {
        if (labelCache.has(node)) return labelCache.get(node)!;
        const v = String(node.v);
        let label: string;
        if ((valueCounts.get(v) || 0) > 1) {
            // Multiple nodes share this value — disambiguate
            const idx = (valueUsed.get(v) || 0) + 1;
            valueUsed.set(v, idx);
            label = idx === 1 ? v : `${v}'`;
            // If even more duplicates, add number
            if (idx > 2) label = `${v}'${idx}`;
        } else {
            label = v;
        }
        // Ensure absolute uniqueness in the adjacency list
        while (adj[label] !== undefined || [...labelCache.values()].includes(label)) {
            label = label + "'";
        }
        labelCache.set(node, label);
        return label;
    }

    function traverse(node: any) {
        if (!node) return;
        const label = assignLabel(node);
        if (adj[label] !== undefined) return; // Already visited
        adj[label] = [];

        if (node.l) {
            adj[label].push(assignLabel(node.l));
            traverse(node.l);
        }
        if (node.r) {
            adj[label].push(assignLabel(node.r));
            traverse(node.r);
        }
    }

    traverse(root);
    return adj;
}

/**
 * Sweeps through the parsed trace steps and transforms any generic object structures
 * that use __id__ and __ref__ into standard Adjacency List representations
 * (which vizDetector and the UI already understand).
 */
function transformCustomObjectGraphs(steps: TraceStep[]): TraceStep[] {
    for (const step of steps) {
        for (const [varName, val] of Object.entries(step.stack)) {
            if (isCustomObjectGraph(val)) {
                step.stack[varName] = buildAdjacencyList(val);
            }
        }
    }
    return steps;
}

function isCustomObjectGraph(val: unknown): boolean {
    if (!val || typeof val !== "object" || Array.isArray(val)) return false;
    const obj = val as Record<string, unknown>;
    // Must be a custom class serialization
    if (!obj.__id__ || !obj.__cls__) return false;
    // Fast path: if it's just a flat object without references to other nodes, it's not a graph
    return true;
}

function buildAdjacencyList(root: any): Record<string, string[]> {
    const adj: Record<string, string[]> = {};
    const nodeMap = new Map<number, any>(); // id -> object

    // Pass 1: Collect all objects and resolve their labels
    function deepCollect(obj: any) {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
            obj.forEach(deepCollect);
            return;
        }
        if (obj.__id__ && obj.__cls__) {
            if (!nodeMap.has(obj.__id__)) {
                nodeMap.set(obj.__id__, obj);
                // Traverse children
                for (const value of Object.values(obj)) {
                    deepCollect(value);
                }
            }
        } else if (!obj.__ref__) {
            for (const value of Object.values(obj)) {
                deepCollect(value);
            }
        }
    }

    deepCollect(root);

    // Heuristic label generator based on object fields — clean, human-readable
    // First pass: collect all display values to detect duplicates
    const displayValues = new Map<string, number>();
    for (const [, obj] of nodeMap.entries()) {
        let valStr = "";
        if (obj.val !== undefined) valStr = String(obj.val);
        else if (obj.value !== undefined) valStr = String(obj.value);
        else if (obj.char !== undefined) valStr = String(obj.char);
        else if (obj.key !== undefined) valStr = String(obj.key);
        else if (obj.data !== undefined) valStr = String(obj.data);
        if (!valStr) valStr = String(obj.__cls__);
        displayValues.set(valStr, (displayValues.get(valStr) || 0) + 1);
    }
    const valueCounters = new Map<string, number>();

    function getNodeLabel(obj: any): string {
        let valStr = "";
        if (obj.val !== undefined) valStr = String(obj.val);
        else if (obj.value !== undefined) valStr = String(obj.value);
        else if (obj.char !== undefined) valStr = String(obj.char);
        else if (obj.key !== undefined) valStr = String(obj.key);
        else if (obj.data !== undefined) valStr = String(obj.data);
        if (!valStr) valStr = String(obj.__cls__);

        // Only add suffix if there are duplicate display values
        if ((displayValues.get(valStr) || 0) > 1) {
            const idx = (valueCounters.get(valStr) || 0) + 1;
            valueCounters.set(valStr, idx);
            return idx === 1 ? valStr : `${valStr}'${idx > 2 ? idx : ""}`;
        }
        return valStr;
    }

    const idToLabel = new Map<number, string>();
    for (const [id, obj] of nodeMap.entries()) {
        idToLabel.set(id, getNodeLabel(obj));
    }

    // Pass 2: Build edges
    for (const [id, obj] of nodeMap.entries()) {
        const sourceLabel = idToLabel.get(id)!;
        const edges: string[] = [];

        function extractEdges(val: any) {
            if (!val || typeof val !== "object") return;
            if (Array.isArray(val)) {
                val.forEach(extractEdges);
            } else if (val.__id__ && val.__cls__) {
                if (val.__id__ !== id) {
                    edges.push(idToLabel.get(val.__id__)!);
                }
            } else if (val.__ref__) {
                if (val.__ref__ !== id && idToLabel.has(val.__ref__)) {
                    edges.push(idToLabel.get(val.__ref__)!);
                }
            } else {
                for (const v of Object.values(val)) {
                    extractEdges(v);
                }
            }
        }

        // Only scan fields of this object (skip __id__ and __cls__)
        for (const [k, v] of Object.entries(obj)) {
            if (k !== "__id__" && k !== "__cls__") {
                extractEdges(v);
            }
        }

        adj[sourceLabel] = edges;
    }

    return adj;
}
