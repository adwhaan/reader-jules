import { Injectable } from '@angular/core';
import { SelectorConfigRepository } from '../../domain/repositories/repositories';
import { SelectorConfig } from '../../domain/models/models';
import { getDb } from './db';

@Injectable({ providedIn: 'root' })
export class IndexedDbSelectorConfigRepository implements SelectorConfigRepository {
  async upsert(config: SelectorConfig): Promise<void> {
    const db = await getDb();
    await db.put('selectorConfigs', config);
  }

  async getById(id: string): Promise<SelectorConfig | null> {
    const db = await getDb();
    return (await db.get('selectorConfigs', id)) ?? null;
  }

  async getAll(): Promise<SelectorConfig[]> {
    const db = await getDb();
    return db.getAll('selectorConfigs');
  }
}
