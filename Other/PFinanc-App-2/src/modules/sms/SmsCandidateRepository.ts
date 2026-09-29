import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RawSmsEvent {
    sender: string;
    body: string;
    timestamp: number;
    messageHash: string;
}

export interface SyncCandidate extends RawSmsEvent {
    id: string; // local uuid
    status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
    attempts: number;
}

interface SmsCandidateState {
    queue: SyncCandidate[];
    addCandidate: (event: RawSmsEvent) => void;
    markSynced: (id: string) => void;
    markFailed: (id: string) => void;
    clearQueue: () => void;
}

export const useSmsCandidateRepository = create<SmsCandidateState>()(
    persist(
        (set) => ({
            queue: [],
            addCandidate: (event) =>
                set((state) => {
                    // Prevent local duplicate
                    if (state.queue.find(c => c.messageHash === event.messageHash)) return state;

                    const candidate: SyncCandidate = {
                        ...event,
                        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
                        status: 'PENDING_SYNC',
                        attempts: 0
                    };
                    return { queue: [...state.queue, candidate] };
                }),
            markSynced: (id) =>
                set((state) => ({
                    queue: state.queue.map(c => c.id === id ? { ...c, status: 'SYNCED' } : c)
                })),
            markFailed: (id) =>
                set((state) => ({
                    queue: state.queue.map(c => c.id === id ? { ...c, status: 'FAILED', attempts: c.attempts + 1 } : c)
                })),
            clearQueue: () => set({ queue: [] }),
        }),
        {
            name: 'sms-candidate-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
