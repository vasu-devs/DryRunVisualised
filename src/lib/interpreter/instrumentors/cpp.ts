/**
 * C++ Instrumentor
 * 
 * Injects tracing code into C++ programs.
 * Strategy: Tracks variable declarations progressively and only
 * includes variables in trace calls AFTER they've been declared.
 * Only injects at safe points (not between if/else).
 */

export const instrumentCpp = (userCode: string): string => {
    const allVarDecls = extractCppVarDeclarations(userCode);
    const userLines = userCode.split('\n');

    // Strip existing includes/using statements
    const filteredLines: string[] = [];
    const lineMapping: number[] = []; // maps filteredLine index -> original line number
    for (let i = 0; i < userLines.length; i++) {
        const t = userLines[i].trim();
        if (t.startsWith('#include') || t === 'using namespace std;') continue;
        filteredLines.push(userLines[i]);
        lineMapping.push(i);
    }

    const result: string[] = [];
    let braceDepth = 0;
    let insideMain = false;
    let mainBraceDepth = 0;
    const declaredVars: CppVar[] = []; // vars declared so far

    for (let fi = 0; fi < filteredLines.length; fi++) {
        const line = filteredLines[fi];
        const t = line.trim();
        const originalLineNum = lineMapping[fi] + 1; // 1-indexed

        result.push(line);

        // Track entering main
        if (t.includes('int main')) insideMain = true;

        // Track brace depth
        const openBraces = (t.match(/{/g) || []).length;
        const closeBraces = (t.match(/}/g) || []).length;
        braceDepth += openBraces - closeBraces;

        if (insideMain && mainBraceDepth === 0 && openBraces > 0) {
            mainBraceDepth = braceDepth;
        }

        // Skip if not inside main
        if (!insideMain || braceDepth < mainBraceDepth) continue;

        // Check if this line declares any of our tracked variables
        for (const vd of allVarDecls) {
            if (!declaredVars.includes(vd) && lineDeclaresVar(t, vd)) {
                declaredVars.push(vd);
            }
        }

        // Skip non-injectable lines
        if (shouldSkipLine(t)) continue;

        // Check if next meaningful line starts with 'else' or '} else'
        if (nextLineIsElse(filteredLines, fi)) continue;

        // Only inject if we have declared vars AND line ends with ;
        if (declaredVars.length > 0 && t.endsWith(';')) {
            const traceExpr = buildCppTraceExpr(declaredVars);
            result.push(`    __et(${originalLineNum}, ${traceExpr});`);
        }
    }

    return buildCppHeader() + result.join('\n');
};

function buildCppTraceExpr(vars: CppVar[]): string {
    const parts = vars.map(v => {
        if (v.type === 'vector_int') return `"\\\"${v.name}\\\":" + __jv(${v.name})`;
        if (v.type === 'vector_double') return `"\\\"${v.name}\\\":" + __jvd(${v.name})`;
        if (v.type === 'vector_string') return `"\\\"${v.name}\\\":" + __jvs(${v.name})`;
        if (v.type === 'vector2d') return `"\\\"${v.name}\\\":" + __jv2d(${v.name})`;
        if (v.type === 'string') return `"\\\"${v.name}\\\":" + __js(${v.name})`;
        if (v.type === 'bool') return `"\\\"${v.name}\\\":" + std::string(${v.name}?"true":"false")`;
        return `"\\\"${v.name}\\\":" + __v(${v.name})`;
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
    if (/^\s*(class |struct |typedef |template)/.test(t)) return true;
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

function lineDeclaresVar(line: string, v: CppVar): boolean {
    // Check if this line contains the declaration of the variable
    const escaped = v.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match "type varName" pattern
    const patterns: RegExp[] = [];
    switch (v.type) {
        case 'vector_int': patterns.push(new RegExp(`vector\\s*<\\s*int\\s*>\\s+${escaped}\\b`)); break;
        case 'vector_double': patterns.push(new RegExp(`vector\\s*<\\s*double\\s*>\\s+${escaped}\\b`)); break;
        case 'vector_string': patterns.push(new RegExp(`vector\\s*<\\s*string\\s*>\\s+${escaped}\\b`)); break;
        case 'vector2d': patterns.push(new RegExp(`vector\\s*<\\s*vector\\s*<\\s*int\\s*>\\s*>\\s+${escaped}\\b`)); break;
        case 'string': patterns.push(new RegExp(`\\bstring\\s+${escaped}\\b`)); break;
        case 'bool': patterns.push(new RegExp(`\\bbool\\s+${escaped}\\b`)); break;
        case 'int': patterns.push(new RegExp(`\\b(?:int|long long|long)\\s+.*\\b${escaped}\\b`)); break;
        case 'double': case 'float': patterns.push(new RegExp(`\\b(?:double|float)\\s+${escaped}\\b`)); break;
        default: patterns.push(new RegExp(`\\b${escaped}\\b`)); break;
    }
    return patterns.some(p => p.test(line));
}

function buildCppHeader(): string {
    return `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <climits>
#include <queue>
#include <stack>
#include <set>
#include <map>
using namespace std;

static int __tc = 0;
template<typename T>
std::string __v(T val) { return std::to_string(val); }
std::string __jv(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += std::to_string(v[i]); }
    return s + "]";
}
std::string __jvd(const std::vector<double>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += std::to_string(v[i]); }
    return s + "]";
}
std::string __jvs(const std::vector<std::string>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += "\\"" + v[i] + "\\""; }
    return s + "]";
}
std::string __jv2d(const std::vector<std::vector<int>>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += __jv(v[i]); }
    return s + "]";
}
std::string __js(const std::string& v) { return "\\"" + v + "\\""; }
void __et(int line, const std::string& vars) {
    if (__tc >= 500) return;
    __tc++;
    std::cerr << "__TRACE__{\\"line\\":" << line
         << ",\\"stack\\":{" << vars
         << "},\\"heap\\":{},\\"stdout\\":\\"\\"}" << std::endl;
}

`;
}

interface CppVar {
    name: string;
    type: 'int' | 'double' | 'float' | 'long' | 'bool' | 'char' | 'string' | 'vector_int' | 'vector_double' | 'vector_string' | 'vector2d';
}

function extractCppVarDeclarations(code: string): CppVar[] {
    const vars: CppVar[] = [];
    const seen = new Set<string>();

    for (const line of code.split('\n')) {
        const t = line.trim();
        if (t.startsWith('#') || t.startsWith('//') || t.startsWith('/*')) continue;

        let m: RegExpMatchArray | null;

        m = t.match(/vector\s*<\s*vector\s*<\s*int\s*>\s*>\s+([a-zA-Z_]\w*)/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'vector2d' }); continue; }

        m = t.match(/vector\s*<\s*int\s*>\s+([a-zA-Z_]\w*)/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'vector_int' }); continue; }

        m = t.match(/vector\s*<\s*double\s*>\s+([a-zA-Z_]\w*)/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'vector_double' }); continue; }

        m = t.match(/vector\s*<\s*string\s*>\s+([a-zA-Z_]\w*)/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'vector_string' }); continue; }

        m = t.match(/\bstring\s+([a-zA-Z_]\w*)\s*[=;,]/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'string' }); continue; }

        m = t.match(/\bbool\s+([a-zA-Z_]\w*)\s*[=;,]/);
        if (m && !seen.has(m[1])) { seen.add(m[1]); vars.push({ name: m[1], type: 'bool' }); continue; }

        m = t.match(/\b(int|long long|long)\s+([a-zA-Z_]\w*)\s*[=;,]/);
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
