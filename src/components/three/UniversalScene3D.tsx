"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, RoundedBox, Line } from "@react-three/drei";
import * as THREE from "three";
import { TraceStep } from "@/lib/interpreter/schema";
import { VizContext } from "@/lib/vizDetector";

// ─── Configuration ───────────────────────────────────────────
const BAR_SPACING = 1.4;
const BAR_DEPTH = 0.8;
const GRID_TILE = 0.9;
const GRID_GAP = 0.1;
const GRAPH_SCALE = 2.2;

// ─── DraggableGroup ─ wraps children in a draggable 3D group ─
function DraggableGroup({
    children,
    initialPosition = [0, 0, 0],
}: {
    children: React.ReactNode;
    initialPosition?: [number, number, number];
}) {
    const groupRef = useRef<THREE.Group>(null);
    const { camera, gl } = useThree();
    const [offset, setOffset] = useState<[number, number, number]>([0, 0, 0]);
    const dragState = useRef<{
        active: boolean;
        startMouse: THREE.Vector2;
        startOffset: [number, number, number];
    }>({ active: false, startMouse: new THREE.Vector2(), startOffset: [0, 0, 0] });

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePointerDown = useCallback((e: any) => {
        const ne = e.nativeEvent as PointerEvent;
        if (ne && ne.button !== 0) return;
        e.stopPropagation();

        const point = getWorldPoint(ne.clientX, ne.clientY);
        dragState.current = {
            active: true,
            startMouse: new THREE.Vector2(point.x, point.y),
            startOffset: [...offset],
        };
        gl.domElement.style.cursor = "grabbing";
        gl.domElement.setPointerCapture(ne.pointerId);
    }, [getWorldPoint, offset, gl]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePointerMove = useCallback((e: any) => {
        if (!dragState.current.active) return;
        const ne = e.nativeEvent as PointerEvent;
        const point = getWorldPoint(ne.clientX, ne.clientY);
        const dx = point.x - dragState.current.startMouse.x;
        const dy = point.y - dragState.current.startMouse.y;
        setOffset([
            dragState.current.startOffset[0] + dx,
            dragState.current.startOffset[1] + dy,
            dragState.current.startOffset[2],
        ]);
    }, [getWorldPoint]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePointerUp = useCallback((e: any) => {
        dragState.current.active = false;
        gl.domElement.style.cursor = "auto";
        const ne = e.nativeEvent as PointerEvent;
        if (ne) gl.domElement.releasePointerCapture(ne.pointerId);
    }, [gl]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDoubleClick = useCallback((e: any) => {
        e.stopPropagation();
        setOffset([0, 0, 0]); // Reset to original position
    }, []);

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
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            onPointerOver={() => {
                if (!dragState.current.active) gl.domElement.style.cursor = "grab";
            }}
            onPointerOut={() => {
                if (!dragState.current.active) gl.domElement.style.cursor = "auto";
            }}
        >
            {children}
        </group>
    );
}
const LERP_SPEED = 5.0;

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

    const targetColor = useMemo(() => {
        if (isChanged) return new THREE.Color("#22c55e");
        if (isPointed) return new THREE.Color("#f59e0b");
        return new THREE.Color(color);
    }, [isChanged, isPointed, color]);

    const targetEmissive = useMemo(() => {
        if (isChanged) return new THREE.Color("#16a34a");
        if (isPointed) return new THREE.Color("#d97706");
        return new THREE.Color("#1e40af");
    }, [isChanged, isPointed]);

    useFrame((_, delta) => {
        elapsedRef.current += delta;
        const speed = LERP_SPEED * delta;
        currentX.current = THREE.MathUtils.lerp(currentX.current, xPos, speed);

        if (groupRef.current) {
            groupRef.current.position.x = currentX.current;
            if (isPointed) {
                groupRef.current.position.y = Math.sin(elapsedRef.current * 3) * 0.05;
            } else {
                groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, speed);
            }
        }

        if (matRef.current) {
            matRef.current.color.lerp(targetColor, speed);
            matRef.current.emissive.lerp(targetEmissive, speed);
            if (isChanged) {
                matRef.current.emissiveIntensity = Math.sin(elapsedRef.current * 4) * 0.3 + 0.7;
            } else {
                matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
                    matRef.current.emissiveIntensity, 0.3, speed
                );
            }
        }
    });

    const displayText = formatCellValue(value);

    return (
        <group ref={groupRef} position={[xPos, 0, zPos]}>
            <RoundedBox
                ref={meshRef}
                args={[1.0, barHeight, BAR_DEPTH]}
                radius={0.06}
                smoothness={4}
                position={[0, barHeight / 2, 0]}
                castShadow
            >
                <meshStandardMaterial
                    ref={matRef}
                    color={color}
                    emissive="#1e40af"
                    emissiveIntensity={0.3}
                    roughness={0.2}
                    metalness={0.8}
                />
            </RoundedBox>
            {/* Value on top */}
            <Text
                position={[0, barHeight + 0.35, 0]}
                fontSize={0.3}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.015}
                outlineColor="#020617"
            >
                {displayText}
            </Text>
            {/* Index below */}
            <Text
                position={[0, -0.25, 0]}
                fontSize={0.18}
                color="#64748b"
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
                outlineColor="#020617"
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
            <RoundedBox args={[text.length * 0.2 + 0.4, 0.45, 0.15]} radius={0.06} smoothness={3}>
                <meshStandardMaterial
                    color={isChanged ? "#052e16" : "#1e293b"}
                    emissive={isChanged ? "#22c55e" : "#334155"}
                    emissiveIntensity={isChanged ? 0.6 : 0.15}
                    roughness={0.4}
                    metalness={0.5}
                />
            </RoundedBox>
            <Text
                position={[0, 0, 0.09]}
                fontSize={0.2}
                color={isChanged ? "#4ade80" : "#e2e8f0"}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.008}
                outlineColor="#020617"
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
    const z = (row - totalRows / 2 + 0.5) * (GRID_TILE + GRID_GAP);

    const targetColor = useMemo(() => {
        if (isChanged) return new THREE.Color("#22c55e");
        if (isPointed) return new THREE.Color("#f59e0b");
        const numVal = typeof value === "number" ? value : 0;
        if (numVal === 0) return new THREE.Color("#1e293b");
        if (numVal === 1 || value === true) return new THREE.Color("#3b82f6");
        return new THREE.Color("#6366f1");
    }, [isChanged, isPointed, value]);

    useFrame((_, delta) => {
        elapsedRef.current += delta;
        const speed = LERP_SPEED * delta;
        if (matRef.current) {
            matRef.current.color.lerp(targetColor, speed);
            if (isChanged) {
                matRef.current.emissiveIntensity = Math.sin(elapsedRef.current * 4) * 0.2 + 0.5;
            } else {
                matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
                    matRef.current.emissiveIntensity, 0.2, speed
                );
            }
        }
    });

    const tileHeight = isPointed ? 0.3 : 0.12;
    const displayText = formatCellValue(value);

    return (
        <group position={[x, 0, z]}>
            <RoundedBox args={[GRID_TILE, tileHeight, GRID_TILE]} radius={0.04} smoothness={3}>
                <meshStandardMaterial
                    ref={matRef}
                    color="#1e293b"
                    emissive="#334155"
                    emissiveIntensity={0.2}
                    roughness={0.3}
                    metalness={0.7}
                />
            </RoundedBox>
            <Text
                position={[0, tileHeight / 2 + 0.12, 0]}
                rotation={[-Math.PI / 4, 0, 0]}
                fontSize={0.22}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.008}
                outlineColor="#020617"
            >
                {displayText}
            </Text>
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
                outlineColor="#020617"
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
                            radius={0.06}
                            smoothness={3}
                        >
                            <meshStandardMaterial
                                color="#1e293b"
                                emissive="#334155"
                                emissiveIntensity={0.15}
                                roughness={0.4}
                                metalness={0.5}
                            />
                        </RoundedBox>
                        <Text
                            position={[0, 0, 0.32]}
                            fontSize={0.16}
                            color="#e2e8f0"
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
    const justPopped = n < prevLen;

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
                outlineColor="#020617"
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
                            radius={0.06}
                            smoothness={4}
                            position={[0, CELL_H / 2, 0]}
                            castShadow
                        >
                            <meshStandardMaterial
                                color={isNew ? "#059669" : isTop ? "#0d9488" : "#115e59"}
                                emissive={isNew ? "#10b981" : isTop ? "#14b8a6" : "#134e4a"}
                                emissiveIntensity={isNew ? 0.8 : isTop ? 0.5 : 0.2}
                                roughness={0.2}
                                metalness={0.8}
                            />
                        </RoundedBox>
                        <Text
                            position={[0, CELL_H / 2, BAR_DEPTH / 2 + 0.02]}
                            fontSize={0.24}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#020617"
                        >
                            {displayText}
                        </Text>
                        {/* Index on the side */}
                        <Text
                            position={[-CELL_W / 2 - 0.25, CELL_H / 2, 0]}
                            fontSize={0.14}
                            color="#64748b"
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
                outlineColor="#020617"
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
                            radius={0.06}
                            smoothness={4}
                            position={[0, CELL_H / 2, 0]}
                            castShadow
                        >
                            <meshStandardMaterial
                                color={isNew ? "#ea580c" : isFront ? "#c2410c" : isBack ? "#f97316" : "#9a3412"}
                                emissive={isNew ? "#f97316" : isFront ? "#ea580c" : "#7c2d12"}
                                emissiveIntensity={isNew ? 0.8 : isFront ? 0.5 : 0.25}
                                roughness={0.2}
                                metalness={0.8}
                            />
                        </RoundedBox>
                        <Text
                            position={[0, CELL_H / 2, BAR_DEPTH / 2 + 0.02]}
                            fontSize={0.22}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#020617"
                        >
                            {displayText}
                        </Text>
                        {/* Index below */}
                        <Text
                            position={[0, -0.2, 0]}
                            fontSize={0.14}
                            color="#64748b"
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
    currentVar,
    prevVar,
}: {
    name: string;
    values: unknown[];
    yPos: number;
    currentVar?: string | null;
    prevVar?: string | null;
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
                outlineColor="#020617"
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
                            radius={0.08}
                            smoothness={4}
                            position={[0, NODE_H / 2, 0]}
                            castShadow
                        >
                            <meshStandardMaterial
                                color={isHead ? "#16a34a" : isTail ? "#15803d" : "#166534"}
                                emissive={isHead ? "#22c55e" : "#15803d"}
                                emissiveIntensity={isHead ? 0.6 : 0.25}
                                roughness={0.2}
                                metalness={0.8}
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
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#020617"
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
                            color="#64748b"
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
                        outlineColor="#020617"
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
    const nodeIds = Object.keys(adj);

    // ── Force-directed layout ──
    // Runs a spring simulation to naturally separate nodes and minimize edge crossings
    const layout = useMemo(() => {
        const n = nodeIds.length;
        if (n === 0) return new Map<string, { x: number; y: number }>();

        // Start from a wider circular arrangement as seed
        const positions: Record<string, { x: number; y: number }> = {};
        nodeIds.forEach((id, i) => {
            const angle = (2 * Math.PI * i) / n - Math.PI / 2;
            positions[id] = {
                x: Math.cos(angle) * GRAPH_SCALE * 1.2,
                y: Math.sin(angle) * GRAPH_SCALE * 1.2,
            };
        });

        // Build undirected edge set
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

        // Force simulation parameters
        const REPULSION = 8.0;
        const SPRING_K = 0.15;
        const IDEAL_LENGTH = GRAPH_SCALE * 0.9;
        const DAMPING = 0.85;
        const ITERATIONS = 200;

        for (let iter = 0; iter < ITERATIONS; iter++) {
            const forces: Record<string, { fx: number; fy: number }> = {};
            for (const id of nodeIds) {
                forces[id] = { fx: 0, fy: 0 };
            }

            // Repulsion between all node pairs (Coulomb's law)
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const a = nodeIds[i];
                    const b = nodeIds[j];
                    const dx = positions[b].x - positions[a].x;
                    const dy = positions[b].y - positions[a].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                    const force = REPULSION / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    forces[a].fx -= fx;
                    forces[a].fy -= fy;
                    forces[b].fx += fx;
                    forces[b].fy += fy;
                }
            }

            // Spring attraction along edges (Hooke's law)
            for (const [a, b] of edgeList) {
                const dx = positions[b].x - positions[a].x;
                const dy = positions[b].y - positions[a].y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                const displacement = dist - IDEAL_LENGTH;
                const force = SPRING_K * displacement;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                forces[a].fx += fx;
                forces[a].fy += fy;
                forces[b].fx -= fx;
                forces[b].fy -= fy;
            }

            // Center gravity — gently pull toward origin
            for (const id of nodeIds) {
                forces[id].fx -= positions[id].x * 0.01;
                forces[id].fy -= positions[id].y * 0.01;
            }

            // Apply forces with damping
            const cooling = 1 - iter / ITERATIONS;
            for (const id of nodeIds) {
                positions[id].x += forces[id].fx * DAMPING * cooling;
                positions[id].y += forces[id].fy * DAMPING * cooling;
            }
        }

        const result = new Map<string, { x: number; y: number }>();
        for (const id of nodeIds) {
            result.set(id, positions[id]);
        }
        return result;
    }, [nodeIds, adj]);

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

    // Deduplicated edges
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

    // Compute center of graph for edge curving direction
    const graphCenter = useMemo(() => {
        let cx = 0, cy = 0;
        layout.forEach(pos => { cx += pos.x; cy += pos.y; });
        const n = layout.size || 1;
        return { x: cx / n, y: cy / n };
    }, [layout]);

    // ── Generate curved edge points (quadratic bezier) ──
    const getEdgePoints = (fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => {
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
                const fromPos = layout.get(from);
                const toPos = layout.get(to);
                if (!fromPos || !toPos) return null;
                const points = getEdgePoints(fromPos, toPos);
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

                let nodeColor = "#475569";
                let emissive = "#1e293b";
                if (id === currentStr) {
                    nodeColor = "#f59e0b";
                    emissive = "#d97706";
                } else if (visitedSet.has(id)) {
                    nodeColor = "#22c55e";
                    emissive = "#16a34a";
                } else if (queueSet.has(id)) {
                    nodeColor = "#3b82f6";
                    emissive = "#2563eb";
                }

                return (
                    <group key={id} position={[pos.x, pos.y, 0]}>
                        <mesh castShadow>
                            <sphereGeometry args={[0.4, 24, 24]} />
                            <meshStandardMaterial
                                color={nodeColor}
                                emissive={emissive}
                                emissiveIntensity={0.5}
                                roughness={0.15}
                                metalness={0.85}
                            />
                        </mesh>
                        <Text
                            position={[0, 0, 0.45]}
                            fontSize={0.32}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.015}
                            outlineColor="#020617"
                        >
                            {id}
                        </Text>
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
            // Check for linked list first (serialized as {__type__: "linked_list", values: [...]})
            if (isLinkedListValue(v.value)) {
                linkedLists.push({ name: v.name, values: (v.value as { __type__: string; values: unknown[] }).values });
            } else if (isAdjList(v.value)) {
                adjLists.push({ name: v.name, value: v.value as Record<string, number[]> });
            } else {
                dicts.push({ name: v.name, value: v.value as Record<string, unknown> });
            }
        } else if (v.type === "scalar") {
            scalars.push({ name: v.name, value: v.value });
        }
    }

    // For backward compat: combine all array-like for layout sizing
    const allArrayLike = [...plainArrays, ...stacks, ...queues];

    // ─── Layout Strategy ───
    const ARRAY_Y_GAP = 5;
    const hasGraphs = adjLists.length > 0;

    const pointedIndices = useMemo(() => {
        const s = new Set<number>();
        for (const p of pointerMap) s.add(p.index);
        return s;
    }, [pointerMap]);

    // Each array-like structure gets a Y position going downward
    let layoutIdx = 0;
    const plainArrayYPositions = plainArrays.map(() => -(layoutIdx++) * ARRAY_Y_GAP);
    const stackYPositions = stacks.map(() => -(layoutIdx++) * ARRAY_Y_GAP);
    const queueYPositions = queues.map(() => -(layoutIdx++) * ARRAY_Y_GAP);
    const linkedListYPositions = linkedLists.map(() => -(layoutIdx++) * ARRAY_Y_GAP);

    // Place graph to the RIGHT of arrays (X-axis offset)
    const maxArrayWidth = allArrayLike.length > 0
        ? Math.max(...allArrayLike.map(a => (a.value as unknown[]).length * BAR_SPACING))
        : 0;
    const GRAPH_X_OFFSET = hasGraphs ? maxArrayWidth / 2 + 8 : 0;

    return (
        <group>
            {/* ─── Scalars at the top ─── */}
            {scalars.length > 0 && (
                <DraggableGroup initialPosition={[0, 0, 0]}>
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
                                yPos={3.5}
                                isChanged={isChanged}
                            />
                        );
                    })}
                </DraggableGroup>
            )}

            {/* ─── Plain Arrays — bar chart style (blue) ─── */}
            {plainArrays.map((arr, arrIdx) => {
                const isPrimary = arr.name === vizCtx.primaryVar;
                const yPos = plainArrayYPositions[arrIdx];
                const n = arr.value.length;
                const xCenter = (n * BAR_SPACING) / 2 - BAR_SPACING / 2;

                return (
                    <DraggableGroup key={arr.name} initialPosition={[0, yPos, 0]}>
                        <Text
                            position={[0, 2.8, 0]}
                            fontSize={0.38}
                            color={isPrimary ? "#60a5fa" : "#a78bfa"}
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.02}
                            outlineColor="#020617"
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
                    <DraggableGroup key={s.name} initialPosition={[0, 0, 0]}>
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
                    <DraggableGroup key={q.name} initialPosition={[0, 0, 0]}>
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
                <DraggableGroup key={ll.name} initialPosition={[0, 0, 0]}>
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
                const totalCols = grid.value[0]?.length || 0;
                // Place grids below all arrays
                const yBase = -(layoutIdx) * ARRAY_Y_GAP - gridIdx * (totalRows * (GRID_TILE + GRID_GAP) + 4);

                const iVal = step.stack.i as number | undefined;
                const jVal = step.stack.j as number | undefined;
                const wVal = step.stack.w as number | undefined;

                return (
                    <DraggableGroup key={grid.name} initialPosition={[0, yBase, 0]}>
                        <Text
                            position={[0, 1.2, -totalRows * (GRID_TILE + GRID_GAP) / 2 - 0.5]}
                            fontSize={0.32}
                            color="#38bdf8"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.015}
                            outlineColor="#020617"
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
            {adjLists.map((g) => {
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

                return (
                    <DraggableGroup key={g.name} initialPosition={[GRAPH_X_OFFSET, 0, 0]}>
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

            {/* ─── Dictionaries (non-graph) ─── */}
            {dicts.map((d, idx) => {
                const yBase = -(layoutIdx) * ARRAY_Y_GAP - grids.length * 6 - idx * 4;
                return (
                    <DraggableGroup key={d.name} initialPosition={[0, yBase, 0]}>
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
