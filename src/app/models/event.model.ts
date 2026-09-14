import { ProductStatus } from './product.model';

export enum LogEventType {
    Added = 'added',
    Entered = 'entered',
    StatusChanged = 'status-changed',
    Removed = 'removed',
    Tick = 'tick',
    Warning = 'warning',
    BufferFull = 'buffer-full',
    BufferFreed = 'buffer-freed',
}

export const LOG_EVENT_LABELS: Record<LogEventType, string> = {
    [LogEventType.Added]: 'Добавлен',
    [LogEventType.Entered]: 'Вход',
    [LogEventType.StatusChanged]: 'Статус',
    [LogEventType.Removed]: 'Удален',
    [LogEventType.Tick]: 'Такт',
    [LogEventType.Warning]: 'Предупреждение',
    [LogEventType.BufferFull]: 'Буфер полон',
    [LogEventType.BufferFreed]: 'Буфер освобожден',
};

export interface LogEventPayload {
    enterLine?: { productId: string };
    exitLine?: { productId: string; status: ProductStatus };
}

export interface LogEvent {
    id: string;
    timestamp: number;
    type: LogEventType;
    message: string;
    payload?: LogEventPayload;
}
