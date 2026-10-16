export const HEARTBEAT_FRAME = ': ping\n\n';

export function formatEvent(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
