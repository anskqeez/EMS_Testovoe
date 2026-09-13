import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  templateUrl: './toasts.component.html',
  styleUrl: './toasts.component.scss',
})
export class ToastsComponent {
  private readonly toastService = inject(ToastService);

  public readonly toasts = this.toastService.toasts;

  public onDismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
