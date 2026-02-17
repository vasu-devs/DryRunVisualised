"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { TraceStep } from "@/lib/interpreter/schema";
import { VizContext } from "@/lib/vizDetector";

interface GraphVisualizationProps {
    step: TraceStep;
    vizCtx: VizContext;
}

type NodeState = "default" | "visiting" | "visited" | "queued";

const NODE_RADIUS = 0.45;
const LAYOUT_SCALE = 3.2;

/**
 * Simple force-directed layout — computed once from adjacency list.
 */
function computeLayout(adj: Record<string, number[]>): Map<string, { x: number; y: number }> {
    const nodes = Object.keys(adj);
    const n = nodes.length;
    if (n === 0) return new Map();

    // Initialize positions in a circle
    const pos = new Map<string, { x: number; y: number }>();
    nodes.forEach((id, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        pos.set(id, {
            x: Math.cos(angle) * LAYOUT_SCALE,
            y: Math.sin(angle) * LAYOUT_SCALE,
        });
    });

    // Force iterations
    const iterations = 100;
    const repulsionK = 4.0;
    const attractionK = 0.12;
    const dampening = 0.85;

    for (let iter = 0; iter < iterations; iter++) {
        const forces = new Map<string, { fx: number; fy: number }>();
        nodes.forEach((id) => forces.set(id, { fx: 0, fy: 0 }));

        // Repulsion between all pairs
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = pos.get(nodes[i])!;
                const b = pos.get(nodes[j])!;
                let dx = a.x - b.x;
                let dy = a.y - b.y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.5);
                const force = repulsionK / (dist * dist);
                dx = (dx / dist) * force;
                dy = (dy / dist) * force;
                forces.get(nodes[i])!.fx += dx;
                forces.get(nodes[i])!.fy += dy;
                forces.get(nodes[j])!.fx -= dx;
                forces.get(nodes[j])!.fy -= dy;
            }
        }

        // Attraction along edges
        for (const [src, neighbors] of Object.entries(adj)) {
            for (const dst of neighbors) {
                const dstStr = String(dst);
                if (!pos.has(dstStr)) continue;
                const a = pos.get(src)!;
                const b = pos.get(dstStr)!;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);
                const force = attractionK * dist;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                forces.get(src)!.fx += fx;
                forces.get(src)!.fy += fy;
                if (forces.has(dstStr)) {
                    forces.get(dstStr)!.fx -= fx;
                    forces.get(dstStr)!.fy -= fy;
                }
            }
        }

        // Apply forces
        for (const id of nodes) {
            const p = pos.get(id)!;
            const f = forces.get(id)!;
            p.x += f.fx * dampening;
            p.y += f.fy * dampening;
        }
    }

    return pos;
}

const STATE_COLORS: Record<NodeState, string> = {
    default: "#475569",
    visiting: "#f59e0b",
    visited: "#22c55e",
    queued: "#3b82f6",
};

const STATE_EMISSIVE: Record<NodeState, string> = {
    default: "#1e293b",
    visiting: "#d97706",
    visited: "#16a34a",
    queued: "#2563eb",
};

/** Animated graph node (sphere). */
function GraphNode({
    nodeId,
    position,
    state,
}: {
    nodeId: string;
    position: [number, number, number];
    state: NodeState;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const matRef = useRef<THREE.MeshStandardMaterial>(null!);
    const targetColor = useRef(new THREE.Color(STATE_COLORS[state]));
    const targetEmissive = useRef(new THREE.Color(STATE_EMISSIVE[state]));
    const currentColor = useRef(new THREE.Color(STATE_COLORS.default));
    const currentEmissive = useRef(new THREE.Color(STATE_EMISSIVE.default));
    const targetScale = useRef(state === "visiting" ? 1.4 : 1.0);
    const currentScale = useRef(1.0);

    targetColor.current.set(STATE_COLORS[state]);
    targetEmissive.current.set(STATE_EMISSIVE[state]);
    targetScale.current = state === "visiting" ? 1.4 : 1.0;

    useFrame((_, delta) => {
        const speed = 6.0 * delta;
        currentColor.current.lerp(targetColor.current, speed);
        currentEmissive.current.lerp(targetEmissive.current, speed);
        currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale.current, speed);

        if (matRef.current) {
            matRef.current.color.copy(currentColor.current);
            matRef.current.emissive.copy(currentEmissive.current);
            matRef.current.emissiveIntensity = state === "visiting" ? 1.8 : 0.6;
        }
        if (meshRef.current) {
            meshRef.current.scale.setScalar(currentScale.current);
        }
    });

    return (
        <group position={position}>
            <mesh ref={meshRef} castShadow>
                <sphereGeometry args={[NODE_RADIUS, 24, 24]} />
                <meshStandardMaterial
                    ref={matRef}
                    roughness={0.15}
                    metalness={0.7}
                />
            </mesh>
            <Text
                position={[0, 0, NODE_RADIUS + 0.18]}
                fontSize={0.35}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#000"
                fontWeight="bold"
            >
                {nodeId}
            </Text>
        </group>
    );
}

/** Thick visible edge using drei Line (supports lineWidth). */
function GraphEdge({
    from,
    to,
    isTraversed,
}: {
    from: [number, number, number];
    to: [number, number, number];
    isTraversed: boolean;
}) {
    return (
        <Line
            points={[from, to]}
            color={isTraversed ? "#60a5fa" : "#475569"}
            lineWidth={isTraversed ? 3.5 : 1.8}
            opacity={isTraversed ? 1.0 : 0.5}
            transparent
        />
    );
}

