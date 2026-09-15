import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useSmsCandidateRepository, RawSmsEvent } from './SmsCandidateRepository';
import { SmsPermissionService } from './SmsPermissionService';
import { apiClient } from '../../api/client';

export class SmsDetectionService {
    private static isInitialized = false;
    private static emitter: NativeEventEmitter | null = null;

    static initialize() {
        if (this.isInitialized || Platform.OS !== 'android') return;

        const { SmsModule } = NativeModules;
        if (!SmsModule) {
            console.warn('SmsModule is not linked natively');
            return;
        }

        this.emitter = new NativeEventEmitter(SmsModule);
        
        this.emitter.addListener('onSmsReceived', (event: RawSmsEvent) => {
            console.log('Received SMS from JS side:', event.sender);
            
            // Basic pre-filter (ignore obvious non-financial senders like 5 digit shortcodes for general spam if desired)
            // But we let backend do the heavy lifting
            
            // Push to local queue
            useSmsCandidateRepository.getState().addCandidate(event);
            
            // Attempt sync
            this.syncQueue();
        });

        this.isInitialized = true;
    }

    static async syncQueue() {
        const repo = useSmsCandidateRepository.getState();
        const pending = repo.queue.filter(c => c.status === 'PENDING_SYNC' || c.status === 'FAILED');
        
        if (pending.length === 0) return;

        try {
            const deviceId = await SmsPermissionService.getDeviceId();
            
            const payload = pending.map(c => ({
                messageHash: c.messageHash,
                sender: c.sender,
                body: c.body,
                receivedAt: new Date(c.timestamp).toISOString()
            }));

            // Sync with backend
            const response = await apiClient.post('/automation/candidates/sync', { candidates: payload }, {
                headers: { 'x-device-id': deviceId }
            });

            // Mark successful
            // In a real app we'd map backend results back to local IDs
            for (const c of pending) {
                repo.markSynced(c.id);
            }
        } catch (error) {
            console.error('Failed to sync SMS queue', error);
            // Mark failed to retry later
            for (const c of pending) {
                repo.markFailed(c.id);
            }
        }
    }
}
