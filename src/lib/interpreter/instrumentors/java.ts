/**
 * Java Instrumentor
 * 
 * Injects tracing code into Java programs.
 * Uses System.err to output __TRACE__ JSON lines.
 * Progressive variable tracking: only references variables after declaration.
 * Safe injection: never between if/else chains.
 */

export const instrumentJava = (userCode: string): string => {
    const allVarDecls = extractJavaVarDeclarations(userCode);
    const userLines = userCode.split('\n');

    // Strip imports and fix 'public class' -> 'class' for Godbolt compatibility
    const filteredLines: string[] = [];
    const lineMapping: number[] = [];
    for (let i = 0; i < userLines.length; i++) {
        if (userLines[i].trim().startsWith('import ')) continue;
        // Godbolt requires non-public class
        let line = userLines[i].replace(/public\s+class\s+/, 'class ');
        filteredLines.push(line);
        lineMapping.push(i);
    }

    const result: string[] = [];
    let braceDepth = 0;
    let inMethod = false;
    let methodBraceDepth = 0;
    const declaredVars: JavaVar[] = [];

    for (let fi = 0; fi < filteredLines.length; fi++) {
        const line = filteredLines[fi];
        const t = line.trim();
        const originalLineNum = lineMapping[fi] + 1;

        result.push(line);

        const openBraces = (t.match(/{/g) || []).length;
        const closeBraces = (t.match(/}/g) || []).length;
        braceDepth += openBraces - closeBraces;

        if (t.includes('static void main')) {
            inMethod = true;
            // methodBraceDepth set when we see the opening brace
        }
        if (inMethod && methodBraceDepth === 0 && openBraces > 0) {
            methodBraceDepth = braceDepth;
        }

        if (!inMethod || braceDepth < methodBraceDepth) continue;

        // Track variable declarations
        for (const vd of allVarDecls) {
            if (!declaredVars.includes(vd) && lineDeclaresJavaVar(t, vd)) {
                declaredVars.push(vd);
            }
        }

        // Skip non-injectable lines
        if (shouldSkipLine(t)) continue;
        if (nextLineIsElse(filteredLines, fi)) continue;

        if (declaredVars.length > 0 && t.endsWith(';')) {
            const traceExpr = buildJavaTraceExpr(declaredVars);
            result.push(`            __et(${originalLineNum}, ${traceExpr});`);
        }
    }

    // Inject trace helpers inside the class
    const traceHelpers = `
    static int __tc = 0;
    static String __ja(int[] a) {
        StringBuilder s = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) s.append(","); s.append(a[i]); }
        return s.append("]").toString();
    }
    static String __jad(double[] a) {
        StringBuilder s = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) s.append(","); s.append(a[i]); }
        return s.append("]").toString();
    }
    static String __ja2d(int[][] a) {
        StringBuilder s = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) s.append(","); s.append(__ja(a[i])); }
        return s.append("]").toString();
    }
    static String __jstr(String v) { return v == null ? "null" : "\\"" + v + "\\""; }
    static void __et(int line, String vars) {
        if (__tc >= 500) return;
        __tc++;
        System.err.println("__TRACE__{\\"line\\":" + line + ",\\"stack\\":{" + vars + "},\\"heap\\":{},\\"stdout\\":\\"\\"}");
    }
`;

    // Find the class opening brace and inject helpers
    const classIdx = result.findIndex(l => /^\s*(public\s+)?class\s+\w+/.test(l.trim()));
    if (classIdx !== -1) {
        let braceIdx = classIdx;
        while (braceIdx < result.length && !result[braceIdx].includes('{')) braceIdx++;
        result.splice(braceIdx + 1, 0, traceHelpers);
    }

    return 'import java.util.*;\n' + result.join('\n');
};

function buildJavaTraceExpr(vars: JavaVar[]): string {
    const parts = vars.map(v => {
        if (v.type === 'array_int') return `"\\\"${v.name}\\\":" + __ja(${v.name})`;
        if (v.type === 'array_double') return `"\\\"${v.name}\\\":" + __jad(${v.name})`;
        if (v.type === 'array2d') return `"\\\"${v.name}\\\":" + __ja2d(${v.name})`;
        if (v.type === 'string') return `"\\\"${v.name}\\\":" + __jstr(${v.name})`;
        if (v.type === 'boolean') return `"\\\"${v.name}\\\":" + ${v.name}`;
        return `"\\\"${v.name}\\\":" + ${v.name}`;
    });
    return parts.join(' + "," + ');
}

