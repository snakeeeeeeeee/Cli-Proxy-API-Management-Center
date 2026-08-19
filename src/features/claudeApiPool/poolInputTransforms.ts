import type { ModelAlias } from '@/types';
import type { HeaderEntry } from '@/utils/headers';

export interface ModelEntry {
  name: string;
  alias: string;
}

export const headersToEntries = (
  headers?: Record<string, string | undefined | null>
): HeaderEntry[] => {
  if (!headers || typeof headers !== 'object') return [];
  return Object.entries(headers)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, value: String(value) }));
};

export const modelsToEntries = (models?: ModelAlias[]): ModelEntry[] => {
  if (!Array.isArray(models) || models.length === 0) return [{ name: '', alias: '' }];
  return models.map((model) => ({ name: model.name || '', alias: model.alias || '' }));
};

export const entriesToModels = (entries: ModelEntry[]): ModelAlias[] =>
  entries
    .filter((entry) => entry.name.trim())
    .map((entry) => {
      const model: ModelAlias = { name: entry.name.trim() };
      const alias = entry.alias.trim();
      if (alias && alias !== model.name) model.alias = alias;
      return model;
    });
