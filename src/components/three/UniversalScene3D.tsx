"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, RoundedBox, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { TraceStep } from "@/lib/interpreter/schema";
import { VizContext } from "@/lib/vizDetector";
import { useGraphLayout, useHierarchicalGraphLayout, type StructuredGraphData } from "@/hooks/useGraphLayout";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

// ─── Configuration ───────────────────────────────────────────
const BAR_SPACING = 1.4;
const BAR_DEPTH = 0.8;
const GRID_TILE = 0.9;
const GRID_GAP = 0.1;
const GRAPH_SCALE = 2.2;

// ─── Persistent drag position store (survives re-renders / step changes) ─
const dragPositionStore = new Map<string, [number, number, number]>();

// ─── DraggableGroup ─ wraps children in a draggable 3D group ─
function DraggableGroup({
    children,
    initialPosition = [0, 0, 0],
    persistKey,
    onDrag,
}: {
    children: React.ReactNode;
    initialPosition?: [number, number, number];
    persistKey?: string; // unique key to persist drag position across step changes
    onDrag?: (dx: number, dy: number, dz: number) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { camera, gl, controls } = useThree() as any;

    // Restore saved offset from the persistent store, or start at [0,0,0]
    const savedOffset = persistKey ? dragPositionStore.get(persistKey) : undefined;
    const [offset, setOffset] = useState<[number, number, number]>(savedOffset || [0, 0, 0]);

    // Sync offset when persistKey changes (e.g., different structure name on step change)
    const prevKeyRef = useRef(persistKey);
    if (persistKey !== prevKeyRef.current) {
        prevKeyRef.current = persistKey;
        const stored = persistKey ? dragPositionStore.get(persistKey) : undefined;
        if (stored && (stored[0] !== offset[0] || stored[1] !== offset[1] || stored[2] !== offset[2])) {
            setOffset(stored);
        } else if (!stored && (offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0)) {
            setOffset([0, 0, 0]);
        }
    }

    const dragState = useRef<{
        active: boolean;
        startWorld: THREE.Vector3;
        startOffset: [number, number, number];
    }>({ active: false, startWorld: new THREE.Vector3(), startOffset: [0, 0, 0] });

    const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const intersection = useMemo(() => new THREE.Vector3(), []);

    const getWorldPoint = useCallback(
        (clientX: number, clientY: number) => {
            const rect = gl.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((clientX - rect.left) / rect.width) * 2 - 1,
                -((clientY - rect.top) / rect.height) * 2 + 1
            );
            raycaster.setFromCamera(mouse, camera);
            raycaster.ray.intersectPlane(dragPlane, intersection);
            return intersection.clone();
        },
        [camera, gl, raycaster, dragPlane, intersection]
    );

    // --- Global pointer handlers (registered on window to handle dragging beyond element bounds) ---
    const onWindowPointerMove = useCallback((e: PointerEvent) => {
        if (!dragState.current.active) return;
        const point = getWorldPoint(e.clientX, e.clientY);
        const dx = point.x - dragState.current.startWorld.x;
        const dy = point.y - dragState.current.startWorld.y;
        const newOffset: [number, number, number] = [
            dragState.current.startOffset[0] + dx,
            dragState.current.startOffset[1] + dy,
            dragState.current.startOffset[2],
        ];
        setOffset(newOffset);
        // Save to persistent store
        if (persistKey) dragPositionStore.set(persistKey, newOffset);
        if (onDrag) onDrag(newOffset[0], newOffset[1], newOffset[2]);
    }, [getWorldPoint, onDrag, persistKey]);

    const onWindowPointerUp = useCallback(() => {
        if (!dragState.current.active) return;
        dragState.current.active = false;
        document.body.style.cursor = "auto";
        // Re-enable OrbitControls
        if (controls) controls.enabled = true;
        window.removeEventListener("pointermove", onWindowPointerMove);
        window.removeEventListener("pointerup", onWindowPointerUp);
    }, [controls, onWindowPointerMove]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePointerDown = useCallback((e: any) => {
        const ne = e.nativeEvent as PointerEvent;
        if (ne && ne.button !== 0) return; // Only left click
        e.stopPropagation();

        // Disable OrbitControls immediately so it doesn't steal the event
        if (controls) controls.enabled = false;

        const point = getWorldPoint(ne.clientX, ne.clientY);
        dragState.current = {
            active: true,
            startWorld: point,
            startOffset: [...offset],
        };
        document.body.style.cursor = "grabbing";

        // Register global handlers for smooth dragging
        window.addEventListener("pointermove", onWindowPointerMove);
        window.addEventListener("pointerup", onWindowPointerUp);
    }, [getWorldPoint, offset, controls, onWindowPointerMove, onWindowPointerUp]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDoubleClick = useCallback((e: any) => {
        e.stopPropagation();
        setOffset([0, 0, 0]); // Reset to original position
        if (persistKey) dragPositionStore.delete(persistKey); // Clear persisted position
        if (onDrag) onDrag(0, 0, 0);
    }, [onDrag, persistKey]);

    const pos: [number, number, number] = [
        initialPosition[0] + offset[0],
        initialPosition[1] + offset[1],
        initialPosition[2] + offset[2],
    ];

    return (
        <group
            ref={groupRef}
            position={pos}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onPointerOver={() => {
                if (!dragState.current.active) document.body.style.cursor = "grab";
            }}
            onPointerOut={() => {
                if (!dragState.current.active) document.body.style.cursor = "auto";
            }}
        >
            {children}
        </group>
    );
}
const LERP_SPEED = 5.0; // Fallback
const DAMP_FACTOR = 0.25; // Smoother physical spring effect

const POINTER_COLORS = [
    "#f59e0b", "#ef4444", "#22c55e", "#a855f7",
    "#06b6d4", "#ec4899", "#84cc16", "#f97316",
];

// ─── Utility functions (mirroring 2D) ────────────────────────

function classifyValue(val: unknown): "array" | "dict" | "scalar" | "none" {
    if (val === undefined || val === null) return "none";
    if (Array.isArray(val)) return "array";
    if (typeof val === "object") return "dict";
    return "scalar";
}

function isAdjList(val: unknown): boolean {
    if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
    if ((val as any).__type__ === "structured_graph") return true;
    const entries = Object.entries(val as Record<string, unknown>);
    return entries.length >= 2 && entries.every(([, v]) => Array.isArray(v));
}

function formatCellValue(val: unknown): string {
    if (typeof val === "number") return String(val);
    if (typeof val === "boolean") return val ? "T" : "F";
    if (typeof val === "string") return val;
    if (val === null || val === undefined) return "—";
    if (Array.isArray(val)) return `[${val.map(v => formatCellValue(v)).join(",")}]`;
    return JSON.stringify(val);
}

function getSortedVariables(step: TraceStep, vizCtx: VizContext) {
    const vars: Array<{ name: string; value: unknown; type: string; priority: number }> = [];
    for (const [name, val] of Object.entries(step.stack)) {
        const type = classifyValue(val);
        let priority = 50;
        if (name === vizCtx.primaryVar) priority = 0;
        else if (type === "array") priority = 10;
        else if (type === "dict") priority = 20;
        else if (vizCtx.pointerVars.includes(name)) priority = 30;
        else if (type === "scalar") priority = 40;
        vars.push({ name, value: val, type, priority });
    }
    vars.sort((a, b) => a.priority - b.priority);
    return vars;
}

function is2DGrid(val: unknown): boolean {
    if (!Array.isArray(val) || val.length === 0) return false;
    const firstRow = val[0];
    if (!Array.isArray(firstRow) || firstRow.length === 0) return false;
    const len = firstRow.length;
    for (const row of val) {
        if (!Array.isArray(row) || row.length !== len) return false;
        const types = new Set((row as unknown[]).map(cell => typeof cell));
        if (types.size > 1) return false;
    }
    return true;
}

// ─── 3D Building Blocks ──────────────────────────────────────

/** Animated bar for arrays */
function Bar3D({
    value,
    index,
    xPos,
    zPos,
    isPointed,
    isChanged,
    color,
}: {
    value: unknown;
    index: number;
    xPos: number;
    zPos: number;
    isPointed: boolean;
    isChanged: boolean;
    color: string;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const matRef = useRef<THREE.MeshStandardMaterial>(null!);
    const groupRef = useRef<THREE.Group>(null!);
    const currentX = useRef(xPos);
    const elapsedRef = useRef(0);

    const numericVal = typeof value === "number" ? value : 1;
    const barHeight = Math.max(0.5, Math.abs(numericVal) * 0.3 + 0.5);

    const [hovered, setHovered] = useState(false);

    const targetColor = useMemo(() => {
        if (isChanged) return new THREE.Color("#22c55e");
        if (isPointed) return new THREE.Color("#00c6a7"); // Cyan accent
        if (hovered) return new THREE.Color("#ffffff"); // Highlight on hover
        if (color === "rgba(24, 24, 27, 0.5)") return new THREE.Color("#e6e8ec"); // Override old dark default
        return new THREE.Color("#e6e8ec"); // Force Neumorphic base
    }, [isChanged, isPointed, hovered, color]);

    const targetEmissive = useMemo(() => {
        if (isChanged) return new THREE.Color("#16a34a");
        if (isPointed) return new THREE.Color("#00a388"); // Darker cyan
        if (hovered) return new THREE.Color("#f8f9fa");
        return new THREE.Color("#ffffff");
    }, [isChanged, isPointed, hovered]);

    useFrame((_, delta) => {
        elapsedRef.current += delta;
        // Use smooth spring damping for movement
        currentX.current = THREE.MathUtils.damp(currentX.current, xPos, 8, delta);

        if (groupRef.current) {
            groupRef.current.position.x = currentX.current;

            // Add slight bobbing and elevation on interact
            let targetY = 0;
            if (isPointed) {
                targetY = Math.sin(elapsedRef.current * 3) * 0.05 + 0.1;
            } else if (isChanged) {
                targetY = 0.2; // Bounce up when changed
            } else if (hovered) {
                targetY = 0.1;
            }

            groupRef.current.position.y = THREE.MathUtils.damp(
                groupRef.current.position.y, targetY, 12, delta
            );
        }

        if (matRef.current) {
            matRef.current.color.lerp(targetColor, delta * 10);
            matRef.current.emissive.lerp(targetEmissive, delta * 10);

            if (isChanged) {
                matRef.current.emissiveIntensity = Math.sin(elapsedRef.current * 4) * 0.3 + 0.7;
            } else {
                matRef.current.emissiveIntensity = THREE.MathUtils.damp(
                    matRef.current.emissiveIntensity, hovered ? 0.6 : 0.3, 10, delta
                );
            }
        }
    });

    const displayText = formatCellValue(value);

    return (
        <group
            ref={groupRef}
            position={[xPos, 0, zPos]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
        >
            <RoundedBox
                ref={meshRef}
                args={[1.0, barHeight, BAR_DEPTH]}
                radius={0.25} // Increased for squircle look
                smoothness={8} // High poly count for smooth curves
                position={[0, barHeight / 2, 0]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial
                    ref={matRef}
                    color="#e6e8ec"
                    emissive="#ffffff"
                    emissiveIntensity={0.8}
                    roughness={0.2}
                    metalness={0.1}
                    transparent
                    opacity={0.9}
                />
            </RoundedBox>

            {/* Glassmorphic Tooltip on Hover */}
            {hovered && (
                <Html position={[0, barHeight + 0.8, 0]} center zIndexRange={[100, 0]}>
                    <div className="neu-raised px-3 py-2 text-xs font-mono text-[var(--text-main)] pointer-events-none whitespace-nowrap flex flex-col items-center animate-fade-in-up">
                        <span className="text-[10px] opacity-60 font-sans uppercase tracking-wider mb-0.5">Index {index}</span>
                        <span className="font-bold text-sm">{displayText}</span>
                    </div>
                </Html>
            )}

            {/* Value on top */}
            <Text
                position={[0, barHeight + 0.35, 0]}
                fontSize={0.3}
                color="#334155" // Slate 700
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.015}
                outlineColor="#ffffff"
            >
                {displayText}
            </Text>
            {/* Index below */}
            <Text
                position={[0, -0.25, 0]}
                fontSize={0.18}
                color="#94a3b8" // Slate 400
                anchorX="center"
                anchorY="top"
            >
                {String(index)}
            </Text>
        </group>
    );
}

/** Pointer arrow beneath an array */
function Pointer3D({
    label,
    targetX,
    zPos,
    color,
}: {
    label: string;
    targetX: number;
    zPos: number;
    color: string;
}) {
    const groupRef = useRef<THREE.Group>(null!);
    const currentX = useRef(targetX);
    const elapsedRef = useRef(0);

    useFrame((_, delta) => {
        elapsedRef.current += delta;
        const speed = LERP_SPEED * delta;
        currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, speed);
        if (groupRef.current) {
            groupRef.current.position.x = currentX.current;
            groupRef.current.position.y = -1.0 + Math.sin(elapsedRef.current * 2.5) * 0.05;
        }
    });

    return (
        <group ref={groupRef} position={[targetX, -1.0, zPos]}>
            <mesh position={[0, 0.35, 0]}>
                <coneGeometry args={[0.18, 0.35, 6]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.6}
                    roughness={0.3}
                    metalness={0.6}
                />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.4}
                />
            </mesh>
            <Text
                position={[0, -0.35, 0]}
                fontSize={0.28}
                color={color}
                anchorX="center"
                anchorY="top"
                outlineWidth={0.01}
                outlineColor="#fcfbf9"
            >
                {label}
            </Text>
        </group>
    );
}

/** Floating scalar badge as 3D text */
function ScalarBadge3D({
    name,
    value,
    xPos,
    yPos,
    isChanged,
}: {
    name: string;
    value: unknown;
    xPos: number;
    yPos: number;
    isChanged: boolean;
}) {
    const text = `${name} = ${formatCellValue(value)}`;
    return (
        <group position={[xPos, yPos, 0]}>
            <RoundedBox args={[text.length * 0.2 + 0.4, 0.45, 0.15]} radius={0.15} smoothness={6} castShadow receiveShadow>
                <meshStandardMaterial
                    color={isChanged ? "#22c55e" : "#cbd5e1"}
                    emissive={isChanged ? "#16a34a" : "#94a3b8"}
                    emissiveIntensity={isChanged ? 1.0 : 0.8}
                    roughness={0.2}
                    metalness={0.1}
                    transparent
                    opacity={0.9}
                />
            </RoundedBox>
            <Text
                position={[0, 0, 0.09]}
                fontSize={0.2}
                color={isChanged ? "#15803d" : "#302a1e"}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.008}
                outlineColor="#fcfbf9"
            >
                {text}
            </Text>
        </group>
    );
}

/** Grid tile (for 2D grids like DP tables, N-Queens boards) */
function GridTile3D({
    value,
    row,
    col,
    isPointed,
    isChanged,
    totalRows,
    totalCols,
}: {
    value: unknown;
    row: number;
    col: number;
    isPointed: boolean;
    isChanged: boolean;
    totalRows: number;
    totalCols: number;
}) {
    const matRef = useRef<THREE.MeshStandardMaterial>(null!);
    const elapsedRef = useRef(0);

    const x = (col - totalCols / 2 + 0.5) * (GRID_TILE + GRID_GAP);
    // Rows go DOWNWARD on Y axis (negative) so the grid faces the user
    const y = -(row - totalRows / 2 + 0.5) * (GRID_TILE + GRID_GAP);

    const [hovered, setHovered] = useState(false);

    const targetColor = useMemo(() => {
        if (isChanged) return new THREE.Color("#22c55e");
        if (isPointed) return new THREE.Color("#00c6a7"); // Cyan
        if (hovered) return new THREE.Color("#ffffff");
        const numVal = typeof value === "number" ? value : 0;
        if (numVal === 0) return new THREE.Color("#e6e8ec"); // Neumorphic base
        if (numVal === 1 || value === true) return new THREE.Color("#dbeafe"); // Keep blueish
        return new THREE.Color("#f1f5f9"); // Lighter hue
    }, [isChanged, isPointed, hovered, value]);

    useFrame((_, delta) => {
        elapsedRef.current += delta;
        if (matRef.current) {
            matRef.current.color.lerp(targetColor, delta * 10);
            if (isChanged) {
                matRef.current.emissiveIntensity = Math.sin(elapsedRef.current * 4) * 0.2 + 0.5;
            } else {
                matRef.current.emissiveIntensity = THREE.MathUtils.damp(
                    matRef.current.emissiveIntensity, hovered ? 0.8 : 0.5, 10, delta
                );
            }
        }
    });

    const tileHeight = isPointed ? 0.3 : (hovered ? 0.2 : 0.12);
    const displayText = formatCellValue(value);

    return (
        <group
            position={[x, y, 0]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
        >
            <RoundedBox args={[GRID_TILE, GRID_TILE, tileHeight]} radius={0.2} smoothness={6} castShadow receiveShadow>
                <meshStandardMaterial
                    ref={matRef}
                    color="#e6e8ec"
                    emissive="#ffffff"
                    emissiveIntensity={0.8}
                    roughness={0.2}
                    metalness={0.1}
                    transparent
                    opacity={0.9}
                />
            </RoundedBox>
            <Text
                position={[0, 0, tileHeight / 2 + 0.05]}
                fontSize={0.22}
                color="#334155"
                anchorX="center"
                anchorY="middle"
                outlineColor="#ffffff"
            >
                {displayText}
            </Text>

            {/* Glassmorphic Tooltip on Hover */}
            {hovered && (
                <Html position={[0, 0, tileHeight + 0.5]} center zIndexRange={[100, 0]}>
                    <div className="neu-raised px-3 py-2 text-xs font-mono text-[var(--text-main)] pointer-events-none whitespace-nowrap flex flex-col items-center animate-fade-in-up">
                        <span className="text-[10px] opacity-60 font-sans uppercase tracking-wider mb-0.5">Cell ({row}, {col})</span>
                        <span className="font-bold text-sm">{displayText}</span>
                    </div>
                </Html>
            )}
        </group>
    );
}

/** Dict/Object as 3D block layout */
function DictView3D({
    name,
    data,
    xOffset,
    zOffset,
}: {
    name: string;
    data: Record<string, unknown>;
    xOffset: number;
    zOffset: number;
}) {
    const entries = Object.entries(data).slice(0, 20); // Cap to avoid GPU overload

    return (
        <group position={[xOffset, 0, zOffset]}>
            {/* Dict name label */}
            <Text
                position={[0, 0.8, 0]}
                fontSize={0.28}
                color="#38bdf8"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#fcfbf9"
            >
                {name}
            </Text>
            {entries.map(([key, val], idx) => {
                const col = idx % 6;
                const row = Math.floor(idx / 6);
                const x = (col - Math.min(entries.length, 6) / 2 + 0.5) * 1.6;
                const z = row * 1.2;
                const text = `${key}: ${formatCellValue(val)}`;

                return (
                    <group key={key} position={[x, 0, z]}>
                        <RoundedBox
                            args={[1.4, 0.4, 0.6]}
                            radius={0.15}
                            smoothness={6}
                            castShadow
                            receiveShadow
                        >
                            <meshStandardMaterial
                                color="#e6e8ec"
                                emissive="#ffffff"
                                emissiveIntensity={0.8}
                                roughness={0.2}
                                metalness={0.1}
                                transparent
                                opacity={0.9}
                            />
                        </RoundedBox>
                        <Text
                            position={[0, 0, 0.32]}
                            fontSize={0.16}
                            color="#334155"
                            anchorX="center"
                            anchorY="middle"
                            maxWidth={1.3}
                        >
                            {text}
                        </Text>
                    </group>
                );
            })}
        </group>
    );
}

// ─── Classify variable name as stack / queue / plain array ───
type DSType = "stack" | "queue" | "array";
function classifyDSType(name: string): DSType {
    const lower = name.toLowerCase();
    if (/^(stack|stk|call_stack|mono_stack)$|_stack$|^stack_/.test(lower)) return "stack";
    if (/^(queue|deque|bfs_queue|dq)$|_queue$|^queue_/.test(lower)) return "queue";
    return "array";
}

// ─── Stack3D ─ Vertical column (LIFO) ─────────────────────────
function Stack3D({
    name,
    items,
    yPos,
    prevItems,
}: {
    name: string;
    items: unknown[];
    yPos: number;
    prevItems: unknown[] | null;
}) {
    const CELL_H = 0.5;
    const CELL_W = 1.3;
    const GAP = 0.08;
    const n = items.length;

    // Detect newly pushed (last element added)
    const prevLen = prevItems ? prevItems.length : n;
    const justPushed = n > prevLen;

    return (
        <group position={[0, yPos, 0]}>
            {/* Label */}
            <Text
                position={[0, (n + 1) * (CELL_H + GAP) + 0.6, 0]}
                fontSize={0.34}
                color="#2dd4bf"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.018}
                outlineColor="#fcfbf9"
                fontWeight="bold"
            >
                {name} (stack) [{n}]
            </Text>

            {/* LIFO arrow — "↓ push / pop ↑" text above stack */}
            <Text
                position={[0, (n + 1) * (CELL_H + GAP) + 0.18, 0]}
                fontSize={0.16}
                color="#5eead4"
                anchorX="center"
                anchorY="middle"
            >
                ↓ push  ·  pop ↑
            </Text>

            {/* Top-of-stack indicator arrow */}
            {n > 0 && (
                <group position={[CELL_W / 2 + 0.5, (n - 1) * (CELL_H + GAP) + CELL_H / 2, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <coneGeometry args={[0.15, 0.3, 6]} />
                        <meshStandardMaterial
                            color="#2dd4bf"
                            emissive="#14b8a6"
                            emissiveIntensity={0.8}
                            roughness={0.3}
                            metalness={0.6}
                        />
                    </mesh>
                    <Text
                        position={[0.35, 0, 0]}
                        fontSize={0.16}
                        color="#5eead4"
                        anchorX="left"
                        anchorY="middle"
                    >
                        TOP
                    </Text>
                </group>
            )}

            {/* Stack cells — bottom to top */}
            {items.map((val, idx) => {
                const isTop = idx === n - 1;
                const isNew = justPushed && idx === n - 1;
                const y = idx * (CELL_H + GAP);
                const displayText = formatCellValue(val);

                return (
                    <group key={idx} position={[0, y, 0]}>
                        <RoundedBox
                            args={[CELL_W, CELL_H, BAR_DEPTH]}
                            radius={0.2}
                            smoothness={6}
                            position={[0, CELL_H / 2, 0]}
                            castShadow
                            receiveShadow
                        >
                            <meshStandardMaterial
                                color={isNew ? "#22c55e" : isTop ? "#e6e8ec" : "#f1f5f9"}
                                emissive={isNew ? "#16a34a" : isTop ? "#ffffff" : "#f8f9fa"}
                                emissiveIntensity={isNew ? 0.8 : isTop ? 0.8 : 0.6}
                                roughness={0.2}
                                metalness={0.1}
                            />
                        </RoundedBox>
                        <Text
                            position={[0, CELL_H / 2, BAR_DEPTH / 2 + 0.02]}
                            fontSize={0.24}
                            color="#334155"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#ffffff"
                        >
                            {displayText}
                        </Text>
                        {/* Index on the side */}
                        <Text
                            position={[-CELL_W / 2 - 0.25, CELL_H / 2, 0]}
                            fontSize={0.14}
                            color="#a8967f"
                            anchorX="right"
                            anchorY="middle"
                        >
                            {String(idx)}
                        </Text>
                    </group>
                );
            })}

            {/* "Bottom" base plate */}
            <mesh position={[0, -0.06, 0]}>
                <boxGeometry args={[CELL_W + 0.2, 0.08, BAR_DEPTH + 0.1]} />
                <meshStandardMaterial
                    color="#134e4a"
                    emissive="#0f766e"
                    emissiveIntensity={0.3}
                    roughness={0.4}
                    metalness={0.6}
                />
            </mesh>
        </group>
    );
}

// ─── Queue3D ─ Horizontal conveyor (FIFO) ─────────────────────
function Queue3D({
    name,
    items,
    yPos,
    prevItems,
}: {
    name: string;
    items: unknown[];
    yPos: number;
    prevItems: unknown[] | null;
}) {
    const CELL_W = 1.1;
    const CELL_H = 0.55;
    const GAP = 0.06;
    const n = items.length;
    const totalW = n * (CELL_W + GAP);
    const xCenter = totalW / 2 - (CELL_W + GAP) / 2;

    const prevLen = prevItems ? prevItems.length : n;
    const justEnqueued = n > prevLen;

    return (
        <group position={[0, yPos, 0]}>
            {/* Label */}
            <Text
                position={[0, CELL_H + 1.2, 0]}
                fontSize={0.34}
                color="#fb923c"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.018}
                outlineColor="#fcfbf9"
                fontWeight="bold"
            >
                {name} (queue) [{n}]
            </Text>

            {/* FIFO direction indicator */}
            <Text
                position={[0, CELL_H + 0.75, 0]}
                fontSize={0.16}
                color="#fdba74"
                anchorX="center"
                anchorY="middle"
            >
                dequeue ← · → enqueue
            </Text>

            {/* FRONT arrow (dequeue side — left) */}
            {n > 0 && (
                <group position={[-xCenter - CELL_W / 2 - 0.6, CELL_H / 2, 0]}>
                    <mesh rotation={[0, 0, -Math.PI / 2]}>
                        <coneGeometry args={[0.15, 0.3, 6]} />
                        <meshStandardMaterial
                            color="#f97316"
                            emissive="#ea580c"
                            emissiveIntensity={0.7}
                            roughness={0.3}
                            metalness={0.6}
                        />
                    </mesh>
                    <Text
                        position={[0, -0.4, 0]}
                        fontSize={0.14}
                        color="#fdba74"
                        anchorX="center"
                        anchorY="middle"
                    >
                        FRONT
                    </Text>
                </group>
            )}

            {/* BACK arrow (enqueue side — right) */}
            {n > 0 && (
                <group position={[-xCenter + totalW - CELL_W / 2 + 0.6, CELL_H / 2, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <coneGeometry args={[0.15, 0.3, 6]} />
                        <meshStandardMaterial
                            color="#f97316"
                            emissive="#ea580c"
                            emissiveIntensity={0.7}
                            roughness={0.3}
                            metalness={0.6}
                        />
                    </mesh>
                    <Text
                        position={[0, -0.4, 0]}
                        fontSize={0.14}
                        color="#fdba74"
                        anchorX="center"
                        anchorY="middle"
                    >
                        BACK
                    </Text>
                </group>
            )}

            {/* Conveyor rail (bottom bar) */}
            {n > 0 && (
                <mesh position={[0, -0.04, 0]}>
                    <boxGeometry args={[totalW + 1.0, 0.06, BAR_DEPTH + 0.1]} />
                    <meshStandardMaterial
                        color="#7c2d12"
                        emissive="#c2410c"
                        emissiveIntensity={0.15}
                        roughness={0.5}
                        metalness={0.5}
                    />
                </mesh>
            )}

            {/* Queue cells — left = front (dequeue), right = back (enqueue) */}
            {items.map((val, idx) => {
                const isFront = idx === 0;
                const isBack = idx === n - 1;
                const isNew = justEnqueued && idx === n - 1;
                const x = idx * (CELL_W + GAP) - xCenter;
                const displayText = formatCellValue(val);

                return (
                    <group key={idx} position={[x, 0, 0]}>
                        <RoundedBox
                            args={[CELL_W, CELL_H, BAR_DEPTH]}
                            radius={0.2}
                            smoothness={6}
                            position={[0, CELL_H / 2, 0]}
                            castShadow
                            receiveShadow
                        >
                            <meshStandardMaterial
                                color={isNew ? "#22c55e" : isFront ? "#d4d4d4" : "#e2e2e2"}
                                roughness={0.2}
                                metalness={0.1}
                            />
                        </RoundedBox>
                        <Text
                            position={[0, CELL_H / 2, BAR_DEPTH / 2 + 0.02]}
                            fontSize={0.22}
                            color="#302a1e"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#fcfbf9"
                        >
                            {displayText}
                        </Text>
                        {/* Index below */}
                        <Text
                            position={[0, -0.2, 0]}
                            fontSize={0.14}
                            color="#a8967f"
                            anchorX="center"
                            anchorY="top"
                        >
                            {String(idx)}
                        </Text>
                    </group>
                );
            })}
        </group>
    );
}

// ─── Helper: detect if a value is a serialized linked list ───
function isLinkedListValue(val: unknown): val is { __type__: "linked_list"; values: unknown[] } {
    return (
        val !== null &&
        typeof val === "object" &&
        (val as Record<string, unknown>).__type__ === "linked_list" &&
        Array.isArray((val as Record<string, unknown>).values)
    );
}

// ─── LinkedListView3D ─ Horizontal chain (lime/emerald) ───────
function LinkedListView3D({
    name,
    values,
    yPos,
}: {
    name: string;
    values: unknown[];
    yPos: number;
}) {
    const NODE_W = 1.1;
    const NODE_H = 0.65;
    const GAP = 0.7; // space for arrow between nodes
    const BAR_D = 0.55;
    const n = values.length;
    const totalW = n * NODE_W + (n - 1) * GAP;
    const xCenter = totalW / 2 - NODE_W / 2;

    return (
        <group position={[0, yPos, 0]}>
            {/* Label */}
            <Text
                position={[0, NODE_H + 1.4, 0]}
                fontSize={0.34}
                color="#86efac"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.018}
                outlineColor="#fcfbf9"
                fontWeight="bold"
            >
                {name} (linked list) [{n}]
            </Text>

            {/* Direction hint */}
            <Text
                position={[0, NODE_H + 0.95, 0]}
                fontSize={0.16}
                color="#4ade80"
                anchorX="center"
                anchorY="middle"
            >
                HEAD → ... → NULL
            </Text>

            {/* HEAD label on first node */}
            {n > 0 && (
                <Text
                    position={[-xCenter - 0.0, NODE_H + 0.55, 0]}
                    fontSize={0.18}
                    color="#22c55e"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                >
                    HEAD
                </Text>
            )}

            {/* Nodes */}
            {values.map((val, idx) => {
                const x = idx * (NODE_W + GAP) - xCenter;
                const displayText = formatCellValue(val);
                const isHead = idx === 0;
                const isTail = idx === n - 1;

                return (
                    <group key={idx} position={[x, 0, 0]}>
                        {/* Node box */}
                        <RoundedBox
                            args={[NODE_W, NODE_H, BAR_D]}
                            radius={0.2}
                            smoothness={6}
                            position={[0, NODE_H / 2, 0]}
                            castShadow
                            receiveShadow
                        >
                            <meshStandardMaterial
                                color={isHead ? "#22c55e" : isTail ? "#d4d4d4" : "#e2e2e2"}
                                roughness={0.2}
                                metalness={0.1}
                            />
                        </RoundedBox>

                        {/* val | next divider */}
                        <mesh position={[NODE_W / 4, NODE_H / 2, BAR_D / 2 + 0.005]}>
                            <planeGeometry args={[0.02, NODE_H * 0.7]} />
                            <meshBasicMaterial color="#4ade80" transparent opacity={0.6} />
                        </mesh>

                        {/* Value text (left compartment) */}
                        <Text
                            position={[-NODE_W / 8, NODE_H / 2, BAR_D / 2 + 0.02]}
                            fontSize={0.24}
                            color="#302a1e"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#fcfbf9"
                            fontWeight="bold"
                        >
                            {displayText}
                        </Text>

                        {/* "·" or arrow symbol in right compartment (next pointer) */}
                        <Text
                            position={[NODE_W / 2.8, NODE_H / 2, BAR_D / 2 + 0.02]}
                            fontSize={0.2}
                            color={isTail ? "#ef4444" : "#4ade80"}
                            anchorX="center"
                            anchorY="middle"
                        >
                            {isTail ? "∅" : "→"}
                        </Text>

                        {/* Index below */}
                        <Text
                            position={[0, -0.2, 0]}
                            fontSize={0.14}
                            color="#a8967f"
                            anchorX="center"
                            anchorY="top"
                        >
                            {String(idx)}
                        </Text>

                        {/* Arrow to next node */}
                        {!isTail && (
                            <group position={[NODE_W / 2 + GAP / 2, NODE_H / 2, 0]}>
                                {/* Shaft */}
                                <mesh position={[0, 0, 0]}>
                                    <boxGeometry args={[GAP * 0.6, 0.04, 0.04]} />
                                    <meshStandardMaterial
                                        color="#4ade80"
                                        emissive="#22c55e"
                                        emissiveIntensity={0.5}
                                    />
                                </mesh>
                                {/* Arrowhead */}
                                <mesh
                                    position={[GAP * 0.3, 0, 0]}
                                    rotation={[0, 0, -Math.PI / 2]}
                                >
                                    <coneGeometry args={[0.08, 0.18, 4]} />
                                    <meshStandardMaterial
                                        color="#4ade80"
                                        emissive="#22c55e"
                                        emissiveIntensity={0.6}
                                    />
                                </mesh>
                            </group>
                        )}
                    </group>
                );
            })}

            {/* NULL terminator after last node */}
            {n > 0 && (
                <group position={[(n - 1) * (NODE_W + GAP) - xCenter + NODE_W / 2 + GAP / 2 + 0.4, NODE_H / 2, 0]}>
                    <Text
                        fontSize={0.22}
                        color="#ef4444"
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        outlineWidth={0.015}
                        outlineColor="#fcfbf9"
                    >
                        NULL
                    </Text>
                </group>
            )}
        </group>
    );
}

/** Graph visualization — force-directed layout with curved edges */
function GraphView3D({
    adj,
    visited,
    queue,
    current,
    xOffset,
    zOffset,
}: {
    adj: Record<string, number[]>;
    visited: unknown[];
    queue: unknown[];
    current: unknown;
    xOffset: number;
    zOffset: number;
}) {
    const visitedSet = useMemo(() => {
        if (Array.isArray(visited)) return new Set(visited.map(String));
        if (visited && typeof visited === 'object') return new Set(Object.keys(visited).map(String));
        return new Set<string>();
    }, [visited]);
    const queueSet = useMemo(() => {
        if (Array.isArray(queue)) return new Set(queue.map(String));
        if (queue && typeof queue === 'object') return new Set(Object.keys(queue).map(String));
        return new Set<string>();
    }, [queue]);
    const currentStr = current !== undefined ? String(current) : null;

    // Use shared layout engine
    const { layout, edges, nodes: nodeIds } = useGraphLayout(adj, GRAPH_SCALE, 200);

    // Compute center of graph for edge curving direction
    const graphCenter = useMemo(() => {
        let cx = 0, cy = 0;
        layout.forEach(pos => { cx += pos.x; cy += pos.y; });
        const n = layout.size || 1;
        return { x: cx / n, y: cy / n };
    }, [layout]);

    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});

    // ── Generate curved edge points (quadratic bezier) ──
    const getEdgePoints = (fromId: string, toId: string) => {
        const fromBase = layout.get(fromId);
        const toBase = layout.get(toId);
        if (!fromBase || !toBase) return null;

        const dFrom = dragOffsets[fromId] || { x: 0, y: 0 };
        const dTo = dragOffsets[toId] || { x: 0, y: 0 };

        const fromPos = { x: fromBase.x + dFrom.x, y: fromBase.y + dFrom.y };
        const toPos = { x: toBase.x + dTo.x, y: toBase.y + dTo.y };

        const NODE_RADIUS = 0.45;
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) return null;

        // Direction unit vector
        const ux = dx / dist;
        const uy = dy / dist;

        // Start/end offset by node radius so lines don't go inside spheres
        const startX = fromPos.x + ux * NODE_RADIUS;
        const startY = fromPos.y + uy * NODE_RADIUS;
        const endX = toPos.x - ux * NODE_RADIUS;
        const endY = toPos.y - uy * NODE_RADIUS;

        // Midpoint
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;

        // Perpendicular direction (away from graph center for cleaner arcs)
        const perpX = -uy;
        const perpY = ux;

        // Push control point away from the graph center
        const centerDx = midX - graphCenter.x;
        const centerDy = midY - graphCenter.y;
        const dot = centerDx * perpX + centerDy * perpY;
        const sign = dot >= 0 ? 1 : -1;

        // Curve strength proportional to distance (longer edges curve more)
        const curvature = Math.min(dist * 0.15, 1.2);
        const ctrlX = midX + perpX * curvature * sign;
        const ctrlY = midY + perpY * curvature * sign;

        // Generate points along quadratic bezier
        const SEGMENTS = 16;
        const points: [number, number, number][] = [];
        for (let i = 0; i <= SEGMENTS; i++) {
            const t = i / SEGMENTS;
            const oneMinusT = 1 - t;
            const px = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * ctrlX + t * t * endX;
            const py = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * ctrlY + t * t * endY;
            points.push([px, py, 0]);
        }
        return points;
    };

    return (
        <group position={[xOffset, 0, zOffset]}>
            {/* Edges — curved bezier lines */}
            {edges.map(({ from, to }) => {
                const points = getEdgePoints(from, to);
                if (!points) return null;
                const isTraversed = visitedSet.has(from) && visitedSet.has(to);
                return (
                    <Line
                        key={`${from}-${to}`}
                        points={points}
                        color={isTraversed ? "#22c55e" : "#475569"}
                        lineWidth={isTraversed ? 2.5 : 1.2}
                        transparent
                        opacity={isTraversed ? 1.0 : 0.5}
                    />
                );
            })}

            {/* Nodes */}
            {nodeIds.map((id) => {
                const pos = layout.get(id);
                if (!pos) return null;

                let nodeColor = "#f8fafc";
                let emissive = "#cbd5e1";
                const isHovered = hoveredNode === id;

                if (id === currentStr) {
                    nodeColor = "#ffedd5";
                    emissive = "#f97316";
                } else if (visitedSet.has(id)) {
                    nodeColor = "#dcfce7";
                    emissive = "#22c55e";
                } else if (queueSet.has(id)) {
                    nodeColor = "#dbeafe";
                    emissive = "#3b82f6";
                } else if (isHovered) {
                    nodeColor = "#ffffff";
                    emissive = "#e2e8f0";
                }

                // Add slight bobbing and physical pop on hover
                const zHover = isHovered ? 0.3 : 0;
                const scale = isHovered ? 1.15 : 1.0;

                return (
                    <DraggableGroup
                        key={id}
                        initialPosition={[pos.x, pos.y, zHover]}
                        onDrag={(dx, dy) => setDragOffsets(prev => ({ ...prev, [id]: { x: dx, y: dy } }))}
                    >
                        <group
                            scale={scale}
                            onPointerOver={(e) => { e.stopPropagation(); setHoveredNode(id); document.body.style.cursor = 'pointer'; }}
                            onPointerOut={(e) => { e.stopPropagation(); setHoveredNode(null); document.body.style.cursor = 'auto'; }}
                        >
                            <mesh castShadow receiveShadow>
                                <sphereGeometry args={[0.4, 24, 24]} />
                                <meshPhysicalMaterial
                                    color={nodeColor}
                                    roughness={0.15}
                                    transmission={0.0}
                                    thickness={0.5}
                                    clearcoat={0.2}
                                />
                            </mesh>
                            <Text
                                position={[0, 0, 0.45]}
                                fontSize={0.32}
                                color="#302a1e"
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.015}
                                outlineColor="#fcfbf9"
                            >
                                {id}
                            </Text>

                            {/* Glassmorphic Tooltip on Hover */}
                            {isHovered && (
                                <Html position={[0, 0.7, 0]} center zIndexRange={[100, 0]}>
                                    <div className="bg-cream-100/80 backdrop-blur-md border border-cream-200/50 shadow-lg px-3 py-2 rounded-xl text-xs font-mono text-cream-900 pointer-events-none whitespace-nowrap flex flex-col items-center animate-fade-in-up">
                                        <span className="text-[10px] text-cream-500 font-sans uppercase tracking-wider mb-0.5">Node</span>
                                        <span className="font-bold text-sm">{id}</span>
                                    </div>
                                </Html>
                            )}
                        </group>
                    </DraggableGroup>
                );
            })}
        </group>
    );
}

