import { Injectable } from '@angular/core';
import { JsonSelectorService } from '../../domain/adapters/adapters';
import { SelectorConfig } from '../../domain/models/models';

@Injectable({ providedIn: 'root' })
export class JsonSelectorFileService implements JsonSelectorService {
  import(json: string): SelectorConfig[] {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('Expected a JSON array of selector configs.');
    }
    return parsed as SelectorConfig[];
  }

  export(configs: SelectorConfig[]): string {
    return JSON.stringify(configs, null, 2);
  }
}
