export const GLOBAL_ROOM = 'global';

export const HISTORY_LIMIT = 100;
export const RATE_LIMIT_WINDOW_SEC = 5;
export const RATE_LIMIT_MAX = 5;

export const roomKey = (room: string) => `chat:messages:${room}`;