/** Structured Hierarchical Graph Visualization (e.g. Tries) */
function StructuredGraph3D({
    graph,
    visited,
    queue,
    current,
    xOffset,
    zOffset,
}: {
    graph: StructuredGraphData;
    visited: unknown[];
    queue: unknown[];
    current: unknown;
    xOffset: number;
    zOffset: number;
}) {
    const visitedSet = useMemo(() => {
        if (Array.isArray(visited)) return new Set(visited.map(String));
        if (visited && typeof visited === 'object') return new Set(Object.keys(visited).map(String));
        return new Set<string>();
    }, [visited]);
    const queueSet = useMemo(() => {
        if (Array.isArray(queue)) return new Set(queue.map(String));
        if (queue && typeof queue === 'object') return new Set(Object.keys(queue).map(String));
        return new Set<string>();
    }, [queue]);
    const currentStr = current !== undefined ? String(current) : null;

    const { layout, edges, nodes: nodeIds } = useHierarchicalGraphLayout(graph, 3, 3.5);

    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});

    // ── Generate curved edge points ──
    const getEdgePoints = (fromId: string, toId: string, type?: string) => {
        const fromBase = layout.get(fromId);
        const toBase = layout.get(toId);
        if (!fromBase || !toBase) return null;

        const dFrom = dragOffsets[fromId] || { x: 0, y: 0 };
        const dTo = dragOffsets[toId] || { x: 0, y: 0 };

        const fromPos = { x: fromBase.x + dFrom.x, y: fromBase.y + dFrom.y };
        const toPos = { x: toBase.x + dTo.x, y: toBase.y + dTo.y };

        const NODE_RADIUS = 0.45;
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) return null;

        const ux = dx / dist;
        const uy = dy / dist;

        const startX = fromPos.x + ux * NODE_RADIUS;
        const startY = fromPos.y + uy * NODE_RADIUS;
        const endX = toPos.x - ux * NODE_RADIUS;
        const endY = toPos.y - uy * NODE_RADIUS;

        // If it's a structural tree edge, draw an almost straight line with subtle bezier.
        // If it's a fail edge, draw a wider sweeping curve.
        const isFail = type === "fail";
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;

        const perpX = -uy;
        const curvature = isFail ? Math.min(dist * 0.4, 3) : Math.min(dist * 0.05, 0.5);
        const sign = startX < endX ? 1 : -1;

        // For fail links, arch outwards.
        const ctrlX = midX + (isFail ? curvature * sign : ux * curvature);
        const ctrlY = midY + (isFail ? curvature : 0);

        const SEGMENTS = isFail ? 20 : 10;
        const points: [number, number, number][] = [];
        for (let i = 0; i <= SEGMENTS; i++) {
            const t = i / SEGMENTS;
            const oneMinusT = 1 - t;
            const px = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * ctrlX + t * t * endX;
            const py = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * ctrlY + t * t * endY;
            points.push([px, py, 0]);
        }

        // Point exactly halfway along the curve for placing label
        const tMid = 0.5;
        const oneMinusTMid = 0.5;
        const labelX = oneMinusTMid * oneMinusTMid * startX + 2 * oneMinusTMid * tMid * ctrlX + tMid * tMid * endX;
        const labelY = oneMinusTMid * oneMinusTMid * startY + 2 * oneMinusTMid * tMid * ctrlY + tMid * tMid * endY;

        return { points, labelPos: [labelX, labelY, 0.1] as [number, number, number] };
    };

    return (
        <group position={[xOffset, 0, zOffset]}>
            {/* Edges */}
            {edges.map(({ from, to, label, type }: { from: string, to: string, label?: string, type?: string }, idx: number) => {
                const edgeData = getEdgePoints(from, to, type);
                if (!edgeData) return null;
                const { points, labelPos } = edgeData;

                const isFail = type === "fail";
                const isTraversed = visitedSet.has(from) && visitedSet.has(to);

                let edgeColor = isTraversed ? "#22c55e" : "#475569";
                if (isFail) edgeColor = "#f43f5e"; // Rose color for fail links

                return (
                    <group key={`edge-${from}-${to}-${idx}`}>
                        <Line
                            points={points}
                            color={edgeColor}
                            lineWidth={isTraversed ? 2.5 : isFail ? 1.5 : 1.2}
                            transparent
                            opacity={isFail ? 0.35 : (isTraversed ? 1.0 : 0.6)}
                            dashed={isFail}
                            dashScale={0.1}
                        />
                        {/* Edge Label (e.g., character in Trie) */}
                        {label && !isFail && (
                            <Text
                                position={labelPos}
                                fontSize={0.25}
                                color="#e2e8f0"
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.03}
                                outlineColor="#000000"
                            >
                                {label}
                            </Text>
                        )}
                    </group>
                );
            })}

            {/* Nodes */}
            {nodeIds.map((id: string) => {
                const pos = layout.get(id);
                if (!pos) return null;

                let nodeColor = "#f8fafc";
                let emissive = "#cbd5e1";
                const isHovered = hoveredNode === id;

                if (id === currentStr) {
                    nodeColor = "#ffedd5";
                    emissive = "#f97316";
                } else if (visitedSet.has(id)) {
                    nodeColor = "#dcfce7";
                    emissive = "#22c55e";
                } else if (queueSet.has(id)) {
                    nodeColor = "#dbeafe";
                    emissive = "#3b82f6";
                } else if (isHovered) {
                    nodeColor = "#ffffff";
                    emissive = "#e2e8f0";
                }

                const zHover = isHovered ? 0.3 : 0;
                const scale = isHovered ? 1.15 : 1.0;

                return (
                    <DraggableGroup
                        key={id}
                        initialPosition={[pos.x, pos.y, zHover]}
                        onDrag={(dx, dy) => setDragOffsets(prev => ({ ...prev, [id]: { x: dx, y: dy } }))}
                    >
                        <group
                            scale={scale}
                            onPointerOver={(e) => { e.stopPropagation(); setHoveredNode(id); document.body.style.cursor = 'pointer'; }}
                            onPointerOut={(e) => { e.stopPropagation(); setHoveredNode(null); document.body.style.cursor = 'auto'; }}
                        >
                            <mesh castShadow receiveShadow>
                                <sphereGeometry args={[0.4, 24, 24]} />
                                <meshPhysicalMaterial
                                    color={nodeColor}
                                    roughness={0.15}
                                    transmission={0.0}
                                    thickness={0.5}
                                    clearcoat={0.2}
                                />
                            </mesh>
                            <Text
                                position={[0, 0, 0.45]}
                                fontSize={0.32}
                                color="#302a1e"
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.015}
                                outlineColor="#fcfbf9"
                            >
                                {graph.nodes[id]?.label || id}
                            </Text>
                        </group>
                    </DraggableGroup>
                );
            })}
        </group>
    );
}

