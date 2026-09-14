import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Product, ProductStatus } from '../../../../models/product.model';
import { StorageService } from '../../storage/storage.service';
import { storageServiceStub } from '../../../../testing/storage-service.stub';
import { WaitingQueueService } from '../waiting-queue.service';

describe('WaitingQueueService', () => {
  let service: WaitingQueueService;

  const createProduct = (id: string): Product => ({
    id,
    entryTime: Date.now(),
    status: ProductStatus.InQueue,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: StorageService, useValue: storageServiceStub }],
    });
    service = TestBed.inject(WaitingQueueService);
  });

  it('dequeue возвращает продукты в порядке FIFO', () => {
    service.enqueue(createProduct('p1'));
    service.enqueue(createProduct('p2'));

    expect(service.dequeue()?.id).toBe('p1');
    expect(service.dequeue()?.id).toBe('p2');
    expect(service.dequeue()).toBeNull();
  });

  it('не принимает продукты сверх MAX_SIZE', () => {
    for (let i = 0; i < service.MAX_SIZE; i++) {
      expect(service.enqueue(createProduct(`p${i}`))).toBe(true);
    }

    expect(service.isFull()).toBe(true);
    expect(service.canEnqueue()).toBe(false);
    expect(service.enqueue(createProduct('overflow'))).toBe(false);
    expect(service.waiting().length).toBe(service.MAX_SIZE);
  });

  it('remove удаляет произвольный продукт из середины очереди', () => {
    service.enqueue(createProduct('p1'));
    service.enqueue(createProduct('p2'));
    service.enqueue(createProduct('p3'));

    expect(service.remove('p2')).toBe(true);
    expect(service.waiting().map((product) => product.id)).toEqual(['p1', 'p3']);
    expect(service.remove('p2')).toBe(false);
  });
});
