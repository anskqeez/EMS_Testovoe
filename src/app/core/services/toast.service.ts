import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly TTL_MS = 4000;
  private readonly MAX_VISIBLE = 4;

  private readonly _toasts = signal<Toast[]>([]);
  public readonly toasts = this._toasts.asReadonly();

  public show(message: string, type: ToastType = 'info'): void {
    const toast: Toast = { id: crypto.randomUUID(), message, type };
    this._toasts.update((current) => [...current, toast].slice(-this.MAX_VISIBLE));
    
    setTimeout(() => this.dismiss(toast.id), this.TTL_MS);
  }

  public dismiss(id: string): void {
    this._toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}
