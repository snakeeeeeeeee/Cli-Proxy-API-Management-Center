import { apiClient } from './client';
import type {
  ClaudeAPIPoolBatchUpdateResult,
  ClaudeAPIPoolConfig,
  ClaudeAPIPoolImportPreview,
  ClaudeAPIPoolImportResult,
  ClaudeAPIPoolItem,
  ClaudeAPIPoolItemRaw,
  ClaudeAPIPoolItemTestResult,
  ClaudeAPIPoolListParams,
  ClaudeAPIPoolListResponse,
  ClaudeAPIPoolMutationRef,
} from '@/types';

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const claudeApiPoolApi = {
  getConfig: () => apiClient.get<ClaudeAPIPoolConfig>('/claude-api-pool/config'),

  updateConfig: (config: Partial<ClaudeAPIPoolConfig>) =>
    apiClient.patch<{
      status: string;
      enabled: boolean;
      'pure-mode'?: boolean;
      path?: string;
      import_path?: string;
      storage?: string;
      storage_backend?: string;
      storage_schema?: string;
      defaults?: ClaudeAPIPoolConfig['defaults'];
      models?: ClaudeAPIPoolConfig['models'];
      'virtual-cache'?: ClaudeAPIPoolConfig['virtual-cache'];
      routing?: ClaudeAPIPoolConfig['routing'];
      'reuse-stats'?: ClaudeAPIPoolConfig['reuse-stats'];
      'runtime-stats'?: ClaudeAPIPoolConfig['runtime-stats'];
    }>('/claude-api-pool/config', {
      enabled: config.enabled,
      'pure-mode': config['pure-mode'],
      defaults: config.defaults,
      models: config.models,
      'virtual-cache': config['virtual-cache'],
      routing: config.routing,
    }),

  createItem: (value: ClaudeAPIPoolItemRaw) =>
    apiClient.post<{ status: string; item: ClaudeAPIPoolItem }>('/claude-api-pool/items', {
      value,
    }),

  listItems: (params: ClaudeAPIPoolListParams) =>
    apiClient.get<ClaudeAPIPoolListResponse>(
      `/claude-api-pool/items${buildQuery({
        page: params.page,
        page_size: params.page_size,
        q: params.q,
        status: params.status,
        model: params.model,
      })}`
    ),

  exportPool: async (format: 'yaml' | 'json' = 'yaml') => {
    const response = await apiClient.getRaw(`/claude-api-pool/export?format=${format}`, {
      responseType: 'text',
      headers: {
        Accept: format === 'json' ? 'application/json' : 'application/yaml, text/yaml, text/plain',
      },
    });
    const data: unknown = response.data;
    return typeof data === 'string' ? data : String(data ?? '');
  },

  importPool: (content: string, replace: boolean, dryRun = false) =>
    apiClient.post<ClaudeAPIPoolImportPreview | ClaudeAPIPoolImportResult>(
      '/claude-api-pool/import',
      {
        content,
        replace,
        dry_run: dryRun,
      }
    ),

  updateItem: (position: number, itemHash: string, value: ClaudeAPIPoolItemRaw) =>
    apiClient.patch<{ status: string; item: ClaudeAPIPoolItem }>(
      `/claude-api-pool/items/${position}`,
      { item_hash: itemHash, value }
    ),

  setDisabled: (position: number, itemHash: string, disabled: boolean) =>
    apiClient.patch<{ status: string; item: ClaudeAPIPoolItem }>(
      `/claude-api-pool/items/${position}`,
      { item_hash: itemHash, disabled }
    ),

  setDisabledBatch: (items: ClaudeAPIPoolMutationRef[], disabled: boolean) =>
    apiClient.patch<ClaudeAPIPoolBatchUpdateResult>('/claude-api-pool/items', {
      items,
      disabled,
    }),

  testItem: (position: number, itemHash: string, model: string, prompt = 'hi') =>
    apiClient.post<ClaudeAPIPoolItemTestResult>(`/claude-api-pool/items/${position}/test`, {
      item_hash: itemHash,
      model,
      prompt,
    }),

  deleteItem: (position: number, itemHash: string) =>
    apiClient.delete<{ status: string }>(
      `/claude-api-pool/items/${position}${buildQuery({ item_hash: itemHash })}`
    ),

  resetCooling: (position?: number) =>
    position
      ? apiClient.post<{ status: string }>(`/claude-api-pool/items/${position}/reset-cooling`)
      : apiClient.post<{ status: string }>('/claude-api-pool/reset-cooling'),

  clearLedger: () =>
    apiClient.post<{ status: string; entries: number }>('/claude-api-pool/ledger/clear'),
};
