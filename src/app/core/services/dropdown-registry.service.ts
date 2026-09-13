import { Injectable, signal } from '@angular/core';

/**
 * Гарантирует, что в приложении открыт не более одного dropdown-меню:
 * открытие нового «захватывает» слот, предыдущий владелец закрывается effect'ом
 */
@Injectable({
  providedIn: 'root',
})
export class DropdownRegistryService {
  private readonly _openId = signal<string | null>(null);
  public readonly openId = this._openId.asReadonly();

  public claim(id: string): void {
    this._openId.set(id);
  }

  public release(id: string): void {
    if (this._openId() === id) {
      this._openId.set(null);
    }
  }
}