// ─── 3D Bitmask Visualization ────────────────────────────────

const BITMASK_3D_TILE = 0.8;
const BITMASK_3D_GAP = 0.12;

const BITMASK_3D_COLORS: Record<string, string> = {
    cols: '#ef4444',
    ld: '#f97316',
    rd: '#eab308',
    pos: '#22c55e',
    p: '#3b82f6',
    mask: '#8b5cf6',
    used: '#ef4444',
    queen: '#3b82f6',
};

function getBitmask3DColor(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, color] of Object.entries(BITMASK_3D_COLORS)) {
        if (lower.includes(key)) return color;
    }
    return '#6b7280';
}

/** Detect bit-width from scope */
function detectBitWidth3D(stack: Record<string, unknown>): number | null {
    const ub = stack['upper_bound'] ?? stack['upperBound'] ?? stack['all_ones'];
    const n = stack['n'] ?? stack['N'] ?? stack['num_bits'] ?? stack['size'];
    if (typeof ub === 'number' && ub > 0) {
        const w = Math.round(Math.log2(ub + 1));
        if ((1 << w) - 1 === ub && w >= 2 && w <= 32) return w;
    }
    if (typeof n === 'number' && n >= 2 && n <= 32 && Number.isInteger(n)) return n;
    return null;
}