/** Legend showing color meanings */
function Legend() {
    const items = [
        { label: "Current", color: "#f59e0b" },
        { label: "Visited", color: "#22c55e" },
        { label: "Queued", color: "#3b82f6" },
        { label: "Default", color: "#475569" },
    ];

    return (
        <group position={[LAYOUT_SCALE + 1.5, LAYOUT_SCALE, 0]}>
            {items.map((item, i) => (
                <group key={item.label} position={[0, -i * 0.55, 0]}>
                    <mesh>
                        <sphereGeometry args={[0.12, 12, 12]} />
                        <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.8} />
                    </mesh>
                    <Text
                        position={[0.35, 0, 0]}
                        fontSize={0.2}
                        color="#94a3b8"
                        anchorX="left"
                        anchorY="middle"
                    >
                        {item.label}
                    </Text>
                </group>
            ))}
        </group>
    );
}

export function GraphVisualization({ step, vizCtx }: GraphVisualizationProps) {
    const graphData = vizCtx.primaryVar ? step.stack[vizCtx.primaryVar] : null;

    // Normalize adjacency list
    const adj = useMemo<Record<string, number[]>>(() => {
        if (!graphData || typeof graphData !== "object" || Array.isArray(graphData)) return {};
        const result: Record<string, number[]> = {};
        for (const [k, v] of Object.entries(graphData as Record<string, unknown>)) {
            if (Array.isArray(v)) {
                result[k] = v.map(Number);
            }
        }
        return result;
    }, [graphData]);

    const layout = useMemo(() => computeLayout(adj), [adj]);

    // State extraction
    const visited = useMemo<Set<string>>(() => {
        const v = step.stack.visited;
        if (Array.isArray(v)) return new Set(v.map(String));
        if (v && typeof v === "object" && !Array.isArray(v)) {
            return new Set(Object.keys(v));
        }
        return new Set();
    }, [step.stack.visited]);

    const queued = useMemo<Set<string>>(() => {
        const q = step.stack.queue ?? step.stack.stack ?? step.stack.frontier;
        if (Array.isArray(q)) return new Set(q.map(String));
        return new Set();
    }, [step.stack.queue, step.stack.stack, step.stack.frontier]);

    const currentNode: string | null = useMemo(() => {
        const c = step.stack.current ?? step.stack.node ?? step.stack.curr;
        return c !== undefined ? String(c) : null;
    }, [step.stack.current, step.stack.node, step.stack.curr]);

    // Visited edges
    const visitedEdges = useMemo<Set<string>>(() => {
        const edges = new Set<string>();
        visited.forEach(v => {
            const neighbors = adj[v];
            if (neighbors) {
                neighbors.forEach(n => {
                    if (visited.has(String(n))) {
                        edges.add(`${v}-${n}`);
                    }
                });
            }
        });
        return edges;
    }, [visited, adj]);

    function getNodeState(nodeId: string): NodeState {
        if (currentNode === nodeId) return "visiting";
        if (visited.has(nodeId)) return "visited";
        if (queued.has(nodeId)) return "queued";
        return "default";
    }

    const nodeIds = Array.from(layout.keys());

    // Edge list (deduplicated)
    const edges = useMemo(() => {
        const edgeList: { from: string; to: string }[] = [];
        const seen = new Set<string>();
        for (const [src, neighbors] of Object.entries(adj)) {
            for (const dst of neighbors) {
                const key = [src, String(dst)].sort().join("-");
                if (!seen.has(key)) {
                    seen.add(key);
                    edgeList.push({ from: src, to: String(dst) });
                }
            }
        }
        return edgeList;
    }, [adj]);

    if (nodeIds.length === 0) return null;

    // Distance info (for Dijkstra)
    const distances = step.stack.distances ?? step.stack.dist;

    return (
        <group>
            {/* Edges */}
            {edges.map((edge) => {
                const fromPos = layout.get(edge.from);
                const toPos = layout.get(edge.to);
                if (!fromPos || !toPos) return null;
                const isTraversed = visitedEdges.has(`${edge.from}-${edge.to}`) ||
                    visitedEdges.has(`${edge.to}-${edge.from}`);
                return (
                    <GraphEdge
                        key={`${edge.from}-${edge.to}`}
                        from={[fromPos.x, fromPos.y, 0]}
                        to={[toPos.x, toPos.y, 0]}
                        isTraversed={isTraversed}
                    />
                );
            })}

            {/* Nodes */}
            {nodeIds.map((id) => {
                const pos = layout.get(id)!;
                return (
                    <GraphNode
                        key={id}
                        nodeId={id}
                        position={[pos.x, pos.y, 0]}
                        state={getNodeState(id)}
                    />
                );
            })}

            {/* Distance labels (Dijkstra) */}
            {distances && typeof distances === "object" && nodeIds.map((id) => {
                const pos = layout.get(id)!;
                const d = (distances as Record<string, unknown>)[id];
                if (d === undefined) return null;
                const label = d === Infinity || d === 999999 ? "∞" : String(d);
                return (
                    <Text
                        key={`dist-${id}`}
                        position={[pos.x, pos.y - NODE_RADIUS - 0.35, 0.1]}
                        fontSize={0.22}
                        color="#e879f9"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.015}
                        outlineColor="#020617"
                    >
                        {`d=${label}`}
                    </Text>
                );
            })}

            {/* Current node label */}
            {currentNode && (
                <Text
                    position={[0, -LAYOUT_SCALE - 1.5, 0]}
                    fontSize={0.35}
                    color="#f59e0b"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#020617"
                >
                    {`current = ${currentNode}`}
                </Text>
            )}

            {/* Graph variable label */}
            <Text
                position={[0, -LAYOUT_SCALE - 2.2, 0]}
                fontSize={0.3}
                color="#38bdf8"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#020617"
            >
                {vizCtx.primaryVar ?? "graph"}
            </Text>

            <Legend />
        </group>
    );
}
