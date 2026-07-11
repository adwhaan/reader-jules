import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReaderStateService } from '../../application/reader-state.service';
import { FeedDiscoveryService } from '../../application/feed-discovery.service';
import { FeedDefinition } from '../../domain/models/models';
import { FeedMeta } from '../../infrastructure/parsing/rss-atom.parser';

@Component({
  selector: 'app-add-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div>
        <h2 class="font-display text-xl font-semibold text-ink">Add an RSS or Atom feed</h2>
        <p class="mt-1 text-sm text-ink-muted">
          Paste a feed URL — the site's own feed link, not its homepage
          (often ending in <code class="font-mono text-xs">/feed</code>,
          <code class="font-mono text-xs">/rss</code>, or
          <code class="font-mono text-xs">.xml</code>).
        </p>
      </div>

      <label class="block">
        <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">Feed URL</span>
        <div class="mt-1 flex gap-2">
          <input
            type="url"
            class="w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
            placeholder="https://example.com/feed"
            [(ngModel)]="url"
            (keydown.enter)="lookUp()"
          />
          <button
            type="button"
            class="flex-shrink-0 rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-moss-400 hover:text-moss-600 disabled:opacity-50"
            [disabled]="!url() || lookingUp()"
            (click)="lookUp()"
          >
            {{ lookingUp() ? 'Looking up…' : 'Look up feed' }}
          </button>
        </div>
      </label>

      @if (lookupError()) {
        <p class="text-sm text-red-700">{{ lookupError() }}</p>
      }

      @if (meta(); as meta) {
        <div class="rounded-md border border-hairline bg-surface p-3">
          <p class="font-mono text-xs uppercase tracking-widest text-ink-faint">
            {{ meta.type === 'atom' ? 'Atom feed' : 'RSS feed' }} found
          </p>
          <p class="mt-1 font-display text-lg font-semibold text-ink">{{ meta.title }}</p>
          @if (meta.htmlUrl) {
            <p class="text-xs text-ink-faint">{{ meta.htmlUrl }}</p>
          }
        </div>

        <label class="block">
          <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">Title</span>
          <input
            type="text"
            class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
            [(ngModel)]="title"
          />
        </label>

        <label class="block">
          <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">Folder</span>
          <select
            class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
            [(ngModel)]="folderId"
          >
            <option [ngValue]="null">No folder</option>
            @for (folder of state.folders(); track folder.id) {
              <option [ngValue]="folder.id">{{ folder.name }}</option>
            }
            <option [ngValue]="'__new__'">+ New folder…</option>
          </select>
        </label>

        @if (folderId() === '__new__') {
          <label class="block">
            <span class="font-mono text-xs uppercase tracking-widest text-ink-faint">New folder name</span>
            <input
              type="text"
              class="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
              [(ngModel)]="newFolderName"
            />
          </label>
        }

        <button
          type="button"
          class="w-fit rounded-md bg-moss-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-moss-600 disabled:opacity-50"
          [disabled]="!title() || adding()"
          (click)="addFeed()"
        >
          {{ adding() ? 'Adding…' : 'Add feed' }}
        </button>

        @if (addedMessage()) {
          <p class="text-sm text-moss-700">{{ addedMessage() }}</p>
        }
      }
    </div>
  `,
})
export class AddFeedComponent {
  readonly url = signal('');
  readonly title = signal('');
  readonly folderId = signal<string | null>(null);
  readonly newFolderName = signal('');
  readonly meta = signal<FeedMeta | null>(null);
  readonly lookingUp = signal(false);
  readonly lookupError = signal<string | null>(null);
  readonly adding = signal(false);
  readonly addedMessage = signal<string | null>(null);

  constructor(
    public state: ReaderStateService,
    private discovery: FeedDiscoveryService,
  ) {}

  async lookUp(): Promise<void> {
    this.lookingUp.set(true);
    this.lookupError.set(null);
    this.meta.set(null);
    this.addedMessage.set(null);

    try {
      const meta = await this.discovery.discover(this.url());
      this.meta.set(meta);
      this.title.set(meta.title);
    } catch (err) {
      this.lookupError.set(
        `Could not read a feed at that URL. Check it points directly at the feed, not the site's homepage.`,
      );
    } finally {
      this.lookingUp.set(false);
    }
  }

  async addFeed(): Promise<void> {
    const meta = this.meta();
    if (!meta) return;

    this.adding.set(true);
    try {
      let folderId = this.folderId();
      if (folderId === '__new__') {
        const name = this.newFolderName().trim();
        folderId = name ? await this.state.createFolder(name) : null;
      }

      const now = new Date().toISOString();
      const feed: FeedDefinition = {
        id: crypto.randomUUID(),
        type: meta.type,
        title: this.title(),
        folderId: folderId ?? undefined,
        xmlUrl: this.url(),
        htmlUrl: meta.htmlUrl,
        enabled: true,
        defaultTags: [],
        createdAt: now,
        updatedAt: now,
      };

      await this.state.addFeed(feed);
      this.addedMessage.set(`Added "${feed.title}" and fetched its latest articles.`);

      this.url.set('');
      this.meta.set(null);
      this.title.set('');
    } catch (err) {
      this.lookupError.set(`Feed was found but could not be added: ${err}`);
    } finally {
      this.adding.set(false);
    }
  }
}
