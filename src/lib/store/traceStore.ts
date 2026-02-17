import { create } from 'zustand';
import { Trace, TraceStep } from '../interpreter/schema';

interface TraceState {
    trace: Trace;
    currentStepIndex: number;
    isPlaying: boolean;
    playSpeed: number; // ms between steps

    // Actions
    setTrace: (trace: Trace) => void;
    nextStep: () => void;
    prevStep: () => void;
    setStep: (index: number) => void;
    togglePlay: () => void;
    setPlaySpeed: (speed: number) => void;
    reset: () => void;

    // Selectors
    getCurrentStep: () => TraceStep | null;
    getPrevStep: () => TraceStep | null;
}

export const useTraceStore = create<TraceState>((set, get) => ({
    trace: [],
    currentStepIndex: 0,
    isPlaying: false,
    playSpeed: 500,

    setTrace: (trace) => set({ trace, currentStepIndex: 0, isPlaying: false }),

    nextStep: () => set((state) => ({
        currentStepIndex: Math.min(state.currentStepIndex + 1, state.trace.length - 1)
    })),

    prevStep: () => set((state) => ({
        currentStepIndex: Math.max(state.currentStepIndex - 1, 0)
    })),

    setStep: (index) => set((state) => ({
        currentStepIndex: Math.max(0, Math.min(index, state.trace.length - 1))
    })),

    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

    setPlaySpeed: (speed) => set({ playSpeed: speed }),

    reset: () => set({ currentStepIndex: 0, isPlaying: false }),

    getCurrentStep: () => {
        const { trace, currentStepIndex } = get();
        return trace.length > 0 ? trace[currentStepIndex] : null;
    },

    getPrevStep: () => {
        const { trace, currentStepIndex } = get();
        return currentStepIndex > 0 ? trace[currentStepIndex - 1] : null;
    },
}));
