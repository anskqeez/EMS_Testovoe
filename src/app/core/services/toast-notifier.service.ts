import { effect, inject, Injectable } from '@angular/core';
import { LogEvent, LogEventType } from '../../models/event.model';
import { EventLogService } from './queue/event-log.service';
import { ToastService, ToastType } from './toast.service';

/**
 * UI-проекция потока доменных событий: определяет, какие события
 * достойны всплывающего уведомления и в каком стиле.
 * Единственное место, где «политика уведомлений» отделена от домена
 */
@Injectable({
    providedIn: 'root',
})
export class ToastNotifierService {
    private readonly eventLog = inject(EventLogService);
    private readonly toastService = inject(ToastService);

    private readonly TOAST_BY_EVENT: Partial<Record<LogEventType, ToastType>> = {
        [LogEventType.Warning]: 'warning',
        [LogEventType.BufferFull]: 'warning',
        [LogEventType.BufferFreed]: 'success',
    };

    private lastProcessedEventId: string | null;

    constructor() {
        this.lastProcessedEventId = this.eventLog.events()[0]?.id ?? null;

        effect(() => {
            const events = this.eventLog.events();

            const fresh: LogEvent[] = [];
            for (const event of events) {
                if (event.id === this.lastProcessedEventId) break;

                fresh.push(event);
            }

            if (fresh.length === 0) return;

            this.lastProcessedEventId = events[0].id;

            for (const event of fresh.reverse()) {
                const toastType = this.TOAST_BY_EVENT[event.type];

                if (toastType) {
                    this.toastService.show(event.message, toastType);
                }
            }
        });
    }
}
