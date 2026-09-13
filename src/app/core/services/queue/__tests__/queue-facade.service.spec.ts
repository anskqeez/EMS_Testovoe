import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LogEventType } from '../../../../models/event.model';
import { ProductStatus } from '../../../../models/product.model';
import { StorageService } from '../../storage/storage.service';
import { EventLogService } from '../event-log.service';
import { QueueFacadeService } from '../queue-facade.service';
import { storageServiceStub } from '../../../../testing/storage-service.stub';

describe('QueueFacadeService', () => {
  let facade: QueueFacadeService;
  let eventLog: EventLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: StorageService, useValue: storageServiceStub }],
    });
    facade = TestBed.inject(QueueFacadeService);
    eventLog = TestBed.inject(EventLogService);
  });

  const lastEventType = (): LogEventType => eventLog.events()[0].type;

  it('первый продукт выходит прямо на линию', () => {
    facade.addProduct();

    expect(facade.belt()[0]).not.toBeNull();
    expect(facade.waiting().length).toBe(0);
    expect(lastEventType()).toBe(LogEventType.Added);
  });

  it('при занятом слоте 0 продукт встаёт в буфер ожидания', () => {
    facade.addProduct();
    facade.addProduct();

    expect(facade.belt()[0]).not.toBeNull();
    expect(facade.waiting().length).toBe(1);
  });

  it('такт сдвигает ленту и выпускает голову буфера на линию', () => {
    facade.addProduct();
    facade.addProduct();
    const onBelt = facade.belt()[0]!;
    const inBuffer = facade.waiting()[0];

    facade.nextTick();

    expect(facade.belt()[0]?.id).toBe(inBuffer.id);
    expect(facade.belt()[1]?.id).toBe(onBelt.id);
    expect(facade.waiting().length).toBe(0);
    expect(lastEventType()).toBe(LogEventType.Entered);
  });

  it('продукт покидает линию только у датчика отбраковки', () => {
    facade.addProduct();
    const product = facade.belt()[0]!;

    for (let i = 0; i < facade.MAX_QUEUE_SIZE - 1; i++) {
      facade.nextTick();
    }
    expect(facade.belt()[facade.MAX_QUEUE_SIZE - 1]?.id).toBe(product.id);

    facade.nextTick();
    expect(facade.belt().every((slot) => slot === null)).toBe(true);
    expect(lastEventType()).toBe(LogEventType.Tick);
  });

  it('отказывает в добавлении при полном буфере и пишет Warning', () => {
    for (let i = 0; i < facade.MAX_QUEUE_SIZE + 1; i++) {
      facade.addProduct();
    }
    expect(lastEventType()).toBe(LogEventType.BufferFull);

    facade.addProduct();

    expect(facade.waiting().length).toBe(facade.MAX_QUEUE_SIZE);
    expect(lastEventType()).toBe(LogEventType.Warning);
  });

  it('освобождение буфера через такт порождает BufferFreed', () => {
    for (let i = 0; i < facade.MAX_QUEUE_SIZE + 1; i++) {
      facade.addProduct();
    }

    facade.nextTick();

    expect(facade.waiting().length).toBe(facade.MAX_QUEUE_SIZE - 1);
    expect(lastEventType()).toBe(LogEventType.BufferFreed);
  });

  it('removeProduct удаляет и с ленты, и из буфера', () => {
    facade.addProduct();
    facade.addProduct();
    const onBelt = facade.belt()[0]!;
    const inBuffer = facade.waiting()[0];

    facade.removeProduct(inBuffer.id);
    expect(facade.waiting().length).toBe(0);
    expect(lastEventType()).toBe(LogEventType.Removed);

    // буфер пуст, поэтому слот 0 остаётся свободным после удаления
    facade.removeProduct(onBelt.id);
    expect(facade.belt()[0]).toBeNull();
    expect(lastEventType()).toBe(LogEventType.Removed);
  });

  it('голова буфера сразу занимает слот 0, освободившийся после ручного удаления', () => {
    facade.addProduct();
    facade.addProduct();
    const onBelt = facade.belt()[0]!;
    const inBuffer = facade.waiting()[0];

    facade.removeProduct(onBelt.id);

    expect(facade.belt()[0]?.id).toBe(inBuffer.id);
    expect(facade.waiting().length).toBe(0);
    // цепочка в журнале: Removed → Entered
    expect(eventLog.events()[0].type).toBe(LogEventType.Entered);
    expect(eventLog.events()[1].type).toBe(LogEventType.Removed);
  });

  it('мгновенный вход из буфера после удаления порождает BufferFreed', () => {
    for (let i = 0; i < facade.MAX_QUEUE_SIZE + 1; i++) {
      facade.addProduct();
    }
    expect(lastEventType()).toBe(LogEventType.BufferFull);
    const onBelt = facade.belt()[0]!;

    facade.removeProduct(onBelt.id);

    expect(facade.waiting().length).toBe(facade.MAX_QUEUE_SIZE - 1);
    expect(lastEventType()).toBe(LogEventType.BufferFreed);
    expect(facade.canAddProduct()).toBe(true);
  });

  it('инвариант фотоглаза: слот 0 пуст только когда буфер пуст', () => {
    facade.addProduct();
    facade.addProduct();

    facade.removeProduct(facade.belt()[0]!.id); // голова буфера встаёт сразу
    expect(facade.belt()[0]).not.toBeNull();

    facade.removeProduct(facade.belt()[0]!.id); // буфер пуст — слот остаётся свободным
    expect(facade.belt()[0]).toBeNull();
    expect(facade.waiting().length).toBe(0);
  });

  it('updateProductStatus меняет статус и логирует изменение', () => {
    facade.addProduct();
    const product = facade.belt()[0]!;

    facade.updateProductStatus(product.id, ProductStatus.Rejected);

    expect(facade.belt()[0]?.status).toBe(ProductStatus.Rejected);
    expect(lastEventType()).toBe(LogEventType.StatusChanged);
  });

  it('такт на пустой системе безопасен и пишет Warning', () => {
    facade.nextTick();

    expect(facade.belt().every((slot) => slot === null)).toBe(true);
    expect(lastEventType()).toBe(LogEventType.Warning);
  });
});
