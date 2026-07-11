import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FeedFetcher } from '../../domain/adapters/adapters';
import { API_CONFIG, ApiConfig } from '../api-config';

@Injectable({ providedIn: 'root' })
export class HttpFeedFetcher implements FeedFetcher {
  constructor(private http: HttpClient, @Inject(API_CONFIG) private config: ApiConfig) {}

  async fetchText(url: string): Promise<string> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (this.config.functionKey) {
      headers = headers.set('x-functions-key', this.config.functionKey);
    }

    return firstValueFrom(
      this.http.post(`${this.config.baseUrl}/feeds/fetch`, { url }, { headers, responseType: 'text' }),
    );
  }
}
