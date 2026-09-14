import { inject, Injectable } from '@angular/core';
import { Product, PRODUCT_STATUS_LABELS, ProductStatus } from '../../../models/product.model';
import { LogEventPayload, LogEventType } from '../../../models/event.model';
import { shortId } from '../../utils/short-id.util';
import { ConveyorBeltService } from './conveyor-belt.service';
import { WaitingQueueService } from './waiting-queue.service';
import { EventLogService } from './event-log.service';

/**
 * Application-слой: единая точка входа для UI. Загрузка на линию event-driven
 * («фотоглаз» на слоте 0), откуда инвариант: слот 0 пуст ⇔ буфер пуст
 */
@Injectable({
    providedIn: 'root',
})
export class QueueFacadeService {
    private readonly beltService = inject(ConveyorBeltService);
    private readonly waitingService = inject(WaitingQueueService);
    private readonly eventLog = inject(EventLogService);

    public readonly MAX_QUEUE_SIZE = this.beltService.MAX_SIZE;

    public readonly belt = this.beltService.belt;
    public readonly waiting = this.waitingService.waiting;
    public readonly lineLoad = this.beltService.load;
    public readonly canAddProduct = this.waitingService.canEnqueue;
    public readonly isExitOccupied = this.beltService.isExitOccupied;

    public addProduct(): void {
        if (!this.waitingService.canEnqueue()) {
            this.log(
                LogEventType.Warning,
                `Очередь переполнена: буфер ожидания заполнен ` +
                    `(${this.waitingService.MAX_SIZE}/${this.waitingService.MAX_SIZE}). Добавление заблокировано`,
            );

            return;
        }

        const product = this.createProduct();

        if (this.beltService.placeAtEntry(product)) {
            this.log(
                LogEventType.Added,
                `Продукт #${shortId(product.id)} добавлен в очередь (вышел на линию)`,
                { enterLine: { productId: product.id } },
            );
            return;
        }

        this.waitingService.enqueue(product);

        this.log(
            LogEventType.Added,
            `Продукт #${shortId(product.id)} добавлен в очередь (ожидает у входа)`,
        );

        if (this.waitingService.isFull()) {
            this.log(
                LogEventType.BufferFull,
                `Буфер ожидания заполнен (${this.waitingService.MAX_SIZE}/${this.waitingService.MAX_SIZE}): ` +
                    'добавление заблокировано до следующего такта',
            );
        }
    }

    public nextTick(): void {
        if (this.beltService.isEmpty() && this.waitingService.isEmpty()) {
            this.log(LogEventType.Warning, 'Такт пропущен: конвейер пуст');

            return;
        }

        const exiting = this.beltService.advance();

        if (exiting) {
            const statusText =
                exiting.status === ProductStatus.Rejected ? 'отбракован' : 'прошел проверку';

            this.log(
                LogEventType.Tick,
                `Такт: продукт #${shortId(exiting.id)} покинул линию (${statusText})`,
                { exitLine: { productId: exiting.id, status: exiting.status } },
            );
        }

        this.fillEntryIfPossible();
    }

    public updateProductStatus(productId: string, newStatus: ProductStatus): void {
        this.beltService.updateStatus(productId, newStatus);

        this.log(
            LogEventType.StatusChanged,
            `Статус продукта #${shortId(productId)} изменен на "${PRODUCT_STATUS_LABELS[newStatus]}"`,
        );
    }

    public removeProduct(productId: string): void {
        const belt = this.beltService.belt();

        const removedFromBelt = belt.find((slot) => slot?.id === productId) ?? null;
        const removedFromExit = removedFromBelt !== null && belt[belt.length - 1]?.id === productId;

        if (removedFromBelt !== null && this.beltService.remove(productId)) {
            this.log(
                LogEventType.Removed,
                `Продукт #${shortId(productId)} удален с линии`,
                removedFromExit
                    ? { exitLine: { productId, status: removedFromBelt.status } }
                    : undefined,
            );

            this.fillEntryIfPossible();

            return;
        }

        if (this.waitingService.remove(productId)) {
            this.log(
                LogEventType.Removed,
                `Продукт #${shortId(productId)} удален из очереди ожидания`,
            );
        }
    }

    /** Event-driven загрузчик: голова буфера занимает освободившийся слот 0 сразу */
    private fillEntryIfPossible(): void {
        const head = this.waitingService.nextToEnter();
        if (!head) return;

        const wasWaitingFull = this.waitingService.isFull();

        if (!this.beltService.placeAtEntry(head)) return;

        this.waitingService.dequeue();
        this.log(
            LogEventType.Entered,
            `Продукт #${shortId(head.id)} вышел на линию из очереди ожидания`,
            { enterLine: { productId: head.id } },
        );

        if (wasWaitingFull && !this.waitingService.isFull()) {
            this.log(
                LogEventType.BufferFreed,
                'Место в буфере освобождено — можно добавлять продукты',
            );
        }
    }

    private createProduct(): Product {
        return {
            id: crypto.randomUUID(),
            entryTime: Date.now(),
            status: ProductStatus.InQueue,
        };
    }

    private log(type: LogEventType, message: string, payload?: LogEventPayload): void {
        this.eventLog.add(type, message, payload);
    }
}
