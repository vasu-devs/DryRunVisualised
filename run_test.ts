import fs from 'fs';
import { instrumentPython } from './src/lib/interpreter/instrumentors/python';
import { executeLocal } from './src/lib/execution/local';
import { parseTrace } from './src/lib/interpreter/parsers/traceParser';
import { detectVizType } from './src/lib/vizDetector';

async function run() {
    const code = fs.readFileSync('aho_test.py', 'utf8');
    const instrumented = instrumentPython(code);
    const result = await executeLocal(instrumented);

    if (result.stderr) {
        console.error("STDERR:", result.stderr);
        if (!result.stdout.includes("__TRACE__")) return;
    }

    const trace = parseTrace(result.stdout);
    console.log("Trace parsed successfully. Number of steps:", trace.length);
    console.log("Last step stack keys:", Object.keys(trace[trace.length - 1].stack));
    // Check if root is safely serialized
    const rootVar = trace[trace.length - 1].stack['root'];
    console.log("Root variable structure:", JSON.stringify(rootVar, null, 2));

    const vizContext = detectVizType(trace);
    console.log("Detected Visualization Context:", JSON.stringify(vizContext, null, 2));
}

run().catch(console.error);
