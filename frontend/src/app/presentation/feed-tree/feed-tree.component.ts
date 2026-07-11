import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReaderStateService } from '../../application/reader-state.service';

@Component({
  selector: 'app-feed-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="flex h-full flex-col overflow-y-auto">
      <button
        type="button"
        class="flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium tracking-wide transition-colors"
        [class.bg-moss-50]="state.selectedFolderId() === null"
        [class.text-moss-700]="state.selectedFolderId() === null"
        [class.text-ink]="state.selectedFolderId() !== null"
        (click)="selectAll()"
      >
        <span>All feeds</span>
      </button>

      @for (folder of state.folders(); track folder.id; let i = $index) {
        <div class="group/folder mt-1">
          <div
            class="flex w-full items-center justify-between px-4 py-2 text-left transition-colors"
            [class.text-moss-600]="state.selectedFolderId() === folder.id"
            [class.text-ink-muted]="state.selectedFolderId() !== folder.id"
          >
            @if (editingFolderId === folder.id) {
              <input
                type="text"
                class="w-full rounded border border-moss-400 bg-surface px-1 py-0.5 text-xs"
                [value]="folder.name"
                (blur)="commitFolderRename(folder.id, $event)"
                (keydown.enter)="commitFolderRename(folder.id, $event)"
                autofocus
              />
            } @else {
              <button
                type="button"
                class="flex-1 truncate text-left text-xs font-mono uppercase tracking-widest"
                (click)="selectFolder(folder.id)"
              >
                {{ folder.name }}
              </button>

              <span class="hidden items-center gap-1 group-hover/folder:flex">
                <button type="button" class="text-xs text-ink-faint hover:text-moss-600" title="Move up" (click)="moveFolder(folder.id, 'up')">↑</button>
                <button type="button" class="text-xs text-ink-faint hover:text-moss-600" title="Move down" (click)="moveFolder(folder.id, 'down')">↓</button>
                <button type="button" class="text-xs text-ink-faint hover:text-moss-600" title="Rename" (click)="startFolderRename(folder.id)">✎</button>
                <button type="button" class="text-xs text-ink-faint hover:text-red-600" title="Delete folder" (click)="removeFolder(folder.id)">×</button>
              </span>
            }
          </div>

          @for (feed of feedsIn(folder.id); track feed.id) {
            <div
              class="group/feed flex w-full items-center justify-between py-1.5 pl-7 pr-4 text-left text-sm transition-colors"
              [class.bg-moss-50]="state.selectedFeedId() === feed.id"
              [class.text-moss-700]="state.selectedFeedId() === feed.id"
              [class.text-ink]="state.selectedFeedId() !== feed.id"
            >
              @if (editingFeedId === feed.id) {
                <input
                  type="text"
                  class="w-full rounded border border-moss-400 bg-surface px-1 py-0.5 text-xs"
                  [value]="feed.title"
                  (blur)="commitFeedRename(feed.id, $event)"
                  (keydown.enter)="commitFeedRename(feed.id, $event)"
                  autofocus
                />
              } @else {
                <button type="button" class="flex-1 truncate text-left" (click)="selectFeed(feed.id)">
                  {{ feed.title }}
                </button>

                <span class="flex items-center gap-1.5">
                  @if (state.refreshing().has(feed.id)) {
                    <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-ochre-500" title="Refreshing"></span>
                  }
                  @if (unread(feed.id) > 0) {
                    <span class="rounded-full bg-moss-500 px-1.5 py-0.5 font-mono text-[11px] leading-none text-white">{{ unread(feed.id) }}</span>
                  }
                  <span class="hidden items-center gap-1 group-hover/feed:flex">
                    <button type="button" class="text-xs text-ink-faint hover:text-moss-600" title="Rename" (click)="startFeedRename(feed.id)">✎</button>
                    <button type="button" class="text-xs text-ink-faint hover:text-red-600" title="Remove feed" (click)="removeFeed(feed.id)">×</button>
                  </span>
                </span>
              }
            </div>
          }
        </div>
      }

      <div class="mt-auto border-t border-hairline p-3">
        <button
          type="button"
          class="w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-moss-400 hover:text-moss-600"
          (click)="refreshAll()"
        >
          Refresh this view
        </button>
      </div>
    </nav>
  `,
})
export class FeedTreeComponent {
  editingFolderId: string | null = null;
  editingFeedId: string | null = null;

  constructor(public state: ReaderStateService) {}

  feedsIn(folderId: string) {
    return this.state.feeds().filter((f) => f.folderId === folderId);
  }

  unread(feedId: string): number {
    return this.state.unreadCountForFeed(feedId);
  }

  selectAll(): void {
    void this.state.selectFolder(null);
  }

  selectFolder(folderId: string): void {
    void this.state.selectFolder(folderId);
  }

  selectFeed(feedId: string): void {
    void this.state.selectFeed(feedId);
  }

  refreshAll(): void {
    void this.state.refreshAllInCurrentFolder();
  }

  startFolderRename(folderId: string): void {
    this.editingFolderId = folderId;
  }

  commitFolderRename(folderId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.editingFolderId = null;
    if (value) void this.state.renameFolder(folderId, value);
  }

  moveFolder(folderId: string, direction: 'up' | 'down'): void {
    void this.state.reorderFolder(folderId, direction);
  }

  removeFolder(folderId: string): void {
    if (confirm('Delete this folder? Its feeds will remain, ungrouped.')) {
      void this.state.deleteFolder(folderId);
    }
  }

  startFeedRename(feedId: string): void {
    this.editingFeedId = feedId;
  }

  commitFeedRename(feedId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.editingFeedId = null;
    if (value) void this.state.renameFeed(feedId, value);
  }

  removeFeed(feedId: string): void {
    if (confirm('Remove this feed?')) {
      void this.state.deleteFeed(feedId);
    }
  }
}
