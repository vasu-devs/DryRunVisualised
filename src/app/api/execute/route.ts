import { NextRequest, NextResponse } from "next/server";
import { instrumentPython } from "@/lib/interpreter/instrumentors/python";
import { executeLocal } from "@/lib/execution/local";
import { parseTrace } from "@/lib/interpreter/parsers/traceParser";

export async function POST(req: NextRequest) {
    try {
        const { code, language } = await req.json();

        if (!code || !language) {
            return NextResponse.json({ error: "Code and language are required" }, { status: 400 });
        }

        let instrumentedCode = code;

        if (language === "python" || language === "python3") {
            instrumentedCode = instrumentPython(code);
        } else {
            return NextResponse.json({ error: "Language not yet supported" }, { status: 400 });
        }

        const result = await executeLocal(instrumentedCode);

        if (result.stderr && !result.stdout.includes("__TRACE__")) {
            return NextResponse.json({ error: result.stderr }, { status: 500 });
        }

        const trace = parseTrace(result.stdout);

        return NextResponse.json({ trace, rawStdout: result.stdout, stderr: result.stderr });
    } catch (error: any) {
        console.error("Execution error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

