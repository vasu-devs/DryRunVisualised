"use client";

import { useState, useMemo } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { Scene } from "@/components/three/Scene";
import { Toolbar } from "@/components/controls/Toolbar";
import { StepSlider } from "@/components/controls/StepSlider";
import { VariablePanel, StdoutPanel } from "@/components/panels/InfoPanels";
import { useTraceStore } from "@/lib/store/traceStore";
import { Visualization2D } from "@/components/visualizer/Visualization2D";
import { detectVizType } from "@/lib/vizDetector";
import { instrumentPython } from "@/lib/interpreter/instrumentors/python";
import { executePyodide } from "@/lib/execution/pyodide";
import { parseTrace } from "@/lib/interpreter/parsers/traceParser";

// ────────────────────────────────────────────────────────────
// Algorithm Templates (per language)
// ────────────────────────────────────────────────────────────

type LangKey = "python" | "cpp" | "java";

interface Example { label: string; code: string; }

const EXAMPLES: Record<LangKey, Record<string, Example>> = {
  python: {
    binary_search: {
      label: "Binary Search",
      code: `# Rotated Sorted Array Search
def search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = (left + right) // 2

        if nums[mid] == target:
            return mid

        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1

result = search([4, 5, 6, 7, 0, 1, 2], 0)`,
    },

    bubble_sort: {
      label: "Bubble Sort",
      code: `# Bubble Sort
nums = [5, 2, 8, 1, 9, 3]

for i in range(len(nums)):
    for j in range(0, len(nums) - i - 1):
        if nums[j] > nums[j + 1]:
            nums[j], nums[j + 1] = nums[j + 1], nums[j]`,
    },

    selection_sort: {
      label: "Selection Sort",
      code: `# Selection Sort
nums = [64, 25, 12, 22, 11]

for i in range(len(nums)):
    min_idx = i
    for j in range(i + 1, len(nums)):
        if nums[j] < nums[min_idx]:
            min_idx = j
    nums[i], nums[min_idx] = nums[min_idx], nums[i]`,
    },

    insertion_sort: {
      label: "Insertion Sort",
      code: `# Insertion Sort
nums = [12, 11, 13, 5, 6]

for i in range(1, len(nums)):
    key = nums[i]
    j = i - 1
    while j >= 0 and key < nums[j]:
        nums[j + 1] = nums[j]
        j -= 1
    nums[j + 1] = key`,
    },

    bfs: {
      label: "BFS (Graph)",
      code: `# Breadth-First Search
graph = {
    0: [1, 2],
    1: [0, 3, 4],
    2: [0, 5],
    3: [1],
    4: [1, 5],
    5: [2, 4]
}

visited = []
queue = [0]

while queue:
    current = queue.pop(0)
    if current not in visited:
        visited.append(current)
        for neighbor in graph[current]:
            if neighbor not in visited:
                queue.append(neighbor)`,
    },

    dfs: {
      label: "DFS (Graph)",
      code: `# Depth-First Search
graph = {
    0: [1, 3],
    1: [0, 2, 4],
    2: [1, 5],
    3: [0, 4],
    4: [1, 3, 5, 6],
    5: [2, 4, 7],
    6: [4, 7],
    7: [5, 6]
}

visited = []
stack = [0]

while stack:
    current = stack.pop()
    if current not in visited:
        visited.append(current)
        for neighbor in graph[current]:
            if neighbor not in visited:
                stack.append(neighbor)`,
    },

    dijkstra: {
      label: "Dijkstra",
      code: `# Dijkstra's Shortest Path
graph = {
    0: [1, 2],
    1: [0, 3, 4],
    2: [0, 4],
    3: [1, 5],
    4: [1, 2, 5],
    5: [3, 4]
}

distances = {0: 0, 1: 999999, 2: 999999, 3: 999999, 4: 999999, 5: 999999}
visited = []
queue = [0]

while queue:
    current = queue.pop(0)
    if current not in visited:
        visited.append(current)
        for neighbor in graph[current]:
            new_dist = distances[current] + 1
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
            if neighbor not in visited:
                queue.append(neighbor)`,
    },

    nqueens: {
      label: "N-Queens",
      code: `# N-Queens (4x4)
board = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
]

def is_safe(board, row, col):
    for i in range(col):
        if board[row][i] == 1:
            return False
    r, c = row, col
    while r >= 0 and c >= 0:
        if board[r][c] == 1:
            return False
        r -= 1
        c -= 1
    r, c = row, col
    while r < len(board) and c >= 0:
        if board[r][c] == 1:
            return False
        r += 1
        c -= 1
    return True

def solve(board, col):
    if col >= len(board):
        return True
    for row in range(len(board)):
        if is_safe(board, row, col):
            board[row][col] = 1
            if solve(board, col + 1):
                return True
            board[row][col] = 0
    return False

solve(board, 0)`,
    },

    linear_search: {
      label: "Linear Search",
      code: `# Linear Search
nums = [3, 7, 1, 9, 4, 6, 2]
target = 9

for i in range(len(nums)):
    if nums[i] == target:
        result = i
        break`,
    },

    two_pointer: {
      label: "Two Pointer",
      code: `# Two Sum (Sorted Array)
nums = [1, 2, 4, 6, 8, 10, 12]
target = 14

left = 0
right = len(nums) - 1

while left < right:
    mid = left + right
    current_sum = nums[left] + nums[right]
    if current_sum == target:
        result = [left, right]
        break
    elif current_sum < target:
        left += 1
    else:
        right -= 1`,
    },

    trapping_rain_water: {
      label: "Trapping Rain Water",
      code: `# Trapping Rain Water (Two Pointer)
height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]

left = 0
right = len(height) - 1
left_max = 0
right_max = 0
water = 0

while left < right:
    if height[left] < height[right]:
        if height[left] >= left_max:
            left_max = height[left]
        else:
            water += left_max - height[left]
        left += 1
    else:
        if height[right] >= right_max:
            right_max = height[right]
        else:
            water += right_max - height[right]
        right -= 1`,
    },

    median_sorted_arrays: {
      label: "Median Sorted Arrays",
      code: `# Median of Two Sorted Arrays
nums1 = [1, 3, 8, 9, 15]
nums2 = [7, 11, 18, 19, 21, 25]

# Binary search on the smaller array
low = 0
high = len(nums1)
n1 = len(nums1)
n2 = len(nums2)

while low <= high:
    cut1 = (low + high) // 2
    cut2 = (n1 + n2 + 1) // 2 - cut1

    left1 = nums1[cut1 - 1] if cut1 > 0 else -999999
    right1 = nums1[cut1] if cut1 < n1 else 999999
    left2 = nums2[cut2 - 1] if cut2 > 0 else -999999
    right2 = nums2[cut2] if cut2 < n2 else 999999

    if left1 <= right2 and left2 <= right1:
        if (n1 + n2) % 2 == 0:
            result = (max(left1, left2) + min(right1, right2)) / 2
        else:
            result = max(left1, left2)
        break
    elif left1 > right2:
        high = cut1 - 1
    else:
        low = cut1 + 1`,
    },
  },

  // ─── C++ Examples ───
  cpp: {
    bubble_sort: {
      label: "Bubble Sort",
      code: `// Bubble Sort
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {5, 2, 8, 1, 9, 3};
    int n = nums.size();

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (nums[j] > nums[j + 1]) {
                int temp = nums[j];
                nums[j] = nums[j + 1];
                nums[j + 1] = temp;
            }
        }
    }
    return 0;
}`,
    },
    binary_search: {
      label: "Binary Search",
      code: `// Binary Search
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 3, 5, 7, 9, 11, 15, 18};
    int target = 7;
    int left = 0;
    int right = nums.size() - 1;
    int mid = 0;
    int result = -1;

    while (left <= right) {
        mid = (left + right) / 2;
        if (nums[mid] == target) {
            result = mid;
            break;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return 0;
}`,
    },
    selection_sort: {
      label: "Selection Sort",
      code: `// Selection Sort
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {64, 25, 12, 22, 11};
    int n = nums.size();
    int min_idx = 0;

    for (int i = 0; i < n - 1; i++) {
        min_idx = i;
        for (int j = i + 1; j < n; j++) {
            if (nums[j] < nums[min_idx]) {
                min_idx = j;
            }
        }
        int temp = nums[i];
        nums[i] = nums[min_idx];
        nums[min_idx] = temp;
    }
    return 0;
}`,
    },
    two_pointer: {
      label: "Two Sum",
      code: `// Two Sum (Sorted Array)
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 4, 6, 8, 10, 12};
    int target = 14;
    int left = 0;
    int right = nums.size() - 1;
    int current_sum = 0;

    while (left < right) {
        current_sum = nums[left] + nums[right];
        if (current_sum == target) {
            break;
        } else if (current_sum < target) {
            left = left + 1;
        } else {
            right = right - 1;
        }
    }
    return 0;
}`,
    },
  },

  // ─── Java Examples ───
  java: {
    bubble_sort: {
      label: "Bubble Sort",
      code: `// Bubble Sort
import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {5, 2, 8, 1, 9, 3};
        int n = nums.length;

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (nums[j] > nums[j + 1]) {
                    int temp = nums[j];
                    nums[j] = nums[j + 1];
                    nums[j + 1] = temp;
                }
            }
        }
    }
}`,
    },
    binary_search: {
      label: "Binary Search",
      code: `// Binary Search
import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {1, 3, 5, 7, 9, 11, 15, 18};
        int target = 7;
        int left = 0;
        int right = nums.length - 1;
        int mid = 0;
        int result = -1;

        while (left <= right) {
            mid = (left + right) / 2;
            if (nums[mid] == target) {
                result = mid;
                break;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }
}`,
    },
    selection_sort: {
      label: "Selection Sort",
      code: `// Selection Sort
import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {64, 25, 12, 22, 11};
        int n = nums.length;
        int min_idx = 0;

        for (int i = 0; i < n - 1; i++) {
            min_idx = i;
            for (int j = i + 1; j < n; j++) {
                if (nums[j] < nums[min_idx]) {
                    min_idx = j;
                }
            }
            int temp = nums[i];
            nums[i] = nums[min_idx];
            nums[min_idx] = temp;
        }
    }
}`,
    },
    two_pointer: {
      label: "Two Sum",
      code: `// Two Sum (Sorted Array)
import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {1, 2, 4, 6, 8, 10, 12};
        int target = 14;
        int left = 0;
        int right = nums.length - 1;
        int current_sum = 0;

        while (left < right) {
            current_sum = nums[left] + nums[right];
            if (current_sum == target) {
                break;
            } else if (current_sum < target) {
                left = left + 1;
            } else {
                right = right - 1;
            }
        }
    }
}`,
    },
  },
};

