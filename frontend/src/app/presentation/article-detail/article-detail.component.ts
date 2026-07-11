import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReaderStateService } from '../../application/reader-state.service';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (article(); as article) {
      <article class="flex h-full flex-col overflow-y-auto p-6">
        <p class="font-mono text-xs uppercase tracking-widest text-moss-600">{{ article.sourceTitle }}</p>
        <h1 class="mt-1 font-display text-2xl font-semibold leading-tight text-ink">{{ article.title }}</h1>

        <div class="mt-2 flex items-center gap-3 text-xs text-ink-faint">
          @if (article.publishedAt) {
            <span>{{ article.publishedAt | date: 'medium' }}</span>
          }
        </div>

        @if (article.imageUrl) {
          <img [src]="article.imageUrl" alt="" class="mt-4 max-h-72 w-full rounded-lg object-cover" />
        }

        @if (article.summary) {
          <p class="mt-4 text-[15px] leading-relaxed text-ink">{{ article.summary }}</p>
        }

        <div class="mt-6 flex flex-wrap items-center gap-2">
          <a
            [href]="article.canonicalUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-md bg-moss-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-moss-600"
          >
            Read full article ↗
          </a>

          <button
            type="button"
            class="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-ochre-500 hover:text-ochre-600"
            (click)="toggleReadLater(article.id)"
          >
            {{ article.state.readLater ? 'Remove from read later' : 'Read later' }}
          </button>

          <button
            type="button"
            class="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-moss-400 hover:text-moss-600"
            (click)="toggleRead(article.id)"
          >
            {{ article.state.read ? 'Mark unread' : 'Mark read' }}
          </button>
        </div>

        <div class="mt-6">
          <label class="block font-mono text-xs uppercase tracking-widest text-ink-faint" for="tags-input">
            Tags
          </label>
          <input
            id="tags-input"
            type="text"
            class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
            placeholder="comma, separated, tags"
            [ngModel]="tagsInput()"
            (ngModelChange)="tagsInput.set($event)"
            (blur)="saveTags(article.id)"
          />
        </div>
      </article>
    } @else {
      <div class="flex h-full items-center justify-center text-sm text-ink-faint">
        Select an article to read it here.
      </div>
    }
  `,
})
export class ArticleDetailComponent {
  readonly tagsInput = signal('');

  article = computed(() => {
    const id = this.state.selectedArticleId();
    return this.state.articles().find((a) => a.id === id) ?? null;
  });

  constructor(public state: ReaderStateService) {
    effect(() => {
      const current = this.article();
      this.tagsInput.set(current ? current.state.tags.join(', ') : '');
    });
  }

  toggleRead(articleId: string): void {
    void this.state.markRead(articleId);
  }

  toggleReadLater(articleId: string): void {
    void this.state.markReadLater(articleId);
  }

  saveTags(articleId: string): void {
    const tags = this.tagsInput()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    void this.state.setTags(articleId, tags);
  }
}
