"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

export type BarState = "active" | "dimmed" | "mid" | "found" | "default";

interface AnimatedBarProps {
    value: number;
    index: number;
    totalCount: number;
    xPosition: number;
    state: BarState;
    isTarget?: boolean;
}

// Color palette for each state
const STATE_COLORS: Record<BarState, { color: string; emissive: string; opacity: number }> = {
    active: { color: "#60a5fa", emissive: "#1d4ed8", opacity: 1.0 },   // Blue — in search range
    dimmed: { color: "#1e293b", emissive: "#000000", opacity: 0.3 },   // Dark slate — out of range
    mid: { color: "#f59e0b", emissive: "#d97706", opacity: 1.0 },   // Amber — being tested
    found: { color: "#22c55e", emissive: "#16a34a", opacity: 1.0 },   // Green — found!
    default: { color: "#60a5fa", emissive: "#1d4ed8", opacity: 1.0 },   // Blue — default
};

const LERP_SPEED = 4.0;

export function AnimatedBar({ value, index, totalCount, xPosition, state, isTarget }: AnimatedBarProps) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const groupRef = useRef<THREE.Group>(null!);
    const textRef = useRef<THREE.Group>(null!);
    const ringRef = useRef<THREE.Mesh>(null!);

    // Bar height based on value — normalized
    const barHeight = Math.max(0.4, Math.abs(value) * 0.35 + 0.5);

    // Target state values
    const targets = useMemo(() => {
        const cfg = STATE_COLORS[state];
        return {
            color: new THREE.Color(cfg.color),
            emissive: new THREE.Color(cfg.emissive),
            opacity: cfg.opacity,
            scaleY: state === "found" ? 1.15 : state === "dimmed" ? 0.85 : 1.0,
            posY: state === "found" ? 0.1 : 0,
        };
    }, [state]);

    // Current interpolation values (stored in refs for useFrame)
    const currentColor = useRef(new THREE.Color(STATE_COLORS.default.color));
    const currentEmissive = useRef(new THREE.Color(STATE_COLORS.default.emissive));
    const currentOpacity = useRef(1.0);
    const currentScaleY = useRef(1.0);
    const currentPosX = useRef(xPosition);
    const elapsedRef = useRef(0);

    useFrame((_, delta) => {
        const speed = LERP_SPEED * delta;
        elapsedRef.current += delta;

        // Smooth color interpolation
        currentColor.current.lerp(targets.color, speed);
        currentEmissive.current.lerp(targets.emissive, speed);
        currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targets.opacity, speed);
        currentScaleY.current = THREE.MathUtils.lerp(currentScaleY.current, targets.scaleY, speed);
        currentPosX.current = THREE.MathUtils.lerp(currentPosX.current, xPosition, speed);

        // Apply to material
        if (materialRef.current) {
            materialRef.current.color.copy(currentColor.current);
            materialRef.current.emissive.copy(currentEmissive.current);
            materialRef.current.opacity = currentOpacity.current;
            materialRef.current.transparent = currentOpacity.current < 1.0;
        }

        // Apply to group
        if (groupRef.current) {
            groupRef.current.position.x = currentPosX.current;
            groupRef.current.scale.y = currentScaleY.current;
        }

        // Found state: pulsing glow
        if (state === "found" && materialRef.current) {
            const pulse = Math.sin(elapsedRef.current * 4) * 0.3 + 0.7;
            materialRef.current.emissiveIntensity = pulse;
        } else if (materialRef.current) {
            materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
                materialRef.current.emissiveIntensity, 0.4, speed
            );
        }

        // Mid state: gentle bounce
        if (state === "mid" && groupRef.current) {
            groupRef.current.position.y = Math.sin(elapsedRef.current * 3) * 0.08 + targets.posY;
        } else if (groupRef.current) {
            groupRef.current.position.y = THREE.MathUtils.lerp(
                groupRef.current.position.y, targets.posY, speed
            );
        }

        // Target indicator ring rotation
        if (ringRef.current) {
            ringRef.current.rotation.y += delta * 2;
        }
    });

    return (
        <group ref={groupRef} position={[xPosition, 0, 0]}>
            {/* Main bar */}
            <RoundedBox
                ref={meshRef}
                args={[1.0, barHeight, 1.0]}
                radius={0.08}
                smoothness={4}
                position={[0, barHeight / 2, 0]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial
                    ref={materialRef}
                    color={STATE_COLORS.default.color}
                    emissive={STATE_COLORS.default.emissive}
                    emissiveIntensity={0.4}
                    roughness={0.15}
                    metalness={0.85}
                    transparent
                />
            </RoundedBox>

            {/* Value label on top */}
            <Text
                position={[0, barHeight + 0.45, 0]}
                fontSize={0.42}
                color="white"
                anchorX="center"
                anchorY="middle"

                outlineWidth={0.02}
                outlineColor="#020617"
            >
                {value.toString()}
            </Text>

            {/* Index label below */}
            <Text
                position={[0, -0.3, 0]}
                fontSize={0.22}
                color="#64748b"
                anchorX="center"
                anchorY="top"
            >
                {`[${index}]`}
            </Text>

            {/* Target indicator ring */}
            {isTarget && (
                <mesh
                    ref={ringRef}
                    position={[0, barHeight + 1.0, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                >
                    <torusGeometry args={[0.35, 0.04, 16, 32]} />
                    <meshStandardMaterial
                        color="#f472b6"
                        emissive="#ec4899"
                        emissiveIntensity={1.0}
                        transparent
                        opacity={0.9}
                    />
                </mesh>
            )}
        </group>
    );
}
