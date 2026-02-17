"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface PointerArrowProps {
    label: string;
    targetX: number;
    color: string;
    emissiveColor: string;
    yOffset?: number;
    visible: boolean;
}

const LERP_SPEED = 3.5;

export function PointerArrow({
    label,
    targetX,
    color,
    emissiveColor,
    yOffset = -1.0,
    visible,
}: PointerArrowProps) {
    const groupRef = useRef<THREE.Group>(null!);
    const currentX = useRef(targetX);
    const currentOpacity = useRef(visible ? 1 : 0);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const elapsedRef = useRef(0);

    useFrame((_, delta) => {
        elapsedRef.current += delta;
        const speed = LERP_SPEED * delta;

        // Smooth X position
        currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, speed);

        // Smooth opacity
        const targetOpacity = visible ? 1.0 : 0.0;
        currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, speed);

        if (groupRef.current) {
            groupRef.current.position.x = currentX.current;
            // Gentle floating motion
            groupRef.current.position.y = yOffset + Math.sin(elapsedRef.current * 2.5 + targetX) * 0.06;
            groupRef.current.visible = currentOpacity.current > 0.01;
        }

        if (materialRef.current) {
            materialRef.current.opacity = currentOpacity.current;
        }
    });

    return (
        <group ref={groupRef} position={[targetX, yOffset, 0]}>
            {/* Arrow cone pointing up */}
            <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0]}>
                <coneGeometry args={[0.2, 0.4, 8]} />
                <meshStandardMaterial
                    ref={materialRef}
                    color={color}
                    emissive={emissiveColor}
                    emissiveIntensity={0.8}
                    transparent
                    roughness={0.2}
                    metalness={0.7}
                />
            </mesh>

            {/* Shaft */}
            <mesh position={[0, 0.0, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
                <meshStandardMaterial
                    color={color}
                    emissive={emissiveColor}
                    emissiveIntensity={0.5}
                    transparent
                    opacity={currentOpacity.current}
                    roughness={0.3}
                    metalness={0.6}
                />
            </mesh>

            {/* Label */}
            <Text
                position={[0, -0.5, 0]}
                fontSize={0.35}
                color={color}
                anchorX="center"
                anchorY="top"
                outlineWidth={0.015}
                outlineColor="#020617"
            >
                {label}
            </Text>
        </group>
    );
}
