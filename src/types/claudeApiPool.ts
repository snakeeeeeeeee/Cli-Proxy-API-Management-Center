import type { CloakConfig, ModelAlias } from './provider';

export interface ClaudeAPIPoolConfig {
  enabled: boolean;
  path?: string;
  import_path?: string;
  storage?: string;
  'virtual-cache'?: ClaudeAPIPoolVirtualCacheConfig;
  routing?: ClaudeAPIPoolRoutingConfig;
  'reuse-stats'?: ClaudeAPIPoolVirtualCacheReuseStats;
}

export interface ClaudeAPIPoolVirtualCacheConfig {
  enabled: boolean;
  mode?: 'natural' | 'forced' | string;
  hit_rate: number;
  target_cache_reuse_ratio: number;
  min_cache_tokens?: number;
  max_cache_tokens?: number;
  uncached_input_tokens?: number;
  context_shrink_reset_ratio: number;
  min_creation_tokens?: number;
  max_creation_tokens?: number;
}

export interface ClaudeAPIPoolVirtualCacheReuseStats {
  enabled: boolean;
  window_seconds: number;
  target_ratio: number;
  actual_ratio: number;
  input_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  denominator_tokens: number;
  sample_count: number;
}

export interface ClaudeAPIPoolRoutingConfig {
  per_account_rpm: number;
  per_account_concurrency: number;
  max_switches: number;
  switch_delay_ms: number;
  rate_limit_cooldown_ms: number;
  rate_limit_max_cooldown_ms: number;
  overload_cooldown_ms: number;
  overload_max_cooldown_ms: number;
  same_account_retry_429: number;
  same_account_retry_529: number;
  same_account_retry_delay_ms: number;
}

export interface ClaudeAPIPoolDefaults {
  'base-url'?: string;
  'proxy-url'?: string;
  priority?: number;
  'disable-cooling'?: boolean;
  headers?: Record<string, string>;
}

export interface ClaudeAPIPoolItemRaw {
  'api-key': string;
  'base-url'?: string;
  'proxy-url'?: string;
  priority?: number;
  'disable-cooling'?: boolean;
  disabled?: boolean;
  headers?: Record<string, string>;
  models?: ModelAlias[];
  'excluded-models'?: string[];
  cloak?: CloakConfig;
  'experimental-cch-signing'?: boolean;
}

export interface ClaudeAPIPoolItem {
  position: number;
  item_hash: string;
  auth_id?: string;
  status: 'enabled' | 'disabled' | 'cooling' | string;
  api_key_preview: string;
  'base-url': string;
  'proxy-url': string;
  priority: number;
  'disable-cooling': boolean;
  headers?: Record<string, string>;
  models?: ModelAlias[];
  'excluded-models'?: string[];
  raw: ClaudeAPIPoolItemRaw;
  in_flight: number;
  rpm_used: number;
  rpm_limit: number;
  cooling: boolean;
  cooling_until?: string;
  warm_keys: number;
}

export interface ClaudeAPIPoolListParams {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  model?: string;
}

export interface ClaudeAPIPoolListResponse {
  items: ClaudeAPIPoolItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface ClaudeAPIPoolImportPreview {
  count: number;
  items: ClaudeAPIPoolItem[];
}

export interface ClaudeAPIPoolImportResult {
  status: string;
  imported: number;
}

export interface ClaudeAPIPoolMutationRef {
  position: number;
  item_hash: string;
}

export interface ClaudeAPIPoolBatchUpdateResult {
  status: string;
  updated: number;
  items: ClaudeAPIPoolItem[];
}

export interface ClaudeAPIPoolItemTestRequest {
  item_hash: string;
  model?: string;
  prompt?: string;
}

export interface ClaudeAPIPoolItemTestResult {
  status: 'ok' | 'error' | string;
  status_code: number;
  model: string;
  prompt: string;
  message?: string;
  body?: string;
  duration_ms: number;
  headers?: Record<string, string>;
}
