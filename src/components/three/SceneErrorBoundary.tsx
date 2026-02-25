"use client";
import React, { Component, ErrorInfo, ReactNode } from 'react';

export class SceneErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }, { hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        console.error('SceneErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', zIndex: 9999, position: 'absolute', background: 'white', width: '100%', height: '100%', overflow: 'auto' }}>
                    <h1>3D Scene Crashed</h1>
                    <pre>{this.state.error?.toString()}</pre>
                    <pre>{this.state.errorInfo?.componentStack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}
