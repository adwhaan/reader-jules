import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { ArticleItem, ArticleState, FeedDefinition, FolderDefinition, SelectorConfig } from '../../domain/models/models';

export interface ReaderDbSchema extends DBSchema {
  articles: {
    key: string;
    value: ArticleItem;
    indexes: { 'by-feed': string; 'by-canonical-url': string };
  };
  articleStates: {
    key: string;
    value: ArticleState;
  };
  feeds: {
    key: string;
    value: FeedDefinition;
  };
  folders: {
    key: string;
    value: FolderDefinition;
  };
  selectorConfigs: {
    key: string;
    value: SelectorConfig;
  };
  syncQueue: {
    key: number;
    value: { id?: number; queuedAt: string; reason: string };
  };
}

const DB_NAME = 'reader-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ReaderDbSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<ReaderDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ReaderDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const articles = db.createObjectStore('articles', { keyPath: 'id' });
        articles.createIndex('by-feed', 'feedId');
        articles.createIndex('by-canonical-url', 'canonicalUrl', { unique: false });

        db.createObjectStore('articleStates', { keyPath: 'articleId' });
        db.createObjectStore('feeds', { keyPath: 'id' });
        db.createObjectStore('folders', { keyPath: 'id' });
        db.createObjectStore('selectorConfigs', { keyPath: 'id' });
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      },
    });
  }
  return dbPromise;
}
