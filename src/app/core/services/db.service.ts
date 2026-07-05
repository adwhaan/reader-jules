import { Injectable, signal } from '@angular/core';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private db: any;
  isReady = signal(false);

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const sqlite3: any = await (sqlite3InitModule as any)({
        print: console.log,
        printErr: console.error,
      });

      if ('opfs' in sqlite3) {
        this.db = new sqlite3.oo1.OpfsDb('/rss-reader.db');
        console.log('Using OPFS SQLite database');
      } else {
        this.db = new sqlite3.oo1.DB('/rss-reader.db', 'ct');
        console.log('Using in-memory/fallback SQLite database');
      }

      await this.createTables();
      this.isReady.set(true);
    } catch (err) {
      console.error('Failed to initialize SQLite', err);
    }
  }

  private async createTables() {
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        email_hint TEXT,
        last_sync_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        name VARCHAR(100) NOT NULL,
        parent_folder_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name, parent_folder_id)
      );

      CREATE TABLE IF NOT EXISTS feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        url TEXT NOT NULL,
        display_name VARCHAR(200),
        folder_id INTEGER,
        favicon_url TEXT,
        favicon_cache_path TEXT,
        last_fetched_at DATETIME,
        fetch_error_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, url)
      );

      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        feed_id INTEGER,
        title VARCHAR(500) NOT NULL,
        published_at DATETIME NOT NULL,
        updated_at DATETIME,
        author VARCHAR(200),
        summary TEXT,
        content_html TEXT,
        content_cache_path TEXT,
        featured_image_url TEXT,
        featured_image_cache_path TEXT,
        external_link_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS article_states (
        id TEXT PRIMARY KEY,
        guid TEXT NOT NULL,
        user_device_id TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        is_starred BOOLEAN DEFAULT 0,
        folder_assignments TEXT,
        tag_assignments TEXT,
        notes TEXT,
        last_changed_ts DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    this.db.exec(schema);
  }

  async query(sql: string, params: any[] = []) {
    return this.db.exec({
      sql,
      bind: params,
      returnValue: 'resultRows',
      rowMode: 'object'
    });
  }

  async run(sql: string, params: any[] = []) {
    this.db.exec({
      sql,
      bind: params
    });
  }
}
