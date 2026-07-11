import { Inject, Injectable, signal } from '@angular/core';
import {
  ArticleRepository,
  FeedRepository,
  FolderRepository,
  StateRepository,
} from '../domain/repositories/repositories';
import { ArticleItem, ArticleState, FeedDefinition, FolderDefinition } from '../domain/models/models';
import { ARTICLE_REPOSITORY, FEED_REPOSITORY, FOLDER_REPOSITORY, STATE_REPOSITORY } from '../domain/tokens';
import { FeedIngestionService } from './feed-ingestion.service';
import { ArticleStateService } from './article-state.service';
import { SyncOrchestratorService } from './sync-orchestrator.service';

export interface ArticleWithState extends ArticleItem {
  state: ArticleState;
}

@Injectable({ providedIn: 'root' })
export class ReaderStateService {
  readonly folders = signal<FolderDefinition[]>([]);
  readonly feeds = signal<FeedDefinition[]>([]);
  readonly selectedFolderId = signal<string | null>(null);
  readonly selectedFeedId = signal<string | null>(null);
  readonly selectedArticleId = signal<string | null>(null);
  readonly articles = signal<ArticleWithState[]>([]);
  readonly refreshing = signal<Set<string>>(new Set());

  constructor(
    @Inject(FOLDER_REPOSITORY) private folderRepo: FolderRepository,
    @Inject(FEED_REPOSITORY) private feedRepo: FeedRepository,
    @Inject(ARTICLE_REPOSITORY) private articleRepo: ArticleRepository,
    @Inject(STATE_REPOSITORY) private stateRepo: StateRepository,
    private ingestion: FeedIngestionService,
    private articleState: ArticleStateService,
    private syncOrchestrator: SyncOrchestratorService,
  ) {}

  async loadFoldersAndFeeds(): Promise<void> {
    const [folders, feeds] = await Promise.all([this.folderRepo.getAll(), this.feedRepo.getAll()]);
    this.folders.set(folders.filter((f) => !f.deletedAt).sort((a, b) => a.order - b.order));
    this.feeds.set(feeds.filter((f) => !f.deletedAt));
  }

  async createFolder(name: string): Promise<string> {
    const folder: FolderDefinition = {
      id: crypto.randomUUID(),
      name,
      order: this.folders().length,
      updatedAt: new Date().toISOString(),
    };
    await this.folderRepo.upsert(folder);
    this.folders.update((current) => [...current, folder]);
    return folder.id;
  }

  async renameFolder(folderId: string, name: string): Promise<void> {
    const folder = this.folders().find((f) => f.id === folderId);
    if (!folder) return;
    const updated = { ...folder, name, updatedAt: new Date().toISOString() };
    await this.folderRepo.upsert(updated);
    this.folders.update((current) => current.map((f) => (f.id === folderId ? updated : f)));
  }

  async reorderFolder(folderId: string, direction: 'up' | 'down'): Promise<void> {
    const ordered = [...this.folders()].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((f) => f.id === folderId);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= ordered.length) return;

    const now = new Date().toISOString();
    const a = { ...ordered[index], order: ordered[swapWith].order, updatedAt: now };
    const b = { ...ordered[swapWith], order: ordered[index].order, updatedAt: now };
    await Promise.all([this.folderRepo.upsert(a), this.folderRepo.upsert(b)]);

