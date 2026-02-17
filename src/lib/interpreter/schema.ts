import { z } from "zod";

/**
 * Represents an object on the heap. 
 * For v1, we focus on arrays and simple objects.
 */
export const HeapObjectSchema = z.object({
    type: z.enum(["array", "object", "list_node", "tree_node", "other"]),
    value: z.any(),
});

/**
 * A single step in the code execution trace.
 */
export const TraceStepSchema = z.object({
    line: z.number().describe("The line number currently being executed"),
    stack: z.record(z.string(), z.any()).describe("Map of variable names to their current values"),
    heap: z.record(z.string(), HeapObjectSchema).describe("Map of memory addresses to heap objects"),
    stdout: z.string().describe("Cumulative or incremental stdout at this step"),
});

/**
 * The full execution trace.
 */
export const TraceSchema = z.array(TraceStepSchema);

export type HeapObject = z.infer<typeof HeapObjectSchema>;
export type TraceStep = z.infer<typeof TraceStepSchema>;
export type Trace = z.infer<typeof TraceSchema>;
