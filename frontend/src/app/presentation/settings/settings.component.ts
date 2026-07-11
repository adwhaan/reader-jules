import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SyncOrchestratorService } from '../../application/sync-orchestrator.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <h2 class="font-display text-xl font-semibold text-ink dark:text-paper">Settings</h2>

      <label class="block max-w-sm">
        <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">Theme</span>
        <select
          class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
          [ngModel]="sync.settings().theme"
          (ngModelChange)="sync.updateSettings({ theme: $event })"
        >
          <option value="system">Match system</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label class="block max-w-sm">
        <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">Default view</span>
        <select
          class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
          [ngModel]="sync.settings().defaultView"
          (ngModelChange)="sync.updateSettings({ defaultView: $event })"
        >
          <option value="all">All articles</option>
          <option value="unread">Unread only</option>
          <option value="readLater">Read later</option>
        </select>
      </label>

      <label class="flex max-w-sm items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-hairline text-moss-500 focus:ring-moss-400"
          [ngModel]="sync.settings().autoRefreshOnFolderSwitch"
          (ngModelChange)="sync.updateSettings({ autoRefreshOnFolderSwitch: $event })"
        />
        <span class="text-sm text-ink dark:text-paper">Automatically refresh when switching folders</span>
      </label>

      <label class="block max-w-sm">
        <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Refresh interval (minutes)
        </span>
        <input
          type="number"
          min="5"
          max="1440"
          class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
          [ngModel]="sync.settings().refreshIntervalMinutes"
          (ngModelChange)="sync.updateSettings({ refreshIntervalMinutes: +$event })"
        />
        <span class="mt-1 block text-xs text-ink-faint">
          A feed won't be re-fetched automatically more often than this.
        </span>
      </label>

      <label class="block max-w-sm">
        <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Stagger between feed refreshes (ms)
        </span>
        <input
          type="number"
          min="0"
          max="5000"
          step="50"
          class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
          [ngModel]="sync.settings().staggerMs"
          (ngModelChange)="sync.updateSettings({ staggerMs: +$event })"
        />
        <span class="mt-1 block text-xs text-ink-faint">
          Delay between each feed's refresh when refreshing a whole folder at once, to avoid a burst of requests.
        </span>
      </label>

      <label class="block max-w-sm">
        <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Keep deleted feeds/folders for (days)
        </span>
        <input
          type="number"
          min="1"
          max="365"
          class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
          [ngModel]="sync.settings().tombstoneRetentionDays"
          (ngModelChange)="sync.updateSettings({ tombstoneRetentionDays: +$event })"
        />
        <span class="mt-1 block text-xs text-ink-faint">
          Deletions replicate to your other devices for this many days before being cleaned up permanently
          (architecture.md §5.5).
        </span>
      </label>
    </div>
  `,
})
export class SettingsComponent {
  constructor(public sync: SyncOrchestratorService) {}
}
