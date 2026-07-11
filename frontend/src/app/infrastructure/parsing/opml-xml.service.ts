import { Injectable } from '@angular/core';
import { OpmlImportedFeed, OpmlService } from '../../domain/adapters/adapters';

@Injectable({ providedIn: 'root' })
export class OpmlXmlService implements OpmlService {
  import(xml: string): OpmlImportedFeed[] {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('OPML file could not be parsed.');
    }

    const results: OpmlImportedFeed[] = [];

    const walk = (node: Element, folderName?: string) => {
      for (const child of Array.from(node.children)) {
        if (child.tagName.toLowerCase() !== 'outline') continue;

        const xmlUrl = child.getAttribute('xmlUrl');
        if (xmlUrl) {
          results.push({
            title: child.getAttribute('title') ?? child.getAttribute('text') ?? xmlUrl,
            xmlUrl,
            htmlUrl: child.getAttribute('htmlUrl') ?? undefined,
            folderName,
          });
        } else {
          const nestedFolderName = child.getAttribute('title') ?? child.getAttribute('text') ?? folderName;
          walk(child, nestedFolderName);
        }
      }
    };

    const body = doc.querySelector('body');
    if (body) walk(body);

    return results;
  }

  export(feeds: Array<{ title: string; xmlUrl: string; htmlUrl?: string; folderName?: string }>): string {
    const doc = document.implementation.createDocument(null, 'opml');
    const root = doc.documentElement;
    root.setAttribute('version', '2.0');

    const head = doc.createElement('head');
    const title = doc.createElement('title');
    title.textContent = 'Local News Aggregator subscriptions';
    head.appendChild(title);
    root.appendChild(head);

    const body = doc.createElement('body');
    root.appendChild(body);

    const folderNodes = new Map<string, Element>();
    const containerFor = (folderName?: string): Element => {
      if (!folderName) return body;
      if (!folderNodes.has(folderName)) {
        const folderOutline = doc.createElement('outline');
        folderOutline.setAttribute('title', folderName);
        folderOutline.setAttribute('text', folderName);
        body.appendChild(folderOutline);
        folderNodes.set(folderName, folderOutline);
      }
      return folderNodes.get(folderName)!;
    };

    for (const feed of feeds) {
      const outline = doc.createElement('outline');
      outline.setAttribute('type', 'rss');
      outline.setAttribute('title', feed.title);
      outline.setAttribute('text', feed.title);
      outline.setAttribute('xmlUrl', feed.xmlUrl);
      if (feed.htmlUrl) outline.setAttribute('htmlUrl', feed.htmlUrl);
      containerFor(feed.folderName).appendChild(outline);
    }

    return new XMLSerializer().serializeToString(doc);
  }
}
