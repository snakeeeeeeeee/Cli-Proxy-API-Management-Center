import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { HeaderInputList } from '@/components/ui/HeaderInputList';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ModelInputList } from '@/components/ui/ModelInputList';
import { entriesToModels, modelsToEntries, type ModelEntry } from '@/components/ui/modelInputListUtils';
import { SelectionCheckbox } from '@/components/ui/SelectionCheckbox';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  IconChartLine,
  IconDownload,
  IconFileText,
  IconKey,
  IconPencil,
  IconPlay,
  IconPower,
  IconRefreshCw,
  IconSearch,
  IconSettings,
  IconShield,
  IconSlidersHorizontal,
  IconTable,
  IconTrash2,
  IconUpload,
} from '@/components/ui/icons';
import { claudeApiPoolApi } from '@/services/api';
import { useNotificationStore } from '@/stores';
import { downloadBlob } from '@/utils/download';
import { buildHeaderObject, headersToEntries, type HeaderEntry } from '@/utils/headers';
import type {
  ClaudeAPIPoolConfig,
  ClaudeAPIPoolImportPreview,
  ClaudeAPIPoolItem,
  ClaudeAPIPoolItemRaw,
  ClaudeAPIPoolItemTestResult,
} from '@/types';
import styles from './ClaudeApiPoolPage.module.scss';

const pageSizes = ['25', '50', '100', '200'];
const poolStoreName = 'claude-api-pool.db';
const poolImportFileName = 'claude-api-pool.yaml';
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'enabled', label: '启用' },
  { value: 'cooling', label: '冷却中' },
  { value: 'disabled', label: '已禁用' },
];
const virtualCacheModeOptions = [
  { value: 'natural', label: '自然增长' },
  { value: 'forced', label: '强制目标' },
];
const refreshIntervalOptions = [
  { value: '0', label: '关闭自动刷新' },
  { value: '30000', label: '30 秒' },
  { value: '60000', label: '1 分钟' },
  { value: '120000', label: '2 分钟' },
  { value: '300000', label: '5 分钟' },
];

const simpleImportExample = `key-1-----workspace-a
key-2-----workspace-b`;

const yamlImportExample = `version: 1

defaults:
  base-url: https://aws-external-anthropic.us-east-1.api.aws
  proxy-url: ""
  priority: 0
  disable-cooling: false
  headers:
    anthropic-version: 2023-06-01

models:
  - name: claude-opus-4-7
    alias: ""
  - name: claude-sonnet-4-6
    alias: ""
  - name: claude-opus-4-6
    alias: ""
  - name: claude-haiku-4-5-20251001
    alias: ""

virtual-cache:
  enabled: true
  mode: natural
  hit-rate: 0.9
  target-cache-reuse-ratio: 0.9
  context-shrink-reset-ratio: 0.7

routing:
  per-account-rpm: 0
  per-account-concurrency: 1
  max-switches: 3
  switch-delay-ms: 0
  rate-limit-cooldown-ms: 1000
  rate-limit-max-cooldown-ms: 1800000
  overload-cooldown-ms: 10000
  overload-max-cooldown-ms: 60000
  same-account-retry-429: 0
  same-account-retry-529: 0
  same-account-retry-delay-ms: 1500

items:
  - api-key: key-1
    headers:
      x-custom-a: value-a

  - api-key: key-2
    headers:
      x-custom-b: value-b`;

const jsonImportExample = `{
  "version": 1,
  "defaults": {
    "base-url": "https://aws-external-anthropic.us-east-1.api.aws",
    "proxy-url": "",
    "priority": 0,
    "disable-cooling": false,
    "headers": {
      "anthropic-version": "2023-06-01"
    }
  },
  "models": [
    { "name": "claude-opus-4-7", "alias": "" },
    { "name": "claude-sonnet-4-6", "alias": "" }
  ],
  "virtual-cache": {
    "enabled": true,
    "mode": "natural",
    "hit-rate": 0.9,
    "target-cache-reuse-ratio": 0.9,
    "context-shrink-reset-ratio": 0.7
  },
  "routing": {
    "per-account-rpm": 0,
    "per-account-concurrency": 1,
    "max-switches": 3,
    "switch-delay-ms": 0,
    "rate-limit-cooldown-ms": 1000,
    "rate-limit-max-cooldown-ms": 1800000,
    "overload-cooldown-ms": 10000,
    "overload-max-cooldown-ms": 60000,
    "same-account-retry-429": 0,
    "same-account-retry-529": 0,
    "same-account-retry-delay-ms": 1500
  },
  "items": [
    {
      "api-key": "key-1",
      "headers": { "x-custom-a": "value-a" }
    },
    {
      "api-key": "key-2",
      "headers": { "x-custom-b": "value-b" }
    }
  ]
}`;

type EditDraft = {
  apiKey: string;
  workspaceId: string;
  baseUrl: string;
  proxyUrl: string;
  priority: string;
  disableCooling: boolean;
  disabled: boolean;
  experimentalCCHSigning: boolean;
  headersText: string;
  modelsText: string;
  excludedModelsText: string;
};

type PoolDefaultsDraft = {
  baseUrl: string;
  proxyUrl: string;
  priority: string;
  disableCooling: boolean;
  headers: HeaderEntry[];
  models: ModelEntry[];
};

type VirtualCacheDraft = {
  enabled: boolean;
  mode: 'natural' | 'forced';
  hitRate: string;
  targetCacheReuseRatio: string;
  contextShrinkResetRatio: string;
};

type RoutingDraft = {
  perAccountRPM: string;
  perAccountConcurrency: string;
  maxSwitches: string;
  switchDelayMS: string;
  rateLimitCooldownMS: string;
  rateLimitMaxCooldownMS: string;
  overloadCooldownMS: string;
  overloadMaxCooldownMS: string;
  sameAccountRetry429: string;
  sameAccountRetry529: string;
  sameAccountRetryDelayMS: string;
  cacheAffinityEnabled: boolean;
  cacheAffinityAuto: boolean;
  cacheAffinityMinTokens: string;
  cacheAffinityLanes: string;
  cacheAffinityMaxLanes: string;
  cacheAffinityWaitMS: string;
  cacheAffinityTTLMS: string;
};

const emptyDraft: EditDraft = {
  apiKey: '',
  workspaceId: '',
  baseUrl: '',
  proxyUrl: '',
  priority: '',
  disableCooling: false,
  disabled: false,
  experimentalCCHSigning: false,
  headersText: '',
  modelsText: '',
  excludedModelsText: '',
};

const emptyPoolDefaultsDraft: PoolDefaultsDraft = {
  baseUrl: '',
  proxyUrl: '',
  priority: '',
  disableCooling: false,
  headers: [],
  models: [{ name: '', alias: '' }],
};

const defaultVirtualCacheDraft: VirtualCacheDraft = {
  enabled: true,
  mode: 'natural',
  hitRate: '90',
  targetCacheReuseRatio: '0',
  contextShrinkResetRatio: '70',
};

const defaultRoutingDraft: RoutingDraft = {
  perAccountRPM: '0',
  perAccountConcurrency: '0',
  maxSwitches: '0',
  switchDelayMS: '0',
  rateLimitCooldownMS: '1000',
  rateLimitMaxCooldownMS: '1800000',
  overloadCooldownMS: '10000',
  overloadMaxCooldownMS: '60000',
  sameAccountRetry429: '0',
  sameAccountRetry529: '0',
  sameAccountRetryDelayMS: '1500',
  cacheAffinityEnabled: false,
  cacheAffinityAuto: true,
  cacheAffinityMinTokens: '4096',
  cacheAffinityLanes: '2',
  cacheAffinityMaxLanes: '4',
  cacheAffinityWaitMS: '250',
  cacheAffinityTTLMS: '300000',
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : '未知错误';

const formatJson = (value: unknown) => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value) && value.length === 0) return '';
  if (!Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === 0) return '';
  return JSON.stringify(value, null, 2);
};

const parseJsonField = <T,>(text: string, fallback: T): T => {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed) as T;
};

