import { SelectorConfig, SyncDocument } from '../models/models';

export interface FeedFetcher {
  fetchText(url: string): Promise<string>;
}

export interface FeedParser<TItem> {
  parse(input: string): Promise<TItem[]>;
}

export interface SelectorTestResult {
  matchedCount: number;
  items: Array<{
    title?: string;
    summary?: string;
    imageUrl?: string;
    url?: string;
    publishedAt?: string;
  }>;
  warnings: string[];
}

export interface SelectorEvaluator {
  evaluate(url: string, config: SelectorConfig): Promise<SelectorTestResult>;
}

export interface SyncLoadResult {
  document: SyncDocument | null;
  etag?: string;
}

export interface SyncSaveResult {
  etag: string;
}

export class SyncConflictError extends Error {
  constructor(message = 'The sync document was updated elsewhere. Reload and retry.') {
    super(message);
    this.name = 'SyncConflictError';
  }
}

export interface SyncProvider {
  load(): Promise<SyncLoadResult>;
  save(document: SyncDocument, etag?: string): Promise<SyncSaveResult>;
}

export interface OpmlImportedFeed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  folderName?: string;
}

export interface OpmlService {
  import(xml: string): OpmlImportedFeed[];
  export(feeds: Array<{ title: string; xmlUrl: string; htmlUrl?: string; folderName?: string }>): string;
}

export interface JsonSelectorService {
  import(json: string): SelectorConfig[];
  export(configs: SelectorConfig[]): string;
}
