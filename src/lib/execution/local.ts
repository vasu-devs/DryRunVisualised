/**
 * Local Python Executor
 * 
 * Executes Python code locally using child_process.
 * Used as the primary execution engine (replacing Piston API).
 */

import { execFile } from "child_process";

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    code: number;
}

export const executeLocal = (code: string): Promise<ExecutionResult> => {
    return new Promise((resolve, _reject) => {
        const timeout = 15000; // 15 second timeout

        const pyCmd = process.platform === "win32" ? "python" : "python3";

        execFile(
            pyCmd,
            ["-c", code],
            {
                timeout,
                maxBuffer: 1024 * 1024 * 5, // 5MB
                env: { ...process.env, PYTHONUNBUFFERED: "1" },
            },
            (error, stdout, stderr) => {
                // Handle maxBuffer exceeded gracefully
                if (error && 'code' in error && error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
                    resolve({
                        stdout: stdout || "",
                        stderr: "Output exceeded maximum buffer size (5MB). Your code may have an infinite loop or excessive print statements.",
                        code: 1,
                    });
                    return;
                }

                // Handle timeout gracefully
                if (error && 'killed' in error && error.killed) {
                    resolve({
                        stdout: stdout || "",
                        stderr: "Execution timed out after 15 seconds. Your code may contain an infinite loop.",
                        code: 1,
                    });
                    return;
                }

                resolve({
                    stdout: stdout || "",
                    stderr: stderr || "",
                    code: error?.code !== undefined ? (typeof error.code === 'number' ? error.code : 1) : 0,
                });
            }
        );
    });
};