function shouldSkipLine(t: string): boolean {
    if (!t) return true;
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return true;
    if (t === '{' || t === '}') return true;
    if (/^\s*(if|else\s+if|else)\s*/.test(t)) return true;
    if (/^\s*(for|while)\s*\(/.test(t)) return true;
    if (t.startsWith('return') || t.startsWith('break') || t.startsWith('continue')) return true;
    if (/^\s*(public\s+)?class\s/.test(t)) return true;
    if (t.includes('static void main')) return true;
    return false;
}

function nextLineIsElse(lines: string[], idx: number): boolean {
    for (let j = idx + 1; j < lines.length; j++) {
        const nt = lines[j].trim();
        if (nt && !nt.startsWith('//')) {
            return nt.startsWith('else') || nt.startsWith('} else');
        }
    }
    return false;
}

function lineDeclaresJavaVar(line: string, v: JavaVar): boolean {
    const escaped = v.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    switch (v.type) {
        case 'array_int': return new RegExp(`int\\s*\\[\\]\\s+${escaped}\\b`).test(line);
        case 'array_double': return new RegExp(`double\\s*\\[\\]\\s+${escaped}\\b`).test(line);
        case 'array2d': return new RegExp(`int\\s*\\[\\]\\[\\]\\s+${escaped}\\b`).test(line);
        case 'string': return new RegExp(`String\\s+${escaped}\\b`).test(line);
        case 'boolean': return new RegExp(`boolean\\s+${escaped}\\b`).test(line);
        case 'int': return new RegExp(`\\b(?:int|long)\\s+.*\\b${escaped}\\b`).test(line);
        case 'double': case 'float': return new RegExp(`\\b(?:double|float)\\s+${escaped}\\b`).test(line);
        default: return false;
    }
}

interface JavaVar {
    name: string;
    type: 'int' | 'long' | 'double' | 'float' | 'string' | 'boolean' | 'char' | 'array_int' | 'array_double' | 'array2d';
}

function extractJavaVarDeclarations(code: string): JavaVar[] {
    const vars: JavaVar[] = [];
    const seen = new Set<string>();

    for (const line of code.split('\n')) {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('import ') ||
            t.startsWith('class ') || t.startsWith('public class')) continue;

        let m: RegExpMatchArray | null;

        m = t.match(/int\s*\[\]\[\]\s+([a-zA-Z_]\w*)\s*[=;]/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'array2d' }); continue; }

        m = t.match(/int\s*\[\]\s+([a-zA-Z_]\w*)\s*[=;]/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'array_int' }); continue; }

        m = t.match(/double\s*\[\]\s+([a-zA-Z_]\w*)\s*[=;]/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'array_double' }); continue; }

        m = t.match(/String\s+([a-zA-Z_]\w*)\s*[=;,]/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'string' }); continue; }

        m = t.match(/boolean\s+([a-zA-Z_]\w*)\s*[=;,]/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'boolean' }); continue; }

        m = t.match(/\b(int|long)\s+([a-zA-Z_]\w*)\s*[=;,]/);
        if (m && !seen.has(m[2])) { seen.add(m[2]); vars.push({ name: m[2], type: 'int' }); }

        const multiMatch = t.match(/\b(?:int|long)\s+\w+\s*=[^,;]*,\s*([a-zA-Z_]\w*)\s*[=;]/);
        if (multiMatch && !seen.has(multiMatch[1])) {
            seen.add(multiMatch[1]);
            vars.push({ name: multiMatch[1], type: 'int' });
        }

        m = t.match(/\b(double|float)\s+([a-zA-Z_]\w*)\s*[=;,]/);
        if (m && !seen.has(m[2])) { seen.add(m[2]); vars.push({ name: m[2], type: m[1] as 'double' | 'float' }); }
    }

    return vars;
}
