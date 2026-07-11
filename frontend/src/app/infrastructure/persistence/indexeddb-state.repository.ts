import { Injectable } from '@angular/core';
import { StateRepository } from '../../domain/repositories/repositories';
import { ArticleState } from '../../domain/models/models';
import { getDb } from './db';

@Injectable({ providedIn: 'root' })
export class IndexedDbStateRepository implements StateRepository {
  async upsert(state: ArticleState): Promise<void> {
    const db = await getDb();
    await db.put('articleStates', state);
  }

  async getByArticleId(articleId: string): Promise<ArticleState | null> {
    const db = await getDb();
    return (await db.get('articleStates', articleId)) ?? null;
  }

  async getAll(): Promise<ArticleState[]> {
    const db = await getDb();
    return db.getAll('articleStates');
  }
}
