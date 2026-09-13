import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { QueueFacadeService } from '../../core/services/queue/queue-facade.service';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { WaitingZoneComponent } from '../waiting-zone/waiting-zone.component';
import { ConveyorSlot } from '../../models/conveyor.model';
import { ProductStatus } from '../../models/product.model';
import { withViewTransition } from '../../core/utils/view-transition.util';

@Component({
    selector: 'app-queue-view',
    standalone: true,
    imports: [ProductCardComponent, WaitingZoneComponent],
    templateUrl: './queue-view.component.html',
    styleUrl: './queue-view.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(window:resize)': 'onBeltScroll()',
    },
})
export class QueueViewComponent implements AfterViewInit, OnDestroy {
    private readonly queue = inject(QueueFacadeService);

    private readonly beltElement = viewChild<ElementRef<HTMLDivElement>>('conveyorBelt');
    private readonly sensorInElement = viewChild<ElementRef<HTMLDivElement>>('sensorIn');
    private readonly sensorOutElement = viewChild<ElementRef<HTMLDivElement>>('sensorOut');
    private scrollRaf: number | null = null;

    /**
     * id продукта в слоте 0 на момент инициализации:
     * восстановление состояния после перезагрузки не должно мигать датчиком
     */
    private previousEntryId: string | null = this.queue.belt()[0]?.id ?? null;

    /** Снимок ленты для детекта выхода продукта через датчик отбраковки */
    private previousBelt: readonly ConveyorSlot[] = this.queue.belt();

    /**
     * Слоты, полностью помещающиеся в скроллпорт: только они получают
     * view-transition-name. Частично видимая ячейка у края — «занавес»:
     * её карточки не снимаются VT (иначе снапшот рисовался бы поверх
     * кромки ленты, т.к. VT-слой не наследует overflow-клиппинг предка).
     * Полностью скрытые слоты не снимаются тем более — призрак исключён
     */
    public readonly visibleSlots = signal<boolean[]>([]);

    public readonly belt = this.queue.belt;
    public readonly maxSize = this.queue.MAX_QUEUE_SIZE;
    public readonly waiting = this.queue.waiting;
    public readonly isExitOccupied = this.queue.isExitOccupied;

    constructor() {
        // Световая индикация событий линии. Датчики лежат вне скролл-контейнера
        // и видны при любом скролле, поэтому сигнал доходит до пользователя
        // без угона viewport'а
        effect(() => {
            const belt = this.belt();

            // Вход: occupant слота 0 сменился новым продуктом — кто-то поступил
            // на линию: прямое добавление, голова буфера на такте или голова
            // буфера после удаления, освободившего слот. Фотоглазу на входе
            // всё равно, откуда приехал продукт, — он сигнализирует факт входа
            const first = belt[0];
            const firstId = first?.id ?? null;
            if (firstId !== null && firstId !== this.previousEntryId) {
                this.triggerEntryPulse();
            }
            this.previousEntryId = firstId;

            // Выход: последний слот был занят и продукт в нём сменился —
            // кто-то покинул линию через датчик отбраковки. Цвет вспышки —
            // статус ушедшего из предыдущего снимка ленты
            const last = belt[belt.length - 1];
            const previousLast = this.previousBelt[this.previousBelt.length - 1];
            if (previousLast && (!last || last.id !== previousLast.id)) {
                this.triggerExitPulse(previousLast.status);
            }
            this.previousBelt = belt;
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

    /** rAF-троттлинг: скролл- и resize-события приходят пачками */
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

    /**
     * Вспышка датчика кольцом цвета события. Web Animations API, а не
     * CSS-класс: пульс — событие, а не состояние, и повторное событие
     * должно перезапускать анимацию, а не продлевать уже играющую
     */
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
        const eps = 2; // допуск на округление субпикселей

        this.visibleSlots.set(
            Array.from(belt.children, (child) => {
                const rect = child.getBoundingClientRect();
                return rect.left >= beltRect.left - eps && rect.right <= beltRect.right + eps;
            }),
        );
    }
}
