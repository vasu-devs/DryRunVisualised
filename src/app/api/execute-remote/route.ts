/**
 * Remote Code Execution via Godbolt Compiler Explorer API
 * 
 * Proxied through a Next.js API route to avoid CORS issues.
 * Supports C++ and Java. Python uses client-side Pyodide.
 * Works on Vercel since it only makes HTTP requests.
 */

import { NextRequest, NextResponse } from "next/server";
import { instrumentCpp } from "@/lib/interpreter/instrumentors/cpp";
import { instrumentJava } from "@/lib/interpreter/instrumentors/java";
import { parseTrace } from "@/lib/interpreter/parsers/traceParser";

const GODBOLT_API = "https://godbolt.org/api/compiler";

const COMPILER_MAP: Record<string, { id: string; args: string }> = {
    cpp: { id: "g141", args: "-std=c++17 -O0" },
    "c++": { id: "g141", args: "-std=c++17 -O0" },
    java: { id: "java2102", args: "" },
};

interface GodboltLine {
    text: string;
}

interface GodboltResult {
    code?: number;
    stdout?: GodboltLine[];
    stderr?: GodboltLine[];
    execResult?: {
        code?: number;
        stdout?: GodboltLine[];
        stderr?: GodboltLine[];
        buildResult?: {
            code?: number;
            stderr?: GodboltLine[];
        };
    };
    buildResult?: {
        code?: number;
        stderr?: GodboltLine[];
    };
}

export async function POST(req: NextRequest) {
    try {
        const { code, language } = await req.json();

        if (!code || !language) {
            return NextResponse.json({ error: "Code and language are required" }, { status: 400 });
        }

        const lang = language.toLowerCase();
        const compilerConfig = COMPILER_MAP[lang];

        if (!compilerConfig) {
            return NextResponse.json({ error: `Language "${language}" is not supported. Use cpp or java.` }, { status: 400 });
        }

        // Instrument the code
        let instrumentedCode: string;
        if (lang === "cpp" || lang === "c++") {
            instrumentedCode = instrumentCpp(code);
        } else if (lang === "java") {
            instrumentedCode = instrumentJava(code);
        } else {
            return NextResponse.json({ error: "Language not supported" }, { status: 400 });
        }

        // Call Godbolt Compiler Explorer API
        const response = await fetch(`${GODBOLT_API}/${compilerConfig.id}/compile`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                source: instrumentedCode,
                options: {
                    userArguments: compilerConfig.args,
                    executeParameters: { args: [], stdin: "" },
                    compilerOptions: { executorRequest: true },
                    filters: { execute: true },
                },
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            return NextResponse.json({ error: `Compiler API error (${response.status}): ${text}` }, { status: 502 });
        }

        const result: GodboltResult = await response.json();

        // Check for build/compile errors
        const buildErrors = result.buildResult?.stderr || result.execResult?.buildResult?.stderr || [];
        if (buildErrors.length > 0) {
            const errorText = buildErrors.map(l => l.text).join("\n");
            // Check if it's just warnings (still compiled successfully)
            const execStderr = result.execResult?.stderr || result.stderr || [];
            if (execStderr.length === 0 && !errorText.includes("__TRACE__")) {
                return NextResponse.json({ error: `Compilation Error:\n${errorText}` }, { status: 400 });
            }
        }

        // Collect output: traces are printed to stderr via cerr/System.err
        const execStdout = result.execResult?.stdout || result.stdout || [];
        const execStderr = result.execResult?.stderr || result.stderr || [];

        const allOutput = [
            ...execStdout.map(l => l.text),
            ...execStderr.map(l => l.text),
        ].join("\n");

        if (!allOutput.includes("__TRACE__")) {
            const buildErrorStr = buildErrors.map(l => l.text).join("\n");
            return NextResponse.json({
                error: buildErrorStr
                    ? `Compilation Error:\n${buildErrorStr}`
                    : `No trace output generated. Raw output:\n${allOutput || "(empty)"}`,
            }, { status: 400 });
        }

        const trace = parseTrace(allOutput);

        return NextResponse.json({ trace, rawStdout: allOutput, stderr: "" });
    } catch (error: unknown) {
        console.error("Remote execution error:", error);
        return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
    }
}
