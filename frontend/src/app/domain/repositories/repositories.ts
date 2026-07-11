import { ArticleItem, ArticleState, FeedDefinition, FolderDefinition, SelectorConfig } from '../models/models';

export interface ArticleRepository {
  upsertMany(items: ArticleItem[]): Promise<void>;
  getByFeedId(feedId: string): Promise<ArticleItem[]>;
  findByCanonicalUrl(url: string): Promise<ArticleItem | null>;
}

export interface StateRepository {
  upsert(state: ArticleState): Promise<void>;
  getByArticleId(articleId: string): Promise<ArticleState | null>;
  getAll(): Promise<ArticleState[]>;
}

export interface FeedRepository {
  upsert(feed: FeedDefinition): Promise<void>;
  getAll(): Promise<FeedDefinition[]>;
  getById(id: string): Promise<FeedDefinition | null>;
  softDelete(id: string, deletedAt: string): Promise<void>;
}

export interface FolderRepository {
  upsert(folder: FolderDefinition): Promise<void>;
  getAll(): Promise<FolderDefinition[]>;
  softDelete(id: string, deletedAt: string): Promise<void>;
}

export interface SelectorConfigRepository {
  upsert(config: SelectorConfig): Promise<void>;
  getById(id: string): Promise<SelectorConfig | null>;
  getAll(): Promise<SelectorConfig[]>;
}
