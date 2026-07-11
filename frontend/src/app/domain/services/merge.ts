import { SyncDocument } from '../models/models';

export function isNewer(candidate: SyncDocument, incumbent: SyncDocument | null): boolean {
  if (!incumbent) return true;
  return new Date(candidate.updatedAt).getTime() > new Date(incumbent.updatedAt).getTime();
}

export function chooseCurrent(local: SyncDocument | null, remote: SyncDocument | null): SyncDocument | null {
  if (!local) return remote;
  if (!remote) return local;
  return isNewer(remote, local) ? remote : local;
}