const configToVirtualCacheDraft = (config: ClaudeAPIPoolConfig): VirtualCacheDraft => {
  const virtualCache = config['virtual-cache'];
  if (!virtualCache) return defaultVirtualCacheDraft;
  return {
    enabled: virtualCache.enabled,
    mode: virtualCache.mode === 'forced' ? 'forced' : 'natural',
    hitRate: String(Math.round((virtualCache.hit_rate || 0) * 1000) / 10),
    targetCacheReuseRatio: String(Math.round((virtualCache.target_cache_reuse_ratio || 0) * 1000) / 10),
    contextShrinkResetRatio: String(Math.round((virtualCache.context_shrink_reset_ratio || 0) * 1000) / 10),
  };
};

const configToRoutingDraft = (config: ClaudeAPIPoolConfig): RoutingDraft => {
  const routing = config.routing;
  if (!routing) return defaultRoutingDraft;
  return {
    perAccountRPM: String(routing.per_account_rpm || 0),
    perAccountConcurrency: String(routing.per_account_concurrency || 0),
    maxSwitches: String(routing.max_switches || 0),
    switchDelayMS: String(routing.switch_delay_ms || 0),
    rateLimitCooldownMS: String(routing.rate_limit_cooldown_ms || 1000),
    rateLimitMaxCooldownMS: String(routing.rate_limit_max_cooldown_ms || 1800000),
    overloadCooldownMS: String(routing.overload_cooldown_ms || 10000),
    overloadMaxCooldownMS: String(routing.overload_max_cooldown_ms || 60000),
    sameAccountRetry429: String(routing.same_account_retry_429 || 0),
    sameAccountRetry529: String(routing.same_account_retry_529 || 0),
    sameAccountRetryDelayMS: String(routing.same_account_retry_delay_ms || 1500),
    cacheAffinityEnabled: Boolean(routing.cache_affinity_enabled),
    cacheAffinityAuto: Boolean(routing.cache_affinity_auto),
    cacheAffinityMinTokens: String(routing.cache_affinity_min_cache_tokens || 4096),
    cacheAffinityLanes: String(routing.cache_affinity_lanes || 2),
    cacheAffinityMaxLanes: String(routing.cache_affinity_max_lanes || 4),
    cacheAffinityWaitMS: String(routing.cache_affinity_wait_ms || 250),
    cacheAffinityTTLMS: String(routing.cache_affinity_ttl_ms || 300000),
  };
};

const configToPoolDefaultsDraft = (config: ClaudeAPIPoolConfig): PoolDefaultsDraft => {
  const defaults = config.defaults || {};
  return {
    baseUrl: defaults['base-url'] || '',
    proxyUrl: defaults['proxy-url'] || '',
    priority: defaults.priority === undefined ? '' : String(defaults.priority),
    disableCooling: Boolean(defaults['disable-cooling']),
    headers: headersToEntries(defaults.headers),
    models: modelsToEntries(config.models),
  };
};

const parseNonNegativeInt = (value: string, label: string) => {
  const normalized = value.trim() || '0';
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`${label} 必须是大于等于 0 的整数`);
  }
  return parsed;
};

const routingDraftToConfig = (draft: RoutingDraft) => {
  const config = {
    per_account_rpm: parseNonNegativeInt(draft.perAccountRPM, '每账号 RPM'),
    per_account_concurrency: parseNonNegativeInt(draft.perAccountConcurrency, '每账号并发'),
    max_switches: parseNonNegativeInt(draft.maxSwitches, '最大换号次数'),
    switch_delay_ms: parseNonNegativeInt(draft.switchDelayMS, '换号间隔'),
    rate_limit_cooldown_ms: parseNonNegativeInt(draft.rateLimitCooldownMS, '429 初始冷却'),
    rate_limit_max_cooldown_ms: parseNonNegativeInt(draft.rateLimitMaxCooldownMS, '429 最大冷却'),
    overload_cooldown_ms: parseNonNegativeInt(draft.overloadCooldownMS, '529 初始冷却'),
    overload_max_cooldown_ms: parseNonNegativeInt(draft.overloadMaxCooldownMS, '529 最大冷却'),
    same_account_retry_429: parseNonNegativeInt(draft.sameAccountRetry429, '429 同账号重试'),
    same_account_retry_529: parseNonNegativeInt(draft.sameAccountRetry529, '529 同账号重试'),
    same_account_retry_delay_ms: parseNonNegativeInt(draft.sameAccountRetryDelayMS, '同账号重试间隔'),
    cache_affinity_enabled: draft.cacheAffinityEnabled,
    cache_affinity_auto: draft.cacheAffinityAuto,
    cache_affinity_min_cache_tokens: parseNonNegativeInt(draft.cacheAffinityMinTokens, '亲和最小缓存 Tokens'),
    cache_affinity_lanes: parseNonNegativeInt(draft.cacheAffinityLanes, '亲和 lanes'),
    cache_affinity_max_lanes: parseNonNegativeInt(draft.cacheAffinityMaxLanes, '亲和最大 lanes'),
    cache_affinity_wait_ms: parseNonNegativeInt(draft.cacheAffinityWaitMS, '亲和等待'),
    cache_affinity_ttl_ms: parseNonNegativeInt(draft.cacheAffinityTTLMS, '亲和 TTL'),
  };
  if (config.rate_limit_max_cooldown_ms > 0 && config.rate_limit_max_cooldown_ms < config.rate_limit_cooldown_ms) {
    throw new Error('429 最大冷却不能小于 429 初始冷却');
  }
  if (config.overload_max_cooldown_ms > 0 && config.overload_max_cooldown_ms < config.overload_cooldown_ms) {
    throw new Error('529 最大冷却不能小于 529 初始冷却');
  }
  if (config.cache_affinity_max_lanes > 0 && config.cache_affinity_max_lanes < config.cache_affinity_lanes) {
    throw new Error('亲和最大 lanes 不能小于亲和 lanes');
  }
  return config;
};

const poolDefaultsDraftToConfig = (draft: PoolDefaultsDraft): Pick<ClaudeAPIPoolConfig, 'defaults' | 'models'> => {
  const defaults: NonNullable<ClaudeAPIPoolConfig['defaults']> = {};
  if (draft.baseUrl.trim()) defaults['base-url'] = draft.baseUrl.trim();
  if (draft.proxyUrl.trim()) defaults['proxy-url'] = draft.proxyUrl.trim();
  if (draft.priority.trim()) {
    const priority = Number(draft.priority);
    if (!Number.isFinite(priority) || !Number.isInteger(priority)) {
      throw new Error('公共优先级必须是整数');
    }
    defaults.priority = priority;
  }
  if (draft.disableCooling) defaults['disable-cooling'] = true;
  const headers = buildHeaderObject(draft.headers);
  if (Object.keys(headers).length) defaults.headers = headers;
  return {
    defaults,
    models: entriesToModels(draft.models),
  };
};

const virtualCacheDraftToConfig = (draft: VirtualCacheDraft) => {
  const hitRatePercent = Number(draft.hitRate.trim() || '0');
  if (!Number.isFinite(hitRatePercent) || hitRatePercent < 0 || hitRatePercent > 100) {
    throw new Error('缓存命中率必须在 0 到 100 之间');
  }
  const targetCacheReusePercent = Number(draft.targetCacheReuseRatio.trim() || '0');
  if (!Number.isFinite(targetCacheReusePercent) || targetCacheReusePercent < 0 || targetCacheReusePercent > 100) {
    throw new Error('目标缓存复用率必须在 0 到 100 之间');
  }
  const shrinkResetPercent = Number(draft.contextShrinkResetRatio.trim() || '0');
  if (!Number.isFinite(shrinkResetPercent) || shrinkResetPercent < 0 || shrinkResetPercent > 100) {
    throw new Error('压缩重置比例必须在 0 到 100 之间');
  }
  return {
    enabled: draft.enabled,
    mode: draft.mode,
    hit_rate: hitRatePercent / 100,
    target_cache_reuse_ratio: targetCacheReusePercent / 100,
    context_shrink_reset_ratio: shrinkResetPercent / 100,
  };
};

