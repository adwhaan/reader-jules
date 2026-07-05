import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StoreService } from './store.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FeedFetcherService {
  private http = inject(HttpClient);
  private store = inject(StoreService);

  async fetchFeed(url: string) {
    try {
      // In a real browser, this might hit CORS issues.
      // Usually, self-hosted RSS readers use a proxy or a backend.
      // For now, we'll assume the URL is accessible or the user is using a CORS-bypass extension.
      const xml = await lastValueFrom(this.http.get(url, { responseType: 'text' }));
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      const title = doc.querySelector('channel > title')?.textContent || 'Unknown Feed';

      // Basic addition to our store
      this.store.feeds.insert({
        id: Math.floor(Math.random() * 1000000), // Temporary ID generation
        user_id: 'default-user',
        url: url,
        display_name: title,
        fetch_error_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      });

      console.log(`Feed added: ${title}`);
    } catch (err) {
      console.error('Failed to fetch feed', err);
      throw err;
    }
  }
}
