"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { TraceStep } from "@/lib/interpreter/schema";
import { VizContext } from "@/lib/vizDetector";

interface GridVisualizationProps {
    step: TraceStep;
    vizCtx: VizContext;
}

type CellState = "empty" | "filled" | "current" | "path" | "blocked";

const TILE_SIZE = 0.9;
const TILE_GAP = 0.1;

const CELL_COLORS: Record<CellState, string> = {
    empty: "#1e293b",
    filled: "#22c55e",
    current: "#f59e0b",
    path: "#3b82f6",
    blocked: "#7f1d1d",
};

const CELL_EMISSIVE: Record<CellState, string> = {
    empty: "#0f172a",
    filled: "#16a34a",
    current: "#d97706",
    path: "#2563eb",
    blocked: "#450a0a",
};

/** Individual animated grid cell */
function GridCell({
    row,
    col,
    value,
    state,
    totalRows,
    totalCols,
}: {
    row: number;
    col: number;
    value: unknown;
    state: CellState;
    totalRows: number;
    totalCols: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const matRef = useRef<THREE.MeshStandardMaterial>(null!);
    const targetColor = useRef(new THREE.Color(CELL_COLORS[state]));
    const targetEmissive = useRef(new THREE.Color(CELL_EMISSIVE[state]));
    const currentColor = useRef(new THREE.Color(CELL_COLORS.empty));
    const currentEmissive = useRef(new THREE.Color(CELL_EMISSIVE.empty));
    const targetHeight = useRef(state === "current" ? 0.6 : state === "filled" ? 0.4 : 0.1);
    const currentHeight = useRef(0.1);

    targetColor.current.set(CELL_COLORS[state]);
    targetEmissive.current.set(CELL_EMISSIVE[state]);
    targetHeight.current = state === "current" ? 0.6 : state === "filled" ? 0.4 : 0.1;

    // Center the grid
    const cellStep = TILE_SIZE + TILE_GAP;
    const x = col * cellStep - ((totalCols - 1) * cellStep) / 2;
    const z = row * cellStep - ((totalRows - 1) * cellStep) / 2;

    useFrame((_, delta) => {
        const speed = 8.0 * delta;
        currentColor.current.lerp(targetColor.current, speed);
        currentEmissive.current.lerp(targetEmissive.current, speed);
        currentHeight.current = THREE.MathUtils.lerp(currentHeight.current, targetHeight.current, speed);

        if (matRef.current) {
            matRef.current.color.copy(currentColor.current);
            matRef.current.emissive.copy(currentEmissive.current);
            matRef.current.emissiveIntensity = state === "current" ? 1.5 : state === "filled" ? 0.8 : 0.3;
        }

        if (meshRef.current) {
            meshRef.current.scale.y = currentHeight.current / 0.1;
            meshRef.current.position.y = currentHeight.current / 2;
        }
    });

    // Display value
    const displayValue = useMemo(() => {
        if (value === 1 || value === "Q") return "Q";
        if (value === 0 || value === ".") return "";
        if (typeof value === "number" && value > 0) return String(value);
        if (typeof value === "string" && value.length === 1) return value;
        return "";
    }, [value]);

    return (
        <group position={[x, 0, z]}>
            <mesh ref={meshRef} castShadow position={[0, 0.05, 0]}>
                <boxGeometry args={[TILE_SIZE, 0.1, TILE_SIZE]} />
                <meshStandardMaterial
                    ref={matRef}
                    roughness={0.25}
                    metalness={0.5}
                />
            </mesh>
            {displayValue && (
                <Text
                    position={[0, currentHeight.current + 0.2, 0]}
                    fontSize={0.4}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#020617"
                    fontWeight="bold"
                >
                    {displayValue}
                </Text>
            )}
        </group>
    );
}

export function GridVisualization({ step, vizCtx }: GridVisualizationProps) {
    const gridData = vizCtx.primaryVar ? step.stack[vizCtx.primaryVar] as unknown[][] : null;

    // Extract current position markers
    const currentRow = step.stack.row ?? step.stack.r;
    const currentCol = step.stack.col ?? step.stack.c;

    // Extract visited/path sets if available
    const pathSet = useMemo<Set<string>>(() => {
        const p = step.stack.path ?? step.stack.visited;
        if (Array.isArray(p)) {
            return new Set(p.map((item: unknown) => {
                if (Array.isArray(item) && item.length === 2) return `${item[0]},${item[1]}`;
                return String(item);
            }));
        }
        return new Set();
    }, [step.stack.path, step.stack.visited]);

    // Queens positions (for N-Queens specifically)
    const queensSet = useMemo<Set<string>>(() => {
        const q = step.stack.queens;
        if (Array.isArray(q)) {
            return new Set(q.map((col: number, row: number) => `${row},${col}`));
        }
        return new Set();
    }, [step.stack.queens]);

    if (!gridData || !Array.isArray(gridData) || gridData.length === 0) return null;

    const totalRows = gridData.length;
    const totalCols = Array.isArray(gridData[0]) ? gridData[0].length : 0;

    function getCellState(r: number, c: number, val: unknown): CellState {
        // Current cell being processed
        if (currentRow !== undefined && currentCol !== undefined &&
            Number(currentRow) === r && Number(currentCol) === c) {
            return "current";
        }

        // Queens set (N-Queens specific)
        if (queensSet.has(`${r},${c}`)) return "filled";

        // Path/visited cell
        if (pathSet.has(`${r},${c}`)) return "path";

        // Filled/placed value
        if (val === 1 || val === "Q" || (typeof val === "number" && val > 0)) return "filled";

        // Blocked/wall
        if (val === -1 || val === "#") return "blocked";

        return "empty";
    }

    return (
        <group>
            {/* Grid cells — laid flat, no rotation */}
            {gridData.map((row, r) =>
                Array.isArray(row) && row.map((val, c) => (
                    <GridCell
                        key={`${r}-${c}`}
                        row={r}
                        col={c}
                        value={val}
                        state={getCellState(r, c, val)}
                        totalRows={totalRows}
                        totalCols={totalCols}
                    />
                ))
            )}

            {/* Row labels */}
            {Array.from({ length: totalRows }, (_, r) => {
                const cellStep = TILE_SIZE + TILE_GAP;
                return (
                    <Text
                        key={`row-${r}`}
                        position={[
                            -((totalCols - 1) * cellStep) / 2 - TILE_SIZE,
                            0.1,
                            r * cellStep - ((totalRows - 1) * cellStep) / 2,
                        ]}
                        fontSize={0.3}
                        color="#64748b"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {String(r)}
                    </Text>
                );
            })}

            {/* Col labels */}
            {Array.from({ length: totalCols }, (_, c) => {
                const cellStep = TILE_SIZE + TILE_GAP;
                return (
                    <Text
                        key={`col-${c}`}
                        position={[
                            c * cellStep - ((totalCols - 1) * cellStep) / 2,
                            0.1,
                            -((totalRows - 1) * cellStep) / 2 - TILE_SIZE,
                        ]}
                        fontSize={0.3}
                        color="#64748b"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {String(c)}
                    </Text>
                );
            })}

            {/* Grid name label */}
            {vizCtx.primaryVar && (
                <Text
                    position={[0, 0.1, ((totalRows - 1) * (TILE_SIZE + TILE_GAP)) / 2 + TILE_SIZE + 0.5]}
                    fontSize={0.4}
                    color="#38bdf8"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.015}
                    outlineColor="#020617"
                >
                    {vizCtx.primaryVar}
                </Text>
            )}
        </group>
    );
}
