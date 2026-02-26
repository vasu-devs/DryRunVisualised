/**
 * Client-Side Python Executor using Pyodide (WebAssembly)
 * 
 * Runs Python code entirely in the browser using Pyodide.
 * No server-side Python installation required — works on Vercel, Netlify, etc.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodideInstance: any = null;
let loadingPromise: Promise<void> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

async function loadPyodide(): Promise<void> {
    if (pyodideInstance) return;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        // Dynamically load Pyodide from CDN
        if (typeof window !== "undefined" && !window.loadPyodide) {
            await new Promise<void>((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Failed to load Pyodide"));
                document.head.appendChild(script);
            });
        }

        pyodideInstance = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
        });
    })();

    return loadingPromise;
}

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    code: number;
}

export async function executePyodide(code: string): Promise<ExecutionResult> {
    await loadPyodide();

    // Collect ALL output (including __TRACE__ lines printed to sys.__stdout__)
    // by redirecting both stdout and __stdout__ to a capture buffer
    const capturedOutput: string[] = [];

    pyodideInstance.setStdout({
        batched: (text: string) => {
            capturedOutput.push(text);
        }
    });

    pyodideInstance.setStderr({
        batched: (text: string) => {
            capturedOutput.push(text);
        }
    });

    try {
        pyodideInstance.runPython(code);

        const stdout = capturedOutput.join("\n");
        return { stdout, stderr: "", code: 0 };
    } catch (error: unknown) {
        const stdout = capturedOutput.join("\n");
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If we got traces before the error, still return them
        if (stdout.includes("__TRACE__")) {
            return { stdout, stderr: errorMessage, code: 1 };
        }

        return { stdout, stderr: errorMessage, code: 1 };
    }
}

export function isPyodideLoaded(): boolean {
    return pyodideInstance !== null;
}
