"use client";

import React, { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { motion } from "framer-motion";
import { AnimatedBackground } from "../ui/AnimatedBackground";
import { FuturisticGrid, FloatingDSAAssets } from "../ui/CustomAssets";

interface VisualizerLayoutProps {
    sidebarContent?: ReactNode;
    editorContent?: ReactNode;
    topbarContent?: ReactNode;
    bottomPanelContent?: ReactNode;
    children?: ReactNode; // R3F 3D elements to render
}

export const VisualizerLayout = ({
    sidebarContent,
    editorContent,
    topbarContent,
    bottomPanelContent,
    children,
}: VisualizerLayoutProps) => {
    return (
        <div className="relative w-full h-screen overflow-hidden bg-transparent text-foreground font-sans">
            <AnimatedBackground />
            <FuturisticGrid />
            <FloatingDSAAssets />

            {/* ─────────────────────────────────────────────────────────────────
          3D Canvas Layer (Bottom)
          ───────────────────────────────────────────────────────────────── */}
            <div className="absolute inset-0 z-0">
                <Canvas shadows camera={{ position: [0, 5, 10], fov: 45 }} dpr={[1, 2]}>
                    <color attach="background" args={['transparent']} />
                    <ambientLight intensity={0.6} />

                    {/* Primary top-left light to cast classic neumorphic shadows */}
                    <directionalLight
                        position={[-10, 15, 10]}
                        intensity={1.2}
                        castShadow
                        shadow-mapSize={[1024, 1024]}
                        shadow-camera-near={0.5}
                        shadow-camera-far={50}
                        shadow-camera-left={-20}
                        shadow-camera-right={20}
                        shadow-camera-top={20}
                        shadow-camera-bottom={-20}
                        shadow-bias={-0.0001}
                    />

                    {/* Secondary bottom-right bounce light */}
                    <directionalLight
                        position={[10, -5, -10]}
                        intensity={0.4}
                        color="#ffffff"
                    />

                    {/* Default Orbit Controls with smooth damping */}
                    <OrbitControls
                        makeDefault
                        enableDamping
                        dampingFactor={0.05}
                        minDistance={2}
                        maxDistance={50}
                    />

                    <Grid
                        args={[30, 30]}
                        position={[0, -2, 0]}
                        cellColor="#b8b8b8"
                        sectionColor="#e2e2e2"
                        fadeDistance={20}
                        fadeStrength={1}
                    />

                    {/* Invisible plane to catch shadows */}
                    <mesh position={[0, -2.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[100, 100]} />
                        <shadowMaterial opacity={0.15} />
                    </mesh>

                    {children}
                </Canvas>
            </div>

            {/* ─────────────────────────────────────────────────────────────────
          HTML UI Overlay Layer (Top)
          ───────────────────────────────────────────────────────────────── */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-3 gap-3">
                {/* Top Navbar */}
                {topbarContent && (
                    <motion.header
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full h-14 pointer-events-auto rounded-full neu-raised flex items-center px-6 relative overflow-hidden"
                    >
                        {topbarContent}
                    </motion.header>
                )}

                {/* Main Content Area (Sidebar, Editor, Canvas Viewport) */}
                <div className="flex-1 flex gap-4 min-h-0">
                    {/* Left Sidebar */}
                    {sidebarContent && (
                        <motion.aside
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="w-72 h-full pointer-events-auto flex flex-col pt-1"
                        >
                            <div className="neu-raised h-full w-full flex flex-col overflow-hidden">
                                {sidebarContent}
                            </div>
                        </motion.aside>
                    )}

                    {/* Center Viewport Space - Remains empty to let user interact with Canvas */}
                    <div className="flex-1 pointer-events-auto">
                        {/* If we needed floating buttons in the center overlay, they'd go here */}
                    </div>

                    {/* Right Editor Panel */}
                    {editorContent && (
                        <motion.aside
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="w-80 h-full pointer-events-auto flex flex-col pt-1"
                        >
                            <div className="neu-raised h-full w-full flex flex-col overflow-hidden">
                                {editorContent}
                            </div>
                        </motion.aside>
                    )}
                </div>

                {/* Bottom Panel */}
                {bottomPanelContent && (
                    <motion.footer
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full h-36 pointer-events-auto mt-auto pb-1"
                    >
                        <div className="neu-raised w-full h-full flex relative overflow-hidden">
                            {bottomPanelContent}
                        </div>
                    </motion.footer>
                )}
            </div>
        </div>
    );
};
