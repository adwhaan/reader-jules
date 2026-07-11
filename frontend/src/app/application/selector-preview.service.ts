import { Inject, Injectable } from '@angular/core';
import { FeedFetcher, SelectorEvaluator, SelectorTestResult } from '../domain/adapters/adapters';
import { SelectorConfig } from '../domain/models/models';
import { FEED_FETCHER, SELECTOR_EVALUATOR } from '../domain/tokens';

@Injectable({ providedIn: 'root' })
export class SelectorPreviewService {
  constructor(
    @Inject(FEED_FETCHER) private feedFetcher: FeedFetcher,
    @Inject(SELECTOR_EVALUATOR) private selectorEvaluator: SelectorEvaluator,
  ) {}

  async fetchPreviewHtml(url: string): Promise<string> {
    return this.feedFetcher.fetchText(url);
  }

  async evaluate(url: string, config: SelectorConfig): Promise<SelectorTestResult> {
    return this.selectorEvaluator.evaluate(url, config);
  }
}
