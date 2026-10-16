import type { REALTIME_EVENT_NAMES } from './realtime.constants.js';

export type RealtimeEventName = (typeof REALTIME_EVENT_NAMES)[number];

// Minimal on purpose: clients re-fetch the details through the REST API
export interface RealtimeEventData {
    id: number;
    status: string;
    updatedAt: string;
}

export interface RealtimeEvent {
    event: RealtimeEventName;
    data: RealtimeEventData;
}

export interface StreamUser {
    sub: number;
    exp?: number;
}
