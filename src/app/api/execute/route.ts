import { NextRequest, NextResponse } from "next/server";
import { instrumentPython } from "@/lib/interpreter/instrumentors/python";
import { executeLocal } from "@/lib/execution/local";
import { parseTraceResult } from "@/lib/interpreter/parsers/traceParser";

// ─── Simple in-memory rate limiter ───
let activeRequests = 0;
const MAX_CONCURRENT = 5;
const MAX_CODE_LENGTH = 50 * 1024; // 50kB

export async function POST(req: NextRequest) {
    // Rate limit check
    if (activeRequests >= MAX_CONCURRENT) {
        return NextResponse.json(
            { error: "Too many concurrent requests. Please try again shortly." },
            { status: 429 }
        );
    }

    activeRequests++;
    try {
        const { code, language } = await req.json();

        if (!code || !language) {
            return NextResponse.json({ error: "Code and language are required" }, { status: 400 });
        }

        if (code.length > MAX_CODE_LENGTH) {
            return NextResponse.json(
                { error: `Code too large (${Math.round(code.length / 1024)}kB). Maximum is ${MAX_CODE_LENGTH / 1024}kB.` },
                { status: 400 }
            );
        }

        let instrumentedCode = code;

        if (language === "python" || language === "python3") {
            instrumentedCode = instrumentPython(code);
        } else {
            return NextResponse.json({ error: "Language not yet supported" }, { status: 400 });
        }

        const result = await executeLocal(instrumentedCode);

        // Always try to parse traces from stdout, even if there was an error.
        // This preserves partial traces when code crashes midway (e.g. IndexError).
        const { steps: trace, truncated } = parseTraceResult(result.stdout);

        // Build the response — include both trace and error if applicable
        const response: Record<string, unknown> = {
            trace,
            rawStdout: result.stdout,
            stderr: result.stderr,
        };

        if (truncated) {
            response.warning = "Trace was truncated at 1000 steps. Only a partial execution is shown.";
        }

        // If there was an error but we still got trace data, return it with the error
        if (result.stderr && trace.length === 0) {
            return NextResponse.json({ error: result.stderr }, { status: 500 });
        }

        if (result.stderr) {
            response.error = result.stderr;
        }

        return NextResponse.json(response);
    } catch (error: unknown) {
        console.error("Execution error:", error);
        return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
    } finally {
        activeRequests--;
    }
}