const modelValue = (entry: { name?: string; alias?: string }) => (entry.alias || entry.name || '').trim();

const modelLabel = (entry: { name?: string; alias?: string }) => {
  const value = modelValue(entry);
  if (!entry.alias || entry.alias === entry.name) return value;
  return `${entry.alias} (${entry.name})`;
};

const withoutWorkspaceHeader = (headers?: Record<string, string>) => {
  if (!headers) return undefined;
  const next = { ...headers };
  delete next['anthropic-workspace-id'];
  return next;
};

const itemToDraft = (item: ClaudeAPIPoolItem): EditDraft => ({
  apiKey: item.raw?.['api-key'] || '',
  workspaceId: item.raw?.headers?.['anthropic-workspace-id'] || '',
  baseUrl: item.raw?.['base-url'] || '',
  proxyUrl: item.raw?.['proxy-url'] || '',
  priority: item.raw?.priority === undefined ? '' : String(item.raw.priority),
  disableCooling: Boolean(item.raw?.['disable-cooling']),
  disabled: Boolean(item.raw?.disabled),
  experimentalCCHSigning: Boolean(item.raw?.['experimental-cch-signing']),
  headersText: formatJson(withoutWorkspaceHeader(item.raw?.headers)),
  modelsText: formatJson(item.raw?.models),
  excludedModelsText: formatJson(item.raw?.['excluded-models']),
});

const draftToItem = (draft: EditDraft): ClaudeAPIPoolItemRaw => {
  const apiKey = draft.apiKey.trim();
  if (!apiKey) {
    throw new Error('API Key 不能为空');
  }
  const value: ClaudeAPIPoolItemRaw = { 'api-key': apiKey };
  if (draft.baseUrl.trim()) value['base-url'] = draft.baseUrl.trim();
  if (draft.proxyUrl.trim()) value['proxy-url'] = draft.proxyUrl.trim();
  if (draft.priority.trim()) {
    const priority = Number(draft.priority);
    if (!Number.isFinite(priority)) throw new Error('优先级必须是数字');
    value.priority = priority;
  }
  if (draft.disableCooling) value['disable-cooling'] = true;
  if (draft.disabled) value.disabled = true;
  if (draft.experimentalCCHSigning) value['experimental-cch-signing'] = true;
  const headers = parseJsonField<Record<string, string>>(draft.headersText, {});
  if (draft.workspaceId.trim()) headers['anthropic-workspace-id'] = draft.workspaceId.trim();
  if (Object.keys(headers).length) value.headers = headers;
  const models = parseJsonField<ClaudeAPIPoolItemRaw['models']>(draft.modelsText, []);
  if (models && models.length) value.models = models;
  const excludedModels = parseJsonField<string[]>(draft.excludedModelsText, []);
  if (excludedModels.length) value['excluded-models'] = excludedModels;
  return value;
};

const statusClass = (status: string) => {
  if (status === 'enabled') return `${styles.statusBadge} ${styles.statusEnabled}`;
  if (status === 'cooling') return `${styles.statusBadge} ${styles.statusCooling}`;
  return `${styles.statusBadge} ${styles.statusDisabled}`;
};

const statusLabel = (status: string) => {
  if (status === 'enabled') return '启用';
  if (status === 'cooling') return '冷却中';
  if (status === 'disabled') return '已禁用';
  return status || '-';
};

const formatPercent = (value?: number) => `${Math.round(((value || 0) * 100) * 10) / 10}%`;
const formatNumber = (value?: number) => new Intl.NumberFormat('zh-CN').format(value || 0);
const formatMs = (value?: number) => (value && value > 0 ? `${Math.round(value)}ms` : '-');
const formatTokenPair = (read?: number, created?: number) =>
  `读 ${formatNumber(read)} / 建 ${formatNumber(created)}`;
const historyClass = (state?: string) => {
  if (state === 'green') return styles.historyGreen;
  if (state === 'yellow') return styles.historyYellow;
  if (state === 'red') return styles.historyRed;
  return styles.historyEmpty;
};

