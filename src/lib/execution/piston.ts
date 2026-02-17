/**
 * Piston API Client
 * 
 * Executes code using the Piston API.
 * Defaults to the public instance if no URL is provided.
 */

const PISTON_URL = process.env.PISTON_URL || "https://emkc.org/api/v2/piston/execute";

export interface PistonResult {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
}

export const executePiston = async (
    language: string,
    version: string,
    content: string
): Promise<PistonResult> => {
    const response = await fetch(PISTON_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            language,
            version: version || "*",
            files: [{ content }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Piston API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.run;
};
