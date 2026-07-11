import { Inject, Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SyncConflictError, SyncProvider } from '../domain/adapters/adapters';
import { SyncDocument, UserSettings, createDefaultSettings, createEmptySyncDocument } from '../domain/models/models';
import { pruneFeeds, pruneFolders } from '../domain/services/pruning';
import { SYNC_PROVIDER } from '../domain/tokens';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'conflict' | 'error';

@Injectable({ providedIn: 'root' })
export class SyncOrchestratorService {
  private readonly statusSubject = new BehaviorSubject<SyncStatus>('idle');
  readonly status$ = this.statusSubject.asObservable();

  readonly settings = signal<UserSettings>(createDefaultSettings());

  private currentDocument: SyncDocument | null = null;
  private currentEtag: string | undefined;
  private pendingChange = false;

  constructor(@Inject(SYNC_PROVIDER) private syncProvider: SyncProvider) {}

  async loadInitial(): Promise<SyncDocument> {
    this.statusSubject.next('syncing');
    try {
      const { document, etag } = await this.syncProvider.load();
      this.currentDocument = document ?? createEmptySyncDocument();
      this.currentEtag = etag;
      this.applyLocalPruning();
      this.settings.set(this.currentDocument.settings);
      this.statusSubject.next('idle');
      return this.currentDocument;
    } catch (err) {
      this.statusSubject.next('offline');
      this.currentDocument = this.currentDocument ?? createEmptySyncDocument();
      this.settings.set(this.currentDocument.settings);
      return this.currentDocument;
    }
  }

  updateSettings(patch: Partial<UserSettings>): void {
    this.queueImmediate((doc) => ({ ...doc, settings: { ...doc.settings, ...patch } }));
    this.settings.update((current) => ({ ...current, ...patch }));
  }

  queueImmediate(mutate: (doc: SyncDocument) => SyncDocument): void {
    if (!this.currentDocument) return;
    this.currentDocument = mutate({ ...this.currentDocument, updatedAt: new Date().toISOString() });
    this.pendingChange = true;
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (!this.pendingChange || !this.currentDocument) return;

    this.statusSubject.next('syncing');
    try {
      const result = await this.syncProvider.save(this.currentDocument, this.currentEtag);
      this.currentEtag = result.etag;
      this.pendingChange = false;
      this.statusSubject.next('idle');
    } catch (err) {
      if (err instanceof SyncConflictError) {
        this.statusSubject.next('conflict');
        const { document, etag } = await this.syncProvider.load();
        this.currentDocument = document ?? this.currentDocument;
        this.currentEtag = etag;
        this.pendingChange = false;
        this.statusSubject.next('idle');
        return;
      }
      this.statusSubject.next('offline');
    }
  }

  private applyLocalPruning(): void {
    if (!this.currentDocument) return;
    const retentionDays = this.currentDocument.settings.tombstoneRetentionDays;
    this.currentDocument = {
      ...this.currentDocument,
      folders: pruneFolders(this.currentDocument.folders, retentionDays),
      feeds: pruneFeeds(this.currentDocument.feeds, retentionDays),
    };
  }

  getCurrentDocument(): SyncDocument | null {
    return this.currentDocument;
  }
}
