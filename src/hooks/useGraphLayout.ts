import { useMemo } from 'react';

// Simple seeded random generator to ensure deterministic layout mapping between renders
function seededRandom(seed: number) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

export function useGraphLayout(
    adj: Record<string, unknown[]>,
    scale: number = 100,
    iterations: number = 200,
) {
    return useMemo(() => {
        const nodeIds = Object.keys(adj).sort(); // Sort to guarantee deterministic mapping
        const n = nodeIds.length;
        if (n === 0) return { layout: new Map<string, { x: number; y: number }>(), edges: [], nodes: [] };

        // 1. Build undirected edge set and ensure all nodes exist
        const edgeSet = new Set<string>();
        const edgeList: { from: string; to: string }[] = [];

        for (const [node, neighbors] of Object.entries(adj)) {
            for (const neighbor of neighbors) {
                const neighborStr = String(neighbor);
                // Ensure nodes in edges exist in nodeIds (in case adj list only declares directed edges)
                if (adj[neighborStr] === undefined && !nodeIds.includes(neighborStr)) {
                    nodeIds.push(neighborStr);
                }
                const key = [node, neighborStr].sort().join("-");
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    edgeList.push({ from: node, to: neighborStr });
                }
            }
        }

        nodeIds.sort();
        const actualN = nodeIds.length;

        // 2. Seeded initial circular arrangement + slight noise
        // This prevents the layout from jumping wildly across renders
        const positions: Record<string, { x: number; y: number }> = {};
        nodeIds.forEach((id, i) => {
            const angle = (2 * Math.PI * i) / actualN - Math.PI / 2;
            const noiseX = (seededRandom(i * 10) - 0.5) * scale * 0.1;
            const noiseY = (seededRandom(i * 10 + 1) - 0.5) * scale * 0.1;
            positions[id] = {
                x: Math.cos(angle) * scale * 0.8 + noiseX,
                y: Math.sin(angle) * scale * 0.8 + noiseY,
            };
        });

        // 3. Robust Force simulation (Fruchterman-Reingold inspired)
        const REPULSION = scale * scale * 1.2;
        const SPRING_K = 0.05;
        const IDEAL_LENGTH = scale * 0.9;
        const DAMPING = 0.85;

        for (let iter = 0; iter < iterations; iter++) {
            const forces: Record<string, { fx: number; fy: number }> = {};
            for (const id of nodeIds) forces[id] = { fx: 0, fy: 0 };

            // 3a. Node Repulsion (Coulomb's Law)
            for (let i = 0; i < actualN; i++) {
                for (let j = i + 1; j < actualN; j++) {
                    const a = nodeIds[i];
                    const b = nodeIds[j];
                    let dx = positions[b].x - positions[a].x;
                    let dy = positions[b].y - positions[a].y;
                    let dist = Math.sqrt(dx * dx + dy * dy);

                    // Prevent singularity
                    if (dist === 0) {
                        dx = (seededRandom(i * j) - 0.5) * 0.1;
                        dy = (seededRandom(i * j + 1) - 0.5) * 0.1;
                        dist = Math.sqrt(dx * dx + dy * dy);
                    }

                    const force = REPULSION / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    forces[a].fx -= fx;
                    forces[a].fy -= fy;
                    forces[b].fx += fx;
                    forces[b].fy += fy;
                }
            }

            // 3b. Edge Attraction (Hooke's Law)
            for (const { from: a, to: b } of edgeList) {
                const dx = positions[b].x - positions[a].x;
                const dy = positions[b].y - positions[a].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
                const displacement = dist - IDEAL_LENGTH;
                const force = SPRING_K * displacement;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                forces[a].fx += fx;
                forces[a].fy += fy;
                forces[b].fx -= fx;
                forces[b].fy -= fy;
            }

            // 3c. Center Gravity
            for (const id of nodeIds) {
                forces[id].fx -= positions[id].x * 0.02;
                forces[id].fy -= positions[id].y * 0.02;
            }

            // 3d. Apply forces with a simulated annealing cooling schedule
            const cooling = Math.max(0.05, 1 - iter / iterations);
            for (const id of nodeIds) {
                positions[id].x += forces[id].fx * DAMPING * cooling;
                positions[id].y += forces[id].fy * DAMPING * cooling;
            }
        }

        const layout = new Map<string, { x: number; y: number }>();
        for (const id of nodeIds) layout.set(id, positions[id]);

        return { layout, edges: edgeList, nodes: nodeIds };
    }, [adj, scale, iterations]);
}

