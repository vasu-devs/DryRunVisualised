"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { Scene } from "@/components/three/Scene";
import { Toolbar } from "@/components/controls/Toolbar";
import { StepSlider } from "@/components/controls/StepSlider";
import { VariablePanel, StdoutPanel } from "@/components/panels/InfoPanels";
import { Github, Play, Loader2 } from "lucide-react";
import { useTraceStore } from "@/lib/store/traceStore";
import { Visualization2D } from "@/components/visualizer/Visualization2D";
import { detectVizType } from "@/lib/vizDetector";
import { instrumentPython } from "@/lib/interpreter/instrumentors/python";
import { executePyodide } from "@/lib/execution/pyodide";
import { parseTrace } from "@/lib/interpreter/parsers/traceParser";
import { EXAMPLES, DEFAULT_LANG, DEFAULT_EXAMPLE } from "@/lib/examples";
import type { LangKey } from "@/lib/examples";

// ────────────────────────────────────────────────────────────
// Grouped examples helper — groups examples by their 'group' field
// ────────────────────────────────────────────────────────────
function groupExamples(examples: Record<string, { label: string; group: string; code: string }>) {
  const groups: Record<string, Array<{ key: string; label: string }>> = {};
  for (const [key, ex] of Object.entries(examples)) {
    if (!groups[ex.group]) groups[ex.group] = [];
    groups[ex.group].push({ key, label: ex.label });
  }
  return groups;
}

