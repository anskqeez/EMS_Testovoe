import { effect, Injectable } from '@angular/core';

/**
 * Инфраструктурный сервис доступа к LocalStorage.
 * Не знает ничего о домене: только ключи, JSON и обработка ошибок.
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  /**
   * Безопасная загрузка: при отсутствии ключа или ошибке парсинга возвращает fallback
   */
  public load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : fallback;
    } catch (error) {
      console.error(`[StorageService] Не удалось прочитать ключ "${key}"`, error);
      return fallback;
    }
  }

  /**
   * Безопасное сохранение: ошибки квоты/доступности не роняют приложение
   */
  public save(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[StorageService] Не удалось сохранить ключ "${key}"`, error);
    }
  }

  /**
   * Привязывает сигнал к ключу: автосохранение при каждом изменении состояния.
   * Вызывать только в injection-контексте (конструктор сервиса)
   */
  public bind<T>(key: string, reader: () => T): void {
    effect(() => {
      this.save(key, reader());
    });
  }
}
