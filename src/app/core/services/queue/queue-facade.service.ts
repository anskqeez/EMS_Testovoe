import { inject, Injectable } from '@angular/core';
import { Product, ProductStatus } from '../../../models/product.model';
import { LogEventType } from '../../../models/event.model';
import { shortId } from '../../utils/short-id.util';
import { ConveyorBeltService } from './conveyor-belt.service';
import { WaitingQueueService } from './waiting-queue.service';
import { EventLogService } from './event-log.service';

/**
 * Application-слой: единая точка входа для UI-компонентов.
 * Оркестрирует агрегаты и владеет сценариями use-case'ов.
 *
 * Загрузка на линию — event-driven: «фотоглаз» на входе следит за слотом 0
 * и при любом его освобождении (такт или ручное удаление) немедленно
 * подаёт голову буфера ожидания. Инвариант: слот 0 пуст ⇔ буфер пуст
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

  /**
   * Добавление продукта в конец очереди (FIFO):
   * буфер полон → отказ; слот 0 свободен → на линию; иначе → в буфер.
   * Благодаря инварианту «фотоглаза» слот 0 свободен только при пустом буфере,
   * поэтому новый продукт никогда не обгоняет ожидающих
   */
  public addProduct(): void {
    if (!this.waitingService.canEnqueue()) {
      this.eventLog.add(
        LogEventType.Warning,
        `Очередь переполнена: буфер ожидания заполнен ` +
          `(${this.waitingService.MAX_SIZE}/${this.waitingService.MAX_SIZE}). Добавление заблокировано`,
      );
      return;
    }

    const product = this.createProduct();

    if (this.beltService.placeAtEntry(product)) {
      this.eventLog.add(
        LogEventType.Added,
        `Продукт #${shortId(product.id)} добавлен в очередь (вышел на линию)`,
      );
      return;
    }

    this.waitingService.enqueue(product);
    this.eventLog.add(
      LogEventType.Added,
      `Продукт #${shortId(product.id)} добавлен в очередь (ожидает у входа)`,
    );

    if (this.waitingService.isFull()) {
      this.eventLog.add(
        LogEventType.BufferFull,
        `Буфер ожидания заполнен (${this.waitingService.MAX_SIZE}/${this.waitingService.MAX_SIZE}): ` +
          'добавление заблокировано до следующего такта',
      );
    }
  }

  /**
   * Такт: продукт у отбраковки покидает линию, лента сдвигается вправо,
   * освободившийся слот 0 сразу занимает голова буфера («фотоглаз»)
   */
  public nextTick(): void {
    if (this.beltService.isEmpty() && this.waitingService.isEmpty()) {
      this.eventLog.add(LogEventType.Warning, 'Такт пропущен: конвейер пуст');
      return;
    }

    const exiting = this.beltService.advance();
    if (exiting) {
      const statusText =
        exiting.status === ProductStatus.Rejected ? 'отбракован' : 'прошел проверку';
      this.eventLog.add(
        LogEventType.Tick,
        `Такт: продукт #${shortId(exiting.id)} покинул линию (${statusText})`,
      );
    }

    this.fillEntryIfPossible();
  }

  public updateProductStatus(productId: string, newStatus: ProductStatus): void {
    this.beltService.updateStatus(productId, newStatus);
    this.eventLog.add(
      LogEventType.StatusChanged,
      `Статус продукта #${shortId(productId)} изменен на "${newStatus}"`,
    );
  }

  /**
   * Удаление из очереди: сначала ищем на ленте, затем в буфере.
   * Если освобождается слот 0 — голова буфера занимает его немедленно
   */
  public removeProduct(productId: string): void {
    if (this.beltService.remove(productId)) {
      this.eventLog.add(LogEventType.Removed, `Продукт #${shortId(productId)} удален с линии`);
      this.fillEntryIfPossible();
      return;
    }

    if (this.waitingService.remove(productId)) {
      this.eventLog.add(
        LogEventType.Removed,
        `Продукт #${shortId(productId)} удален из очереди ожидания`,
      );
    }
  }

  /**
   * Event-driven загрузчик: если слот 0 свободен и буфер не пуст,
   * голова буфера немедленно выходит на линию
   */
  private fillEntryIfPossible(): void {
    const head = this.waitingService.nextToEnter();
    if (!head) return;

    const wasWaitingFull = this.waitingService.isFull();

    // Слот 0 занят (например, удаление было из середины ленты) — ждём дальше
    if (!this.beltService.placeAtEntry(head)) return;

    this.waitingService.dequeue();
    this.eventLog.add(
      LogEventType.Entered,
      `Продукт #${shortId(head.id)} вышел на линию из очереди ожидания`,
    );

    if (wasWaitingFull && !this.waitingService.isFull()) {
      this.eventLog.add(
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
}
