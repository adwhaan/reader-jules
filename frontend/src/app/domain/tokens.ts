import { InjectionToken } from '@angular/core';
import { FeedFetcher, JsonSelectorService, OpmlService, SelectorEvaluator, SyncProvider } from './adapters/adapters';
import {
  ArticleRepository,
  FeedRepository,
  FolderRepository,
  SelectorConfigRepository,
  StateRepository,
} from './repositories/repositories';

export const ARTICLE_REPOSITORY = new InjectionToken<ArticleRepository>('ARTICLE_REPOSITORY');
export const STATE_REPOSITORY = new InjectionToken<StateRepository>('STATE_REPOSITORY');
export const FEED_REPOSITORY = new InjectionToken<FeedRepository>('FEED_REPOSITORY');
export const FOLDER_REPOSITORY = new InjectionToken<FolderRepository>('FOLDER_REPOSITORY');
export const SELECTOR_CONFIG_REPOSITORY = new InjectionToken<SelectorConfigRepository>('SELECTOR_CONFIG_REPOSITORY');

export const FEED_FETCHER = new InjectionToken<FeedFetcher>('FEED_FETCHER');
export const SELECTOR_EVALUATOR = new InjectionToken<SelectorEvaluator>('SELECTOR_EVALUATOR');
export const SYNC_PROVIDER = new InjectionToken<SyncProvider>('SYNC_PROVIDER');
export const OPML_SERVICE = new InjectionToken<OpmlService>('OPML_SERVICE');
export const JSON_SELECTOR_SERVICE = new InjectionToken<JsonSelectorService>('JSON_SELECTOR_SERVICE');
