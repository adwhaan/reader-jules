import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { OpmlImportExportService } from '../../application/opml-import-export.service';
import { JsonSelectorService } from '../../application/json-selector.service';

@Component({
  selector: 'app-import-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h2 class="font-display text-xl font-semibold text-ink">Feed subscriptions (OPML)</h2>
        <p class="mt-1 text-sm text-ink-muted">Import or export your RSS/Atom feed list.</p>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <label
            class="cursor-pointer rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-moss-400 hover:text-moss-600"
          >
            Import OPML file
            <input type="file" accept=".opml,.xml" class="hidden" (change)="onOpmlFileChosen($event)" />
          </label>

          <button
            type="button"
            class="rounded-md bg-moss-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-moss-600"
            (click)="exportOpml()"
          >
            Export OPML
          </button>
        </div>

        @if (opmlMessage()) {
          <p class="mt-2 text-sm text-moss-700">{{ opmlMessage() }}</p>
        }
      </div>

      <div class="border-t border-hairline pt-6">
        <h2 class="font-display text-xl font-semibold text-ink">Selector configs (JSON)</h2>
        <p class="mt-1 text-sm text-ink-muted">Import or export your custom selector-feed definitions.</p>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <label
            class="cursor-pointer rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-moss-400 hover:text-moss-600"
          >
            Import JSON file
            <input type="file" accept=".json" class="hidden" (change)="onJsonFileChosen($event)" />
          </label>

          <button
            type="button"
            class="rounded-md bg-moss-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-moss-600"
            (click)="exportJson()"
          >
            Export JSON
          </button>
        </div>

        @if (jsonMessage()) {
          <p class="mt-2 text-sm text-moss-700">{{ jsonMessage() }}</p>
        }
      </div>
    </div>
  `,
})
export class ImportExportComponent {
  readonly opmlMessage = signal<string | null>(null);
  readonly jsonMessage = signal<string | null>(null);

  constructor(
    private opmlService: OpmlImportExportService,
    private jsonSelectorService: JsonSelectorService,
  ) {}

  async onOpmlFileChosen(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const count = await this.opmlService.importFromXml(text);
    this.opmlMessage.set(`Imported ${count} feed(s).`);
  }

  async exportOpml(): Promise<void> {
    const xml = await this.opmlService.exportToXml();
    downloadFile(xml, 'subscriptions.opml', 'text/x-opml');
    this.opmlMessage.set('Exported subscriptions.opml.');
  }

  async onJsonFileChosen(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const count = await this.jsonSelectorService.importFromJson(text);
    this.jsonMessage.set(`Imported ${count} selector config(s).`);
  }

  async exportJson(): Promise<void> {
    const json = await this.jsonSelectorService.exportToJson();
    downloadFile(json, 'selector-configs.json', 'application/json');
    this.jsonMessage.set('Exported selector-configs.json.');
  }
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
