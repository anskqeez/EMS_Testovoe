import { inject, Injectable, signal } from '@angular/core';
import { LogEvent, LogEventPayload, LogEventType } from '../../../models/event.model';
import { StorageService } from '../storage/storage.service';

/**
 * Агрегат журнала событий: хранит не более MAX_ENTRIES записей,
 * сам отвечает за свою персистентность
 */
@Injectable({
    providedIn: 'root',
})
export class EventLogService {
    private readonly storage = inject(StorageService);
    private readonly STORAGE_KEY = 'fifo_logs';
    private readonly MAX_ENTRIES = 20;

    private readonly _events = signal<LogEvent[]>(
        this.storage.load<LogEvent[]>(this.STORAGE_KEY, []),
    );

    public readonly events = this._events.asReadonly();

    constructor() {
        this.storage.bind(this.STORAGE_KEY, () => this._events());
    }

    public add(type: LogEventType, message: string, payload?: LogEventPayload): void {
        const event: LogEvent = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type,
            message,
            ...(payload !== undefined && { payload }),
        };
        this._events.update((events) => [event, ...events].slice(0, this.MAX_ENTRIES));
    }
}
