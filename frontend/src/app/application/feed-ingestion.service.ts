import { Inject, Injectable } from '@angular/core';
import { ArticleRepository, FeedRepository, SelectorConfigRepository } from '../domain/repositories/repositories';
import { FeedFetcher, SelectorEvaluator } from '../domain/adapters/adapters';
import { ArticleItem, FeedDefinition } from '../domain/models/models';
import { normalizeLink, resolveArticleId } from '../domain/services/deduplication';
import { RssAtomParser } from '../infrastructure/parsing/rss-atom.parser';
import {
  ARTICLE_REPOSITORY,
  FEED_FETCHER,
  FEED_REPOSITORY,
  SELECTOR_CONFIG_REPOSITORY,
  SELECTOR_EVALUATOR,
} from '../domain/tokens';

@Injectable({ providedIn: 'root' })
export class FeedIngestionService {
  constructor(
    @Inject(ARTICLE_REPOSITORY) private articleRepo: ArticleRepository,
    @Inject(FEED_REPOSITORY) private feedRepo: FeedRepository,
    @Inject(SELECTOR_CONFIG_REPOSITORY) private selectorConfigRepo: SelectorConfigRepository,
    @Inject(FEED_FETCHER) private feedFetcher: FeedFetcher,
    @Inject(SELECTOR_EVALUATOR) private selectorEvaluator: SelectorEvaluator,
    private rssAtomParser: RssAtomParser,
  ) {}

  async refresh(feed: FeedDefinition): Promise<ArticleItem[]> {
    const items = feed.type === 'selector' ? await this.refreshSelectorFeed(feed) : await this.refreshRssOrAtomFeed(feed);

    await this.articleRepo.upsertMany(items);
    await this.feedRepo.upsert({ ...feed, lastRefreshAt: new Date().toISOString() });
    return items;
  }

  private async refreshRssOrAtomFeed(feed: FeedDefinition): Promise<ArticleItem[]> {
    if (!feed.xmlUrl) {
      throw new Error(`Feed ${feed.id} has no xmlUrl configured.`);
    }

    const xml = await this.feedFetcher.fetchText(feed.xmlUrl);
    const parsed = await this.rssAtomParser.parse(xml);
    const existingIds = new Set((await this.articleRepo.getByFeedId(feed.id)).map((a) => a.id));

    const now = new Date().toISOString();
    return parsed
      .filter((p) => !!p.canonicalUrl)
      .map((p) => {
        const id = resolveArticleId(p.canonicalUrl, p.publishedAt, existingIds);
        const item: ArticleItem = {
          id,
          feedId: feed.id,
          canonicalUrl: p.canonicalUrl,
          title: p.title,
          summary: p.summary,
          imageUrl: p.imageUrl,
          publishedAt: p.publishedAt,
          sourceTitle: feed.title,
          sourceUrl: feed.htmlUrl,
          createdAt: now,
          updatedAt: now,
        };
        existingIds.add(id);
        return item;
      });
  }

  private async refreshSelectorFeed(feed: FeedDefinition): Promise<ArticleItem[]> {
    if (!feed.pageUrl || !feed.selectorConfigId) {
      throw new Error(`Feed ${feed.id} is missing pageUrl or selectorConfigId.`);
    }

    const config = await this.selectorConfigRepo.getById(feed.selectorConfigId);
    if (!config) {
      throw new Error(`Selector config ${feed.selectorConfigId} not found.`);
    }

    const result = await this.selectorEvaluator.evaluate(feed.pageUrl, config);
    const existingIds = new Set((await this.articleRepo.getByFeedId(feed.id)).map((a) => a.id));
    const now = new Date().toISOString();

    return result.items
      .filter((i) => !!i.url)
      .map((i) => {
        const link = normalizeLink(i.url!);
        const id = resolveArticleId(link, i.publishedAt, existingIds);
        const item: ArticleItem = {
          id,
          feedId: feed.id,
          canonicalUrl: link,
          title: i.title ?? '(untitled)',
          summary: i.summary,
          imageUrl: i.imageUrl,
          publishedAt: i.publishedAt,
          sourceTitle: feed.title,
          sourceUrl: feed.pageUrl,
          createdAt: now,
          updatedAt: now,
        };
        existingIds.add(id);
        return item;
      });
  }
}
