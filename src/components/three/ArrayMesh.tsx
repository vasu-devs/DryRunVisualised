"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { TraceStep } from "@/lib/interpreter/schema";
import { VizContext } from "@/lib/vizDetector";

interface ArrayVisualizationProps {
    step: TraceStep;
    prevStep?: TraceStep | null;
    vizCtx: VizContext;
}

const BAR_SPACING = 1.5;

type BarState = "default" | "active_i" | "active_j" | "swapping" | "sorted";

const STATE_COLORS: Record<BarState, string> = {
    default: "#3b82f6",
    active_i: "#ef4444",
    active_j: "#f59e0b",
    swapping: "#a855f7",
    sorted: "#22c55e",
};

const STATE_EMISSIVE: Record<BarState, string> = {
    default: "#1d4ed8",
    active_i: "#b91c1c",
    active_j: "#d97706",
    swapping: "#7e22ce",
    sorted: "#15803d",
};

/** Single animated bar for sorting visualization */
function SortBar({
    value,
    index,
    totalCount,
    state,
    xPos,
}: {
    value: number;
    index: number;
    totalCount: number;
    state: BarState;
    xPos: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const matRef = useRef<THREE.MeshStandardMaterial>(null!);
    const targetColor = useRef(new THREE.Color(STATE_COLORS[state]));
    const targetEmissive = useRef(new THREE.Color(STATE_EMISSIVE[state]));
    const currentColor = useRef(new THREE.Color(STATE_COLORS.default));
    const currentEmissive = useRef(new THREE.Color(STATE_EMISSIVE.default));
    const currentX = useRef(xPos);
    const currentHeight = useRef(value * 0.5 + 0.5);

    targetColor.current.set(STATE_COLORS[state]);
    targetEmissive.current.set(STATE_EMISSIVE[state]);

    const barHeight = value * 0.5 + 0.5;

    useFrame((_, delta) => {
        const speed = 5.0 * delta;
        currentColor.current.lerp(targetColor.current, speed);
        currentEmissive.current.lerp(targetEmissive.current, speed);
        currentX.current = THREE.MathUtils.lerp(currentX.current, xPos, speed);
        currentHeight.current = THREE.MathUtils.lerp(currentHeight.current, barHeight, speed);

        if (matRef.current) {
            matRef.current.color.copy(currentColor.current);
            matRef.current.emissive.copy(currentEmissive.current);
            matRef.current.emissiveIntensity = state === "swapping" ? 1.2 : 0.4;
        }

        if (meshRef.current) {
            meshRef.current.position.x = currentX.current;
            meshRef.current.scale.y = currentHeight.current / (value * 0.5 + 0.5 || 1);
        }
    });

    return (
        <group>
            <RoundedBox
                ref={meshRef}
                args={[1, barHeight, 1]}
                radius={0.08}
                smoothness={4}
                position={[xPos, barHeight / 2, 0]}
                castShadow
            >
                <meshStandardMaterial
                    ref={matRef}
                    roughness={0.25}
                    metalness={0.5}
                />
            </RoundedBox>

            {/* Value label */}
            <Text
                position={[xPos, barHeight + 0.4, 0]}
                fontSize={0.35}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#020617"
            >
                {String(value)}
            </Text>

            {/* Index label */}
            <Text
                position={[xPos, -0.3, 0.6]}
                fontSize={0.2}
                color="#64748b"
                anchorX="center"
                anchorY="middle"
            >
                {`[${index}]`}
            </Text>
        </group>
    );
}

/** Pointer indicator for i/j variables */
function SortPointer({
    label,
    targetX,
    color,
    visible,
}: {
    label: string;
    targetX: number;
    color: string;
    visible: boolean;
}) {
    const groupRef = useRef<THREE.Group>(null!);
    const currentX = useRef(targetX);
    const elapsedRef = useRef(0);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        elapsedRef.current += delta;
        currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, 4 * delta);
        groupRef.current.position.x = currentX.current;
        groupRef.current.position.y = -0.8 + Math.sin(elapsedRef.current * 2.5) * 0.08;
        groupRef.current.visible = visible;
    });

    return (
        <group ref={groupRef} position={[targetX, -0.8, 0]}>
            <mesh rotation={[0, 0, Math.PI]}>
                <coneGeometry args={[0.18, 0.35, 6]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.7}
                />
            </mesh>
            <Text
                position={[0, -0.45, 0]}
                fontSize={0.25}
                color={color}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#020617"
            >
                {label}
            </Text>
        </group>
    );
}

export function ArrayVisualization({ step, prevStep, vizCtx }: ArrayVisualizationProps) {
    const arrayData = vizCtx.primaryVar ? step.stack[vizCtx.primaryVar] as number[] : null;
    const prevArray = prevStep && vizCtx.primaryVar ? prevStep.stack[vizCtx.primaryVar] as number[] | undefined : undefined;

    if (!arrayData || !Array.isArray(arrayData) || arrayData.length === 0) return null;

    const n = arrayData.length;
    const offset = n * BAR_SPACING * 0.5 - BAR_SPACING * 0.5;

    // Extract pointer variables
    const iVal = step.stack.i as number | undefined;
    const jVal = step.stack.j as number | undefined;
    const kVal = step.stack.k as number | undefined;
    const minIdx = step.stack.min_idx as number | undefined;
    const pivot = step.stack.pivot;
    const keyVal = step.stack.key;

    // Detect if a swap happened between steps
    const swapIndices = useMemo<Set<number>>(() => {
        if (!prevArray || !Array.isArray(prevArray) || prevArray.length !== arrayData.length) {
            return new Set();
        }
        const changed = new Set<number>();
        for (let i = 0; i < arrayData.length; i++) {
            if (arrayData[i] !== prevArray[i]) changed.add(i);
        }
        // A swap changes exactly 2 indices
        if (changed.size === 2) return changed;
        return new Set();
    }, [arrayData, prevArray]);

    function getBarState(idx: number): BarState {
        if (swapIndices.has(idx)) return "swapping";
        if (iVal !== undefined && idx === iVal) return "active_i";
        if (jVal !== undefined && idx === jVal) return "active_j";
        if (minIdx !== undefined && idx === minIdx) return "active_j";
        return "default";
    }

    return (
        <group>
            {arrayData.map((val, idx) => (
                <SortBar
                    key={idx}
                    value={val}
                    index={idx}
                    totalCount={n}
                    state={getBarState(idx)}
                    xPos={idx * BAR_SPACING - offset}
                />
            ))}

            {/* Pointers */}
            <SortPointer
                label="i"
                targetX={iVal !== undefined ? iVal * BAR_SPACING - offset : 0}
                color="#ef4444"
                visible={iVal !== undefined}
            />
            <SortPointer
                label="j"
                targetX={jVal !== undefined ? jVal * BAR_SPACING - offset : 0}
                color="#f59e0b"
                visible={jVal !== undefined}
            />
            {minIdx !== undefined && (
                <SortPointer
                    label="min"
                    targetX={minIdx * BAR_SPACING - offset}
                    color="#a855f7"
                    visible={true}
                />
            )}

            {/* Array name */}
            <Text
                position={[0, -2.0, 0]}
                fontSize={0.35}
                color="#38bdf8"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#020617"
            >
                {vizCtx.primaryVar ?? "array"}
            </Text>
        </group>
    );
}
