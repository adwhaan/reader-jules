import { Inject, Injectable } from '@angular/core';
import { JsonSelectorService as JsonSelectorAdapter } from '../domain/adapters/adapters';
import { SelectorConfigRepository } from '../domain/repositories/repositories';
import { JSON_SELECTOR_SERVICE, SELECTOR_CONFIG_REPOSITORY } from '../domain/tokens';

@Injectable({ providedIn: 'root' })
export class JsonSelectorService {
  constructor(
    @Inject(JSON_SELECTOR_SERVICE) private jsonSelector: JsonSelectorAdapter,
    @Inject(SELECTOR_CONFIG_REPOSITORY) private selectorConfigRepo: SelectorConfigRepository,
  ) {}

  async importFromJson(json: string): Promise<number> {
    const configs = this.jsonSelector.import(json);
    for (const config of configs) {
      await this.selectorConfigRepo.upsert(config);
    }
    return configs.length;
  }

  async exportToJson(): Promise<string> {
    const configs = await this.selectorConfigRepo.getAll();
    return this.jsonSelector.export(configs);
  }
}
