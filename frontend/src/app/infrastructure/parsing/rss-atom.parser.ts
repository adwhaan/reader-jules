import { Injectable } from '@angular/core';
import { FeedParser } from '../../domain/adapters/adapters';
import { normalizeLink } from '../../domain/services/deduplication';
import { FeedType } from '../../domain/models/models';

export interface ParsedArticle {
  canonicalUrl: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  publishedAt?: string;
}

export interface FeedMeta {
  type: FeedType;
  title: string;
  htmlUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class RssAtomParser implements FeedParser<ParsedArticle> {
  async parse(xmlText: string): Promise<ParsedArticle[]> {
    const doc = this.parseXml(xmlText);
    const isAtom = doc.documentElement.localName === 'feed';
    return isAtom ? this.parseAtom(doc) : this.parseRss(doc);
  }

  parseMeta(xmlText: string): FeedMeta {
    const doc = this.parseXml(xmlText);
    const isAtom = doc.documentElement.localName === 'feed';

    if (isAtom) {
      const linkEl = doc.querySelector('feed > link[rel="alternate"]') ?? doc.querySelector('feed > link');
      return {
        type: 'atom',
        title: doc.querySelector('feed > title')?.textContent?.trim() || 'Untitled feed',
        htmlUrl: linkEl?.getAttribute('href') ?? undefined,
      };
    }

    return {
      type: 'rss',
      title: doc.querySelector('channel > title')?.textContent?.trim() || 'Untitled feed',
      htmlUrl: doc.querySelector('channel > link')?.textContent?.trim() || undefined,
    };
  }

  private parseXml(xmlText: string): Document {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('Feed XML could not be parsed.');
    }
    return doc;
  }

  private parseRss(doc: Document): ParsedArticle[] {
    return Array.from(doc.querySelectorAll('item')).map((item) => {
      const link = item.querySelector('link')?.textContent?.trim() ?? '';
      return {
        canonicalUrl: link ? normalizeLink(link) : link,
        title: item.querySelector('title')?.textContent?.trim() ?? '(untitled)',
        summary: item.querySelector('description')?.textContent?.trim(),
        imageUrl: item.querySelector('enclosure[type^="image"]')?.getAttribute('url') ?? undefined,
        publishedAt: item.querySelector('pubDate')?.textContent?.trim(),
      };
    });
  }

  private parseAtom(doc: Document): ParsedArticle[] {
    return Array.from(doc.querySelectorAll('entry')).map((entry) => {
      const linkEl =
        entry.querySelector('link[rel="alternate"]') ?? entry.querySelector('link');
      const link = linkEl?.getAttribute('href') ?? '';
      return {
        canonicalUrl: link ? normalizeLink(link) : link,
        title: entry.querySelector('title')?.textContent?.trim() ?? '(untitled)',
        summary: entry.querySelector('summary')?.textContent?.trim(),
        imageUrl: undefined,
        publishedAt: entry.querySelector('updated')?.textContent?.trim() ??
          entry.querySelector('published')?.textContent?.trim(),
      };
    });
  }
}