export function ClaudeApiPoolPage() {
  const { showNotification, showConfirmation } = useNotificationStore();
  const [config, setConfig] = useState<ClaudeAPIPoolConfig>({ enabled: false });
  const [poolDefaultsDraft, setPoolDefaultsDraft] = useState<PoolDefaultsDraft>(emptyPoolDefaultsDraft);
  const [virtualCacheDraft, setVirtualCacheDraft] = useState<VirtualCacheDraft>(defaultVirtualCacheDraft);
  const [routingDraft, setRoutingDraft] = useState<RoutingDraft>(defaultRoutingDraft);
  const [items, setItems] = useState<ClaudeAPIPoolItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ClaudeAPIPoolItem | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [draft, setDraft] = useState<EditDraft>(emptyDraft);
  const [savingItem, setSavingItem] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [replaceImport, setReplaceImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ClaudeAPIPoolImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [quickImportContent, setQuickImportContent] = useState('');
  const [quickReplaceImport, setQuickReplaceImport] = useState(false);
  const [quickImportPreview, setQuickImportPreview] = useState<ClaudeAPIPoolImportPreview | null>(null);
  const [quickImporting, setQuickImporting] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(new Set());
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [testingItem, setTestingItem] = useState<ClaudeAPIPoolItem | null>(null);
  const [testModel, setTestModel] = useState('');
  const [testPrompt, setTestPrompt] = useState('hi');
  const [testResult, setTestResult] = useState<ClaudeAPIPoolItemTestResult | null>(null);
  const [testError, setTestError] = useState('');
  const [testing, setTesting] = useState(false);
  const [refreshIntervalMS, setRefreshIntervalMS] = useState(30000);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedItems = useMemo(
    () => items.filter((item) => selectedPositions.has(item.position)),
    [items, selectedPositions]
  );
  const selectedCount = selectedItems.length;
  const allPageSelected = items.length > 0 && items.every((item) => selectedPositions.has(item.position));
  const somePageSelected = items.some((item) => selectedPositions.has(item.position));
  const runtimeStats = config['runtime-stats'];
  const runtimeTotalAccounts = runtimeStats?.account_count || total;
  const autoRefreshPaused = Boolean(editing || creatingItem || importOpen || testingItem || quickImporting);
  const publicModelCount = entriesToModels(poolDefaultsDraft.models).length;
  const publicHeaderCount = Object.keys(buildHeaderObject(poolDefaultsDraft.headers)).length;
  const modelOptions = useMemo(() => {
    const names = new Set<string>();
    items.forEach((item) => {
      item.models?.forEach((entry) => {
        if (entry.name) names.add(entry.name);
        if (entry.alias) names.add(entry.alias);
      });
    });
    return [{ value: '', label: '全部模型' }, ...Array.from(names).sort().map((name) => ({ value: name, label: name }))];
  }, [items]);
  const testModelOptions = useMemo(() => {
    const options = (testingItem?.models || [])
      .map((entry) => ({ value: modelValue(entry), label: modelLabel(entry) }))
      .filter((option) => option.value);
    const seen = new Set<string>();
    return options.filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }, [testingItem]);

  const loadConfig = useCallback(async () => {
    const nextConfig = await claudeApiPoolApi.getConfig();
    setConfig(nextConfig);
    setPoolDefaultsDraft(configToPoolDefaultsDraft(nextConfig));
    setVirtualCacheDraft(configToVirtualCacheDraft(nextConfig));
    setRoutingDraft(configToRoutingDraft(nextConfig));
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await claudeApiPoolApi.listItems({
        page,
        page_size: pageSize,
        q: query.trim(),
        status,
        model,
      });
      setItems(result.items || []);
      setTotal(result.total || 0);
      setPage(result.page || page);
      setLastRefreshAt(new Date());
      setSelectedPositions((prev) => {
        const visible = new Set((result.items || []).map((item) => item.position));
        const next = new Set(Array.from(prev).filter((position) => visible.has(position)));
        return next.size === prev.size ? prev : next;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [model, page, pageSize, query, status]);

  useEffect(() => {
    void loadConfig().catch((err) => setError(getErrorMessage(err)));
  }, [loadConfig]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!refreshIntervalMS || autoRefreshPaused) return undefined;
    const timer = window.setInterval(() => {
      void Promise.all([loadConfig(), loadItems()]).catch((err) => setError(getErrorMessage(err)));
    }, refreshIntervalMS);
    return () => window.clearInterval(timer);
  }, [autoRefreshPaused, refreshIntervalMS, loadConfig, loadItems]);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const poolDefaults = poolDefaultsDraftToConfig(poolDefaultsDraft);
      const virtualCache = virtualCacheDraftToConfig(virtualCacheDraft);
      const routing = routingDraftToConfig(routingDraft);
      const result = await claudeApiPoolApi.updateConfig({
        enabled: config.enabled,
        defaults: poolDefaults.defaults,
        models: poolDefaults.models,
        'virtual-cache': virtualCache,
        routing,
      });
      const nextConfig = {
        enabled: result.enabled,
        path: result.path || config.path,
        import_path: result.import_path || config.import_path,
        storage: result.storage || config.storage,
        defaults: result.defaults || poolDefaults.defaults,
        models: result.models || poolDefaults.models,
        'virtual-cache': result['virtual-cache'] || virtualCache,
        routing: result.routing || routing,
        'reuse-stats': result['reuse-stats'],
        'runtime-stats': result['runtime-stats'],
      };
      setConfig(nextConfig);
      setPoolDefaultsDraft(configToPoolDefaultsDraft(nextConfig));
      setVirtualCacheDraft(configToVirtualCacheDraft(nextConfig));
      setRoutingDraft(configToRoutingDraft(nextConfig));
      showNotification('Claude API 池配置已保存', 'success');
      await loadItems();
    } catch (err) {
      showNotification(`保存失败：${getErrorMessage(err)}`, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([loadConfig(), loadItems()]);
  }, [loadConfig, loadItems]);

  const openEdit = (item: ClaudeAPIPoolItem) => {
    setEditing(item);
    setDraft(itemToDraft(item));
  };

  const openCreate = () => {
    setCreatingItem(true);
    setDraft(emptyDraft);
  };

  const closeEdit = () => {
    if (savingItem) return;
    setEditing(null);
    setCreatingItem(false);
    setDraft(emptyDraft);
  };

  const saveItem = async () => {
    if (!editing && !creatingItem) return;
    setSavingItem(true);
    try {
      const value = draftToItem(draft);
      if (editing) {
        await claudeApiPoolApi.updateItem(editing.position, editing.item_hash, value);
        showNotification('账号配置已保存', 'success');
      } else {
        await claudeApiPoolApi.createItem(value);
        showNotification('账号已新增', 'success');
      }
      closeEdit();
      await loadItems();
    } catch (err) {
      showNotification(`保存失败：${getErrorMessage(err)}`, 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const toggleItem = async (item: ClaudeAPIPoolItem) => {
    const disabled = item.status !== 'disabled';
    try {
      await claudeApiPoolApi.setDisabled(item.position, item.item_hash, disabled);
      showNotification(disabled ? '账号已禁用' : '账号已启用', 'success');
      await loadItems();
    } catch (err) {
      showNotification(`更新失败：${getErrorMessage(err)}`, 'error');
    }
  };

  const toggleSelected = (item: ClaudeAPIPoolItem, checked: boolean) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(item.position);
      } else {
        next.delete(item.position);
      }
      return next;
    });
  };

  const togglePageSelected = (checked: boolean) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      items.forEach((item) => {
        if (checked) {
          next.add(item.position);
        } else {
          next.delete(item.position);
        }
      });
      return next;
    });
  };

  const clearSelection = () => setSelectedPositions(new Set());

  const openTest = (item: ClaudeAPIPoolItem) => {
    const firstModel = (item.models || []).map(modelValue).find(Boolean) || '';
    setTestingItem(item);
    setTestModel(firstModel);
    setTestPrompt('hi');
    setTestResult(null);
    setTestError('');
  };

  const closeTest = () => {
    if (testing) return;
    setTestingItem(null);
    setTestResult(null);
    setTestError('');
  };

  const runTest = async () => {
    if (!testingItem || testing) return;
    if (!testModel.trim()) {
      const message = '请选择一个测试模型';
      setTestError(message);
      showNotification(message, 'error');
      return;
    }
    setTesting(true);
    setTestError('');
    setTestResult(null);
    try {
      const result = await claudeApiPoolApi.testItem(
        testingItem.position,
        testingItem.item_hash,
        testModel.trim(),
        testPrompt.trim() || 'hi'
      );
      setTestResult(result);
      if (result.status === 'ok') {
        showNotification(`#${testingItem.position} 测试成功`, 'success');
      } else {
        showNotification(`#${testingItem.position} 测试失败：${result.message || `HTTP ${result.status_code}`}`, 'error');
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setTestError(message);
      showNotification(`测试失败：${message}`, 'error');
    } finally {
      setTesting(false);
    }
  };

  const batchSetDisabled = async (disabled: boolean) => {
    if (selectedItems.length === 0) return;
    setBatchUpdating(true);
    try {
      const refs = selectedItems.map((item) => ({ position: item.position, item_hash: item.item_hash }));
      const result = await claudeApiPoolApi.setDisabledBatch(refs, disabled);
      showNotification(disabled ? `已禁用 ${result.updated} 个账号` : `已启用 ${result.updated} 个账号`, 'success');
      clearSelection();
      await loadItems();
    } catch (err) {
      showNotification(`批量更新失败：${getErrorMessage(err)}`, 'error');
    } finally {
      setBatchUpdating(false);
    }
  };

  const deleteItem = (item: ClaudeAPIPoolItem) => {
    showConfirmation({
      title: '删除 Claude API 池账号',
      message: `确定删除 #${item.position}（${item.api_key_preview}）吗？`,
      confirmText: '删除',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await claudeApiPoolApi.deleteItem(item.position, item.item_hash);
          showNotification('账号已删除', 'success');
          await loadItems();
        } catch (err) {
          showNotification(`删除失败：${getErrorMessage(err)}`, 'error');
        }
      },
    });
  };

  const exportPool = async (format: 'yaml' | 'json') => {
    try {
      const content = await claudeApiPoolApi.exportPool(format);
      downloadBlob({
        filename: `claude-api-pool.${format === 'json' ? 'json' : 'yaml'}`,
        blob: new Blob([content], { type: format === 'json' ? 'application/json' : 'application/yaml' }),
      });
      showNotification('已导出 Claude API 池', 'success');
    } catch (err) {
      showNotification(`导出失败：${getErrorMessage(err)}`, 'error');
    }
  };

  const previewImport = async () => {
    setImporting(true);
    try {
      const result = await claudeApiPoolApi.importPool(importContent, replaceImport, true);
      if ('items' in result) {
        setImportPreview(result);
      }
    } catch (err) {
      showNotification(`导入预览失败：${getErrorMessage(err)}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const previewQuickImport = async () => {
    if (!quickImportContent.trim()) {
      showNotification('请先粘贴 apiKey-----workspaceId', 'error');
      return;
    }
    setQuickImporting(true);
    try {
      const result = await claudeApiPoolApi.importPool(quickImportContent, quickReplaceImport, true);
      if ('items' in result) {
        setQuickImportPreview(result);
      }
    } catch (err) {
      showNotification(`账号导入预览失败：${getErrorMessage(err)}`, 'error');
    } finally {
      setQuickImporting(false);
    }
  };

  const runQuickImport = async () => {
    if (!quickImportContent.trim()) {
      showNotification('请先粘贴 apiKey-----workspaceId', 'error');
      return;
    }
    setQuickImporting(true);
    try {
      const result = await claudeApiPoolApi.importPool(quickImportContent, quickReplaceImport, false);
      if ('imported' in result) {
        showNotification(`已导入 ${result.imported} 个账号`, 'success');
      }
      setQuickImportContent('');
      setQuickImportPreview(null);
      await loadItems();
    } catch (err) {
      showNotification(`账号导入失败：${getErrorMessage(err)}`, 'error');
    } finally {
      setQuickImporting(false);
    }
  };

  const fillImportExample = (content: string) => {
    setImportContent(content);
    setImportPreview(null);
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const result = await claudeApiPoolApi.importPool(importContent, replaceImport, false);
      if ('imported' in result) {
        showNotification(`已导入 ${result.imported} 个账号`, 'success');
      }
      setImportOpen(false);
      setImportContent('');
      setImportPreview(null);
      await loadItems();
    } catch (err) {
      showNotification(`导入失败：${getErrorMessage(err)}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const clearLedger = () => {
    showConfirmation({
      title: '清空虚拟缓存账本',
      message: '确定清空所有本地虚拟缓存账本记录吗？',
      confirmText: '清空',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await claudeApiPoolApi.clearLedger();
          showNotification('虚拟缓存账本已清空', 'success');
        } catch (err) {
          showNotification(`清空失败：${getErrorMessage(err)}`, 'error');
        }
      },
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>账号池运行面板</span>
          <h1 className={styles.title}>Claude API 池</h1>
          <div className={styles.meta}>
            <span>{formatNumber(total)} 个账号</span>
            <span>{config.enabled ? '运行中' : '已停用'}</span>
            <span className={styles.mono}>{config.path || poolStoreName}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Select
            value={String(refreshIntervalMS)}
            onChange={(value) => setRefreshIntervalMS(Number(value))}
            options={refreshIntervalOptions}
            ariaLabel="选择自动刷新间隔"
          />
          <span className={styles.refreshMeta}>
            {autoRefreshPaused ? '自动刷新已暂停' : lastRefreshAt ? `刷新 ${lastRefreshAt.toLocaleTimeString()}` : '尚未刷新'}
          </span>
          <Button variant="secondary" onClick={refreshAll}>
            <IconRefreshCw size={16} /> 刷新
          </Button>
          <Button onClick={saveConfig} loading={savingConfig}>
            保存配置
          </Button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span>可用账号</span>
          <strong>{formatNumber(runtimeStats?.available_accounts)}</strong>
          <small>总数 {formatNumber(runtimeTotalAccounts)}</small>
        </div>
        <div className={styles.statItem}>
          <span>全局并发</span>
          <strong>{formatNumber(runtimeStats?.in_flight)}</strong>
          <small>当前请求</small>
        </div>
        <div className={styles.statItem}>
          <span>RPM</span>
          <strong>{formatNumber(runtimeStats?.rpm_used)}{runtimeStats?.rpm_limit ? ` / ${formatNumber(runtimeStats.rpm_limit)}` : ''}</strong>
          <small>滚动窗口</small>
        </div>
        <div className={styles.statItem}>
          <span>真实缓存率</span>
          <strong>{formatPercent(runtimeStats?.real_cache_ratio)}</strong>
          <small>{formatTokenPair(runtimeStats?.cache_read_tokens, runtimeStats?.cache_creation_tokens)}</small>
        </div>
        <div className={styles.statItem}>
          <span>亲和 Key / lanes</span>
          <strong>{formatNumber(runtimeStats?.active_affinity_keys)} / {formatNumber(runtimeStats?.warm_lanes)}</strong>
          <small>缓存路由</small>
        </div>
        <div className={styles.statItem}>
          <span>成功率</span>
          <strong>{formatPercent(runtimeStats?.success_rate)}</strong>
          <small>{formatNumber(runtimeStats?.success_count)} / {formatNumber(runtimeStats?.request_count)}</small>
        </div>
      </div>

      <section className={styles.configIntro}>
        <div className={styles.configIntroMain}>
          <div>
            <span className={styles.sectionKicker}><IconSettings size={15} /> 基础配置</span>
            <h2>公共配置入口</h2>
            <p>Defaults、Models、账号导入分开管理。账号未单独覆盖时，会继承公共 Defaults 和公共 Models。</p>
          </div>
          <ToggleSwitch
            checked={config.enabled}
            onChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
            label="启用账号池"
          />
        </div>
        <div className={styles.storageStrip}>
          <div>
            <span>SQLite 主存储</span>
            <strong className={styles.mono}>{config.path || poolStoreName}</strong>
          </div>
          <div>
            <span>高级导入文件</span>
            <strong className={styles.mono}>{config.import_path || poolImportFileName}</strong>
          </div>
          <div>
            <span>当前公共模型</span>
            <strong>{publicModelCount} 个</strong>
          </div>
        </div>
      </section>

      <div className={styles.setupGrid}>
        <section className={`${styles.setupPanel} ${styles.defaultsPanel}`}>
          <div className={styles.setupPanelHead}>
            <div>
              <span className={styles.panelIndex}>01</span>
              <h2>公共 Defaults</h2>
              <p>Base URL、代理、优先级和公共 Headers 会作为账号级默认值。</p>
            </div>
            <div className={styles.panelMetric}>
              <strong>{publicHeaderCount}</strong>
              <span>Headers</span>
            </div>
          </div>

          <div className={styles.defaultsGrid}>
            <Input
              label="Base URL"
              value={poolDefaultsDraft.baseUrl}
              onChange={(event) => setPoolDefaultsDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
              placeholder="留空使用默认 Anthropic"
            />
            <Input
              label="代理 URL"
              value={poolDefaultsDraft.proxyUrl}
              onChange={(event) => setPoolDefaultsDraft((prev) => ({ ...prev, proxyUrl: event.target.value }))}
              placeholder="留空不走独立代理"
            />
            <Input
              label="优先级"
              type="number"
              step="1"
              value={poolDefaultsDraft.priority}
              onChange={(event) => setPoolDefaultsDraft((prev) => ({ ...prev, priority: event.target.value }))}
              placeholder="0"
            />
            <div className={styles.inlineToggleField}>
              <ToggleSwitch
                checked={poolDefaultsDraft.disableCooling}
                onChange={(disableCooling) => setPoolDefaultsDraft((prev) => ({ ...prev, disableCooling }))}
                label="默认禁用冷却"
              />
              <span>只影响没有账号级覆盖的账号。</span>
            </div>
          </div>

          <div className={styles.editorBlock}>
            <div className={styles.editorBlockHead}>
              <span><IconFileText size={15} /> 公共 Headers</span>
              <small>例如 anthropic-version、自定义代理头，Workspace 不建议放这里。</small>
            </div>
            <HeaderInputList
              entries={poolDefaultsDraft.headers}
              onChange={(headers) => setPoolDefaultsDraft((prev) => ({ ...prev, headers }))}
              addLabel="添加 Header"
              keyPlaceholder="header-name"
              valuePlaceholder="value"
              removeButtonTitle="删除 Header"
              removeButtonAriaLabel="删除 Header"
            />
          </div>
        </section>

        <section className={styles.setupPanel}>
          <div className={styles.setupPanelHead}>
            <div>
              <span className={styles.panelIndex}>02</span>
              <h2>公共 Models</h2>
              <p>这里维护池子的公共模型清单。alias 可以留空，新增账号默认继承。</p>
            </div>
            <div className={styles.panelMetric}>
              <strong>{publicModelCount}</strong>
              <span>Models</span>
            </div>
          </div>

          <div className={styles.modelEditorShell}>
            <div className={styles.modelColumnsHeader}>
              <span>真实模型名</span>
              <span>别名，可留空</span>
            </div>
            <ModelInputList
              entries={poolDefaultsDraft.models}
              onChange={(models) => setPoolDefaultsDraft((prev) => ({ ...prev, models }))}
              addLabel="添加模型"
              namePlaceholder="claude-opus-4-8"
              aliasPlaceholder="alias"
              rowClassName={styles.modelRow}
              inputClassName={styles.compactInput}
              removeButtonTitle="删除模型"
              removeButtonAriaLabel="删除模型"
            />
          </div>
        </section>

        <section className={styles.setupPanel}>
          <div className={styles.setupPanelHead}>
            <div>
              <span className={styles.panelIndex}>03</span>
              <h2>账号导入</h2>
              <p>一行一个账号，格式固定为 apiKey-----workspaceId。默认追加，不覆盖现有账号。</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuickImportContent(simpleImportExample);
                setQuickImportPreview(null);
              }}
            >
              填入示例
            </Button>
          </div>

          <textarea
            className={`input ${styles.quickImportTextarea}`}
            value={quickImportContent}
            onChange={(event) => {
              setQuickImportContent(event.target.value);
              setQuickImportPreview(null);
            }}
            placeholder={`api-key-1-----wrkspc_xxx\napi-key-2-----wrkspc_yyy`}
          />
          <div className={styles.importControlRow}>
            <ToggleSwitch checked={quickReplaceImport} onChange={setQuickReplaceImport} label="替换现有账号" />
            <div className={styles.importActions}>
              <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                <IconUpload size={16} /> 高级导入
              </Button>
              <Button variant="secondary" size="sm" onClick={previewQuickImport} loading={quickImporting}>
                预览
              </Button>
              <Button size="sm" onClick={runQuickImport} loading={quickImporting}>
                导入账号
              </Button>
            </div>
          </div>
          <div className={styles.importHintLine}>
            {quickImportPreview
              ? `预览：共 ${quickImportPreview.count} 个账号，当前显示前 ${quickImportPreview.items.length} 个。`
              : '分隔符是 5 个英文横线：-----。Workspace 会写入账号级 anthropic-workspace-id。'}
          </div>
        </section>
      </div>

      <div className={styles.settingsLayout}>
        <section className={styles.virtualCacheBar}>
          <div className={styles.virtualCacheHeader}>
            <div>
              <span className={styles.sectionKicker}><IconChartLine size={15} /> 虚拟账本</span>
              <h2>对外缓存口径</h2>
            </div>
            <div className={styles.sectionStatus}>
              <span>目标 {formatPercent(config['reuse-stats']?.target_ratio)}</span>
              <span>实际 {formatPercent(config['reuse-stats']?.actual_ratio)}</span>
              <span>样本 {config['reuse-stats']?.sample_count || 0}</span>
            </div>
          </div>
          <div className={styles.virtualCacheGrid}>
            <ToggleSwitch
              checked={virtualCacheDraft.enabled}
              onChange={(enabled) => setVirtualCacheDraft((prev) => ({ ...prev, enabled }))}
              label="启用虚拟缓存账本"
            />
            <label className={styles.selectField}>
              <span>账本模式</span>
              <Select
                value={virtualCacheDraft.mode}
                options={virtualCacheModeOptions}
                onChange={(mode) =>
                  setVirtualCacheDraft((prev) => ({
                    ...prev,
                    mode: mode === 'forced' ? 'forced' : 'natural',
                  }))
                }
                ariaLabel="选择虚拟缓存账本模式"
              />
            </label>
            <Input
              label="缓存命中率 %"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={virtualCacheDraft.hitRate}
              onChange={(event) => setVirtualCacheDraft((prev) => ({ ...prev, hitRate: event.target.value }))}
            />
            <Input
              label="目标复用率 %"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={virtualCacheDraft.targetCacheReuseRatio}
              onChange={(event) => setVirtualCacheDraft((prev) => ({ ...prev, targetCacheReuseRatio: event.target.value }))}
            />
            <Input
              label="压缩重置比例 %"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={virtualCacheDraft.contextShrinkResetRatio}
              onChange={(event) => setVirtualCacheDraft((prev) => ({ ...prev, contextShrinkResetRatio: event.target.value }))}
            />
          </div>
        </section>

        <section className={styles.routingBar}>
          <div className={styles.routingHeader}>
            <div>
              <span className={styles.sectionKicker}><IconShield size={15} /> 路由保护</span>
              <h2>限速与换号</h2>
            </div>
          </div>
          <div className={styles.routingGrid}>
            <Input
              label="每账号 RPM"
              type="number"
              min="0"
              step="1"
              value={routingDraft.perAccountRPM}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, perAccountRPM: event.target.value }))}
            />
            <Input
              label="每账号并发"
              type="number"
              min="0"
              step="1"
              value={routingDraft.perAccountConcurrency}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, perAccountConcurrency: event.target.value }))}
            />
            <Input
              label="最大换号次数"
              type="number"
              min="0"
              step="1"
              value={routingDraft.maxSwitches}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, maxSwitches: event.target.value }))}
            />
            <Input
              label="换号间隔 ms"
              type="number"
              min="0"
              step="1"
              value={routingDraft.switchDelayMS}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, switchDelayMS: event.target.value }))}
            />
            <Input
              label="429 初始冷却 ms"
              type="number"
              min="0"
              step="1"
              value={routingDraft.rateLimitCooldownMS}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, rateLimitCooldownMS: event.target.value }))}
            />
            <Input
              label="429 最大冷却 ms"
              type="number"
              min="0"
              step="1"
              value={routingDraft.rateLimitMaxCooldownMS}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, rateLimitMaxCooldownMS: event.target.value }))}
            />
            <Input
              label="529 初始冷却 ms"
              type="number"
              min="0"
              step="1"
              value={routingDraft.overloadCooldownMS}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, overloadCooldownMS: event.target.value }))}
            />
            <Input
              label="529 最大冷却 ms"
              type="number"
              min="0"
              step="1"
              value={routingDraft.overloadMaxCooldownMS}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, overloadMaxCooldownMS: event.target.value }))}
            />
            <Input
              label="429 同号重试"
              type="number"
              min="0"
              step="1"
              value={routingDraft.sameAccountRetry429}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, sameAccountRetry429: event.target.value }))}
            />
            <Input
              label="529 同号重试"
              type="number"
              min="0"
              step="1"
              value={routingDraft.sameAccountRetry529}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, sameAccountRetry529: event.target.value }))}
            />
            <Input
              label="同号重试间隔 ms"
              type="number"
              min="0"
              step="1"
              value={routingDraft.sameAccountRetryDelayMS}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, sameAccountRetryDelayMS: event.target.value }))}
            />
          </div>
          <div className={styles.routingHeader}>
            <div>
              <span className={styles.sectionKicker}><IconSlidersHorizontal size={15} /> 真实缓存亲和</span>
              <h2>选号策略</h2>
            </div>
          </div>
          <div className={styles.routingGrid}>
            <ToggleSwitch
              checked={routingDraft.cacheAffinityEnabled}
              onChange={(cacheAffinityEnabled) => setRoutingDraft((prev) => ({ ...prev, cacheAffinityEnabled }))}
              label="启用缓存亲和"
            />
            <ToggleSwitch
              checked={routingDraft.cacheAffinityAuto}
              onChange={(cacheAffinityAuto) => setRoutingDraft((prev) => ({ ...prev, cacheAffinityAuto }))}
              label="自动策略"
            />
            <Input
              label="最小缓存 Tokens"
              type="number"
              min="0"
              step="1"
              value={routingDraft.cacheAffinityMinTokens}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, cacheAffinityMinTokens: event.target.value }))}
            />
            <Input
              label="亲和 lanes"
              type="number"
              min="1"
              step="1"
              value={routingDraft.cacheAffinityLanes}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, cacheAffinityLanes: event.target.value }))}
            />
            <Input
              label="自动最大 lanes"
              type="number"
              min="1"
              step="1"
              value={routingDraft.cacheAffinityMaxLanes}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, cacheAffinityMaxLanes: event.target.value }))}
            />
            <Input
              label="亲和等待 ms"
              type="number"
              min="0"
              step="1"
              value={routingDraft.cacheAffinityWaitMS}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, cacheAffinityWaitMS: event.target.value }))}
            />
            <Input
              label="亲和 TTL ms"
              type="number"
              min="0"
              step="1"
              value={routingDraft.cacheAffinityTTLMS}
              onChange={(event) => setRoutingDraft((prev) => ({ ...prev, cacheAffinityTTLMS: event.target.value }))}
            />
          </div>
        </section>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarTitle}>
          <span className={styles.sectionKicker}><IconSearch size={15} /> 账号监控</span>
          <strong>{formatNumber(total)} 条记录</strong>
        </div>
        <Input
          value={query}
          onChange={(event) => {
            setPage(1);
            setQuery(event.target.value);
          }}
          placeholder="搜索 Key、Base URL、模型、Header"
          aria-label="搜索 Claude API 池账号"
        />
        <Select value={model} onChange={(value) => { setPage(1); setModel(value); }} options={modelOptions} />
        <Select value={status} onChange={(value) => { setPage(1); setStatus(value); }} options={statusOptions} />
        <div className={styles.toolbarActions}>
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <IconKey size={16} /> 新增账号
          </Button>
          <Button variant="secondary" size="sm" onClick={() => batchSetDisabled(false)} disabled={selectedCount === 0 || batchUpdating} loading={batchUpdating}>
            <IconPower size={16} /> 批量启用
          </Button>
          <Button variant="secondary" size="sm" onClick={() => batchSetDisabled(true)} disabled={selectedCount === 0 || batchUpdating} loading={batchUpdating}>
            <IconPower size={16} /> 批量禁用
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportPool('yaml')}>
            <IconDownload size={16} /> 导出
          </Button>
          <Button variant="secondary" size="sm" onClick={clearLedger}>
            <IconTable size={16} /> 清空账本
          </Button>
        </div>
      </div>

      <div className={styles.tablePanel}>
        {selectedCount > 0 && (
          <div className={styles.batchBar}>
            <span>已选择 {selectedCount} 个账号</span>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={batchUpdating}>
              取消选择
            </Button>
          </div>
        )}
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.selectCell}>
                  <SelectionCheckbox
                    checked={allPageSelected}
                    onChange={togglePageSelected}
                    ariaLabel={allPageSelected ? '取消选择本页账号' : '选择本页账号'}
                    title={somePageSelected && !allPageSelected ? '部分账号已选择' : undefined}
                  />
                </th>
                <th className={styles.numberCell}>#</th>
                <th className={styles.statusCell}>状态</th>
                <th className={styles.baseUrlCell}>Base URL</th>
                <th className={styles.modelsCell}>模型</th>
                <th className={styles.headersCell}>Headers</th>
                <th className={styles.smallNumberCell}>优先级</th>
                <th className={styles.smallNumberCell}>进行中</th>
                <th className={styles.smallNumberCell}>RPM</th>
                <th className={styles.metricsCell}>成功率</th>
                <th className={styles.metricsCell}>真实缓存</th>
                <th className={styles.historyCell}>近 60 分钟</th>
                <th className={styles.smallNumberCell}>冷却</th>
                <th className={styles.smallNumberCell}>热 Key</th>
                <th className={styles.actionsCell}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.position}:${item.item_hash}`}>
                  <td className={styles.selectCell}>
                    <SelectionCheckbox
                      checked={selectedPositions.has(item.position)}
                      onChange={(checked) => toggleSelected(item, checked)}
                      ariaLabel={`选择 #${item.position}`}
                    />
                  </td>
                  <td className={styles.numberCell}>
                    <span className={styles.mono}>#{item.position}</span>
                  </td>
                  <td className={styles.statusCell}>
                    <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
                  </td>
                  <td className={styles.baseUrlCell}>
                    <div className={styles.accountCell}>
                      <span className={styles.accountIndex}>#{item.position}</span>
                      <div>
                        <div className={`${styles.truncate} ${styles.mono}`} title={item['base-url'] || '-'}>
                          {item['base-url'] || '默认 Anthropic'}
                        </div>
                        <div className={styles.keyPreview}>{item.api_key_preview}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.modelsCell}>
                    <div className={styles.pillList}>
                      {(item.models || []).slice(0, 4).map((entry) => (
                        <span className={styles.pill} key={`${entry.name}:${entry.alias || ''}`} title={entry.alias || entry.name}>
                          {entry.alias || entry.name}
                        </span>
                      ))}
                      {(item.models || []).length > 4 && <span className={styles.pill}>+{(item.models || []).length - 4}</span>}
                    </div>
                  </td>
                  <td className={styles.headersCell}>
                    <div className={styles.pillList}>
                      {Object.keys(item.headers || {}).slice(0, 3).map((key) => (
                        <span className={styles.pill} key={key} title={`${key}: ${(item.headers || {})[key]}`}>
                          {key}
                        </span>
                      ))}
                      {Object.keys(item.headers || {}).length > 3 && <span className={styles.pill}>+{Object.keys(item.headers || {}).length - 3}</span>}
                    </div>
                  </td>
                  <td className={styles.smallNumberCell}>{item.priority}</td>
                  <td className={styles.smallNumberCell}>{item.in_flight}</td>
                  <td className={styles.smallNumberCell}>
                    {item.rpm_limit > 0 ? `${item.rpm_used}/${item.rpm_limit}` : item.rpm_used || '-'}
                  </td>
                  <td className={styles.metricsCell}>
                    <div className={styles.metricStack}>
                      <strong>{formatPercent(item.metrics?.success_rate)}</strong>
                      <span>{formatNumber(item.metrics?.success_count)} / {formatNumber(item.metrics?.request_count)}</span>
                    </div>
                  </td>
                  <td className={styles.metricsCell}>
                    <div className={styles.metricStack}>
                      <strong>{formatPercent(item.metrics?.real_cache_ratio)}</strong>
                      <span>{formatTokenPair(item.metrics?.cache_read_tokens, item.metrics?.cache_creation_tokens)}</span>
                    </div>
                  </td>
                  <td className={styles.historyCell}>
                    <div className={styles.historyStrip}>
                      {(item.metrics?.history || []).map((bucket, index) => (
                        <span
                          key={`${bucket.time}:${index}`}
                          className={`${styles.historyDot} ${historyClass(bucket.state)}`}
                          title={`${bucket.time} 请求 ${bucket.requests} 成功 ${bucket.success} 失败 ${bucket.failures}`}
                        />
                      ))}
                    </div>
                    <span>{formatMs(item.metrics?.avg_latency_ms)}</span>
                  </td>
                  <td className={styles.smallNumberCell} title={item.cooling_until || undefined}>
                    {item.cooling ? '是' : '否'}
                  </td>
                  <td className={styles.smallNumberCell}>{item.warm_keys}</td>
                  <td className={styles.actionsCell}>
                    <div className={styles.rowActions}>
                      <Button className={styles.iconButton} variant="secondary" size="sm" onClick={() => openEdit(item)} title="编辑">
                        <IconPencil size={16} />
                      </Button>
                      <Button className={styles.iconButton} variant="secondary" size="sm" onClick={() => openTest(item)} title="测试连接">
                        <IconPlay size={16} />
                      </Button>
                      <Button className={styles.iconButton} variant="secondary" size="sm" onClick={() => toggleItem(item)} title={item.status === 'disabled' ? '启用' : '禁用'}>
                        <IconPower size={16} />
                      </Button>
                      <Button className={styles.iconButton} variant="secondary" size="sm" onClick={() => claudeApiPoolApi.resetCooling(item.position).then(loadItems)} title="重置冷却">
                        <IconRefreshCw size={16} />
                      </Button>
                      <Button className={styles.iconButton} variant="danger" size="sm" onClick={() => deleteItem(item)} title="删除">
                        <IconTrash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className={styles.emptyState}>加载中...</div>}
        {!loading && error && <div className={styles.errorState}>{error}</div>}
        {!loading && !error && items.length === 0 && <div className={styles.emptyState}>暂无池账号</div>}
        <div className={styles.pagination}>
          <span>
            第 {page} / {totalPages} 页
          </span>
          <div className={styles.paginationControls}>
            <Select value={String(pageSize)} options={pageSizes.map((size) => ({ value: size, label: `${size} 条/页` }))} onChange={(value) => { setPage(1); setPageSize(Number(value)); }} />
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>上一页</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>下一页</Button>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(editing) || creatingItem}
        title={editing ? `编辑池账号 #${editing.position}` : '新增池账号'}
        onClose={closeEdit}
        width={760}
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={closeEdit} disabled={savingItem}>取消</Button>
            <Button onClick={saveItem} loading={savingItem}>保存</Button>
          </div>
        }
      >
        <div className={styles.modalGrid}>
          <Input label="API key" value={draft.apiKey} onChange={(event) => setDraft((prev) => ({ ...prev, apiKey: event.target.value }))} className={styles.mono} />
          <Input
            label="Workspace ID"
            value={draft.workspaceId}
            onChange={(event) => setDraft((prev) => ({ ...prev, workspaceId: event.target.value }))}
            placeholder="wrkspc_..."
            hint="会写入 anthropic-workspace-id；留空则不设置。"
          />
          <Input
            label="Base URL"
            value={draft.baseUrl}
            onChange={(event) => setDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
            placeholder={poolDefaultsDraft.baseUrl || '继承公共 Base URL'}
            hint="留空继承公共配置。"
          />
          <Input
            label="代理 URL"
            value={draft.proxyUrl}
            onChange={(event) => setDraft((prev) => ({ ...prev, proxyUrl: event.target.value }))}
            placeholder={poolDefaultsDraft.proxyUrl || '继承公共代理'}
            hint="留空继承公共配置。"
          />
          <Input
            label="优先级"
            type="number"
            step="1"
            value={draft.priority}
            onChange={(event) => setDraft((prev) => ({ ...prev, priority: event.target.value }))}
            placeholder={poolDefaultsDraft.priority || '继承公共优先级'}
          />
          <ToggleSwitch checked={draft.disableCooling} onChange={(value) => setDraft((prev) => ({ ...prev, disableCooling: value }))} label="禁用冷却" />
          <ToggleSwitch checked={draft.disabled} onChange={(value) => setDraft((prev) => ({ ...prev, disabled: value }))} label="禁用账号" />
          <ToggleSwitch checked={draft.experimentalCCHSigning} onChange={(value) => setDraft((prev) => ({ ...prev, experimentalCCHSigning: value }))} label="CCH 签名" />
          <label className={styles.fullSpan}>
            <span>Headers JSON</span>
            <textarea className={`input ${styles.textarea}`} value={draft.headersText} onChange={(event) => setDraft((prev) => ({ ...prev, headersText: event.target.value }))} />
            <small className={styles.inheritHint}>这里是账号级额外 Headers；Workspace ID 会自动合并为 anthropic-workspace-id。</small>
          </label>
          <label className={styles.fullSpan}>
            <span>模型 JSON</span>
            <textarea className={`input ${styles.textarea}`} value={draft.modelsText} onChange={(event) => setDraft((prev) => ({ ...prev, modelsText: event.target.value }))} />
            <small className={styles.inheritHint}>留空则继承公共模型列表。</small>
          </label>
          <label className={styles.fullSpan}>
            <span>排除模型 JSON</span>
            <textarea className={`input ${styles.textarea}`} value={draft.excludedModelsText} onChange={(event) => setDraft((prev) => ({ ...prev, excludedModelsText: event.target.value }))} />
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(testingItem)}
        title={testingItem ? `测试账号连接 #${testingItem.position}` : '测试账号连接'}
        onClose={closeTest}
        width={760}
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={closeTest} disabled={testing}>关闭</Button>
            <Button onClick={runTest} loading={testing} disabled={!testingItem || testModelOptions.length === 0}>
              {testResult || testError ? '重试' : '开始测试'}
            </Button>
          </div>
        }
      >
        {testingItem && (
          <div className={styles.testPanel}>
            <div className={styles.testSummary}>
              <div>
                <span>账号</span>
                <strong className={styles.mono}>#{testingItem.position} {testingItem.api_key_preview}</strong>
              </div>
              <div>
                <span>状态</span>
                <strong className={statusClass(testingItem.status)}>{statusLabel(testingItem.status)}</strong>
              </div>
              <div>
                <span>Base URL</span>
                <strong className={styles.mono}>{testingItem['base-url'] || '默认 Anthropic'}</strong>
              </div>
            </div>

            <div className={styles.testControls}>
              <label>
                <span>测试模型</span>
                <Select
                  value={testModel}
                  onChange={setTestModel}
                  options={testModelOptions}
                  disabled={testing || testModelOptions.length === 0}
                  ariaLabel="选择测试模型"
                />
              </label>
              <Input
                label="测试消息"
                value={testPrompt}
                onChange={(event) => setTestPrompt(event.target.value)}
                disabled={testing}
                placeholder="hi"
              />
            </div>

            {testModelOptions.length === 0 && (
              <div className={styles.errorState}>这个账号没有可用模型，请先在顶层 models 或账号 models 中配置模型。</div>
            )}

            <div className={styles.testLog} aria-live="polite">
              {testing && (
                <>
                  <div>$ 使用账号 #{testingItem.position} 发送 Claude Messages 测试请求...</div>
                  <div>$ model={testModel || '-'}</div>
                  <div>$ prompt={testPrompt.trim() || 'hi'}</div>
                </>
              )}
              {!testing && !testResult && !testError && (
                <>
                  <div>$ 准备测试账号 #{testingItem.position}</div>
                  <div>$ 点击“开始测试”后会用该账号直接发送一条最小消息。</div>
                </>
              )}
              {testError && (
                <>
                  <div className={styles.logError}>$ 请求失败</div>
                  <div>{testError}</div>
                </>
              )}
              {testResult && (
                <>
                  <div className={testResult.status === 'ok' ? styles.logSuccess : styles.logError}>
                    $ {testResult.status === 'ok' ? '测试成功' : '测试失败'} HTTP {testResult.status_code} · {testResult.duration_ms}ms
                  </div>
                  <div>$ model={testResult.model}</div>
                  {testResult.message && <div>$ message={testResult.message}</div>}
                  {testResult.headers && Object.keys(testResult.headers).length > 0 && (
                    <div>$ headers={JSON.stringify(testResult.headers)}</div>
                  )}
                  {testResult.body && <pre>{testResult.body}</pre>}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={importOpen}
        title="导入 Claude API 池"
        onClose={() => !importing && setImportOpen(false)}
        width={760}
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setImportOpen(false)} disabled={importing}>取消</Button>
            <Button variant="secondary" onClick={previewImport} loading={importing}>预览</Button>
            <Button onClick={runImport} loading={importing}>导入</Button>
          </div>
        }
      >
        <div className={styles.importHelp}>
          <div>
            <strong>支持的导入格式</strong>
            <p>
              最简格式是一行一个 <span className={styles.mono}>apiKey-----workspaceId</span>，会生成账号级
              <span className={styles.mono}>headers.anthropic-workspace-id</span>。默认导入只追加新账号，不修改公共配置；也可以粘贴完整的
              <span className={styles.mono}>{poolImportFileName}</span>、带 <span className={styles.mono}>items</span>
              的对象，或 JSON/YAML 账号数组。
            </p>
          </div>
          <div className={styles.exampleActions}>
            <Button variant="secondary" size="sm" onClick={() => fillImportExample(simpleImportExample)}>
              填入简洁示例
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fillImportExample(yamlImportExample)}>
              填入 YAML 示例
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fillImportExample(jsonImportExample)}>
              填入 JSON 示例
            </Button>
          </div>
        </div>
        <pre className={styles.importExample}>{simpleImportExample}</pre>
        <div className={styles.importModeBox}>
          <ToggleSwitch checked={replaceImport} onChange={setReplaceImport} label="替换现有账号" />
          <span>
            默认关闭时只追加账号；打开后会替换现有账号。若导入内容是完整 YAML/JSON 文件，还会以文件内
            <span className={styles.mono}> defaults/models/routing/virtual-cache </span>
            替换公共配置。
          </span>
        </div>
        <textarea
          className={`input ${styles.textarea} ${styles.importTextarea}`}
          value={importContent}
          onChange={(event) => {
            setImportContent(event.target.value);
            setImportPreview(null);
          }}
          placeholder="每行 apiKey-----workspaceId，或粘贴 YAML/JSON"
        />
        {importPreview && (
          <div className={styles.importPreview}>
            预览：共 {importPreview.count} 个账号，当前显示前 {importPreview.items.length} 个。
          </div>
        )}
      </Modal>
    </div>
  );
}
