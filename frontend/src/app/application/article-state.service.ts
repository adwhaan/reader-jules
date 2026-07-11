import { Inject, Injectable } from '@angular/core';
import { StateRepository } from '../domain/repositories/repositories';
import { ArticleState } from '../domain/models/models';
import { STATE_REPOSITORY } from '../domain/tokens';
import { SyncOrchestratorService } from './sync-orchestrator.service';

@Injectable({ providedIn: 'root' })
export class ArticleStateService {
  constructor(
    @Inject(STATE_REPOSITORY) private repo: StateRepository,
    private sync: SyncOrchestratorService,
  ) {}

  async toggleRead(articleId: string): Promise<void> {
    const current = await this.repo.getByArticleId(articleId);
    const next: ArticleState = {
      articleId,
      read: !(current?.read ?? false),
      readLater: current?.readLater ?? false,
      tags: current?.tags ?? [],
      updatedAt: new Date().toISOString(),
    };
    await this.repo.upsert(next);
    this.queueSync(next);
  }

  async toggleReadLater(articleId: string): Promise<void> {
    const current = await this.repo.getByArticleId(articleId);
    const next: ArticleState = {
      articleId,
      read: current?.read ?? false,
      readLater: !(current?.readLater ?? false),
      tags: current?.tags ?? [],
      updatedAt: new Date().toISOString(),
    };
    await this.repo.upsert(next);
    this.queueSync(next);
  }

  async setTags(articleId: string, tags: string[]): Promise<void> {
    const current = await this.repo.getByArticleId(articleId);
    const next: ArticleState = {
      articleId,
      read: current?.read ?? false,
      readLater: current?.readLater ?? false,
      tags,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.upsert(next);
    this.queueSync(next);
  }

  private queueSync(state: ArticleState): void {
    this.sync.queueImmediate((doc) => {
      const withoutThis = doc.articleStates.filter((s) => s.articleId !== state.articleId);
      return { ...doc, articleStates: [...withoutThis, state] };
    });
  }
}
