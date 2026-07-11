import { Inject, Injectable } from '@angular/core';
import { FeedFetcher } from '../domain/adapters/adapters';
import { FEED_FETCHER } from '../domain/tokens';
import { FeedMeta, RssAtomParser } from '../infrastructure/parsing/rss-atom.parser';

@Injectable({ providedIn: 'root' })
export class FeedDiscoveryService {
  constructor(
    @Inject(FEED_FETCHER) private feedFetcher: FeedFetcher,
    private rssAtomParser: RssAtomParser,
  ) {}

  async discover(url: string): Promise<FeedMeta> {
    const xml = await this.feedFetcher.fetchText(url);
    return this.rssAtomParser.parseMeta(xml);
  }
}