export default function Home() {
  const [language, setLanguage] = useState<LangKey>(DEFAULT_LANG);
  const [selectedExample, setSelectedExample] = useState(DEFAULT_EXAMPLE);
  const [code, setCode] = useState(EXAMPLES[DEFAULT_LANG][DEFAULT_EXAMPLE].code);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState("");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── Resizable panels ───
  const [leftPanelWidth, setLeftPanelWidth] = useState(420);
  const isDragging = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setLeftPanelWidth(Math.min(700, Math.max(280, x)));
    };
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ─── Vertical resize: code editor vs variables/console ───
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const isVDragging = useRef(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const handleVDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isVDragging.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onVMove = (e: MouseEvent) => {
      if (!isVDragging.current || !leftPanelRef.current) return;
      const rect = leftPanelRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const panelH = rect.height;
      const newBottomH = panelH - y;
      setBottomPanelHeight(Math.min(panelH * 0.5, Math.max(80, newBottomH)));
    };
    const onVUp = () => {
      if (isVDragging.current) {
        isVDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onVMove);
    window.addEventListener("mouseup", onVUp);
    return () => {
      window.removeEventListener("mousemove", onVMove);
      window.removeEventListener("mouseup", onVUp);
    };
  }, []);
  const setTrace = useTraceStore((state) => state.setTrace);
  const trace = useTraceStore((s) => s.trace);
  const currentStep = useTraceStore((s) => {
    const { trace: t, currentStepIndex } = s;
    return t.length > 0 ? t[currentStepIndex] : null;
  });
  const prevStep = useTraceStore((s) => {
    const { trace: t, currentStepIndex } = s;
    return currentStepIndex > 0 ? t[currentStepIndex - 1] : null;
  });
  const vizCtx = useMemo(() => detectVizType(trace), [trace]);

  const handleExecute = async () => {
    setIsExecuting(true);
    setTrace([]);
    try {
      if (language === "python") {
        // Python: client-side Pyodide execution
        setExecutionStatus("Loading Python engine...");
        const instrumentedCode = instrumentPython(code);
        setExecutionStatus("Executing...");
        const result = await executePyodide(instrumentedCode);

        if (result.stderr && !result.stdout.includes("__TRACE__")) {
          alert("Execution Error: " + result.stderr);
        } else {
          const trace = parseTrace(result.stdout);
          setTrace(trace);
          if (trace.length > 0) {
            setTimeout(() => { useTraceStore.getState().togglePlay(); }, 100);
          }
        }
      } else {
        // C++ / Java: remote execution via Wandbox API
        setExecutionStatus(`Compiling & running ${language.toUpperCase()}...`);
        const response = await fetch("/api/execute-remote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language }),
        });
        const data = await response.json();
        if (data.error) {
          alert("Execution Error: " + data.error);
        } else {
          setTrace(data.trace);
          if (data.trace.length > 0) {
            setTimeout(() => { useTraceStore.getState().togglePlay(); }, 100);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("Execution error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExecuting(false);
      setExecutionStatus("");
    }
  };

  const handleLanguageChange = (lang: LangKey) => {
    setLanguage(lang);
    const langExamples = EXAMPLES[lang];
    const firstKey = Object.keys(langExamples)[0];
    setSelectedExample(firstKey);
    setCode(langExamples[firstKey].code);
    useTraceStore.getState().reset();
    useTraceStore.getState().setTrace([]);
  };

  const handleExampleChange = (key: string) => {
    setSelectedExample(key);
    setCode(EXAMPLES[language][key].code);
    useTraceStore.getState().reset();
    useTraceStore.getState().setTrace([]);
  };

  const currentExamples = EXAMPLES[language];

  return (
    <main className="flex flex-col h-screen text-[var(--text-primary)] overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════
          HEADER — Premium branding bar
          ═══════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-6 py-3 z-10 relative shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo — uses actual favicon image */}
          <div className="w-10 h-10 neu-extruded rounded-2xl flex items-center justify-center overflow-hidden p-1.5">
            <img src="/favicon.png" alt="Visual DSA" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] leading-tight font-[var(--font-sans)]">
              Visual DSA
            </h1>
            <span className="text-[10px] font-medium text-[var(--text-secondary)] tracking-[0.05em] uppercase leading-tight">
              Algorithm Visualizer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language tabs */}
          {(["python", "cpp"] as LangKey[]).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] neu-base-pill transition-all ${language === lang
                ? "neu-inset text-[var(--accent-dark)]"
                : "neu-extruded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
            >
              {lang === "cpp" ? "C++" : lang.charAt(0).toUpperCase() + lang.slice(1)}
            </button>
          ))}

          <div className="w-[1px] h-7 rounded-full neu-inset mx-2 opacity-40" />

          {/* Algorithm dropdown — grouped by category */}
          <select
            value={selectedExample}
            onChange={(e) => handleExampleChange(e.target.value)}
            className="neu-inset neu-base-pill neu-select px-5 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer appearance-none transition-all hover:text-[var(--accent-dark)]"
            style={{ minWidth: 220 }}
          >
            {Object.entries(groupExamples(currentExamples)).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* GitHub */}
        <a
          href="https://github.com/vasu-devs/DryRunVisualised"
          target="_blank"
          rel="noopener noreferrer"
          className="neu-extruded neu-base-pill px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] hover:text-[var(--accent-dark)] transition-all flex items-center gap-1.5"
        >
          <Github size={13} />
          GitHub
        </a>
      </header>

      {/* Gradient divider */}
      <div className="neu-divider mx-6" />

      {/* ═══════════════════════════════════════════════════════════
          BODY — 2-column resizable dashboard
          ═══════════════════════════════════════════════════════════ */}
      <div ref={bodyRef} className="flex-1 flex p-4 min-h-0">

        {/* ─────────────────────────────────────────────────────────
            LEFT PANEL — Extruded Control Deck (Resizable)
            ───────────────────────────────────────────────────────── */}
        {!isFullscreen && (
          <div ref={leftPanelRef} style={{ width: leftPanelWidth, minWidth: 280, maxWidth: 700 }} className="shrink-0 neu-extruded neu-base-card flex flex-col overflow-hidden">

            {/* Controls Row */}
            <div className="shrink-0 px-4 pt-4 pb-3">
              <Toolbar onExecute={handleExecute} isExecuting={isExecuting} />
            </div>

            {/* Divider */}
            <div className="neu-divider mx-5" />

            {/* Code Editor — fills remaining space above the bottom panel */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeEditor code={code} language={language === "cpp" ? "cpp" : language} onChange={(val) => setCode(val || "")} />
            </div>

            {/* ─── Vertical Drag Handle (neumorphic) ─── */}
            <div
              className="flex justify-center items-center shrink-0 group cursor-row-resize mx-4"
              style={{ height: 16, zIndex: 30 }}
              onMouseDown={handleVDragStart}
            >
              <div className="neu-inset rounded-full flex items-center justify-center" style={{ width: 64, height: 10 }}>
                <div className="rounded-full bg-[var(--text-secondary)] opacity-30 group-hover:opacity-70 group-hover:bg-[var(--accent-dark)] transition-all duration-200" style={{ width: 32, height: 3 }} />
              </div>
            </div>

            {/* Variables + Console — resizable bottom section */}
            <div style={{ height: bottomPanelHeight, minHeight: 80 }} className="shrink-0 flex flex-col overflow-hidden">
              {/* Variables Section */}
              <div className="flex-1 min-h-0 overflow-auto px-5 py-3 custom-scrollbar">
                <h3 className="section-label mb-2.5">Variables</h3>
                {currentStep ? (
                  <div className="space-y-1">
                    {Object.entries(currentStep.stack).map(([name, value]) => (
                      <div key={name} className="flex items-baseline gap-2.5 font-mono text-xs py-1">
                        <span className="text-[var(--accent-dark)] font-bold min-w-[48px]">{name}</span>
                        <span className="text-[var(--text-secondary)] opacity-40">=</span>
                        <span className="text-[var(--text-primary)] truncate">{JSON.stringify(value)}</span>
                      </div>
                    ))}
                    {Object.keys(currentStep.stack).length === 0 && (
                      <p className="text-[var(--text-secondary)] text-xs italic">No variables in scope</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)] text-xs italic">Run code to inspect variables</p>
                )}
              </div>

              {/* Divider */}
              <div className="neu-divider mx-5" />

              {/* Console Output Section */}
              <div className="flex-1 min-h-0 overflow-auto px-5 py-3 custom-scrollbar">
                <h3 className="section-label mb-2.5">Console</h3>
                <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                  {currentStep?.stdout || <span className="text-[var(--text-secondary)] italic">Output will appear here...</span>}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ─── Horizontal Drag Handle (neumorphic) ─── */}
        {!isFullscreen && (
          <div
            className="flex items-center justify-center shrink-0 group cursor-col-resize my-4"
            style={{ width: 16, zIndex: 30 }}
            onMouseDown={handleDragStart}
          >
            <div className="neu-inset rounded-full flex items-center justify-center" style={{ width: 10, height: 64 }}>
              <div className="rounded-full bg-[var(--text-secondary)] opacity-30 group-hover:opacity-70 group-hover:bg-[var(--accent-dark)] transition-all duration-200" style={{ width: 3, height: 32 }} />
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────
            CENTER STAGE — Inset Viewport Well
            ───────────────────────────────────────────────────────── */}
        <div className="flex-1 neu-inset neu-base-card flex flex-col overflow-hidden relative min-w-0">

          {/* Floating overlay: 2D/3D toggle + metadata + controls */}
          <div className="flex items-center gap-3 px-5 py-3 z-20 absolute top-0 left-0 right-0">
            <div className="flex items-center gap-1.5 p-1 neu-extruded rounded-full">
              <button
                onClick={() => setViewMode("2d")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${viewMode === "2d"
                  ? "neu-inset text-[var(--accent-dark)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
              >
                2D
              </button>
              <button
                onClick={() => setViewMode("3d")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${viewMode === "3d"
                  ? "neu-inset text-[var(--accent-dark)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
              >
                3D
              </button>
            </div>

            <span className="text-[11px] text-[var(--text-secondary)] font-medium tracking-wide">
              {vizCtx.type !== "none" ? `${vizCtx.type}` : ""}
              {vizCtx.primaryVar ? ` · ${vizCtx.primaryVar}` : ""}
            </span>

            <div className="flex-1" />

            {/* Run button — always visible, especially important in fullscreen */}
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className={`px-4 py-2 text-xs font-bold neu-base-pill transition-all ${isExecuting
                ? "neu-inset text-[var(--text-secondary)] opacity-60 cursor-wait"
                : "neu-extruded text-[var(--accent-dark)] hover:scale-[1.02] active:neu-inset"
                }`}
              title="Run & Visualize"
            >
              {isExecuting ? (<><Loader2 size={14} className="animate-spin inline mr-1" />Running...</>) : (<><Play size={14} fill="currentColor" className="inline mr-1" />Run</>)}
            </button>

            {executionStatus && (
              <span className="text-[10px] text-[var(--text-secondary)] italic">{executionStatus}</span>
            )}

            <button
              onClick={() => setIsFullscreen(f => !f)}
              className="px-4 py-2 text-xs font-bold neu-extruded neu-base-pill transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? "⊟ Exit" : "⊞ Expand"}
            </button>
          </div>

          {/* Visualization Canvas */}
          <div className="flex-1 min-h-0 pt-14">
            {viewMode === "3d" ? (
              trace.length > 0 ? (
                <Scene />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                    <path d="M8 12h32M8 24h32M8 36h32" />
                    <circle cx="20" cy="12" r="3" />
                    <circle cx="28" cy="24" r="3" />
                    <circle cx="16" cy="36" r="3" />
                  </svg>
                  <span className="text-sm font-medium">Run your code to see the 3D visualization</span>
                  <span className="text-xs opacity-60">Write an algorithm → click Run</span>
                </div>
              )
            ) : (
              currentStep ? (
                <Visualization2D step={currentStep} prevStep={prevStep} vizCtx={vizCtx} isFullscreen={isFullscreen} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                    <path d="M8 12h32M8 24h32M8 36h32" />
                    <circle cx="20" cy="12" r="3" />
                    <circle cx="28" cy="24" r="3" />
                    <circle cx="16" cy="36" r="3" />
                  </svg>
                  <span className="text-sm font-medium">Run your code to see the visualization</span>
                  <span className="text-xs opacity-60">Write an algorithm → click Run & Visualize</span>
                </div>
              )
            )}
          </div>

          {/* Step Slider — inside the well at the bottom */}
          <div className="shrink-0">
            <StepSlider />
          </div>
        </div>
      </div>
    </main>
  );
}
