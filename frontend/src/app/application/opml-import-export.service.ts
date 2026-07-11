import { Inject, Injectable } from '@angular/core';
import { OpmlService } from '../domain/adapters/adapters';
import { FeedRepository, FolderRepository } from '../domain/repositories/repositories';
import { FeedDefinition, FolderDefinition } from '../domain/models/models';
import { FEED_REPOSITORY, FOLDER_REPOSITORY, OPML_SERVICE } from '../domain/tokens';

@Injectable({ providedIn: 'root' })
export class OpmlImportExportService {
  constructor(
    @Inject(OPML_SERVICE) private opml: OpmlService,
    @Inject(FEED_REPOSITORY) private feedRepo: FeedRepository,
    @Inject(FOLDER_REPOSITORY) private folderRepo: FolderRepository,
  ) {}

  async importFromXml(xml: string): Promise<number> {
    const imported = this.opml.import(xml);
    const now = new Date().toISOString();

    const existingFolders = await this.folderRepo.getAll();
    const folderIdByName = new Map(existingFolders.map((f) => [f.name, f.id]));

    for (const item of imported) {
      let folderId: string | undefined;
      if (item.folderName) {
        folderId = folderIdByName.get(item.folderName);
        if (!folderId) {
          const folder: FolderDefinition = {
            id: crypto.randomUUID(),
            name: item.folderName,
            order: folderIdByName.size,
            updatedAt: now,
          };
          await this.folderRepo.upsert(folder);
          folderIdByName.set(item.folderName, folder.id);
          folderId = folder.id;
        }
      }

      const feed: FeedDefinition = {
        id: crypto.randomUUID(),
        type: 'rss',
        title: item.title,
        folderId,
        xmlUrl: item.xmlUrl,
        htmlUrl: item.htmlUrl,
        enabled: true,
        defaultTags: [],
        createdAt: now,
        updatedAt: now,
      };
      await this.feedRepo.upsert(feed);
    }

    return imported.length;
  }

  async exportToXml(): Promise<string> {
    const [feeds, folders] = await Promise.all([this.feedRepo.getAll(), this.folderRepo.getAll()]);
    const folderNameById = new Map(folders.map((f) => [f.id, f.name]));

    return this.opml.export(
      feeds
        .filter((f) => !f.deletedAt && f.type !== 'selector' && f.xmlUrl)
        .map((f) => ({
          title: f.title,
          xmlUrl: f.xmlUrl!,
          htmlUrl: f.htmlUrl,
          folderName: f.folderId ? folderNameById.get(f.folderId) : undefined,
        })),
    );
  }
}
