import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectorPreviewService } from '../../application/selector-preview.service';
import { SelectorConfig } from '../../domain/models/models';
import { SelectorTestResult } from '../../domain/adapters/adapters';
import { SelectorConfigRepository } from '../../domain/repositories/repositories';
import { SELECTOR_CONFIG_REPOSITORY } from '../../domain/tokens';

function toList(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

@Component({
  selector: 'app-selector-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div>
        <h2 class="font-display text-xl font-semibold text-ink">New selector feed</h2>
        <p class="mt-1 text-sm text-ink-muted">
          Prioritizes structured data (JSON-LD, Microdata, Open Graph) server-side before
          falling back to the CSS selectors below.
        </p>
      </div>

      <label class="block">
        <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">Page URL</span>
        <input
          type="url"
          class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
          placeholder="https://example.com/news"
          [(ngModel)]="pageUrl"
        />
      </label>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        @for (field of fields; track field.key) {
          <label class="block">
            <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">{{ field.label }}</span>
            <input
              type="text"
              class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
              [placeholder]="field.placeholder"
              [ngModel]="selectorInputs()[field.key]"
              (ngModelChange)="updateField(field.key, $event)"
            />
          </label>
        }
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-moss-400 hover:text-moss-600 disabled:opacity-50"
          [disabled]="!pageUrl() || loadingPreview()"
          (click)="loadPreview()"
        >
          {{ loadingPreview() ? 'Loading preview…' : 'Load preview' }}
        </button>

        <button
          type="button"
          class="rounded-md bg-moss-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-moss-600 disabled:opacity-50"
          [disabled]="!pageUrl() || testing()"
          (click)="testSelectors()"
        >
          {{ testing() ? 'Testing…' : 'Test selectors' }}
        </button>

        <button
          type="button"
          class="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-ochre-500 hover:text-ochre-600 disabled:opacity-50"
          [disabled]="!testResult()"
          (click)="save()"
        >
          Save selector config
        </button>
      </div>

      @if (testResult(); as result) {
        <div class="rounded-md border border-hairline bg-surface p-3">
          <p class="font-mono text-xs uppercase tracking-widest text-ink-faint">
            {{ result.matchedCount }} match(es)
          </p>

          @if (result.warnings.length > 0) {
            <ul class="mt-1 list-inside list-disc text-xs text-ochre-600">
              @for (warning of result.warnings; track warning) {
                <li>{{ warning }}</li>
              }
            </ul>
          }

          <ul class="mt-2 space-y-2">
            @for (item of result.items.slice(0, 5); track item.url) {
              <li class="border-t border-hairline pt-2 text-sm first:border-t-0 first:pt-0">
                <p class="font-medium text-ink">{{ item.title || '(no title matched)' }}</p>
                @if (item.summary) {
                  <p class="text-ink-muted line-clamp-2">{{ item.summary }}</p>
                }
              </li>
            }
          </ul>
        </div>
      }

      @if (previewHtml(); as html) {
        <div>
          <p class="mb-1 font-mono text-xs uppercase tracking-widest text-ink-faint">
            Visual preview (sandboxed, scripts disabled)
          </p>
          <iframe
            [srcdoc]="html"
            sandbox="allow-same-origin"
            class="h-96 w-full rounded-md border border-hairline bg-white"
          ></iframe>
        </div>
      }
    </div>
  `,
})
export class SelectorEditorComponent {
  readonly pageUrl = signal('');
  readonly previewHtml = signal<string | null>(null);
  readonly testResult = signal<SelectorTestResult | null>(null);
  readonly loadingPreview = signal(false);
  readonly testing = signal(false);

  readonly selectorInputs = signal<Record<string, string>>({
    item: '',
    title: '',
    summary: '',
    image: '',
    url: '',
    date: '',
  });

  readonly fields: Array<{ key: string; label: string; placeholder: string }> = [
    { key: 'item', label: 'Item selectors', placeholder: 'article, .story-card' },
    { key: 'title', label: 'Title selectors', placeholder: 'h2, .headline' },
    { key: 'summary', label: 'Summary selectors', placeholder: 'p.dek, .summary' },
    { key: 'image', label: 'Image selectors', placeholder: 'img' },
    { key: 'url', label: 'URL selectors', placeholder: 'a' },
    { key: 'date', label: 'Date selectors', placeholder: 'time, .timestamp' },
  ];

  constructor(
    private preview: SelectorPreviewService,
    @Inject(SELECTOR_CONFIG_REPOSITORY) private selectorConfigRepo: SelectorConfigRepository,
  ) {}

  updateField(key: string, value: string): void {
    this.selectorInputs.update((current) => ({ ...current, [key]: value }));
  }

  private buildConfig(): SelectorConfig {
    const inputs = this.selectorInputs();
    return {
      id: crypto.randomUUID(),
      version: 1,
      itemSelectors: toList(inputs['item']),
      titleSelectors: toList(inputs['title']),
      summarySelectors: toList(inputs['summary']),
      imageSelectors: toList(inputs['image']),
      urlSelectors: toList(inputs['url']),
      dateSelectors: toList(inputs['date']),
      updatedAt: new Date().toISOString(),
    };
  }

  async loadPreview(): Promise<void> {
    this.loadingPreview.set(true);
    try {
      const html = await this.preview.fetchPreviewHtml(this.pageUrl());
      this.previewHtml.set(html);
    } catch (err) {
      this.previewHtml.set(`<p style="font-family: sans-serif; padding: 1rem;">Could not load preview: ${err}</p>`);
    } finally {
      this.loadingPreview.set(false);
    }
  }

  async testSelectors(): Promise<void> {
    this.testing.set(true);
    try {
      const result = await this.preview.evaluate(this.pageUrl(), this.buildConfig());
      this.testResult.set(result);
    } finally {
      this.testing.set(false);
    }
  }

  async save(): Promise<void> {
    await this.selectorConfigRepo.upsert(this.buildConfig());
  }
}
