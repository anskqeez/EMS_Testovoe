import { Component, computed, input, output } from '@angular/core';
import { Product } from '../../models/product.model';
import { shortId } from '../../core/utils/short-id.util';

@Component({
    selector: 'app-waiting-zone',
    standalone: true,
    templateUrl: './waiting-zone.component.html',
    styleUrl: './waiting-zone.component.scss',
})
export class WaitingZoneComponent {
    private readonly MAX_VISIBLE = 3;

    public readonly waiting = input.required<Product[]>();
    public readonly removeProduct = output<string>();

    public readonly shortId = shortId;

    public readonly visibleWaiting = computed(() => this.waiting().slice(0, this.MAX_VISIBLE));
    public readonly hiddenCount = computed(() =>
        Math.max(0, this.waiting().length - this.MAX_VISIBLE),
    );

    public onRemove(productId: string): void {
        this.removeProduct.emit(productId);
    }
}
