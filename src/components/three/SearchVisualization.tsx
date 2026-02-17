"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { TraceStep } from "@/lib/interpreter/schema";
import { VizContext } from "@/lib/vizDetector";
import { AnimatedBar, BarState } from "./AnimatedBar";
import { PointerArrow } from "./PointerArrow";

interface SearchVisualizationProps {
    step: TraceStep;
    prevStep?: TraceStep | null;
    vizCtx?: VizContext;
}

const BAR_SPACING = 1.5;

/**
 * Determines if the current trace has search-like variables (left/right or low/high with an array).
 */
export function isSearchTrace(step: TraceStep): boolean {
    const keys = Object.keys(step.stack);
    const hasPointers = (keys.includes("left") && keys.includes("right")) ||
                        (keys.includes("low") && keys.includes("high"));
    const hasArray = Object.values(step.stack).some(
        (v) => Array.isArray(v) && v.length >= 2 && v.every((x: unknown) => typeof x === "number")
    );
    return hasPointers && hasArray;
}

/**
 * Find the primary numeric array from the step stack.
 * Uses vizCtx.primaryVar if available, otherwise searches for common names.
 */
function findPrimaryArray(step: TraceStep, vizCtx?: VizContext): { name: string; data: number[] } | null {
    // Use vizCtx hint first
    if (vizCtx?.primaryVar && Array.isArray(step.stack[vizCtx.primaryVar])) {
        return { name: vizCtx.primaryVar, data: step.stack[vizCtx.primaryVar] as number[] };
    }
    // Fallback: search common names
    const candidates = ["nums", "height", "heights", "arr", "array", "numbers", "prices", "nums1"];
    for (const name of candidates) {
        const val = step.stack[name];
        if (Array.isArray(val) && val.length >= 2 && val.every((v: unknown) => typeof v === "number")) {
            return { name, data: val };
        }
    }
    // Last resort: first 1D numeric array
    for (const [name, val] of Object.entries(step.stack)) {
        if (Array.isArray(val) && val.length >= 2 && val.every((v: unknown) => typeof v === "number")) {
            return { name, data: val };
        }
    }
    return null;
}

