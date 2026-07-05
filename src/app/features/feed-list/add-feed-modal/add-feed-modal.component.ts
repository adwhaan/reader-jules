import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { FeedFetcherService } from '../../../core/services/feed-fetcher.service';

@Component({
  selector: 'app-add-feed-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule
  ],
  template: `
    <h2 mat-dialog-title>Add New RSS Feed</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Feed URL</mat-label>
        <input matInput [(ngModel)]="feedUrl" placeholder="https://example.com/rss" [disabled]="loading">
      </mat-form-field>
      <p *ngIf="error" class="error">{{ error }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="loading">Cancel</button>
      <button mat-raised-button color="primary" (click)="onAdd()" [disabled]="!feedUrl || loading">
        {{ loading ? 'Adding...' : 'Add Feed' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-top: 10px; }
    .error { color: red; font-size: 12px; }
  `]
})
export class AddFeedModalComponent {
  private dialogRef = inject(MatDialogRef<AddFeedModalComponent>);
  private feedFetcher = inject(FeedFetcherService);

  feedUrl = '';
  loading = false;
  error = '';

  onCancel() {
    this.dialogRef.close();
  }

  async onAdd() {
    this.loading = true;
    this.error = '';
    try {
      await this.feedFetcher.fetchFeed(this.feedUrl);
      this.dialogRef.close(true);
    } catch (err) {
      this.error = 'Failed to add feed. Please check the URL.';
    } finally {
      this.loading = false;
    }
  }
}
