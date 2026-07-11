import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReaderStateService } from '../../application/reader-state.service';

@Component({
  selector: 'app-article-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-full flex-col overflow-y-auto divide-y divide-hairline">
      @if (state.articles().length === 0) {
        <div class="p-8 text-center text-sm text-ink-muted">
          Nothing here yet. Pick a feed and refresh, or add one from the feed tree.
        </div>
      }

      @for (article of state.articles(); track article.id) {
        <button
          type="button"
          class="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-moss-50/60"
          [class.bg-moss-50]="state.selectedArticleId() === article.id"
          (click)="open(article.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <h3
              class="font-display text-[15px] leading-snug"
              [class.font-semibold]="!article.state.read"
              [class.text-ink]="!article.state.read"
              [class.text-ink-muted]="article.state.read"
            >
              {{ article.title }}
            </h3>
            @if (!article.state.read) {
              <span class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-moss-500"></span>
            }
          </div>

          <div class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
            <span>{{ article.sourceTitle }}</span>
            @if (article.publishedAt) {
              <span aria-hidden="true">·</span>
              <span>{{ article.publishedAt | date: 'MMM d' }}</span>
            }
            @if (article.state.readLater) {
              <span class="rounded bg-ochre-100 px-1.5 py-0.5 text-ochre-600">Read later</span>
            }
          </div>
        </button>
      }
    </div>
  `,
})
export class ArticleListComponent {
  constructor(public state: ReaderStateService) {}

  open(articleId: string): void {
    this.state.selectArticle(articleId);
    void this.state.markRead(articleId);
  }
}