const BITMASK_SKIP_NAMES = new Set(['n', 'N', 'count', 'upper_bound', 'row', 'num_bits', 'size', 'upper_bound']);
const BITMASK_KNOWN_NAMES = new Set([
    'cols', 'ld', 'rd', 'pos', 'p', 'mask', 'bits', 'used',
    'diag1', 'diag2', 'col_mask', 'row_mask', 'avail', 'available', 'blocked', 'queen',
]);

/** One row of 3D bit tiles for a single bitmask variable */
function BitMaskStrip3D({
    name,
    value,
    bitWidth,
    yPos,
    prevValue,
}: {
    name: string;
    value: number;
    bitWidth: number;
    yPos: number;
    prevValue?: unknown;
}) {
    const color = getBitmask3DColor(name);
    const stride = BITMASK_3D_TILE + BITMASK_3D_GAP;
    const totalWidth = bitWidth * stride;
    const changed = prevValue !== undefined && prevValue !== value;

    return (
        <group position={[0, yPos, 0]}>
            {/* Label */}
            <Text
                position={[-totalWidth / 2 - 0.8, 0, 0.05]}
                fontSize={0.28}
                color={changed ? '#16a34a' : color}
                anchorX="right"
                anchorY="middle"
                fontWeight={700}
            >
                {name}
            </Text>

            {/* Bit tiles */}
            {Array.from({ length: bitWidth }, (_, i) => {
                const bitIdx = bitWidth - 1 - i;
                const isSet = ((value >> bitIdx) & 1) === 1;
                const x = (i - (bitWidth - 1) / 2) * stride;

                return (
                    <group key={i} position={[x, 0, 0]}>
                        <RoundedBox
                            args={[BITMASK_3D_TILE, BITMASK_3D_TILE, 0.15]}
                            radius={0.06}
                            smoothness={2}
                        >
                            <meshStandardMaterial
                                color={isSet ? color : '#e8e5de'}
                                transparent
                                opacity={isSet ? 0.85 : 0.4}
                            />
                        </RoundedBox>
                        <Text
                            position={[0, 0, 0.1]}
                            fontSize={0.3}
                            color={isSet ? '#ffffff' : '#bbb5a8'}
                            anchorX="center"
                            anchorY="middle"
                            fontWeight={700}
                        >
                            {isSet ? '1' : '0'}
                        </Text>
                    </group>
                );
            })}

            {/* Decimal value */}
            <Text
                position={[totalWidth / 2 + 0.6, 0, 0.05]}
                fontSize={0.22}
                color="#a8967f"
                anchorX="left"
                anchorY="middle"
            >
                = {value}
            </Text>
        </group>
    );
}

