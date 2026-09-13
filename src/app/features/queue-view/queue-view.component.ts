import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { QueueFacadeService } from '../../core/services/queue/queue-facade.service';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { WaitingZoneComponent } from '../waiting-zone/waiting-zone.component';
import { ProductStatus } from '../../models/product.model';
import { withViewTransition } from '../../core/utils/view-transition.util';

@Component({
  selector: 'app-queue-view',
  standalone: true,
  imports: [ProductCardComponent, WaitingZoneComponent],
  templateUrl: './queue-view.component.html',
  styleUrl: './queue-view.component.scss',
})
export class QueueViewComponent {
  private readonly queue = inject(QueueFacadeService);

  public readonly belt = this.queue.belt;
  public readonly maxSize = this.queue.MAX_QUEUE_SIZE;
  public readonly waiting = this.queue.waiting;
  public readonly isExitOccupied = this.queue.isExitOccupied;

  public onStatusChange(productId: string, newStatus: ProductStatus): void {
    withViewTransition(() => this.queue.updateProductStatus(productId, newStatus));
  }

  public onRemove(productId: string): void {
    withViewTransition(() => this.queue.removeProduct(productId));
  }
}
