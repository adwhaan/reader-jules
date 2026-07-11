import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

import {
  ARTICLE_REPOSITORY,
  FEED_FETCHER,
  FEED_REPOSITORY,
  FOLDER_REPOSITORY,
  JSON_SELECTOR_SERVICE,
  OPML_SERVICE,
  SELECTOR_CONFIG_REPOSITORY,
  SELECTOR_EVALUATOR,
  STATE_REPOSITORY,
  SYNC_PROVIDER,
} from './domain/tokens';

import { IndexedDbArticleRepository } from './infrastructure/persistence/indexeddb-article.repository';
import { IndexedDbStateRepository } from './infrastructure/persistence/indexeddb-state.repository';
import { IndexedDbFeedRepository } from './infrastructure/persistence/indexeddb-feed.repository';
import { IndexedDbFolderRepository } from './infrastructure/persistence/indexeddb-folder.repository';
import { IndexedDbSelectorConfigRepository } from './infrastructure/persistence/indexeddb-selector-config.repository';
import { HttpSyncProvider } from './infrastructure/sync/http-sync.provider';
import { HttpFeedFetcher } from './infrastructure/fetch/http-feed.fetcher';
import { HttpSelectorEvaluator } from './infrastructure/fetch/http-selector.evaluator';
import { OpmlXmlService } from './infrastructure/parsing/opml-xml.service';
import { JsonSelectorFileService } from './infrastructure/parsing/json-selector-file.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),

    { provide: ARTICLE_REPOSITORY, useClass: IndexedDbArticleRepository },
    { provide: STATE_REPOSITORY, useClass: IndexedDbStateRepository },
    { provide: FEED_REPOSITORY, useClass: IndexedDbFeedRepository },
    { provide: FOLDER_REPOSITORY, useClass: IndexedDbFolderRepository },
    { provide: SELECTOR_CONFIG_REPOSITORY, useClass: IndexedDbSelectorConfigRepository },

    { provide: SYNC_PROVIDER, useClass: HttpSyncProvider },
    { provide: FEED_FETCHER, useClass: HttpFeedFetcher },
    { provide: SELECTOR_EVALUATOR, useClass: HttpSelectorEvaluator },

    { provide: OPML_SERVICE, useClass: OpmlXmlService },
    { provide: JSON_SELECTOR_SERVICE, useClass: JsonSelectorFileService },
  ],
};
