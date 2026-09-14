import {
    Component,
    ElementRef,
    OnDestroy,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild,
    viewChildren,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Product, PRODUCT_STATUS_LABELS, ProductStatus } from '../../models/product.model';
import { DropdownRegistryService } from '../../core/services/dropdown-registry.service';
import { shortId } from '../../core/utils/short-id.util';
import {
    DEFAULT_MENU_CONFIG,
    MenuPosition,
    computeMenuPosition,
} from '../../core/utils/menu-position.util';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './product-card.component.html',
    styleUrl: './product-card.component.scss',
    host: {
        '[class.has-open-menu]': 'isDropdownOpen()',
        '(document:click)': 'onDocumentClick($event)',
    },
})
export class ProductCardComponent implements OnDestroy {
    private readonly ESTIMATED_MENU_HEIGHT = DEFAULT_MENU_CONFIG.menuHeight;

    private readonly CARD_MODIFIERS: Record<ProductStatus, string> = {
        [ProductStatus.InQueue]: 'product-card--in-queue',
        [ProductStatus.Checked]: 'product-card--checked',
        [ProductStatus.Rejected]: 'product-card--rejected',
    };

    private readonly OPTION_MODIFIERS: Record<ProductStatus, string> = {
        [ProductStatus.InQueue]: 'status-dropdown__option--in-queue',
        [ProductStatus.Checked]: 'status-dropdown__option--checked',
        [ProductStatus.Rejected]: 'status-dropdown__option--rejected',
    };

    public readonly cardClass = computed(
        () => `product-card ${this.CARD_MODIFIERS[this.product().status]}`,
    );

    public optionClass(status: ProductStatus): string {
        const base = `status-dropdown__option ${this.OPTION_MODIFIERS[status]}`;
        return status === this.product().status ? `${base} status-dropdown__option--active` : base;
    }

    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly dropdownRegistry = inject(DropdownRegistryService);
    private rafId: number | null = null;
    private triggerElement: HTMLElement | null = null;

    private readonly statusMenu = viewChild<ElementRef<HTMLUListElement>>('statusMenu');
    private readonly statusOptions = viewChildren<ElementRef<HTMLLIElement>>('statusOption');

    public readonly product = input.required<Product>();
    public readonly statusChange = output<ProductStatus>();
    public readonly remove = output<void>();
    public readonly statusLabels = PRODUCT_STATUS_LABELS;

    public readonly shortId = shortId;

    public readonly statuses = Object.values(ProductStatus);
    public readonly isDropdownOpen = signal(false);
    public readonly menuPosition = signal<MenuPosition | null>(null);

    public toggleDropdown(event: MouseEvent): void {
        if (this.isDropdownOpen()) {
            this.closeDropdown();
            return;
        }

        this.triggerElement = event.currentTarget as HTMLElement;
        this.updateMenuPosition();

        if (!this.menuPosition()) {
            this.triggerElement = null;
            return;
        }

        this.dropdownRegistry.claim(this.product().id);
        this.isDropdownOpen.set(true);
        this.startTracking();
    }

    public selectStatus(status: ProductStatus): void {
        this.closeDropdown();
        if (status !== this.product().status) {
            this.statusChange.emit(status);
        }
    }

    public closeDropdown(): void {
        this.stopTracking();
        this.isDropdownOpen.set(false);
        this.menuPosition.set(null);
        this.dropdownRegistry.release(this.product().id);
        this.triggerElement = null;
    }

    public onRemove(): void {
        this.remove.emit();
    }

    public onOptionKeydown(index: number, event: KeyboardEvent): void {
        const isDown = event.key === 'ArrowDown';
        const isUp = event.key === 'ArrowUp';

        if (!isDown && !isUp) return;

        event.preventDefault();

        const options = this.statusOptions();

        if (options.length === 0) return;

        const delta = isDown ? 1 : -1;
        const wrapped = (index + delta + options.length) % options.length;

        options[wrapped].nativeElement.focus();
    }

    public ngOnDestroy(): void {
        this.stopTracking();
    }

    protected onDocumentClick(event: MouseEvent): void {
        if (!this.isDropdownOpen()) return;
        const target = event.target as HTMLElement;
        if (!this.hostElement.contains(target)) {
            this.closeDropdown();
        }
    }

    private startTracking(): void {
        if (this.rafId !== null) return;

        const tick = (): void => {
            if (!this.isDropdownOpen()) {
                this.rafId = null;
                return;
            }
            this.updateMenuPosition();
            this.rafId = requestAnimationFrame(tick);
        };

        this.rafId = requestAnimationFrame(tick);
    }

    private stopTracking(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private updateMenuPosition(): void {
        const trigger = this.triggerElement;
        if (!trigger) {
            this.closeDropdown();
            return;
        }

        const rect = trigger.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
            this.closeDropdown();
            return;
        }

        const menuHeight =
            this.statusMenu()?.nativeElement.getBoundingClientRect().height ??
            this.ESTIMATED_MENU_HEIGHT;

        this.menuPosition.set(
            computeMenuPosition(
                { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
                { width: window.innerWidth, height: window.innerHeight },
                { ...DEFAULT_MENU_CONFIG, menuHeight },
            ),
        );
    }
}
