export type FeedType = 'rss' | 'atom' | 'selector';

export interface FolderDefinition {
  id: string;
  name: string;
  order: number;
  parentId?: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface FeedDefinition {
  id: string;
  type: FeedType;
  title: string;
  folderId?: string;
  xmlUrl?: string;
  htmlUrl?: string;
  pageUrl?: string;
  enabled: boolean;
  defaultTags: string[];
  selectorConfigId?: string;
  selectorConfigVersion?: number;
  lastRefreshAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SelectorConfig {
  id: string;
  version: number;
  itemSelectors: string[];
  titleSelectors: string[];
  summarySelectors: string[];
  imageSelectors: string[];
  urlSelectors: string[];
  dateSelectors: string[];
  notes?: string;
  updatedAt: string;
}

export interface ArticleItem {
  id: string;
  feedId: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  publishedAt?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleState {
  articleId: string;
  read: boolean;
  readLater: boolean;
  tags: string[];
  updatedAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  refreshIntervalMinutes: number;
  staggerMs: number;
  defaultView: 'all' | 'unread' | 'readLater';
  lastActiveFolderId?: string;
  autoRefreshOnFolderSwitch: boolean;
  tombstoneRetentionDays: number;
}

export interface SyncDocument {
  schemaVersion: number;
  updatedAt: string;
  folders: FolderDefinition[];
  feeds: FeedDefinition[];
  selectorConfigs: SelectorConfig[];
  articleStates: ArticleState[];
  settings: UserSettings;
}

export function createDefaultSettings(): UserSettings {
  return {
    theme: 'system',
    refreshIntervalMinutes: 30,
    staggerMs: 250,
    defaultView: 'all',
    autoRefreshOnFolderSwitch: true,
    tombstoneRetentionDays: 30,
  };
}

export function createEmptySyncDocument(): SyncDocument {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    folders: [],
    feeds: [],
    selectorConfigs: [],
    articleStates: [],
    settings: createDefaultSettings(),
  };
}
