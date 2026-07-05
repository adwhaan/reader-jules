import { Injectable, inject, signal } from '@angular/core';
import { Collection } from '@signaldb/core';
import { DbService } from './db.service';
import { Feed, Article } from '../models/db.models';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private dbService = inject(DbService);

  public feeds = new Collection<Feed>();
  public articles = new Collection<Article>();

  // Expose signals for the collections
  public feedsSignal = signal<Feed[]>([]);

  constructor() {
    this.initPersistence();
  }

  private async initPersistence() {
    const checkReady = setInterval(async () => {
        if (this.dbService.isReady()) {
            clearInterval(checkReady);
            await this.loadInitialData();
            this.setupSync();
        }
    }, 100);
  }

  private async loadInitialData() {
      const feedRows = await this.dbService.query('SELECT * FROM feeds');
      feedRows.forEach((row: any) => this.feeds.insert(row));
      this.refreshSignals();
  }

  private refreshSignals() {
      this.feedsSignal.set(this.feeds.find().fetch());
  }

  private setupSync() {
      this.feeds.on('added', async (item) => {
          this.refreshSignals();
          await this.dbService.run(
              `INSERT OR REPLACE INTO feeds (id, user_id, url, display_name, folder_id, is_active)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [item.id, item.user_id, item.url, item.display_name, item.folder_id, item.is_active ? 1 : 0]
          );
      });

      this.feeds.on('changed', async (item) => {
          this.refreshSignals();
          await this.dbService.run(
              `UPDATE feeds SET display_name = ?, is_active = ?, folder_id = ? WHERE id = ?`,
              [item.display_name, item.is_active ? 1 : 0, item.folder_id, item.id]
          );
      });

      this.feeds.on('removed', async (item) => {
          this.refreshSignals();
          await this.dbService.run('DELETE FROM feeds WHERE id = ?', [item.id]);
      });
  }
}
