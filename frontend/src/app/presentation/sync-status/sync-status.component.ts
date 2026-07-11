import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { SyncOrchestratorService, SyncStatus } from '../../application/sync-orchestrator.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide"
      [class.bg-moss-100]="(status$ | async) === 'idle'"
      [class.text-moss-700]="(status$ | async) === 'idle'"
      [class.bg-ochre-100]="(status$ | async) === 'syncing'"
      [class.text-ochre-600]="(status$ | async) === 'syncing'"
      [class.bg-red-100]="(status$ | async) === 'offline' || (status$ | async) === 'conflict' || (status$ | async) === 'error'"
      [class.text-red-700]="(status$ | async) === 'offline' || (status$ | async) === 'conflict' || (status$ | async) === 'error'"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
      {{ label(status$ | async) }}
    </span>
  `,
})
export class SyncStatusComponent {
  status$: Observable<SyncStatus>;

  constructor(sync: SyncOrchestratorService) {
    this.status$ = sync.status$;
  }

  label(status: SyncStatus | null): string {
    switch (status) {
      case 'syncing':
        return 'Syncing';
      case 'offline':
        return 'Offline';
      case 'conflict':
        return 'Resolving';
      case 'error':
        return 'Sync error';
      default:
        return 'Synced';
    }
  }
}
