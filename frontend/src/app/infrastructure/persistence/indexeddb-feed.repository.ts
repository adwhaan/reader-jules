import { Injectable } from '@angular/core';
import { FeedRepository } from '../../domain/repositories/repositories';
import { FeedDefinition } from '../../domain/models/models';
import { getDb } from './db';

@Injectable({ providedIn: 'root' })
export class IndexedDbFeedRepository implements FeedRepository {
  async upsert(feed: FeedDefinition): Promise<void> {
    const db = await getDb();
    await db.put('feeds', feed);
  }

  async getAll(): Promise<FeedDefinition[]> {
    const db = await getDb();
    return db.getAll('feeds');
  }

  async getById(id: string): Promise<FeedDefinition | null> {
    const db = await getDb();
    return (await db.get('feeds', id)) ?? null;
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const db = await getDb();
    const existing = await db.get('feeds', id);
    if (!existing) return;
    await db.put('feeds', { ...existing, deletedAt, updatedAt: deletedAt, enabled: false });
  }
}
