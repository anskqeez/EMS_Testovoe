import { effect, Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    public load<T>(key: string, fallback: T): T {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? (JSON.parse(raw) as T) : fallback;
        } catch (error) {
            console.error(`[StorageService] Не удалось прочитать ключ "${key}"`, error);
            return fallback;
        }
    }

    public save(key: string, value: unknown): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`[StorageService] Не удалось сохранить ключ "${key}"`, error);
        }
    }

    public bind<T>(key: string, reader: () => T): void {
        effect(() => {
            this.save(key, reader());
        });
    }
}
