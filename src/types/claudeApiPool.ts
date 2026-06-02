import type { CloakConfig, ModelAlias } from './provider';

export interface ClaudeAPIPoolConfig {
  enabled: boolean;
  'pure-mode'?: boolean;
  path?: string;
  import_path?: string;
  storage?: string;
  defaults?: ClaudeAPIPoolDefaults;
  models?: ModelAlias[];
  'virtual-cache'?: ClaudeAPIPoolVirtualCacheConfig;
  routing?: ClaudeAPIPoolRoutingConfig;
  'reuse-stats'?: ClaudeAPIPoolVirtualCacheReuseStats;
  'runtime-stats'?: ClaudeAPIPoolRuntimeStats;
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
  cache_affinity_enabled: boolean;
  cache_affinity_auto: boolean;
  cache_affinity_auto_profile?: 'cost' | 'balanced' | 'throughput' | string;
  account_capacity_profile?: 'conservative' | 'standard' | 'aggressive' | 'custom' | string;
  cache_affinity_min_cache_tokens: number;
  cache_affinity_lanes: number;
  cache_affinity_max_lanes: number;
  cache_affinity_wait_ms: number;
  cache_affinity_ttl_ms: number;
}

export interface ClaudeAPIPoolRuntimeStats {
  window_seconds: number;
  account_count: number;
  available_accounts: number;
  cooling_accounts: number;
  in_flight: number;
  rpm_used: number;
  rpm_limit: number;
  active_affinity_keys: number;
  warm_lanes: number;
  request_count: number;
  success_count: number;
  failure_count: number;
  status_429?: number;
  status_529?: number;
  status_5xx?: number;
  success_rate: number;
  real_cache_ratio: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  input_tokens: number;
  output_tokens: number;
  affinity_auto_plan?: ClaudeAPIPoolAffinityAutoPlan;
}

export interface ClaudeAPIPoolAffinityAutoPlan {
  enabled: boolean;
  effective_lanes: number;
  effective_max_lanes: number;
  pool_size: number;
  available_accounts: number;
  pressure: number;
  reason: string;
}

export interface ClaudeAPIPoolMetricsBucket {
  time: string;
  requests: number;
  success: number;
  failures: number;
  status_429: number;
  status_529: number;
  status_5xx: number;
  success_rate: number;
  state: 'empty' | 'green' | 'yellow' | 'red' | string;
}

export interface ClaudeAPIPoolAccountMetrics {
  window_seconds: number;
  request_count: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  rpm_1m: number;
  status_429: number;
  status_529: number;
  status_5xx: number;
  avg_latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  real_cache_ratio: number;
  history: ClaudeAPIPoolMetricsBucket[];
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
  metrics?: ClaudeAPIPoolAccountMetrics;
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