export interface GraphNodeData {
    label: string;
    isRoot?: boolean;
}

export interface GraphEdgeData {
    from: string;
    to: string;
    type?: string;
    label?: string;
}

export interface StructuredGraphData {
    __type__: "structured_graph";
    nodes: Record<string, GraphNodeData>;
    edges: GraphEdgeData[];
    adjList: Record<string, string[]>;
}

/**
 * A simple hierarchical layout for trees and tries.
 * It ignores "fail" or "parent" links for structuring, creating a top-down depth map,
 * and spaces nodes horizontally out at each depth level.
 */
export function useHierarchicalGraphLayout(
    graph: StructuredGraphData | null,
    levelHeight: number = 2.5,
    nodeWidth: number = 2.5
) {
    return useMemo(() => {
        if (!graph || Object.keys(graph.nodes).length === 0) {
            return { layout: new Map<string, { x: number; y: number }>(), edges: [], nodes: [] };
        }

        const nodes = Object.keys(graph.nodes).sort();
        const edges = graph.edges;

        // 1. Find roots. A root is explicitly marked, or has in-degree 0 for 'child' edges
        const inDegree = new Map<string, number>();
        nodes.forEach(n => inDegree.set(n, 0));

        edges.forEach(e => {
            if (e.type !== "fail" && e.type !== "parent") {
                inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
            }
        });

        const roots = nodes.filter(n => graph.nodes[n].isRoot || inDegree.get(n) === 0);
        if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]); // fallback

        // 2. BFS to assign depth
        const depths = new Map<string, number>();
        const levelMap = new Map<number, string[]>(); // depth -> array of node IDs
        let maxDepth = 0;

        const queue: { id: string; depth: number }[] = roots.map(r => ({ id: r, depth: 0 }));
        const visited = new Set<string>();

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            if (visited.has(id)) continue;
            visited.add(id);
            depths.set(id, depth);
            maxDepth = Math.max(maxDepth, depth);

            if (!levelMap.has(depth)) levelMap.set(depth, []);
            levelMap.get(depth)!.push(id);

            // queue children
            edges.forEach(e => {
                if (e.from === id && e.type !== "fail" && e.type !== "parent" && !visited.has(e.to)) {
                    queue.push({ id: e.to, depth: depth + 1 });
                }
            });
        }

        // Catch disconnected nodes
        nodes.forEach(n => {
            if (!visited.has(n)) {
                depths.set(n, 0);
                if (!levelMap.has(0)) levelMap.set(0, []);
                levelMap.get(0)!.push(n);
            }
        });

        // 3. Assign coordinates
        const layout = new Map<string, { x: number; y: number }>();
        const totalHeight = maxDepth * levelHeight;

        for (const [depth, levelNodes] of levelMap.entries()) {
            // Sort nodes at this level to keep layout somewhat deterministic and pretty
            levelNodes.sort();
            const width = levelNodes.length * nodeWidth;
            const startX = -width / 2 + nodeWidth / 2;
            const y = totalHeight / 2 - depth * levelHeight;

            levelNodes.forEach((id, i) => {
                layout.set(id, { x: startX + i * nodeWidth, y });
            });
        }

        return { layout, edges, nodes };
    }, [graph, levelHeight, nodeWidth]);
}