const DEFAULT_LANG: LangKey = "python";
const DEFAULT_EXAMPLE = "binary_search";

export default function Home() {
  const [language, setLanguage] = useState<LangKey>(DEFAULT_LANG);
  const [selectedExample, setSelectedExample] = useState(DEFAULT_EXAMPLE);
  const [code, setCode] = useState(EXAMPLES[DEFAULT_LANG][DEFAULT_EXAMPLE].code);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState("");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [isFullscreen, setIsFullscreen] = useState(false);
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
            <img src="/favicon.png" alt="Dry Runner" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] leading-tight font-[var(--font-sans)]">
              Dry Runner
            </h1>
            <span className="text-[10px] font-medium text-[var(--text-secondary)] tracking-[0.05em] uppercase leading-tight">
              3D Visualizer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language tabs */}
          {(["python", "cpp", "java"] as LangKey[]).map((lang) => (
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

          {/* Algorithm dropdown — custom styled */}
          <select
            value={selectedExample}
            onChange={(e) => handleExampleChange(e.target.value)}
            className="neu-inset neu-base-pill neu-select px-5 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer appearance-none transition-all hover:text-[var(--accent-dark)]"
            style={{ minWidth: 200 }}
          >
            {Object.entries(currentExamples).map(([key, ex]) => (
              <option key={key} value={key}>{ex.label}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Gradient divider */}
      <div className="neu-divider mx-6" />

      {/* ═══════════════════════════════════════════════════════════
          BODY — 2-column dashboard
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">

        {/* ─────────────────────────────────────────────────────────
            LEFT PANEL — Extruded Control Deck
            ───────────────────────────────────────────────────────── */}
        {!isFullscreen && (
          <div className="w-[420px] shrink-0 neu-extruded neu-base-card flex flex-col overflow-hidden">

            {/* Controls Row */}
            <div className="shrink-0 px-4 pt-4 pb-3">
              <Toolbar onExecute={handleExecute} isExecuting={isExecuting} />
            </div>

            {/* Divider */}
            <div className="neu-divider mx-5" />

            {/* Code Editor — takes ~55% of panel height */}
            <div className="flex-[6] min-h-0 overflow-hidden">
              <CodeEditor code={code} language={language === "cpp" ? "cpp" : language} onChange={(val) => setCode(val || "")} />
            </div>

            {/* Divider */}
            <div className="neu-divider mx-5" />

            {/* Variables Section */}
            <div className="flex-[2] min-h-0 overflow-auto px-5 py-3 custom-scrollbar">
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
            <div className="flex-[1.5] min-h-0 overflow-auto px-5 py-3 custom-scrollbar">
              <h3 className="section-label mb-2.5">Console</h3>
              <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {currentStep?.stdout || <span className="text-[var(--text-secondary)] italic">Output will appear here...</span>}
              </pre>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────
            CENTER STAGE — Inset Viewport Well
            ───────────────────────────────────────────────────────── */}
        <div className="flex-1 neu-inset neu-base-card flex flex-col overflow-hidden relative">

          {/* Floating overlay: 2D/3D toggle + metadata */}
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
              <Scene />
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