    this.folders.update((current) =>
      current
        .map((f) => (f.id === a.id ? a : f.id === b.id ? b : f))
        .sort((x, y) => x.order - y.order),
    );
  }

  async deleteFolder(folderId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.folderRepo.softDelete(folderId, now);
    this.folders.update((current) => current.filter((f) => f.id !== folderId));

    if (this.selectedFolderId() === folderId) {
      await this.selectFolder(null);
    }
  }

  async addFeed(feed: FeedDefinition): Promise<void> {
    await this.feedRepo.upsert(feed);
    this.feeds.update((current) => [...current, feed]);
    await this.refreshFeed(feed);
  }

  async renameFeed(feedId: string, title: string): Promise<void> {
    const feed = this.feeds().find((f) => f.id === feedId);
    if (!feed) return;
    const updated = { ...feed, title, updatedAt: new Date().toISOString() };
    await this.feedRepo.upsert(updated);
    this.feeds.update((current) => current.map((f) => (f.id === feedId ? updated : f)));
  }

  async deleteFeed(feedId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.feedRepo.softDelete(feedId, now);
    this.feeds.update((current) => current.filter((f) => f.id !== feedId));

    if (this.selectedFeedId() === feedId) {
      await this.selectFolder(this.selectedFolderId());
    }
  }

  unreadCountForFeed(feedId: string): number {
    return this.articles().filter((a) => a.feedId === feedId && !a.state.read).length;
  }

  async selectFolder(folderId: string | null): Promise<void> {
    this.selectedFolderId.set(folderId);
    this.selectedFeedId.set(null);
    this.selectedArticleId.set(null);
    await this.loadArticlesForCurrentSelection();
    this.syncOrchestrator.updateSettings({ lastActiveFolderId: folderId ?? undefined });

    if (this.syncOrchestrator.settings().autoRefreshOnFolderSwitch) {
      void this.refreshAllInCurrentFolder();
    }
  }

  async selectFeed(feedId: string): Promise<void> {
    this.selectedFeedId.set(feedId);
    this.selectedArticleId.set(null);
    await this.loadArticlesForCurrentSelection();

    if (this.syncOrchestrator.settings().autoRefreshOnFolderSwitch) {
      const feed = this.feeds().find((f) => f.id === feedId);
      if (feed) void this.refreshFeedIfDue(feed);
    }
  }

  selectArticle(articleId: string): void {
    this.selectedArticleId.set(articleId);
  }

  async loadArticlesForCurrentSelection(): Promise<void> {
    const feedId = this.selectedFeedId();
    const folderId = this.selectedFolderId();

    const relevantFeedIds = feedId
      ? [feedId]
      : this.feeds()
          .filter((f) => (folderId ? f.folderId === folderId : true))
          .map((f) => f.id);

    const [itemLists, states] = await Promise.all([
      Promise.all(relevantFeedIds.map((id) => this.articleRepo.getByFeedId(id))),
      this.stateRepo.getAll(),
    ]);

    const stateByArticleId = new Map(states.map((s) => [s.articleId, s]));
    const items = itemLists.flat().map((item) => ({
      ...item,
      state: stateByArticleId.get(item.id) ?? {
        articleId: item.id,
        read: false,
        readLater: false,
        tags: [],
        updatedAt: item.createdAt,
      },
    }));

    items.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
    this.articles.set(items);
  }

  async refreshFeed(feed: FeedDefinition): Promise<void> {
    this.refreshing.update((set) => new Set(set).add(feed.id));
    try {
      await this.ingestion.refresh(feed);
      await this.loadArticlesForCurrentSelection();
      const refreshed = await this.feedRepo.getById(feed.id);
      if (refreshed) {
        this.feeds.update((current) => current.map((f) => (f.id === feed.id ? refreshed : f)));
      }
    } finally {
      this.refreshing.update((set) => {
        const next = new Set(set);
        next.delete(feed.id);
        return next;
      });
    }
  }

  private async refreshFeedIfDue(feed: FeedDefinition): Promise<void> {
    const intervalMs = this.syncOrchestrator.settings().refreshIntervalMinutes * 60_000;
    const lastRefresh = feed.lastRefreshAt ? new Date(feed.lastRefreshAt).getTime() : 0;
    if (Date.now() - lastRefresh < intervalMs) return;
    await this.refreshFeed(feed);
  }

  async refreshAllInCurrentFolder(): Promise<void> {
    const folderId = this.selectedFolderId();
    const targets = this.feeds().filter((f) => (folderId ? f.folderId === folderId : true) && f.enabled);
    const staggerMs = this.syncOrchestrator.settings().staggerMs;

    for (const feed of targets) {
      void this.refreshFeedIfDue(feed);
      if (staggerMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, staggerMs));
      }
    }
  }

  async markRead(articleId: string): Promise<void> {
    await this.articleState.toggleRead(articleId);
    await this.loadArticlesForCurrentSelection();
  }

  async markReadLater(articleId: string): Promise<void> {
    await this.articleState.toggleReadLater(articleId);
    await this.loadArticlesForCurrentSelection();
  }

  async setTags(articleId: string, tags: string[]): Promise<void> {
    await this.articleState.setTags(articleId, tags);
    await this.loadArticlesForCurrentSelection();
  }
}
