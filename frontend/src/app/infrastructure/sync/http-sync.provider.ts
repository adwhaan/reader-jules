import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SyncConflictError, SyncLoadResult, SyncProvider, SyncSaveResult } from '../../domain/adapters/adapters';
import { SyncDocument } from '../../domain/models/models';
import { API_CONFIG, ApiConfig } from '../api-config';

@Injectable({ providedIn: 'root' })
export class HttpSyncProvider implements SyncProvider {
  constructor(private http: HttpClient, @Inject(API_CONFIG) private config: ApiConfig) {}

  async load(): Promise<SyncLoadResult> {
    try {
      const response = await firstValueFrom(
        this.http.get<SyncDocument>(`${this.config.baseUrl}/sync`, {
          headers: this.authHeaders(),
          observe: 'response',
        }),
      );

      if (response.status === 204 || !response.body) {
        return { document: null };
      }

      return { document: response.body, etag: response.headers.get('ETag') ?? undefined };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 204) {
        return { document: null };
      }
      throw err;
    }
  }

  async save(document: SyncDocument, etag?: string): Promise<SyncSaveResult> {
    let headers = this.authHeaders().set('Content-Type', 'application/json');
    if (etag) {
      headers = headers.set('If-Match', etag);
    }

    try {
      const response = await firstValueFrom(
        this.http.put(`${this.config.baseUrl}/sync`, document, { headers, observe: 'response' }),
      );
      return { etag: response.headers.get('ETag') ?? '' };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 412) {
        throw new SyncConflictError();
      }
      throw err;
    }
  }

  private authHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.config.functionKey) {
      headers = headers.set('x-functions-key', this.config.functionKey);
    }
    return headers;
  }
}
