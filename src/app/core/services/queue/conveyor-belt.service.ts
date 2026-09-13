import { computed, inject, Injectable, signal } from '@angular/core';
import { ConveyorSlot } from '../../../models/conveyor.model';
import { Product, ProductStatus } from '../../../models/product.model';
import { StorageService } from '../storage/storage.service';

/**
 * Агрегат ленты конвейера: фиксированные слоты между датчиками.
 * Индекс 0 — у датчика входа, MAX_SIZE - 1 — у датчика отбраковки.
 * Отвечает только за своё состояние и свою персистентность
 */
@Injectable({
  providedIn: 'root',
})
export class ConveyorBeltService {
  private readonly storage = inject(StorageService);
  private readonly STORAGE_KEY = 'fifo_belt';

  /** Физическая длина ленты (количество слотов между датчиками) */
  public readonly MAX_SIZE = 6;

  private readonly _belt = signal<ConveyorSlot[]>(this.loadBelt());

  public readonly belt = this._belt.asReadonly();

  /** Количество занятых слотов */
  public readonly load = computed(() => this._belt().filter((slot) => slot !== null).length);

  /** На ленте нет ни одного продукта */
  public readonly isEmpty = computed(() => this.load() === 0);

  /** Занят ли слот у датчика отбраковки (последний слот ленты) */
  public readonly isExitOccupied = computed(() => this._belt()[this.MAX_SIZE - 1] !== null);

  constructor() {
    this.storage.bind(this.STORAGE_KEY, () => this._belt());
  }

  /**
   * Ставит продукт к датчику входа, только если слот 0 свободен.
   * @returns true, если продукт вышел на линию
   */
  public placeAtEntry(product: Product): boolean {
    if (this._belt()[0] !== null) {
      return false;
    }
    this.admitAtEntry(product);
    return true;
  }

  /**
   * Безусловная постановка в слот 0.
   * Вызывающий гарантирует, что слот свободен (например, сразу после advance())
   */
  public admitAtEntry(product: Product): void {
    this._belt.update((belt) => {
      const next = [...belt];
      next[0] = product;
      return next;
    });
  }

  /**
   * Такт ленты: сдвиг всех продуктов на одну позицию вправо.
   * @returns продукт, покинувший линию у датчика отбраковки, либо null
   */
  public advance(): Product | null {
    const belt = this._belt();
    const exiting = belt[this.MAX_SIZE - 1];

    const shifted: ConveyorSlot[] = new Array(belt.length).fill(null);
    for (let i = 1; i < belt.length; i++) {
      shifted[i] = belt[i - 1];
    }
    this._belt.set(shifted);

    return exiting;
  }

  /** Изменение статуса продукта, находящегося на ленте */
  public updateStatus(productId: string, newStatus: ProductStatus): void {
    this._belt.update((belt) =>
      belt.map((slot) => (slot && slot.id === productId ? { ...slot, status: newStatus } : slot)),
    );
  }

  /**
   * Удаление продукта с ленты с освобождением его слота.
   * @returns true, если продукт найден и удалён
   */
  public remove(productId: string): boolean {
    if (!this.has(productId)) {
      return false;
    }
    this._belt.update((belt) => belt.map((slot) => (slot?.id === productId ? null : slot)));
    return true;
  }

  public has(productId: string): boolean {
    return this._belt().some((slot) => slot?.id === productId);
  }

  /**
   * Загрузка ленты из LocalStorage с валидацией структуры:
   * массив ровно из MAX_SIZE слотов, иначе — пустая лента
   */
  private loadBelt(): ConveyorSlot[] {
    const fallback: ConveyorSlot[] = Array(this.MAX_SIZE).fill(null);
    const loaded = this.storage.load<ConveyorSlot[]>(this.STORAGE_KEY, fallback);
    return Array.isArray(loaded) && loaded.length === this.MAX_SIZE ? loaded : fallback;
  }
}
