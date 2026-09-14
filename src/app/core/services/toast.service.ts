import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
    leaving: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class ToastService {
    private readonly SHOW_DURATION = 4000;
    // Должно совпадать с длительностью toast-out в toasts.component.scss
    private readonly LEAVE_DURATION = 250;
    private readonly MAX_STACK = 4;

    private counter = 0;
    private readonly _toasts = signal<Toast[]>([]);

    public readonly toasts = this._toasts.asReadonly();

    public show(message: string, type: ToastType = 'info'): void {
        const id = ++this.counter;
        this._toasts.update((list) =>
            [...list, { id, message, type, leaving: false }].slice(-this.MAX_STACK),
        );
        setTimeout(() => this.hide(id), this.SHOW_DURATION);
    }

    public dismiss(id: number): void {
        this.hide(id);
    }

    private hide(id: number): void {
        const toast = this._toasts().find((item) => item.id === id);

        if (!toast || toast.leaving) return;

        this._toasts.update((list) =>
            list.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
        );

        setTimeout(() => {
            this._toasts.update((list) => list.filter((item) => item.id !== id));
        }, this.LEAVE_DURATION);
    }
}
