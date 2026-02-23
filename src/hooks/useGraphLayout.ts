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
