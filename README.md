<div align="center">

# 🧊 Dry Runner — 3D Algorithm Visualizer

**Write code. Step through execution. Watch data structures come alive in 3D.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r182-000?logo=threedotjs)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[**Live Demo →**](#) · [**Report Bug**](https://github.com/vasu-devs/DryRunVisualised/issues) · [**Request Feature**](https://github.com/vasu-devs/DryRunVisualised/issues)

</div>

---

## ✨ What is Dry Runner?

Dry Runner is a **real-time algorithm visualizer** that renders data structure operations in both **2D** and **interactive 3D** environments. Write your algorithm in Python or C++, hit Run, and watch arrays sort, graphs traverse, linked lists re-wire, and matrices transform — step by step, with full variable inspection at every line.

### 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Dual View** | Side-by-side 2D (SVG/DOM) and 3D (WebGL/Three.js) visualizations |
| **Multi-Language** | Python (client-side via Pyodide) & C++ (remote via Godbolt Compiler Explorer) |
| **50+ Pre-built Algorithms** | Searching, Sorting, Graph Traversal, DP, Backtracking, Linked Lists, and more |
| **Step-by-Step Debugger** | Play/pause, step forward/backward, adjustable speed slider |
| **Change Highlighting** | Amber glow on modified cells, strikethrough on previous values |
| **Interactive 3D** | Orbit, zoom, pan — drag nodes, hover for tooltips, fullscreen mode |
| **Linked List Arrows** | Proper SVG nodes with `data | next` compartments and curved arrow connectors |
| **Graph Visualization** | Force-directed layouts for adjacency-list graphs with BFS/DFS coloring |
| **Code Editor** | Monaco Editor with syntax highlighting, line-by-line active step markers |
| **Canvas Auto-Clear** | Clean slate on every run — no visual artifacts between algorithm switches |

---

## 📸 Screenshots

> _Replace these with actual screenshots of your running application._

| 2D Visualization | 3D Visualization |
|:-:|:-:|
| Arrays, scalars, linked lists | Bars, grids, graph spheres |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Monaco   │  │   Playback   │  │   Visualization Layer  │ │
│  │  Editor   │  │   Controls   │  │  ┌─────┐   ┌────────┐ │ │
│  │          │  │  ⏮ ▶ ⏭ 🔄  │  │  │ 2D  │   │  3D    │ │ │
│  │          │  │  Speed Slider │  │  │ SVG │   │Three.js│ │ │
│  └──────────┘  └──────┬───────┘  │  └─────┘   └────────┘ │ │
│                       │          └─────────┬──────────────┘ │
│                       ▼                    │                │
│              ┌────────────────┐            │                │
│              │  Zustand Store  │◄───────────┘                │
│              │  (Trace State)  │                             │
│              └───────┬────────┘                             │
│                      │                                      │
│         ┌────────────┴────────────┐                         │
│         ▼                         ▼                         │
│  ┌─────────────┐         ┌──────────────┐                   │
│  │   Python     │         │    C++        │                   │
│  │  Instrumentor│         │ Instrumentor  │                   │
│  │  + Pyodide   │         │ + Godbolt API │                   │
│  └─────────────┘         └──────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Execution Pipeline

1. **User Code** → Instrumentor injects tracing hooks (`sys.settrace` for Python, `cerr` macros for C++)
2. **Execution** → Python runs client-side in Pyodide (WASM). C++ compiles remotely via Godbolt API.
3. **Trace Output** → Each line execution emits a JSON snapshot: `{ line, stack, heap, stdout }`
4. **Parsing** → `traceParser.ts` collects snapshots into an ordered trace array
5. **Visualization** → `vizDetector.ts` classifies variables (array, grid, graph, linked list, tree, scalar) and routes to appropriate 2D/3D components

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0
- **npm** ≥ 9.0
- **Python 3** (for local Python execution via the `/api/execute` route — optional; Pyodide handles client-side)

### Installation

```bash
# Clone the repository
git clone https://github.com/vasu-devs/DryRunVisualised.git
cd DryRunVisualised

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## 🧩 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (Turbopack) | App router, API routes, SSR |
| **UI** | React 19 | Component architecture |
| **3D Engine** | Three.js r182 + React Three Fiber | WebGL-based 3D visualization |
| **3D Helpers** | React Three Drei | Text, RoundedBox, Html overlays, OrbitControls |
| **Code Editor** | Monaco Editor | VSCode-grade editing with syntax highlighting |
| **State** | Zustand 5 | Trace playback state, step index, play/pause |
| **Styling** | Tailwind CSS 4 | Neumorphic design system with CSS variables |
| **Animation** | Framer Motion 12 | Page transitions, micro-interactions |
| **Icons** | Lucide React | Consistent SVG icon system |
| **Python Runtime** | Pyodide (WASM) | Client-side Python execution in the browser |
| **C++ Compiler** | Godbolt API (GCC 14.1) | Remote C++ compilation and execution |
| **Validation** | Zod 4 | Runtime type validation |
| **Language** | TypeScript 5 | End-to-end type safety |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout + metadata
│   ├── globals.css                 # Neumorphic design tokens & utilities
│   ├── visualizer/
│   │   └── page.tsx                # Main visualizer workspace
│   └── api/
│       ├── execute/route.ts        # Python local execution endpoint
│       └── execute-remote/route.ts # C++ remote execution via Godbolt
│
├── components/
│   ├── controls/
│   │   └── Toolbar.tsx             # Play/pause/step/speed controls
│   ├── editor/
│   │   └── MonacoEditor.tsx        # Code editor with active line markers
│   ├── layout/
│   │   └── VisualizerLayout.tsx    # Two-panel workspace layout
│   ├── panels/
│   │   └── ControlPanel.tsx        # Algorithm selector + language tabs
│   ├── three/
│   │   ├── UniversalScene3D.tsx    # All 3D components (Bar, Grid, Graph, etc.)
│   │   ├── Scene.tsx               # Canvas + camera + lighting rig
│   │   └── SceneErrorBoundary.tsx  # Graceful WebGL crash handling
│   ├── ui/
│   │   └── AnimatedBackground.tsx  # Ambient background effects
│   └── visualizer/
│       └── Visualization2D.tsx     # All 2D components (arrays, linked lists, etc.)
│
├── hooks/
│   └── useGraphLayout.ts           # Force-directed graph layout hook
│
└── lib/
    ├── examples.ts                 # 50+ algorithm templates (Python & C++)
    ├── vizDetector.ts              # Classifies variables into viz types
    ├── store/
    │   └── traceStore.ts           # Zustand store for trace playback
    ├── execution/
    │   ├── local.ts                # Local Python executor (child_process)
    │   └── pyodide.ts              # Client-side Pyodide executor (WASM)
    └── interpreter/
        ├── instrumentors/
        │   ├── python.ts           # Python sys.settrace injector
        │   └── cpp.ts              # C++ cerr macro injector
        └── parsers/
            └── traceParser.ts      # Parses __TRACE__ JSON lines into steps
```

---

## 📊 Supported Data Structures

| Structure | 2D Rendering | 3D Rendering |
|-----------|:---:|:---:|
| **Arrays** | Colored cells with index labels | Extruded bars with sky-blue glass material |
| **2D Grids / Matrices** | Table with row/col headers | Indigo tile floor with amber change glow |
| **Linked Lists** | SVG nodes with arrows (`data \| next`) | Emerald chain with red NULL terminator |
| **Graphs** (adjacency list) | Force-directed SVG with state colors | Physical spheres with emissive state glow |
| **Trees** (binary) | Structured graph layout | 3D sphere hierarchy |
| **Stacks** | Vertical list | Blue extruded blocks with TOP indicator |
| **Queues** | Horizontal list | Yellow blocks with FRONT/BACK labels |
| **Scalars** | Badge with change indicator | Text billboard |
| **Dictionaries** | Key-value table | 3D key-value pairs |

---

## 🎨 Algorithm Library (50+)

### Python
| Category | Algorithms |
|----------|-----------|
| **Searching** | Linear Search, Binary Search, Rotated Array Search, Median of Sorted Arrays |
| **Sorting** | Bubble, Selection, Insertion, Merge, Quick, Counting Sort |
| **Two Pointer** | Two Sum, Trapping Rain Water, Container With Most Water, Move Zeroes, Reverse Array, Max Sliding Window |
| **Dynamic Programming** | Fibonacci, Climbing Stairs, Kadane's, Coin Change, House Robber, 0/1 Knapsack, LIS, LCS, Edit Distance |
| **Graph** | BFS, DFS, Dijkstra, Topological Sort, Cycle Detection |
| **Backtracking** | N-Queens, Sudoku Solver |
| **Linked Lists** | Reverse, Insert, Delete, Merge Two Sorted |
| **Stack & Queue** | Valid Parentheses, Next Greater Element, Min Stack |
| **Math** | Sieve of Eratosthenes |

### C++
| Category | Algorithms |
|----------|-----------|
| **Searching** | Linear Search, Binary Search |
| **Sorting** | Bubble, Selection, Insertion, Merge, Quick, Counting Sort |
| **Two Pointer** | Two Sum, Trapping Rain Water, Container With Most Water, Move Zeroes, Reverse Array |
| **Dynamic Programming** | Fibonacci, Climbing Stairs, Kadane's, Coin Change, House Robber, LIS, LCS, Edit Distance |
| **Graph** | BFS, DFS, Dijkstra |
| **Backtracking** | N-Queens |
| **Math** | Sieve of Eratosthenes |

---

## ⚙️ How It Works

### Python Instrumentation
The Python instrumentor uses `sys.settrace` to capture a full variable snapshot at every line execution. It supports:
- **Primitive types**: `int`, `float`, `str`, `bool`
- **Collections**: `list`, `dict`, `set`, `tuple`
- **Linked list nodes**: Objects with `val`/`value`/`data` + `next`/`nextNode`
- **Tree nodes**: Objects with `val` + `left`/`right`
- **Custom classes**: Via `__dict__` and `__slots__`
- **Large numbers**: Clamped to ±10⁹ to prevent 3D scene explosion
- **Cycle detection**: `seen` set prevents infinite recursion

### C++ Instrumentation
The C++ instrumentor injects `cerr`-based trace macros after each executable statement inside `main()`. It progressively tracks variable declarations and only traces variables after they've been declared, avoiding "variable not declared" compilation errors.

### Visualization Detection
`vizDetector.ts` classifies each variable in the trace snapshot:
- Arrays of numbers → **Bar chart** / **Array row**
- 2D arrays of uniform type → **Grid tiles**
- Objects with `__type__: "linked_list"` → **Linked list view**
- Objects with `__type__: "tree"` → **Tree view**
- Adjacency-list-shaped dicts → **Graph view**
- Primitives → **Scalar badges**

---

## 🛠️ Development

```bash
# Run dev server with Turbopack
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build for production
npm run build
```

### Environment Variables

No environment variables are required for local development. The Godbolt API is public and does not require authentication.

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Ideas for Contribution
- Add more algorithm templates
- Support additional languages (Rust, Go, etc.)
- Add audio feedback for step execution
- Mobile-responsive layout improvements
- Export visualizations as GIF/video

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for DSA learners everywhere.**

[⬆ Back to Top](#-dry-runner--3d-algorithm-visualizer)

</div>
