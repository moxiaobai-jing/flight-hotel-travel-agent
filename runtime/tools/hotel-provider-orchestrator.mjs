const INVENTORY_STATUSES = new Set([
  'no-match',
  'room-unavailable',
  'sold-out',
]);

const FAILURE_STATUSES = new Set([
  'source-unconfirmed',
  'tool-error',
  'quote-or-link-invalid',
]);

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function normalizeQuery(query = {}) {
  const missing = ['hotelName', 'checkIn', 'checkOut']
    .filter((field) => !hasValue(query[field]));
  if (missing.length > 0) {
    throw new Error(`Missing hotel search fields: ${missing.join(', ')}`);
  }

  const aliases = Array.isArray(query.hotelAliases)
    ? query.hotelAliases.filter(hasValue).map((alias) => String(alias).trim())
    : [];

  return {
    ...query,
    hotelAliases: [...new Set(aliases)],
    adults: hasValue(query.adults) ? query.adults : 1,
    rooms: hasValue(query.rooms) ? query.rooms : 1,
    scope: query.scope || 'same_option',
    radiusMeters: query.scope === 'nearby'
      ? (hasValue(query.radiusMeters) ? query.radiusMeters : 3000)
      : query.radiusMeters,
    maxPricePerNight: query.maxPricePerNight,
  };
}

function hasSearchFunction(provider) {
  return provider && typeof provider.search === 'function';
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || 'unknown provider error');
}

function sanitizeErrorMessage(error) {
  return getErrorMessage(error).replace(
    /((?:api[_-]?key|token|secret|authorization|password)\s*[:=]\s*)[^\s,;]+/gi,
    '$1[redacted]',
  );
}

function normalizeProviderResult(provider, settled) {
  if (settled.status === 'rejected') {
    return {
      id: provider.id,
      name: provider.name || provider.id,
      status: 'tool-error',
      rooms: [],
      alternatives: [],
      error: sanitizeErrorMessage(settled.reason),
    };
  }

  const result = settled.value && typeof settled.value === 'object' ? settled.value : {};
  const rooms = Array.isArray(result.rooms)
    ? result.rooms.map((room) => ({
      ...room,
      provider: room.provider || result.source || provider.name || provider.id,
      providerId: provider.id,
    }))
    : [];

  return {
    id: provider.id,
    name: provider.name || provider.id,
    status: result.status || 'source-unconfirmed',
    hotel: result.hotel ?? null,
    rooms,
    alternatives: Array.isArray(result.alternatives) ? result.alternatives : [],
    source: result.source || provider.name || provider.id,
    queriedAt: result.queriedAt,
    error: result.error ? sanitizeErrorMessage(result.error) : undefined,
    reason: result.reason,
  };
}

function hasVisibleInventory(providerResult) {
  return providerResult.status === 'available'
    && (providerResult.rooms.length > 0 || providerResult.alternatives.length > 0);
}

function summarize(providerResult, status) {
  if (status === 'available') {
    if (providerResult.alternatives.length > 0 && providerResult.rooms.length === 0) {
      return '已返回目标酒店附近、在限定距离和预算内的可核验候选；请通过详情链接再次核对实时价格与房态。';
    }
    return '已返回 RollingGo 可核验房型；请通过详情链接再次核对实时价格与房态。';
  }
  if (status === 'sold-out') {
    return 'RollingGo 明确返回目标日期售罄或当前没有可售房型。';
  }
  if (status === 'tool-error') {
    return 'RollingGo 查询失败，当前无法核验房态。';
  }
  if (FAILURE_STATUSES.has(providerResult.status)) {
    return '当前无法核验房态：RollingGo 未返回可核验结果。';
  }
  if (INVENTORY_STATUSES.has(providerResult.status)) {
    return 'RollingGo 未返回目标日期的可售房型。';
  }
  return '当前无法核验房态：RollingGo 返回信息不完整。';
}

function aggregateResult(providerResult) {
  const visible = hasVisibleInventory(providerResult);
  const status = visible
    ? 'available'
    : providerResult.status === 'tool-error'
      ? 'tool-error'
      : INVENTORY_STATUSES.has(providerResult.status)
        ? 'sold-out'
        : 'source-unconfirmed';
  const rooms = visible
    ? [...providerResult.rooms].sort((left, right) => {
      if (typeof left.price !== 'number' || typeof right.price !== 'number') return 0;
      return left.price - right.price;
    })
    : [];

  return {
    status,
    hotel: providerResult.hotel,
    rooms,
    alternatives: visible ? providerResult.alternatives : [],
    providers: [providerResult],
    source: providerResult.name,
    queriedAt: providerResult.queriedAt,
    summary: summarize(providerResult, status),
    multiProvider: false,
  };
}

/**
 * 创建 RollingGo 单供应商酒店查询函数。
 * provider 只接收已经配置好的只读查询函数；本模块不读取或记录密钥。
 */
export function createHotelSearch({ provider } = {}) {
  if (!hasSearchFunction(provider)) {
    throw new TypeError('RollingGo hotel search requires one provider with a search function');
  }

  return async function search(query = {}) {
    const normalizedQuery = normalizeQuery(query);
    const settled = await Promise.allSettled([
      provider.search({ ...normalizedQuery }),
    ]);
    const providerResult = normalizeProviderResult(provider, settled[0]);
    return {
      ...aggregateResult(providerResult),
      query: normalizedQuery,
    };
  };
}

export const createRollingGoHotelSearch = createHotelSearch;
