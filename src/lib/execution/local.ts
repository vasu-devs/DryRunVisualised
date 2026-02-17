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
    return new Promise((resolve, reject) => {
        const timeout = 15000; // 15 second timeout

        const proc = execFile(
            "python3",
            ["-c", code],
            {
                timeout,
                maxBuffer: 1024 * 1024 * 5, // 5MB
                env: { ...process.env, PYTHONUNBUFFERED: "1" },
            },
            (error, stdout, stderr) => {
                resolve({
                    stdout: stdout || "",
                    stderr: stderr || "",
                    code: error?.code !== undefined ? (typeof error.code === 'number' ? error.code : 1) : 0,
                });
            }
        );
    });
};
