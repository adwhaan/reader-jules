import { Injectable } from '@angular/core';
import { FolderRepository } from '../../domain/repositories/repositories';
import { FolderDefinition } from '../../domain/models/models';
import { getDb } from './db';

@Injectable({ providedIn: 'root' })
export class IndexedDbFolderRepository implements FolderRepository {
  async upsert(folder: FolderDefinition): Promise<void> {
    const db = await getDb();
    await db.put('folders', folder);
  }

  async getAll(): Promise<FolderDefinition[]> {
    const db = await getDb();
    return db.getAll('folders');
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const db = await getDb();
    const existing = await db.get('folders', id);
    if (!existing) return;
    await db.put('folders', { ...existing, deletedAt, updatedAt: deletedAt });
  }
}
