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

// ────────────────────────────────────────────────────────────
// Algorithm Templates
// ────────────────────────────────────────────────────────────

const EXAMPLES: Record<string, { label: string; code: string }> = {
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
};

const DEFAULT_EXAMPLE = "binary_search";

export default function Home() {
  const [selectedExample, setSelectedExample] = useState(DEFAULT_EXAMPLE);
  const [code, setCode] = useState(EXAMPLES[DEFAULT_EXAMPLE].code);
  const [language, setLanguage] = useState("python");
  const [isExecuting, setIsExecuting] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
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
    setTrace([]); // Clear old trace immediately to prevent stale vizCtx
    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();
      if (data.error) {
        alert("Execution Error: " + data.error);
      } else {
        setTrace(data.trace);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to execution engine");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExampleChange = (key: string) => {
    setSelectedExample(key);
    setCode(EXAMPLES[key].code);
    useTraceStore.getState().reset();
    useTraceStore.getState().setTrace([]);
  };

  return (
    <main className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">DR</div>
          <h1 className="text-lg font-bold tracking-tight">
            Dry Runner <span className="text-slate-500 font-normal ml-1">3D DSA Visualizer</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Examples dropdown */}
          <select
            value={selectedExample}
            onChange={(e) => handleExampleChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
            style={{ minWidth: 160 }}
          >
            <optgroup label="Search">
              <option value="binary_search">Binary Search</option>
              <option value="linear_search">Linear Search</option>
              <option value="two_pointer">Two Pointer</option>
              <option value="trapping_rain_water">Trapping Rain Water</option>
              <option value="median_sorted_arrays">Median Sorted Arrays</option>
            </optgroup>
            <optgroup label="Sorting">
              <option value="bubble_sort">Bubble Sort</option>
              <option value="selection_sort">Selection Sort</option>
              <option value="insertion_sort">Insertion Sort</option>
            </optgroup>
            <optgroup label="Graph Traversal">
              <option value="bfs">BFS (Graph)</option>
              <option value="dfs">DFS (Graph)</option>
              <option value="dijkstra">Dijkstra</option>
            </optgroup>
            <optgroup label="Backtracking">
              <option value="nqueens">N-Queens</option>
            </optgroup>
          </select>
          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs uppercase tracking-widest text-slate-500">{language}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Side: Editor + Controls */}
        <div className="w-[450px] flex flex-col border-r border-slate-800">
          <Toolbar onExecute={handleExecute} isExecuting={isExecuting} />
          <div className="flex-1 min-h-0">
            <CodeEditor code={code} language={language} onChange={(val) => setCode(val || "")} />
          </div>
          <StepSlider />
        </div>

        {/* Right Side: Visualization */}
        <div className="flex-1 relative flex flex-col">
          {/* 2D/3D Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-950/60">
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === "2d"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
            >
              2D View
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === "3d"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
            >
              3D View
            </button>
            <span className="ml-2 text-xs text-slate-500">|</span>
            <span className="text-xs text-slate-500">
              {vizCtx.type !== "none" ? `Detected: ${vizCtx.type}` : "Waiting for code..."}
              {vizCtx.primaryVar ? ` • primary: ${vizCtx.primaryVar}` : ""}
            </span>
          </div>

          {/* Visualization Area */}
          <div className="flex-1 min-h-0">
            {viewMode === "3d" ? (
              <Scene />
            ) : (
              currentStep ? (
                <Visualization2D step={currentStep} prevStep={prevStep} vizCtx={vizCtx} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
                  Run your code to see the visualization
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="h-48 border-t border-slate-800 flex overflow-hidden">
        <VariablePanel />
        <StdoutPanel />
      </div>
    </main>
  );
}