export function SearchVisualization({ step, prevStep, vizCtx }: SearchVisualizationProps) {
    const scanBeamRef = useRef<THREE.Mesh>(null!);
    const scanMatRef = useRef<THREE.MeshStandardMaterial>(null!);
    const targetLabelRef = useRef<THREE.Group>(null!);
    const elapsedRef = useRef(0);

    // Dynamically find the primary array
    const primaryArray = findPrimaryArray(step, vizCtx);
    const nums = primaryArray?.data;
    const arrayName = primaryArray?.name ?? "array";

    // Resolve pointers — support left/right OR low/high
    const left = (step.stack.left as number | undefined) ?? (step.stack.low as number | undefined);
    const right = (step.stack.right as number | undefined) ?? (step.stack.high as number | undefined);
    const mid = (step.stack.mid as number | undefined) ?? (step.stack.cut1 as number | undefined);
    const target = step.stack.target as number | undefined;

    // Extra context variables
    const water = step.stack.water as number | undefined;
    const leftMax = step.stack.left_max as number | undefined;
    const rightMax = step.stack.right_max as number | undefined;

    const n = nums?.length ?? 0;
    const offset = n * BAR_SPACING * 0.5 - BAR_SPACING * 0.5;

    // Use "L"/"R" labels always, but show the actual variable names as tooltips
    const leftLabel = step.stack.left !== undefined ? "L" : step.stack.low !== undefined ? "lo" : "L";
    const rightLabel = step.stack.right !== undefined ? "R" : step.stack.high !== undefined ? "hi" : "R";

    // Previous left/right for beam interpolation
    const prevLeft = useRef(0);
    const prevRight = useRef(n > 0 ? n - 1 : 0);
    const currentBeamLeft = useRef(0);
    const currentBeamRight = useRef(n > 0 ? n - 1 : 0);

    // Determine state for each bar
    const barStates: BarState[] = useMemo(() => {
        if (!nums) return [];

        return nums.map((val, idx) => {
            // Found state — mid matches target
            if (mid !== undefined && target !== undefined && val === target && idx === mid) {
                return "found";
            }
            // Currently being tested (mid pointer)
            if (mid !== undefined && idx === mid && left !== undefined && right !== undefined) {
                return "mid";
            }
            // In active search range
            if (left !== undefined && right !== undefined && idx >= left && idx <= right) {
                return "active";
            }
            // Out of range (pointers defined)
            if (left !== undefined && right !== undefined) {
                return "dimmed";
            }
            // Default (before search starts)
            return "default";
        });
    }, [nums, left, right, mid, target]);

    // Animate the scan beam plane
    useFrame((_, delta) => {
        elapsedRef.current += delta;
        const speed = 3.5 * delta;

        if (left !== undefined) prevLeft.current = left;
        if (right !== undefined) prevRight.current = right;

        currentBeamLeft.current = THREE.MathUtils.lerp(
            currentBeamLeft.current,
            (prevLeft.current * BAR_SPACING - offset),
            speed
        );
        currentBeamRight.current = THREE.MathUtils.lerp(
            currentBeamRight.current,
            (prevRight.current * BAR_SPACING - offset),
            speed
        );

        if (scanBeamRef.current && scanMatRef.current) {
            const beamWidth = Math.abs(currentBeamRight.current - currentBeamLeft.current) + BAR_SPACING;
            const beamCenter = (currentBeamLeft.current + currentBeamRight.current) / 2;
            scanBeamRef.current.position.x = beamCenter;
            scanBeamRef.current.scale.x = beamWidth;

            const pulse = Math.sin(elapsedRef.current * 2) * 0.02 + 0.08;
            scanMatRef.current.opacity = pulse;
        }

        if (targetLabelRef.current) {
            targetLabelRef.current.position.y = 4.5 + Math.sin(elapsedRef.current * 1.5) * 0.1;
        }
    });

    if (!nums || nums.length === 0) return null;

    return (
        <group>
            {/* Animated bars */}
            {nums.map((val, idx) => (
                <AnimatedBar
                    key={idx}
                    value={val}
                    index={idx}
                    totalCount={n}
                    xPosition={idx * BAR_SPACING - offset}
                    state={barStates[idx]}
                    isTarget={target !== undefined && val === target}
                />
            ))}

            {/* Pointer arrows */}
            <PointerArrow
                label={leftLabel}
                targetX={left !== undefined ? left * BAR_SPACING - offset : 0}
                color="#22c55e"
                emissiveColor="#16a34a"
                yOffset={-1.2}
                visible={left !== undefined}
            />
            <PointerArrow
                label={rightLabel}
                targetX={right !== undefined ? right * BAR_SPACING - offset : (n - 1) * BAR_SPACING - offset}
                color="#ef4444"
                emissiveColor="#dc2626"
                yOffset={-1.2}
                visible={right !== undefined}
            />
            <PointerArrow
                label="M"
                targetX={mid !== undefined ? mid * BAR_SPACING - offset : 0}
                color="#f59e0b"
                emissiveColor="#d97706"
                yOffset={-2.2}
                visible={mid !== undefined}
            />

            {/* Scan beam — glowing plane showing active range */}
            <mesh
                ref={scanBeamRef}
                position={[0, -0.05, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[1, 2.5]} />
                <meshStandardMaterial
                    ref={scanMatRef}
                    color="#3b82f6"
                    emissive="#2563eb"
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.08}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Target / Water / Stats labels */}
            {target !== undefined && (
                <group ref={targetLabelRef} position={[0, 4.5, 0]}>
                    <Text
                        fontSize={0.4}
                        color="#f472b6"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.015}
                        outlineColor="#020617"
                    >
                        {`target = ${target}`}
                    </Text>
                </group>
            )}

            {/* Water / Extra stats — shown for Trapping Rain Water etc */}
            {water !== undefined && (
                <group position={[0, 4.5, 0]}>
                    <Text
                        fontSize={0.4}
                        color="#38bdf8"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.015}
                        outlineColor="#020617"
                    >
                        {`water = ${water}`}
                    </Text>
                    {leftMax !== undefined && (
                        <Text
                            position={[-3, -0.6, 0]}
                            fontSize={0.3}
                            color="#22c55e"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#020617"
                        >
                            {`left_max = ${leftMax}`}
                        </Text>
                    )}
                    {rightMax !== undefined && (
                        <Text
                            position={[3, -0.6, 0]}
                            fontSize={0.3}
                            color="#ef4444"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#020617"
                        >
                            {`right_max = ${rightMax}`}
                        </Text>
                    )}
                </group>
            )}

            {/* Array name label */}
            <Text
                position={[0, -3.2, 0]}
                fontSize={0.35}
                color="#38bdf8"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#020617"
            >
                {arrayName}
            </Text>
        </group>
    );
}
