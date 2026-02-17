import { Trace, TraceStepSchema } from "../schema";

/**
 * Parses raw execution output from the backend.
 * Extracts lines prefixed with __TRACE__ and validates them.
 */
export const parseTrace = (stdout: string): Trace => {
    const steps: any[] = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
        if (line.startsWith("__TRACE__")) {
            try {
                const jsonStr = line.replace("__TRACE__", "");
                const rawStep = JSON.parse(jsonStr);
                const parsed = TraceStepSchema.safeParse(rawStep);
                if (parsed.success) {
                    steps.push(parsed.data);
                }
            } catch (e) {
                console.error("Failed to parse trace line:", line, e);
            }
        }
    }

    return steps;
};
