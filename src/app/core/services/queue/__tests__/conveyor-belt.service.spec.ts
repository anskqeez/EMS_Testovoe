import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Product, ProductStatus } from '../../../../models/product.model';
import { StorageService } from '../../storage/storage.service';
import { storageServiceStub } from '../../../../testing/storage-service.stub';
import { ConveyorBeltService } from '../conveyor-belt.service';

describe('ConveyorBeltService', () => {
  let service: ConveyorBeltService;

  const createProduct = (id: string): Product => ({
    id,
    entryTime: Date.now(),
    status: ProductStatus.InQueue,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: StorageService, useValue: storageServiceStub }],
    });
    service = TestBed.inject(ConveyorBeltService);
  });

  it('создаёт пустую ленту из MAX_SIZE слотов', () => {
    expect(service.belt().length).toBe(service.MAX_SIZE);
    expect(service.belt().every((slot) => slot === null)).toBe(true);
    expect(service.isEmpty()).toBe(true);
    expect(service.load()).toBe(0);
  });

  it('placeAtEntry ставит продукт в слот 0 и отказывает, если слот занят', () => {
    expect(service.placeAtEntry(createProduct('p1'))).toBe(true);
    expect(service.belt()[0]?.id).toBe('p1');

    expect(service.placeAtEntry(createProduct('p2'))).toBe(false);
    expect(service.belt()[1]).toBeNull();
  });

  it('advance сдвигает продукты вправо и возвращает покинувшего линию', () => {
    service.placeAtEntry(createProduct('p1'));

    for (let i = 0; i < service.MAX_SIZE - 1; i++) {
      expect(service.advance()).toBeNull();
    }
    expect(service.belt()[service.MAX_SIZE - 1]?.id).toBe('p1');

    expect(service.advance()?.id).toBe('p1');
    expect(service.isEmpty()).toBe(true);
  });

  it('updateStatus меняет статус продукта на ленте', () => {
    service.placeAtEntry(createProduct('p1'));

    service.updateStatus('p1', ProductStatus.Rejected);

    expect(service.belt()[0]?.status).toBe(ProductStatus.Rejected);
  });

  it('remove освобождает слот и сообщает об успехе', () => {
    service.placeAtEntry(createProduct('p1'));

    expect(service.remove('p1')).toBe(true);
    expect(service.belt()[0]).toBeNull();
    expect(service.remove('unknown')).toBe(false);
  });
});
