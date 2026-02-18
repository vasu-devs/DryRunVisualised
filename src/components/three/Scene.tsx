"use client";

import { Suspense, useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid } from "@react-three/drei";
import { useTraceStore } from "@/lib/store/traceStore";
import { detectVizType, VizType } from "@/lib/vizDetector";
import { UniversalScene3D } from "./UniversalScene3D";
import * as THREE from "three";

/** Camera presets per visualization type */
const CAMERA_POSITIONS: Record<VizType, [number, number, number]> = {
    search: [0, 5, 18],
    array: [0, 5, 18],
    graph: [6, 3, 22],
    grid: [0, 14, 10],
    none: [10, 10, 10],
};

// ─── Camera Controls (inside Canvas) ─────────────────────────
function CameraRig({
    target,
    mode,
    resetKey,
}: {
    target: [number, number, number];
    mode: "pan" | "orbit";
    resetKey: number;
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controlsRef = useRef<any>(null);

    // Configure mouse buttons based on mode
    const mouseButtons = useMemo(() => {
        if (mode === "pan") {
            return {
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE,
            };
        }
        return {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
        };
    }, [mode]);

    // Touch controls
    const touches = useMemo(() => {
        if (mode === "pan") {
            return {
                ONE: THREE.TOUCH.PAN,
                TWO: THREE.TOUCH.DOLLY_ROTATE,
            };
        }
        return {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
        };
    }, [mode]);

    // Reset camera when resetKey changes
    useEffect(() => {
        if (controlsRef.current && resetKey > 0) {
            controlsRef.current.reset();
        }
    }, [resetKey]);

    return (
        <OrbitControls
            ref={controlsRef}
            makeDefault
            target={target}
            mouseButtons={mouseButtons}
            touches={touches}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.5}
            panSpeed={0.8}
            zoomSpeed={1.2}
            minDistance={3}
            maxDistance={200}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={0.1}
            autoRotate={false}
        />
    );
}

