import { StorageService } from '../core/services/storage/storage.service';

/**
 * Тест-дабл StorageService: всегда отдаёт fallback,
 * не трогает LocalStorage и не создаёт effect'ов
 */
export const storageServiceStub: Pick<StorageService, 'load' | 'save' | 'bind'> = {
  load: <T>(_key: string, fallback: T): T => fallback,
  save: (_key: string, _value: unknown): void => undefined,
  bind: (_key: string, _reader: () => unknown): void => undefined,
};
