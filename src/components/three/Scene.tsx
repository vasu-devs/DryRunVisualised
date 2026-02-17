"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, Grid } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { useTraceStore } from "@/lib/store/traceStore";
import { detectVizType, VizType } from "@/lib/vizDetector";
import { ArrayVisualization } from "./ArrayMesh";
import { SearchVisualization } from "./SearchVisualization";
import { GraphVisualization } from "./GraphVisualization";
import { GridVisualization } from "./GridVisualization";

/** Camera presets per visualization type */
const CAMERA_POSITIONS: Record<VizType, [number, number, number]> = {
    search: [0, 6, 12],
    array: [0, 6, 12],
    graph: [0, 0, 12],
    grid: [0, 10, 5],
    none: [10, 10, 10],
};

export function Scene() {
    const trace = useTraceStore((s) => s.trace);
    const currentStep = useTraceStore((s) => s.getCurrentStep());
    const prevStep = useTraceStore((s) => {
        const { trace: t, currentStepIndex } = s;
        return currentStepIndex > 0 ? t[currentStepIndex - 1] : null;
    });

    // Detect visualization type from the full trace (stable across steps)
    const vizCtx = useMemo(() => detectVizType(trace), [trace]);
    const cameraPos = CAMERA_POSITIONS[vizCtx.type];

    return (
        <div className="w-full h-full bg-slate-950">
            <Canvas shadows gl={{ antialias: true, alpha: false }}>
                <Suspense fallback={null}>
                    <PerspectiveCamera
                        makeDefault
                        position={cameraPos}
                        fov={50}
                    />
                    <OrbitControls
                        makeDefault
                        minPolarAngle={0.2}
                        maxPolarAngle={Math.PI / 1.75}
                        enableDamping
                        dampingFactor={0.05}
                    />

                    {/* Lighting */}
                    <ambientLight intensity={0.3} />
                    <pointLight position={[8, 12, 8]} intensity={1.5} castShadow color="#e0e7ff" />
                    <pointLight position={[-8, 8, -4]} intensity={0.6} color="#818cf8" />
                    <directionalLight
                        position={[-3, 10, 5]}
                        intensity={0.6}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                        color="#f0f0ff"
                    />
                    <pointLight position={[0, -4, -6]} intensity={0.4} color="#3b82f6" />
                    <Environment preset="night" />

                    {/* Grid floor */}
                    <Grid
                        infiniteGrid
                        fadeDistance={40}
                        fadeStrength={8}
                        cellSize={1}
                        sectionSize={5}
                        sectionColor="#1e3a5f"
                        cellColor="#0f1f38"
                    />

                    {/* Route to the correct visualization */}
                    {currentStep && (
                        <group position={[0, 0.5, 0]}>
                            <VisualizationRenderer
                                vizType={vizCtx.type}
                                vizCtx={vizCtx}
                                step={currentStep}
                                prevStep={prevStep}
                            />
                        </group>
                    )}

                    <color attach="background" args={["#020617"]} />
                </Suspense>
            </Canvas>
        </div>
    );
}

/** Routes to the correct visualization component based on detected type */
function VisualizationRenderer({
    vizType,
    vizCtx,
    step,
    prevStep,
}: {
    vizType: VizType;
    vizCtx: ReturnType<typeof detectVizType>;
    step: import("@/lib/interpreter/schema").TraceStep;
    prevStep: import("@/lib/interpreter/schema").TraceStep | null;
}) {
    switch (vizType) {
        case "search":
            return <SearchVisualization step={step} prevStep={prevStep} vizCtx={vizCtx} />;
        case "graph":
            return <GraphVisualization step={step} vizCtx={vizCtx} />;
        case "grid":
            return <GridVisualization step={step} vizCtx={vizCtx} />;
        case "array":
            return <ArrayVisualization step={step} prevStep={prevStep} vizCtx={vizCtx} />;
        case "none":
        default:
            return null;
    }
}