// ─── Toolbar Overlay (on top of Canvas) ──────────────────────
function CameraToolbar({
    mode,
    setMode,
    onReset,
    onZoomIn,
    onZoomOut,
}: {
    mode: "pan" | "orbit";
    setMode: (m: "pan" | "orbit") => void;
    onReset: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
}) {
    const btnBase =
        "flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-150 backdrop-blur-md border select-none";
    const active =
        "bg-blue-600/80 text-white border-blue-500/60 shadow-lg shadow-blue-500/20";
    const inactive =
        "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-700/70 hover:text-slate-200";

    return (
        <div
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5"
            style={{ pointerEvents: "auto" }}
        >
            {/* Mode Toggle */}
            <div className="flex items-center bg-slate-900/70 backdrop-blur-md rounded-xl p-1 border border-slate-700/40 gap-1">
                <button
                    onClick={() => setMode("pan")}
                    className={`${btnBase} ${mode === "pan" ? active : inactive}`}
                    title="Pan mode — drag to move (Left click)"
                >
                    {/* Move/pan icon */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
                    </svg>
                </button>
                <button
                    onClick={() => setMode("orbit")}
                    className={`${btnBase} ${mode === "orbit" ? active : inactive}`}
                    title="Orbit mode — drag to rotate (Left click)"
                >
                    {/* Orbit/rotate icon */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M13.5 8a5.5 5.5 0 0 1-8.78 4.4" />
                        <path d="M2.5 8a5.5 5.5 0 0 1 8.78-4.4" />
                        <path d="M4.72 12.4l-.72 2.1-2.1-.72" />
                        <path d="M11.28 3.6l.72-2.1 2.1.72" />
                    </svg>
                </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center bg-slate-900/70 backdrop-blur-md rounded-xl p-1 border border-slate-700/40 gap-1">
                <button
                    onClick={onZoomIn}
                    className={`${btnBase} ${inactive}`}
                    title="Zoom in"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M7 3v8M3 7h8" />
                    </svg>
                </button>
                <button
                    onClick={onZoomOut}
                    className={`${btnBase} ${inactive}`}
                    title="Zoom out"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 7h8" />
                    </svg>
                </button>
            </div>

            {/* Reset */}
            <button
                onClick={onReset}
                className={`${btnBase} ${inactive}`}
                title="Reset camera"
            >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 1v4h4" />
                    <path d="M1 5a6 6 0 1 1 1.46 3.9" />
                </svg>
            </button>
        </div>
    );
}


export function Scene() {
    const trace = useTraceStore((s) => s.trace);
    const currentStep = useTraceStore((s) => s.getCurrentStep());
    const prevStep = useTraceStore((s) => {
        const { trace: t, currentStepIndex } = s;
        return currentStepIndex > 0 ? t[currentStepIndex - 1] : null;
    });

    const vizCtx = useMemo(() => detectVizType(trace), [trace]);
    const cameraPos = CAMERA_POSITIONS[vizCtx.type];

    // Camera mode: pan (default) or orbit
    const [cameraMode, setCameraMode] = useState<"pan" | "orbit">("pan");
    const [resetKey, setResetKey] = useState(0);

    // Track WebGL context loss to allow recovery
    const [contextLost, setContextLost] = useState(false);

    // Zoom via canvas — dispatch synthetic wheel events on the canvas
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    const handleZoom = useCallback((direction: "in" | "out") => {
        const canvas = canvasContainerRef.current?.querySelector("canvas");
        if (!canvas) return;
        const delta = direction === "in" ? -300 : 300;
        canvas.dispatchEvent(
            new WheelEvent("wheel", { deltaY: delta, bubbles: true })
        );
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCreated = useCallback((state: any) => {
        const canvas = state.gl.domElement as HTMLCanvasElement;
        canvas.addEventListener("webglcontextlost", (e: Event) => {
            e.preventDefault();
            setContextLost(true);
        });
        canvas.addEventListener("webglcontextrestored", () => {
            setContextLost(false);
        });
    }, []);

    if (contextLost) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
                <div className="text-center">
                    <p className="text-lg mb-2">WebGL context lost</p>
                    <button
                        onClick={() => setContextLost(false)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                    >
                        Reload 3D View
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-slate-950" ref={canvasContainerRef}>
            {/* 3D Canvas */}
            <Canvas
                shadows
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: "default",
                    failIfMajorPerformanceCaveat: false,
                }}
                onCreated={handleCreated}
                frameloop="always"
            >
                <Suspense fallback={null}>
                    <PerspectiveCamera
                        makeDefault
                        position={cameraPos}
                        fov={50}
                        near={0.1}
                        far={500}
                    />
                    <CameraRig
                        target={[0, 0, 0]}
                        mode={cameraMode}
                        resetKey={resetKey}
                    />

                    {/* Lighting */}
                    <ambientLight intensity={0.4} />
                    <pointLight position={[8, 12, 8]} intensity={1.2} castShadow color="#e0e7ff" />
                    <pointLight position={[-8, 8, -4]} intensity={0.5} color="#818cf8" />
                    <directionalLight
                        position={[-3, 10, 5]}
                        intensity={0.5}
                        castShadow
                        shadow-mapSize={[1024, 1024]}
                        color="#f0f0ff"
                    />

                    {/* Grid floor */}
                    <Grid
                        infiniteGrid
                        fadeDistance={80}
                        fadeStrength={6}
                        cellSize={1}
                        sectionSize={5}
                        sectionColor="#1e3a5f"
                        cellColor="#0f1f38"
                    />

                    {/* Universal Visualization */}
                    {currentStep && (
                        <group position={[0, 0.5, 0]}>
                            <UniversalScene3D
                                step={currentStep}
                                prevStep={prevStep}
                                vizCtx={vizCtx}
                            />
                        </group>
                    )}

                    <color attach="background" args={["#020617"]} />
                </Suspense>
            </Canvas>

            {/* Camera Controls Toolbar (overlay on top) */}
            <CameraToolbar
                mode={cameraMode}
                setMode={setCameraMode}
                onReset={() => setResetKey((k) => k + 1)}
                onZoomIn={() => handleZoom("in")}
                onZoomOut={() => handleZoom("out")}
            />

            {/* Hint text */}
            <div className="absolute top-2 left-2 z-10 text-[10px] text-slate-500/60 font-mono pointer-events-none select-none">
                {cameraMode === "pan"
                    ? "LMB: Pan · RMB: Orbit · Scroll: Zoom"
                    : "LMB: Orbit · RMB: Pan · Scroll: Zoom"}
            </div>
        </div>
    );
}
