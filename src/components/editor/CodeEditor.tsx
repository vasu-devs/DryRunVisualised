"use client";

import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect } from "react";

interface CodeEditorProps {
    code: string;
    language: string;
    onChange: (value: string | undefined) => void;
}

export function CodeEditor({ code, language, onChange }: CodeEditorProps) {
    const monaco = useMonaco();

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme("neumorphic", {
                base: "vs",
                inherit: true,
                rules: [
                    { token: "comment", foreground: "718096", fontStyle: "italic" },
                    { token: "keyword", foreground: "1A202C", fontStyle: "bold" },
                    { token: "string", foreground: "1A202C" },
                    { token: "number", foreground: "2D3748" },
                    { token: "identifier", foreground: "2D3748" },
                    { token: "type", foreground: "718096", fontStyle: "bold" },
                ],
                colors: {
                    "editor.background": "#ECECEC", // Strict base background
                    "editor.foreground": "#2D3748", // Primary text
                    "editorLineNumber.foreground": "#a0aec0",
                    "editorLineNumber.activeForeground": "#2D3748",
                    "editor.selectionBackground": "#cbd5e1",
                    "editor.inactiveSelectionBackground": "#e2e8f0",
                    "editorCursor.foreground": "#1A202C",
                    "editor.lineHighlightBackground": "#f1f5f950",
                },
            });
        }
    }, [monaco]);
    return (
        <div className="w-full h-full">
            <Editor
                height="100%"
                defaultLanguage={language}
                language={language}
                value={code}
                theme="neumorphic"
                onChange={onChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16 },
                    renderLineHighlight: "all",
                    hideCursorInOverviewRuler: true,
                    overviewRulerBorder: false,
                }}
            />
        </div>
    );
}
