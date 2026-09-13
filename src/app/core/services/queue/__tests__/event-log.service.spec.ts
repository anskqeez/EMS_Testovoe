import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LogEventType } from '../../../../models/event.model';
import { StorageService } from '../../storage/storage.service';
import { storageServiceStub } from '../../../../testing/storage-service.stub';
import { EventLogService } from '../event-log.service';

describe('EventLogService', () => {
  let service: EventLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: StorageService, useValue: storageServiceStub }],
    });
    service = TestBed.inject(EventLogService);
  });

  it('добавляет события в начало журнала', () => {
    service.add(LogEventType.Added, 'first');
    service.add(LogEventType.Tick, 'second');

    expect(service.events().length).toBe(2);
    expect(service.events()[0].message).toBe('second');
    expect(service.events()[1].message).toBe('first');
  });

  it('хранит не более 20 записей, вытесняя старые', () => {
    for (let i = 1; i <= 25; i++) {
      service.add(LogEventType.Added, `event-${i}`);
    }

    expect(service.events().length).toBe(20);
    expect(service.events()[0].message).toBe('event-25');
    expect(service.events()[19].message).toBe('event-6');
  });

  it('заполняет метаданные события', () => {
    service.add(LogEventType.Removed, 'some message');

    const event = service.events()[0];
    expect(event.type).toBe(LogEventType.Removed);
    expect(event.id).toBeTruthy();
    expect(event.timestamp).toBeGreaterThan(0);
  });
});
