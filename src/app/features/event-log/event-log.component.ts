import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LOG_EVENT_LABELS, LogEventType } from '../../models/event.model';
import { EventLogService } from '../../core/services/queue/event-log.service';

@Component({
    selector: 'app-event-log',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './event-log.component.html',
    styleUrl: './event-log.component.scss',
})
export class EventLogComponent {
    private readonly TYPE_MODIFIERS: Record<LogEventType, string> = {
        [LogEventType.Added]: 'event-log__item--added',
        [LogEventType.Entered]: 'event-log__item--entered',
        [LogEventType.StatusChanged]: 'event-log__item--status',
        [LogEventType.Removed]: 'event-log__item--removed',
        [LogEventType.Tick]: 'event-log__item--tick',
        [LogEventType.Warning]: 'event-log__item--warning',
        [LogEventType.BufferFull]: 'event-log__item--buffer-full',
        [LogEventType.BufferFreed]: 'event-log__item--buffer-freed',
    };

    public readonly typeLabels = LOG_EVENT_LABELS;

    private readonly eventLog = inject(EventLogService);

    public readonly logs = this.eventLog.events;

    public itemClass(type: LogEventType): string {
        return `event-log__item ${this.TYPE_MODIFIERS[type]}`;
    }
}
