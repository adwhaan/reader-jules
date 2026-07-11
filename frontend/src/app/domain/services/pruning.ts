import { FeedDefinition, FolderDefinition } from '../models/models';

export function isTombstoneExpired(deletedAt: string | undefined, retentionDays: number, now = new Date()): boolean {
  if (!deletedAt) return false;
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return new Date(deletedAt) <= cutoff;
}

export function pruneFolders(folders: FolderDefinition[], retentionDays: number, now = new Date()): FolderDefinition[] {
  return folders.filter((f) => !isTombstoneExpired(f.deletedAt, retentionDays, now));
}

export function pruneFeeds(feeds: FeedDefinition[], retentionDays: number, now = new Date()): FeedDefinition[] {
  return feeds.filter((f) => !isTombstoneExpired(f.deletedAt, retentionDays, now));
}
