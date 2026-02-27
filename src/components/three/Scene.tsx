"use client";

import { Suspense, useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useTraceStore } from "@/lib/store/traceStore";
import { detectVizType, VizType, VizContext } from "@/lib/vizDetector";
import { UniversalScene3D, clearDragPositions } from "./UniversalScene3D";
import { TraceStep } from "@/lib/interpreter/schema";
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

    // Reset camera when resetKey changes
    useEffect(() => {
        if (controlsRef.current && resetKey > 0) {
            controlsRef.current.reset();
        }
    }, [resetKey]);

    // ── Custom touch gesture handler ──
    // OrbitControls' built-in touch is limited, so we handle it ourselves:
    // - Pinch (finger distance change) → zoom (dolly)
    // - Two-finger drag (center movement) → orbit (rotate camera)
    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        const domElement = controls.domElement as HTMLCanvasElement;
        if (!domElement) return;

        let prevTouchDist = 0;
        let prevTouchCenter = { x: 0, y: 0 };

        const getTouchInfo = (touches: TouchList) => {
            const t0 = touches[0];
            const t1 = touches[1];
            const dx = t1.clientX - t0.clientX;
            const dy = t1.clientY - t0.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const cx = (t0.clientX + t1.clientX) / 2;
            const cy = (t0.clientY + t1.clientY) / 2;
            return { dist, center: { x: cx, y: cy } };
        };

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const info = getTouchInfo(e.touches);
                prevTouchDist = info.dist;
                prevTouchCenter = info.center;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 2 || !controls) return;
            e.preventDefault();

            const info = getTouchInfo(e.touches);

            // ── Pinch-to-zoom ──
            const distDelta = info.dist - prevTouchDist;
            if (Math.abs(distDelta) > 1) {
                const zoomFactor = 1 - distDelta * 0.005;
                const camera = controls.object as THREE.PerspectiveCamera;
                const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
                offset.multiplyScalar(zoomFactor);
                const newDist = offset.length();
                // Clamp to min/max distance
                if (newDist >= 2 && newDist <= 150) {
                    camera.position.copy(controls.target).add(offset);
                    controls.update();
                }
            }

            // ── Two-finger drag to orbit ──
            const centerDx = info.center.x - prevTouchCenter.x;
            const centerDy = info.center.y - prevTouchCenter.y;
            if (Math.abs(centerDx) > 0.5 || Math.abs(centerDy) > 0.5) {
                const rotateSpeed = 0.004;
                // Horizontal drag → azimuthal rotation (left/right)
                controls.rotateLeft(centerDx * rotateSpeed);
                // Vertical drag → polar rotation (up/down)
                controls.rotateUp(centerDy * rotateSpeed);
                controls.update();
            }

            prevTouchDist = info.dist;
            prevTouchCenter = info.center;
        };

        domElement.addEventListener("touchstart", onTouchStart, { passive: false });
        domElement.addEventListener("touchmove", onTouchMove, { passive: false });

        return () => {
            domElement.removeEventListener("touchstart", onTouchStart);
            domElement.removeEventListener("touchmove", onTouchMove);
        };
    }, []);

    return (
        <OrbitControls
            ref={controlsRef}
            makeDefault
            target={target}
            mouseButtons={mouseButtons}
            touches={{
                ONE: mode === "pan" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
                TWO: -1 as unknown as THREE.TOUCH, // Disable built-in two-finger (we handle it)
            }}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.5}
            panSpeed={0.8}
            zoomSpeed={1.2}
            minDistance={2}
            maxDistance={150}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minPolarAngle={0.1}
            autoRotate={false}
            enableZoom={true}
            zoomToCursor={true}
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
        "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-150 select-none";
    const active =
        "neu-inset text-[var(--accent-dark)]";
    const inactive =
        "neu-extruded text-[var(--text-secondary)] hover:text-[var(--text-primary)]";

    return (
        <div
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5"
            style={{ pointerEvents: "auto" }}
        >
            {/* Mode Toggle */}
            <div className="flex items-center neu-inset p-2 rounded-full gap-2">
                <button
                    onClick={() => setMode("pan")}
                    className={`${btnBase} ${mode === "pan" ? active : inactive}`}
                    title="Pan mode — drag to move (Left click / 1 finger)"
                >
                    {/* Move/pan icon */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
                    </svg>
                </button>
                <button
                    onClick={() => setMode("orbit")}
                    className={`${btnBase} ${mode === "orbit" ? active : inactive}`}
                    title="Orbit mode — drag to rotate (Left click / 1 finger)"
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
            <div className="flex items-center neu-inset p-2 rounded-full gap-2">
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

    // Track trace identity — clear drag positions and force remount when trace changes
    const traceKeyRef = useRef(0);
    const prevTraceRef = useRef(trace);
    if (trace !== prevTraceRef.current) {
        prevTraceRef.current = trace;
        traceKeyRef.current += 1;
        clearDragPositions();
    }
    const traceKey = traceKeyRef.current;

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
        // Enable touch-action for proper gesture recognition
        canvas.style.touchAction = "none";
    }, []);

    if (contextLost) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-neu)] text-[var(--text-main)]">
                <div className="text-center neu-raised p-8">
                    <p className="text-lg mb-4 font-semibold">WebGL context lost</p>
                    <button
                        onClick={() => setContextLost(false)}
                        className="px-6 py-2 neu-raised text-[var(--accent-cyan)] font-bold transition-all"
                    >
                        Reload 3D View
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-transparent" ref={canvasContainerRef} style={{ touchAction: "none" }}>
            {/* 3D Canvas */}
            <Canvas
                shadows
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: "default",
                    failIfMajorPerformanceCaveat: false,
                }}
                onCreated={handleCreated}
                frameloop="always"
                style={{ touchAction: "none" }}
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
                    <ambientLight intensity={0.7} />
                    <pointLight position={[8, 12, 8]} intensity={1.0} castShadow color="#ffffff" />
                    <pointLight position={[-8, 8, -4]} intensity={0.6} color="#f5f2eb" />
                    <directionalLight
                        position={[-3, 10, 5]}
                        intensity={0.4}
                        castShadow
                        shadow-mapSize={[1024, 1024]}
                        color="#ffffff"
                    />


                    {/* Universal Visualization */}
                    {currentStep && (
                        <group key={traceKey} position={[0, 0.5, 0]}>
                            <UniversalScene3D
                                step={currentStep}
                                prevStep={prevStep}
                                vizCtx={vizCtx}
                            />
                        </group>
                    )}


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

            {/* Hint text — desktop + touch */}
            <div className="absolute top-4 left-4 z-10 text-[11px] text-[var(--text-secondary)] font-mono pointer-events-none select-none">
                {cameraMode === "pan"
                    ? "LMB: Pan · RMB: Orbit · Scroll: Zoom · Touch: 1F Pan · 2F Rotate+Zoom"
                    : "LMB: Orbit · RMB: Pan · Scroll: Zoom · Touch: 1F Orbit · 2F Rotate+Zoom"}
            </div>
        </div>
    );
}
