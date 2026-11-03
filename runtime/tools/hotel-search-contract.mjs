const ALLOWED_SCOPES = new Set([
  'same_option',
  'nearby',
  'date_flexible',
  'cheaper',
]);

const ALLOWED_STATUSES = new Set([
  'available',
  'no-match',
  'source-unconfirmed',
  'tool-error',
  'room-unavailable',
  'sold-out',
  'quote-or-link-invalid',
]);

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function assertRequiredQuery({ hotelName, checkIn, checkOut, adults }) {
  const missing = [];
  if (!hasValue(hotelName)) missing.push('hotelName');
  if (!hasValue(checkIn)) missing.push('checkIn');
  if (!hasValue(checkOut)) missing.push('checkOut');
  if (!hasValue(adults)) missing.push('adults');
  if (missing.length > 0) {
    throw new Error(`Missing hotel search fields: ${missing.join(', ')}`);
  }
}

function normalizeScope(scope) {
  const normalized = scope || 'same_option';
  if (!ALLOWED_SCOPES.has(normalized)) {
    throw new Error(`Unsupported hotel search scope: ${normalized}`);
  }
  return normalized;
}

function buildQueryKey({ hotelName, checkIn, checkOut, adults, rooms, scope, radiusMeters, maxPricePerNight }) {
  return [hotelName, checkIn, checkOut, adults, rooms, scope, radiusMeters || '', maxPricePerNight || ''].join('|');
}

/**
 * 将受控酒店查询返回归一化为稳定结构。
 * 该函数不把缺少房态的数据推断成有房或无房。
 */
export function normalizeHotelSearchResult(result = {}) {
  const status = result.status || 'no-match';
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`Unsupported hotel search status: ${status}`);
  }

  return {
    status,
    hotel: result.hotel ?? null,
    rooms: Array.isArray(result.rooms) ? result.rooms : [],
    alternatives: Array.isArray(result.alternatives) ? result.alternatives : [],
    error: result.error,
    reason: result.reason,
    source: result.source,
    queriedAt: result.queriedAt,
    demoData: true,
  };
}

/**
 * 创建只读的受控酒店查询函数。
 * resultsByQuery 的 key 为：酒店|入住日|离店日|成人数|房间数|scope。
 */
export function createControlledHotelSearch({ resultsByQuery = {} } = {}) {
  return async function search({
    hotelName,
    hotelAliases = [],
    checkIn,
    checkOut,
    adults,
    rooms,
    scope,
    radiusMeters,
    maxPricePerNight,
  } = {}) {
    assertRequiredQuery({ hotelName, checkIn, checkOut, adults });

    const normalizedAdults = hasValue(adults) ? adults : 1;
    const normalizedRooms = hasValue(rooms) ? rooms : 1;
    const normalizedScope = normalizeScope(scope);
    const query = {
      hotelName,
      hotelAliases: Array.isArray(hotelAliases) ? hotelAliases.filter(hasValue) : [],
      checkIn,
      checkOut,
      adults: normalizedAdults,
      rooms: normalizedRooms,
      scope: normalizedScope,
    };
    if (normalizedScope === 'nearby') query.radiusMeters = hasValue(radiusMeters) ? radiusMeters : 3000;
    if (hasValue(maxPricePerNight)) query.maxPricePerNight = maxPricePerNight;
    const key = buildQueryKey(query);
    const rawResult = resultsByQuery[key] ?? { status: 'no-match' };

    return {
      ...normalizeHotelSearchResult(rawResult),
      query,
    };
  };
}
