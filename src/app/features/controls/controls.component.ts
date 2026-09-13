import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QueueFacadeService } from '../../core/services/queue/queue-facade.service';
import { withViewTransition } from '../../core/utils/view-transition.util';

@Component({
  selector: 'app-controls',
  standalone: true,
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.scss'
})
export class ControlsComponent {
  private readonly queue = inject(QueueFacadeService);

  public readonly canAddProduct = this.queue.canAddProduct;
  public readonly lineLoad = this.queue.lineLoad;
  public readonly maxSize = this.queue.MAX_QUEUE_SIZE;
  public readonly waitingCount = computed(() => this.queue.waiting().length);

  public onAddProduct(): void {
    withViewTransition(() => this.queue.addProduct());
  }

  public onNextTick(): void {
    withViewTransition(() => this.queue.nextTick());
  }
}
