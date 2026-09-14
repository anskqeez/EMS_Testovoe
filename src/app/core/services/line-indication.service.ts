import { Injectable, effect, inject, signal } from '@angular/core';
import { EventLogService } from './queue/event-log.service';
import { ProductStatus } from '../../models/product.model';

@Injectable({
    providedIn: 'root',
})
export class LineIndicationService {
    private readonly eventLog = inject(EventLogService);

    private lastSeenTimestamp: number = this.eventLog
        .events()
        .reduce((max, event) => Math.max(max, event.timestamp), 0);

    private entrySeq = 0;
    private exitSeq = 0;

    public readonly entryPulse = signal(0);
    public readonly exitPulse = signal<{ seq: number; status: ProductStatus } | null>(null);

    constructor() {
        effect(() => {
            const events = this.eventLog.events();

            const fresh = events
                .filter((event) => event.timestamp > this.lastSeenTimestamp)
                .sort((a, b) => a.timestamp - b.timestamp);

            if (fresh.length === 0) return;

            this.lastSeenTimestamp = fresh[fresh.length - 1].timestamp;

            for (const event of fresh) {
                if (event.payload?.enterLine) {
                    this.entryPulse.set(++this.entrySeq);
                }

                if (event.payload?.exitLine) {
                    this.exitPulse.set({
                        seq: ++this.exitSeq,
                        status: event.payload.exitLine.status,
                    });
                }
            }
        });
    }
}
