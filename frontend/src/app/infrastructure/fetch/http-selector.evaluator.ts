import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SelectorEvaluator, SelectorTestResult } from '../../domain/adapters/adapters';
import { SelectorConfig } from '../../domain/models/models';
import { API_CONFIG, ApiConfig } from '../api-config';

interface BackendSelectorResponse {
  matchedCount: number;
  items: Array<{
    title?: string;
    summary?: string;
    imageUrl?: string;
    url?: string;
    publishedAt?: string;
  }>;
  warnings: string[];
}

@Injectable({ providedIn: 'root' })
export class HttpSelectorEvaluator implements SelectorEvaluator {
  constructor(private http: HttpClient, @Inject(API_CONFIG) private config: ApiConfig) {}

  async evaluate(url: string, selectorConfig: SelectorConfig): Promise<SelectorTestResult> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (this.config.functionKey) {
      headers = headers.set('x-functions-key', this.config.functionKey);
    }

    const response = await firstValueFrom(
      this.http.post<BackendSelectorResponse>(
        `${this.config.baseUrl}/selectors/evaluate`,
        { url, config: selectorConfig },
        { headers },
      ),
    );

    return {
      matchedCount: response.matchedCount,
      items: response.items,
      warnings: response.warnings,
    };
  }
}
