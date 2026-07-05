import { Injectable } from '@angular/core';
import { Readability } from '@mozilla/readability';

@Injectable({
  providedIn: 'root'
})
export class ArticleCacheService {
  constructor() {}

  async extractFullContent(html: string, url: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Check if it's a valid document
    if (!doc.body) return null;

    const reader = new Readability(doc);
    const article = reader.parse();

    return article;
  }

  // Future: Implement local file system caching using OPFS or similar
  async saveToCache(guid: string, content: string) {
    console.log(`Caching content for ${guid}`);
    // implementation for OPFS storage would go here
  }
}
