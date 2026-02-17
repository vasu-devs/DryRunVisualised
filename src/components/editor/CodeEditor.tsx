"use client";

import Editor from "@monaco-editor/react";

interface CodeEditorProps {
    code: string;
    language: string;
    onChange: (value: string | undefined) => void;
}

export function CodeEditor({ code, language, onChange }: CodeEditorProps) {
    return (
        <div className="w-full h-full border-r border-slate-800">
            <Editor
                height="100%"
                defaultLanguage={language}
                language={language}
                value={code}
                theme="vs-dark"
                onChange={onChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16 },
                }}
            />
        </div>
    );
}
