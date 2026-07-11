import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { SyncOrchestratorService } from './application/sync-orchestrator.service';
import { ReaderStateService } from './application/reader-state.service';
import { SyncStatusComponent } from './presentation/sync-status/sync-status.component';
import { FeedTreeComponent } from './presentation/feed-tree/feed-tree.component';
import { ArticleListComponent } from './presentation/article-list/article-list.component';
import { ArticleDetailComponent } from './presentation/article-detail/article-detail.component';
import { SelectorEditorComponent } from './presentation/selector-editor/selector-editor.component';
import { ImportExportComponent } from './presentation/import-export/import-export.component';
import { AddFeedComponent } from './presentation/add-feed/add-feed.component';
import { SettingsComponent } from './presentation/settings/settings.component';

type ActiveView = 'reader' | 'add-feed' | 'import-export' | 'settings';
type AddFeedMode = 'url' | 'selector';
type MobilePane = 'tree' | 'list' | 'detail';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SyncStatusComponent,
    FeedTreeComponent,
    ArticleListComponent,
    ArticleDetailComponent,
    SelectorEditorComponent,
    ImportExportComponent,
    AddFeedComponent,
    SettingsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly activeView = signal<ActiveView>('reader');
  readonly addFeedMode = signal<AddFeedMode>('url');

  readonly mobilePane = computed<MobilePane>(() => {
    if (this.readerState.selectedArticleId()) return 'detail';
    if (this.readerState.selectedFolderId() !== null || this.readerState.selectedFeedId() !== null) return 'list';
    return 'tree';
  });

  constructor(
    private syncOrchestrator: SyncOrchestratorService,
    public readerState: ReaderStateService,
  ) {
    effect((onCleanup) => {
      const theme = this.syncOrchestrator.settings().theme;
      const root = document.documentElement;

      if (theme === 'dark') {
        root.classList.add('dark');
        return;
      }
      if (theme === 'light') {
        root.classList.remove('dark');
        return;
      }

      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => root.classList.toggle('dark', media.matches);
      apply();
      media.addEventListener('change', apply);
      onCleanup(() => media.removeEventListener('change', apply));
    });
  }

  async ngOnInit(): Promise<void> {
    await this.syncOrchestrator.loadInitial();
    await this.readerState.loadFoldersAndFeeds();

    const lastActiveFolderId = this.syncOrchestrator.settings().lastActiveFolderId ?? null;
    this.readerState.selectedFolderId.set(lastActiveFolderId);
    await this.readerState.loadArticlesForCurrentSelection();
    void this.readerState.refreshAllInCurrentFolder();
  }

  backToTree(): void {
    void this.readerState.selectFolder(null);
  }

  backToList(): void {
    this.readerState.selectedArticleId.set(null);
  }
}