/** Combined NxN board for current row — 3D version */
function BitMaskBoard3D({
    row,
    bitWidth,
    cols,
    ld,
    rd,
    pos,
    p,
    yPos,
}: {
    row: number;
    bitWidth: number;
    cols: number;
    ld: number;
    rd: number;
    pos: number;
    p: number;
    yPos: number;
}) {
    const stride = BITMASK_3D_TILE + BITMASK_3D_GAP;

    return (
        <group position={[0, yPos, 0]}>
            {/* Label */}
            <Text
                position={[0, 0.7, 0.05]}
                fontSize={0.22}
                color="#a8967f"
                anchorX="center"
                anchorY="middle"
            >
                Board Row {row}
            </Text>

            {Array.from({ length: bitWidth }, (_, i) => {
                const bitIdx = bitWidth - 1 - i;
                const isCol = (cols >> bitIdx) & 1;
                const isLD = (ld >> bitIdx) & 1;
                const isRD = (rd >> bitIdx) & 1;
                const isBlocked = isCol || isLD || isRD;
                const isPos = (pos >> bitIdx) & 1;
                const isPick = (p >> bitIdx) & 1;
                const x = (i - (bitWidth - 1) / 2) * stride;

                let tileColor = '#e8e5de';
                let label = '';
                let labelColor = '#999';

                if (isPick) {
                    tileColor = '#3b82f6'; label = '♛'; labelColor = '#ffffff';
                } else if (isPos && !isBlocked) {
                    tileColor = '#22c55e'; label = '✓'; labelColor = '#ffffff';
                } else if (isCol) {
                    tileColor = '#ef4444'; label = '×'; labelColor = '#ffffff';
                } else if (isLD) {
                    tileColor = '#f97316'; label = '╲'; labelColor = '#ffffff';
                } else if (isRD) {
                    tileColor = '#eab308'; label = '╱'; labelColor = '#ffffff';
                }

                return (
                    <group key={i} position={[x, 0, 0]}>
                        <RoundedBox
                            args={[BITMASK_3D_TILE, BITMASK_3D_TILE, 0.2]}
                            radius={0.06}
                            smoothness={2}
                        >
                            <meshStandardMaterial
                                color={tileColor}
                                transparent
                                opacity={isPick || isBlocked || isPos ? 0.9 : 0.3}
                            />
                        </RoundedBox>
                        {label && (
                            <Text
                                position={[0, 0, 0.15]}
                                fontSize={isPick ? 0.4 : 0.28}
                                color={labelColor}
                                anchorX="center"
                                anchorY="middle"
                                fontWeight={700}
                            >
                                {label}
                            </Text>
                        )}
                    </group>
                );
            })}
        </group>
    );
}

