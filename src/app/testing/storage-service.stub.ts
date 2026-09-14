import { StorageService } from '../core/services/storage/storage.service';

export const storageServiceStub: Pick<StorageService, 'load' | 'save' | 'bind'> = {
    load: <T>(_key: string, fallback: T): T => fallback,
    save: (_key: string, _value: unknown): void => undefined,
    bind: (_key: string, _reader: () => unknown): void => undefined,
};
