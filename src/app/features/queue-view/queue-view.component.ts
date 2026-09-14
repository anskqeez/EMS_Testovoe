import {
    AfterViewInit,
    Component,
    ElementRef,
    OnDestroy,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { QueueFacadeService } from '../../core/services/queue/queue-facade.service';
import { LineIndicationService } from '../../core/services/line-indication.service';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { WaitingZoneComponent } from '../waiting-zone/waiting-zone.component';
import { ProductStatus } from '../../models/product.model';
import { withViewTransition } from '../../core/utils/view-transition.util';

@Component({
    selector: 'app-queue-view',
    standalone: true,
    imports: [ProductCardComponent, WaitingZoneComponent],
    templateUrl: './queue-view.component.html',
    styleUrl: './queue-view.component.scss',
    host: {
        '(window:resize)': 'onBeltScroll()',
    },
})
export class QueueViewComponent implements AfterViewInit, OnDestroy {
    private readonly queue = inject(QueueFacadeService);
    private readonly indication = inject(LineIndicationService);

    private readonly beltElement = viewChild<ElementRef<HTMLDivElement>>('belt');
    private readonly sensorInElement = viewChild<ElementRef<HTMLDivElement>>('sensorIn');
    private readonly sensorOutElement = viewChild<ElementRef<HTMLDivElement>>('sensorOut');
    private scrollRaf: number | null = null;

    private lastEntrySeq = 0;
    private lastExitSeq = 0;

    public readonly visibleSlots = signal<boolean[]>([]);

    public readonly belt = this.queue.belt;
    public readonly maxSize = this.queue.MAX_QUEUE_SIZE;
    public readonly waiting = this.queue.waiting;
    public readonly isExitOccupied = this.queue.isExitOccupied;

    constructor() {
        effect(() => {
            const entrySeq = this.indication.entryPulse();

            if (entrySeq !== this.lastEntrySeq) {
                this.lastEntrySeq = entrySeq;

                if (entrySeq > 0) {
                    this.triggerEntryPulse();
                }
            }

            const exit = this.indication.exitPulse();

            if (exit !== null && exit.seq !== this.lastExitSeq) {
                this.lastExitSeq = exit.seq;

                this.triggerExitPulse(exit.status);
            }
        });
    }

    public ngAfterViewInit(): void {
        this.updateVisibleSlots();
    }

    public ngOnDestroy(): void {
        if (this.scrollRaf !== null) {
            cancelAnimationFrame(this.scrollRaf);
        }
    }

    public onBeltScroll(): void {
        if (this.scrollRaf !== null) return;
        this.scrollRaf = requestAnimationFrame(() => {
            this.scrollRaf = null;
            this.updateVisibleSlots();
        });
    }

    public onStatusChange(productId: string, newStatus: ProductStatus): void {
        withViewTransition(() => this.queue.updateProductStatus(productId, newStatus));
    }

    public onRemove(productId: string): void {
        withViewTransition(() => this.queue.removeProduct(productId));
    }

    private triggerEntryPulse(): void {
        this.pulseSensor(this.sensorInElement()?.nativeElement ?? null, '--accent');
    }

    private triggerExitPulse(status: ProductStatus): void {
        this.pulseSensor(
            this.sensorOutElement()?.nativeElement ?? null,
            status === ProductStatus.Rejected ? '--danger' : '--success',
        );
    }

    private pulseSensor(el: HTMLElement | null, colorVar: string): void {
        if (!el) return;

        el.getAnimations().forEach((animation) => animation.cancel());
        el.animate(
            [
                { boxShadow: `0 0 0 0 color-mix(in srgb, var(${colorVar}) 55%, transparent)` },
                { boxShadow: '0 0 0 16px transparent', offset: 0.7 },
                { boxShadow: '0 0 0 0 transparent' },
            ],
            { duration: 900, easing: 'ease-out' },
        );
    }

    private updateVisibleSlots(): void {
        const belt = this.beltElement()?.nativeElement;
        if (!belt) return;

        const beltRect = belt.getBoundingClientRect();
        const rounding = 2; // допуск на субпиксельное округление

        this.visibleSlots.set(
            Array.from(belt.children, (child) => {
                const rect = child.getBoundingClientRect();
                return (
                    rect.left >= beltRect.left - rounding && rect.right <= beltRect.right + rounding
                );
            }),
        );
    }
}
