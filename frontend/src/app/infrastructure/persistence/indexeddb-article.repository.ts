import { Injectable } from '@angular/core';
import { ArticleRepository } from '../../domain/repositories/repositories';
import { ArticleItem } from '../../domain/models/models';
import { getDb } from './db';

@Injectable({ providedIn: 'root' })
export class IndexedDbArticleRepository implements ArticleRepository {
  async upsertMany(items: ArticleItem[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('articles', 'readwrite');
    await Promise.all(items.map((item) => tx.store.put(item)));
    await tx.done;
  }

  async getByFeedId(feedId: string): Promise<ArticleItem[]> {
    const db = await getDb();
    return db.getAllFromIndex('articles', 'by-feed', feedId);
  }

  async findByCanonicalUrl(url: string): Promise<ArticleItem | null> {
    const db = await getDb();
    const matches = await db.getAllFromIndex('articles', 'by-canonical-url', url);
    return matches[0] ?? null;
  }
}
