import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StoreService } from '../../core/services/store.service';
import { AddFeedModalComponent } from './add-feed-modal/add-feed-modal.component';

@Component({
  selector: 'app-feed-list',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  template: `
    <div class="feed-list-container">
      <div class="header">
        <h2>My Feeds</h2>
        <button mat-icon-button color="primary" (click)="openAddFeedDialog()">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      <mat-nav-list>
        @for (feed of feeds(); track feed.id) {
          <mat-list-item>
            <mat-icon matListItemIcon>rss_feed</mat-icon>
            <div matListItemTitle>{{ feed.display_name }}</div>
            <div matListItemLine>{{ feed.url }}</div>
            <button mat-icon-button matListItemMeta (click)="removeFeed(feed.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </mat-list-item>
        }
      </mat-nav-list>

      @if (feeds().length === 0) {
        <div class="empty-state">
          <p>No feeds added yet.</p>
          <button mat-raised-button color="primary" (click)="openAddFeedDialog()">Add your first feed</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .feed-list-container { padding: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .empty-state { text-align: center; margin-top: 40px; color: #666; }
  `]
})
export class FeedListComponent {
  private store = inject(StoreService);
  private dialog = inject(MatDialog);

  feeds = this.store.feedsSignal;

  openAddFeedDialog() {
    this.dialog.open(AddFeedModalComponent, {
      width: '400px'
    });
  }

  removeFeed(id: number) {
    this.store.feeds.removeOne({ id } as any);
  }
}