// ─── Main Universal 3D Component ─────────────────────────────

interface UniversalScene3DProps {
    step: TraceStep;
    prevStep: TraceStep | null;
    vizCtx: VizContext;
}

export function UniversalScene3D({ step, prevStep, vizCtx }: UniversalScene3DProps) {
    const sortedVars = useMemo(() => getSortedVariables(step, vizCtx), [step, vizCtx]);

    // Build pointer map for primary array
    const pointerMap = useMemo(() => {
        const pointers: Array<{ name: string; index: number; color: string }> = [];
        let colorIdx = 0;
        for (const v of sortedVars) {
            if (v.type !== "scalar") continue;
            const val = v.value;
            if (typeof val !== "number" || !Number.isInteger(val) || val < 0) continue;
            const primaryArr = vizCtx.primaryVar ? step.stack[vizCtx.primaryVar] : null;
            if (Array.isArray(primaryArr) && val < primaryArr.length) {
                const isLikelyPointer = vizCtx.pointerVars.includes(v.name) ||
                    /^(i|j|k|l|r|m|idx|index|left|right|low|high|mid|start|end|top|bottom|cur|ptr|head|tail|lo|hi|cut\d?)$/i.test(v.name);
                if (isLikelyPointer) {
                    pointers.push({ name: v.name, index: val, color: POINTER_COLORS[colorIdx++ % POINTER_COLORS.length] });
                }
            }
        }
        return pointers;
    }, [sortedVars, vizCtx, step]);

    // Separate variables — classify arrays into stacks, queues, plain arrays, and linked lists
    const plainArrays: Array<{ name: string; value: unknown[] }> = [];
    const stacks: Array<{ name: string; value: unknown[] }> = [];
    const queues: Array<{ name: string; value: unknown[] }> = [];
    const linkedLists: Array<{ name: string; values: unknown[] }> = [];
    const grids: Array<{ name: string; value: unknown[][] }> = [];
    const dicts: Array<{ name: string; value: Record<string, unknown> }> = [];
    const adjLists: Array<{ name: string; value: Record<string, number[]> }> = [];
    const structuredGraphs: Array<{ name: string; value: StructuredGraphData }> = [];
    const scalars: Array<{ name: string; value: unknown }> = [];

    for (const v of sortedVars) {
        if (v.type === "array") {
            if (is2DGrid(v.value)) {
                grids.push({ name: v.name, value: v.value as unknown[][] });
            } else {
                const dsType = classifyDSType(v.name);
                if (dsType === "stack") {
                    stacks.push({ name: v.name, value: v.value as unknown[] });
                } else if (dsType === "queue") {
                    queues.push({ name: v.name, value: v.value as unknown[] });
                } else {
                    plainArrays.push({ name: v.name, value: v.value as unknown[] });
                }
            }
        } else if (v.type === "dict") {
            if (isLinkedListValue(v.value)) {
                linkedLists.push({ name: v.name, values: (v.value as { __type__: string; values: unknown[] }).values });
            } else if (isAdjList(v.value)) {
                if ((v.value as any).__type__ === "structured_graph") {
                    structuredGraphs.push({ name: v.name, value: v.value as StructuredGraphData });
                } else {
                    adjLists.push({ name: v.name, value: v.value as Record<string, number[]> });
                }
            } else {
                dicts.push({ name: v.name, value: v.value as Record<string, unknown> });
            }
        } else if (v.type === "scalar") {
            scalars.push({ name: v.name, value: v.value });
        }
    }

    // ─── Bitmask Detection ───
    const bitWidth = detectBitWidth3D(step.stack);
    const bitmaskVars: Array<{ name: string; value: number }> = [];
    if (bitWidth) {
        const maxVal = (1 << bitWidth) - 1;
        // Extract bitmask variables from scalars
        for (const s of scalars) {
            if (typeof s.value !== 'number' || !Number.isInteger(s.value as number) || (s.value as number) < 0) continue;
            if (BITMASK_SKIP_NAMES.has(s.name)) continue;
            const isKnown = BITMASK_KNOWN_NAMES.has(s.name.toLowerCase());
            const fits = (s.value as number) <= maxVal;
            if (isKnown || fits) {
                bitmaskVars.push({ name: s.name, value: s.value as number });
            }
        }
        // Filter out arrays whose items are tuples/binstrings (noise like state_history)
        for (let i = plainArrays.length - 1; i >= 0; i--) {
            const arr = plainArrays[i].value;
            if (arr.length > 0 && Array.isArray(arr[0])) {
                // Array of tuples — remove from display
                plainArrays.splice(i, 1);
            }
        }
    }
    const hasBitmaskContext = bitWidth !== null && bitmaskVars.length > 0;

    // For backward compat: combine all array-like for layout sizing
    const allArrayLike = [...plainArrays, ...stacks, ...queues];

    // ─── Layout Strategy ───

    const pointedIndices = useMemo(() => {
        const s = new Set<number>();
        for (const p of pointerMap) s.add(p.index);
        return s;
    }, [pointerMap]);

    // Calculate column widths for side-by-side layout
    const maxArrayWidth = allArrayLike.length > 0
        ? Math.max(...allArrayLike.map(a => (a.value as unknown[]).length * BAR_SPACING))
        : 0;

    // ─── COMPACT CENTERED DASHBOARD LAYOUT ───
    // Left column (X=0): arrays, stacks, queues, linked lists
    // Middle column (RIGHT_COL_X): grids, dicts
    // Far right (GRAPH_X_OFFSET): graphs — placed BEYOND the middle column
    // Top center: scalars

    const ITEM_SPACING = 4;
    // Right column offset: past the array width + gap
    const RIGHT_COL_X = maxArrayWidth / 2 + 5;
    // Estimate right column width (for grid/dict sizing)
    const maxGridWidth = grids.length > 0
        ? Math.max(...grids.map(g => ((g.value[0] as unknown[])?.length || 1) * (GRID_TILE + GRID_GAP)))
        : 0;
    const maxDictWidth = dicts.length > 0 ? 6 : 0; // dicts are typically ~6 units wide
    const rightColWidth = Math.max(maxGridWidth, maxDictWidth, 0);

    // Graphs go BEYOND both columns
    const hasGraphs = adjLists.length > 0;
    const hasRightCol = grids.length > 0 || dicts.length > 0;
    const GRAPH_X_OFFSET = hasGraphs
        ? (hasRightCol ? RIGHT_COL_X + rightColWidth + 6 : maxArrayWidth / 2 + 8)
        : 0;

    // Left column — arrays, stacks, queues, linked lists
    let leftY = 1;
    const plainArrayYPositions = plainArrays.map((arr) => {
        const y = leftY;
        const maxVal = Math.max(1, ...(arr.value as unknown[]).map(v => typeof v === 'number' ? Math.abs(v) : 1));
        leftY += Math.min(ITEM_SPACING + (maxVal > 5 ? 1 : 0), 6);
        return y;
    });
    const stackYPositions = stacks.map((s) => {
        const y = leftY;
        leftY += Math.min(ITEM_SPACING, (s.value as unknown[]).length * 0.6 + 2);
        return y;
    });
    const queueYPositions = queues.map(() => {
        const y = leftY;
        leftY += ITEM_SPACING;
        return y;
    });
    const linkedListYPositions = linkedLists.map(() => {
        const y = leftY;
        leftY += ITEM_SPACING;
        return y;
    });

    // Right column — grids, dicts (offset on X axis)
    let rightY = 1;
    const gridYPositions = grids.map((grid) => {
        const totalRows = grid.value.length;
        const gridHeight = totalRows * (GRID_TILE + GRID_GAP) + 3;
        const y = rightY;
        rightY += gridHeight;
        return y;
    });

    const dictYPositions = dicts.map((d) => {
        const numEntries = Math.min(Object.keys(d.value).length, 20);
        const rows = Math.ceil(numEntries / 6) || 1;
        const dictHeight = rows * 1.5 + 3;
        const y = rightY;
        rightY += dictHeight;
        return y;
    });

    // Scalars at the top, centered — positioned just above the tallest column
    const tallestColumn = Math.max(leftY, rightY);
    const scalarYTop = tallestColumn + 1;



    return (
        <group>
            {/* ─── Scalars at the top ─── */}
            {scalars.length > 0 && (
                <DraggableGroup persistKey="drag_scalars" initialPosition={[0, 0, 0]}>
                    {scalars.map((s, idx) => {
                        const isChanged = prevStep ? JSON.stringify(prevStep.stack[s.name]) !== JSON.stringify(s.value) : false;
                        const xSpacing = 2.5;
                        const xPos = (idx - (scalars.length - 1) / 2) * xSpacing;
                        return (
                            <ScalarBadge3D
                                key={s.name}
                                name={s.name}
                                value={s.value}
                                xPos={xPos}
                                yPos={scalarYTop}
                                isChanged={isChanged}
                            />
                        );
                    })}
                </DraggableGroup>
            )}

            {/* ─── 3D Bitmask Visualization ─── */}
            {hasBitmaskContext && bitWidth && (
                <DraggableGroup persistKey="drag_bitmask" initialPosition={[0, 0, 0]}>
                    {/* Title */}
                    <Text
                        position={[0, scalarYTop - 0.5, 0.05]}
                        fontSize={0.28}
                        color="#a8967f"
                        anchorX="center"
                        anchorY="middle"
                    >
                        Bitmask State ({bitWidth}-bit)
                    </Text>

                    {/* Bit strips for each variable */}
                    {bitmaskVars.map((mv, idx) => (
                        <BitMaskStrip3D
                            key={mv.name}
                            name={mv.name}
                            value={mv.value}
                            bitWidth={bitWidth}
                            yPos={scalarYTop - 1.5 - idx * 1.1}
                            prevValue={prevStep?.stack[mv.name]}
                        />
                    ))}

                    {/* Board overlay */}
                    {typeof step.stack['row'] === 'number' && bitmaskVars.some(v => v.name === 'cols') && (
                        <BitMaskBoard3D
                            row={step.stack['row'] as number}
                            bitWidth={bitWidth}
                            cols={(bitmaskVars.find(v => v.name === 'cols')?.value ?? 0)}
                            ld={(bitmaskVars.find(v => v.name === 'ld')?.value ?? 0)}
                            rd={(bitmaskVars.find(v => v.name === 'rd')?.value ?? 0)}
                            pos={(bitmaskVars.find(v => v.name === 'pos')?.value ?? 0)}
                            p={(bitmaskVars.find(v => v.name === 'p')?.value ?? 0)}
                            yPos={scalarYTop - 1.5 - bitmaskVars.length * 1.1 - 1.2}
                        />
                    )}
                </DraggableGroup>
            )}

            {/* ─── Plain Arrays — bar chart style (blue) ─── */}
            {plainArrays.map((arr, arrIdx) => {
                const isPrimary = arr.name === vizCtx.primaryVar;
                const yPos = plainArrayYPositions[arrIdx];
                const n = arr.value.length;
                const xCenter = (n * BAR_SPACING) / 2 - BAR_SPACING / 2;

                return (
                    <DraggableGroup key={arr.name} persistKey={`drag_arr_${arr.name}`} initialPosition={[0, yPos, 0]}>
                        <Text
                            position={[0, 2.8, 0]}
                            fontSize={0.38}
                            color={isPrimary ? "#60a5fa" : "#a78bfa"}
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.02}
                            outlineColor="#fcfbf9"
                            fontWeight="bold"
                        >
                            {arr.name} [{n}]
                        </Text>

                        {arr.value.map((val, idx) => {
                            const isChanged = prevStep
                                ? JSON.stringify(
                                    (prevStep.stack[arr.name] as unknown[])?.[idx]
                                ) !== JSON.stringify(val)
                                : false;
                            const isPointed = isPrimary && pointedIndices.has(idx);

                            return (
                                <Bar3D
                                    key={idx}
                                    value={val}
                                    index={idx}
                                    xPos={idx * BAR_SPACING - xCenter}
                                    zPos={0}
                                    isPointed={isPointed}
                                    isChanged={isChanged}
                                    color={isPrimary ? "#3b82f6" : "#6366f1"}
                                />
                            );
                        })}

                        {isPrimary &&
                            pointerMap.map((p) => (
                                <Pointer3D
                                    key={p.name}
                                    label={p.name}
                                    targetX={p.index * BAR_SPACING - xCenter}
                                    zPos={0}
                                    color={p.color}
                                />
                            ))}
                    </DraggableGroup>
                );
            })}

            {/* ─── Stacks — vertical column (teal) ─── */}
            {stacks.map((s, idx) => {
                const prevArr = prevStep
                    ? (prevStep.stack[s.name] as unknown[] | undefined) ?? null
                    : null;
                return (
                    <DraggableGroup key={s.name} persistKey={`drag_stack_${s.name}`} initialPosition={[0, 0, 0]}>
                        <Stack3D
                            name={s.name}
                            items={s.value}
                            yPos={stackYPositions[idx]}
                            prevItems={prevArr}
                        />
                    </DraggableGroup>
                );
            })}

            {/* ─── Queues — horizontal conveyor (amber) ─── */}
            {queues.map((q, idx) => {
                const prevArr = prevStep
                    ? (prevStep.stack[q.name] as unknown[] | undefined) ?? null
                    : null;
                return (
                    <DraggableGroup key={q.name} persistKey={`drag_queue_${q.name}`} initialPosition={[0, 0, 0]}>
                        <Queue3D
                            name={q.name}
                            items={q.value}
                            yPos={queueYPositions[idx]}
                            prevItems={prevArr}
                        />
                    </DraggableGroup>
                );
            })}

            {/* ─── Linked Lists — horizontal chain (emerald) ─── */}
            {linkedLists.map((ll, idx) => (
                <DraggableGroup key={ll.name} persistKey={`drag_ll_${ll.name}`} initialPosition={[0, 0, 0]}>
                    <LinkedListView3D
                        name={ll.name}
                        values={ll.values}
                        yPos={linkedListYPositions[idx]}
                    />
                </DraggableGroup>
            ))}

            {/* ─── 2D Grids (DP tables, boards) ─── */}
            {grids.map((grid, gridIdx) => {
                const totalRows = grid.value.length;
                const totalCols = (grid.value[0] as unknown[])?.length || 0;
                // Place grids dynamically
                const yBase = gridYPositions[gridIdx];

                const iVal = step.stack.i as number | undefined;
                const jVal = step.stack.j as number | undefined;
                const wVal = step.stack.w as number | undefined;

                return (
                    <DraggableGroup key={grid.name} persistKey={`drag_grid_${grid.name}`} initialPosition={[hasRightCol ? RIGHT_COL_X : 0, yBase, 0]}>
                        <Text
                            position={[0, totalRows * (GRID_TILE + GRID_GAP) / 2 + 0.5, 0]}
                            fontSize={0.32}
                            color="#38bdf8"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.015}
                            outlineColor="#fcfbf9"
                        >
                            {grid.name} [{totalRows}×{totalCols}]
                        </Text>
                        {grid.value.map((row, r) =>
                            (row as unknown[]).map((cellVal, c) => {
                                const isPointed = (iVal !== undefined && r === iVal && ((wVal !== undefined && c === wVal) || (jVal !== undefined && c === jVal)));
                                const isChanged = prevStep
                                    ? JSON.stringify(
                                        ((prevStep.stack[grid.name] as unknown[][])?.[r] as unknown[])?.[c]
                                    ) !== JSON.stringify(cellVal)
                                    : false;

                                return (
                                    <GridTile3D
                                        key={`${r}-${c}`}
                                        value={cellVal}
                                        row={r}
                                        col={c}
                                        isPointed={isPointed}
                                        isChanged={isChanged}
                                        totalRows={totalRows}
                                        totalCols={totalCols}
                                    />
                                );
                            })
                        )}
                    </DraggableGroup>
                );
            })}

            {/* ─── Graph (adjacency list) — placed to the right of arrays ─── */}
            {adjLists.map((g, idx) => {
                const rawVisited = step.stack.visited;
                const visited = Array.isArray(rawVisited)
                    ? rawVisited
                    : rawVisited && typeof rawVisited === 'object'
                        ? Object.keys(rawVisited)
                        : [];
                const rawQueue = step.stack.queue;
                const queue = Array.isArray(rawQueue)
                    ? rawQueue
                    : rawQueue && typeof rawQueue === 'object'
                        ? Object.keys(rawQueue)
                        : [];
                const current = step.stack.current ?? step.stack.node ?? step.stack.curr;

                // Spread multiple graphs along X axis
                const graphSpacing = 15;
                const xPos = GRAPH_X_OFFSET + idx * graphSpacing;

                return (
                    <DraggableGroup key={g.name} persistKey={`drag_graph_${g.name}`} initialPosition={[xPos, 3, 0]}>
                        <GraphView3D
                            adj={g.value}
                            visited={visited}
                            queue={queue}
                            current={current}
                            xOffset={0}
                            zOffset={0}
                        />
                    </DraggableGroup>
                );
            })}

            {/* ─── Structured Graphs (Tries, custom hierarchical objects) ─── */}
            {structuredGraphs.map((g, idx) => {
                const rawVisited = step.stack.visited;
                const visited = Array.isArray(rawVisited) ? rawVisited : rawVisited && typeof rawVisited === 'object' ? Object.keys(rawVisited) : [];
                const rawQueue = step.stack.queue;
                const queue = Array.isArray(rawQueue) ? rawQueue : rawQueue && typeof rawQueue === 'object' ? Object.keys(rawQueue) : [];
                const current = step.stack.current ?? step.stack.node ?? step.stack.curr;

                // Spread multiple graphs along X axis
                const graphSpacing = 20;
                const xPos = GRAPH_X_OFFSET + (adjLists.length + idx) * graphSpacing;

                return (
                    <DraggableGroup key={g.name} persistKey={`drag_struct_graph_${g.name}`} initialPosition={[xPos, 5, 0]}>
                        {/* Label */}
                        <Text position={[0, 2, 0]} fontSize={0.35} color="#cbd5e1" anchorX="center">
                            {g.name} (Trie)
                        </Text>
                        <SceneErrorBoundary>
                            <StructuredGraph3D
                                graph={g.value}
                                visited={visited}
                                queue={queue}
                                current={current}
                                xOffset={0}
                                zOffset={0}
                            />
                        </SceneErrorBoundary>
                    </DraggableGroup>
                );
            })}

            {/* ─── Dictionaries (non-graph) ─── */}
            {dicts.map((d, idx) => {
                const yBase = dictYPositions[idx];
                return (
                    <DraggableGroup key={d.name} persistKey={`drag_dict_${d.name}`} initialPosition={[hasRightCol ? RIGHT_COL_X : 0, yBase, 0]}>
                        <DictView3D
                            name={d.name}
                            data={d.value}
                            xOffset={0}
                            zOffset={0}
                        />
                    </DraggableGroup>
                );
            })}
        </group>
    );
}
