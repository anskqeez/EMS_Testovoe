import { computed, inject, Injectable, signal } from '@angular/core';
import { Product } from '../../../models/product.model';
import { StorageService } from '../storage/storage.service';

/**
 * Агрегат буфера ожидания: FIFO-очередь продуктов перед датчиком входа.
 * Голова очереди (индекс 0) выходит на линию первой
 */
@Injectable({
    providedIn: 'root',
})
export class WaitingQueueService {
    private readonly storage = inject(StorageService);
    private readonly STORAGE_KEY = 'fifo_waiting';

    public readonly MAX_SIZE = 6;

    private readonly _waiting = signal<Product[]>(
        this.storage.load<Product[]>(this.STORAGE_KEY, []),
    );

    public readonly waiting = this._waiting.asReadonly();

    public readonly isFull = computed(() => this._waiting().length >= this.MAX_SIZE);
    public readonly canEnqueue = computed(() => !this.isFull());
    public readonly isEmpty = computed(() => this._waiting().length === 0);

    constructor() {
        this.storage.bind(this.STORAGE_KEY, () => this._waiting());
    }

    public enqueue(product: Product): boolean {
        if (this.isFull()) {
            return false;
        }

        this._waiting.update((queue) => [...queue, product]);

        return true;
    }

    /**
     * Возвращает голову очереди без удаления (для «фотоглаза» входа).
     * @returns продукт либо null, если буфер пуст
     */
    public nextToEnter(): Product | null {
        return this._waiting()[0] ?? null;
    }

    /**
     * Забирает голову очереди (того, кто ждёт дольше всех).
     * @returns продукт либо null, если буфер пуст
     */
    public dequeue(): Product | null {
        const head = this.nextToEnter();

        if (head) {
            this._waiting.update((queue) => queue.slice(1));
        }

        return head;
    }

    public remove(productId: string): boolean {
        if (!this.has(productId)) {
            return false;
        }

        this._waiting.update((queue) => queue.filter((product) => product.id !== productId));
        
        return true;
    }

    public has(productId: string): boolean {
        return this._waiting().some((product) => product.id === productId);
    }
}
