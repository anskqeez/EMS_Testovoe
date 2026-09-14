import { Component, inject } from '@angular/core';
import { ControlsComponent } from './features/controls/controls.component';
import { QueueViewComponent } from './features/queue-view/queue-view.component';
import { EventLogComponent } from './features/event-log/event-log.component';
import { ToastsComponent } from './shared/toasts/toasts.component';
import { ToastNotifierService } from './core/services/toast-notifier.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [ControlsComponent, QueueViewComponent, EventLogComponent, ToastsComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    private readonly _toastNotifier = inject(ToastNotifierService);

    public readonly title = 'FIFO Конвейер';
}
