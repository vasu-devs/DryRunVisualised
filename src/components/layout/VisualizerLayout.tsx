"use client";

import React, { ReactNode, useState, useCallback, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
    // ─── Resizable panels state ───
    // editorWidth is a percentage of the main content area (excluding sidebar)
    const [editorWidthPct, setEditorWidthPct] = useState(30); // default 30%
    const isDragging = useRef(false);
    const mainContentRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !mainContentRef.current) return;
            const rect = mainContentRef.current.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            const totalWidth = rect.width;
            const newEditorPct = ((totalWidth - relativeX) / totalWidth) * 100;
            // Clamp between 15% and 60%
            setEditorWidthPct(Math.min(60, Math.max(15, newEditorPct)));
        };

        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const vizWidthPct = 100 - editorWidthPct;

    return (
        <div className="relative w-full h-screen overflow-hidden bg-transparent text-foreground font-sans">
            <AnimatedBackground />
            <FuturisticGrid />
            <FloatingDSAAssets />

            {/* ─────────────────────────────────────────────────────────────────
          3D Canvas Layer (Bottom Inset Well)
          ───────────────────────────────────────────────────────────────── */}
            <div className="absolute inset-0 z-0 p-4 pt-20 pb-40 px-[320px]">
                {/* The Main Stage (Inset Well) */}
                <div className="w-full h-full neu-inset neu-base-card overflow-hidden rounded-[32px] relative">
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

                        {/* Invisible plane to catch shadows */}
                        <mesh position={[0, -2.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                            <planeGeometry args={[100, 100]} />
                            <shadowMaterial opacity={0.15} />
                        </mesh>

                        {children}
                    </Canvas>
                </div>
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
                        className="w-full h-14 pointer-events-auto neu-base-pill neu-extruded flex items-center px-6 relative overflow-hidden"
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
                            <div className="neu-extruded neu-base-card h-full w-full flex flex-col overflow-hidden">
                                {sidebarContent}
                            </div>
                        </motion.aside>
                    )}

                    {/* ─── Resizable Center + Editor ─── */}
                    <div ref={mainContentRef} className="flex-1 flex min-h-0 min-w-0">
                        {/* Center Viewport Space */}
                        <div
                            className="pointer-events-auto min-w-0"
                            style={{ width: `${vizWidthPct}%` }}
                        >
                            {/* Remains clear for canvas and 2D viz interactions */}
                        </div>

                        {/* ─── Draggable Resize Handle ─── */}
                        {editorContent && (
                            <div
                                className="pointer-events-auto flex items-center justify-center flex-shrink-0 group"
                                style={{ width: "12px", cursor: "col-resize" }}
                                onMouseDown={handleMouseDown}
                            >
                                <div className="w-[3px] h-12 rounded-full bg-[var(--text-secondary)] opacity-30 group-hover:opacity-70 group-hover:h-20 group-hover:bg-[var(--accent-dark)] transition-all duration-200" />
                            </div>
                        )}

                        {/* Right Editor Panel */}
                        {editorContent && (
                            <motion.aside
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="h-full pointer-events-auto flex flex-col pt-1 min-w-0"
                                style={{ width: `${editorWidthPct}%` }}
                            >
                                <div className="neu-extruded neu-base-card h-full w-full flex flex-col overflow-hidden">
                                    {editorContent}
                                </div>
                            </motion.aside>
                        )}
                    </div>
                </div>

                {/* Bottom Panel */}
                {bottomPanelContent && (
                    <motion.footer
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full h-36 pointer-events-auto mt-auto pb-1"
                    >
                        <div className="neu-extruded neu-base-card w-full h-full flex relative overflow-hidden">
                            {bottomPanelContent}
                        </div>
                    </motion.footer>
                )}
            </div>
        </div>
    );
};
