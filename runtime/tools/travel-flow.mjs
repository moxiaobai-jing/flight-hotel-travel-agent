import { getMissingRequiredFields } from './travel-input-contract.mjs';

const ONBOARDING_REPLY = [
  '👋 嗨～想跟上小伙伴的旅程吗？',
  '把小伙伴的航班或酒店截图、文字信息直接发给我，我帮你找同款，也可以帮你看看有没有合适的替代方案。',
  '如果你是自己出游、还没有具体航班，也可以告诉我想去哪里、什么时候出发，以及更在意价格、直飞还是时间，我可以先帮你找合适的航班。',
  '酒店推荐和完整旅行规划功能还在准备中，敬请期待～',
].join('\n');

const UNRECOGNIZED_INPUT_REPLY = [
  '我暂时没有识别到航班或酒店相关信息～',
  '',
  '你可以直接发给我：',
  '- 航班截图或文字信息，我帮你找同款，也可以帮你找时间、价格合适的替代航班；',
  '- 酒店截图或文字信息，我帮你核验这家酒店是否有房、有哪些可入住的房型；',
  '- 如果还没有具体航班，也可以告诉我出发地、目的地、出发时间，以及更在意价格、直飞还是时间，我先帮你找合适的航班。',
].join('\n');

const FIELD_LABELS = {
  hotelName: '酒店名称',
  hotelNameOrAddress: '酒店名称或地址',
  checkIn: '入住日期',
  checkOut: '离店日期',
  adults: '入住成人数',
  origin: '出发地',
  destination: '目的地',
  date: '出发日期',
  departureTime: '出发时间',
  arrivalTime: '抵达时间',
  roomType: '参考房型',
  referenceRoomType: '参考房型',
};

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function getEffectiveMissingFields(resource, extracted, session, conditions) {
  const declaredMissing = resource === 'hotel'
    ? getMissingRequiredFields('hotel', conditions)
    : extracted?.missingFields ?? session.missingFields ?? [];

  // 上游抽取结果可能保留旧的 missingFields；只要字段已被识别或推算并写入
  // conditions，就不能继续把它作为缺口追问。
  return declaredMissing.filter((field) => !hasValue(conditions[field]));
}

function isCancellation(input) {
  return /(取消|不用了|不查了|停止|先不找了)/.test(String(input || ''));
}

function getAlternativeScope(input) {
  const text = String(input || '');
  if (/(附近|就近|近一点|离得近)/.test(text)) return 'nearby';
  if (/(便宜|低价|省钱|价格低)/.test(text)) return 'cheaper';
  if (/(前后\s*三小时|前后\s*3\s*小时|三小时内|3小时内)/.test(text)) return 'plus_minus_3_hours';
  if (/(当天|当日)(任意时段|都行|都可以)?/.test(text)) return 'same_day';
  if (/(相近时间|前后|改一天|临近日期)/.test(text)) return 'date_flexible';
  return null;
}

function cleanConditions(source = {}) {
  const conditions = { ...source };
  delete conditions.resource;
  delete conditions.missingFields;
  if (conditions.hotelName || conditions.address) {
    if (conditions.adults === undefined || conditions.adults === null || conditions.adults === '') {
      conditions.adults = 1;
    }
    if (conditions.rooms === undefined || conditions.rooms === null || conditions.rooms === '') {
      conditions.rooms = 1;
    }
    if (conditions.scope === 'nearby' && !conditions.radiusMeters) {
      conditions.radiusMeters = 3000;
    }
  }
  return normalizeHotelDates(conditions);
}

function normalizeHotelDates(conditions) {
  if (!conditions.hotelName && !conditions.address) return conditions;

  const normalized = { ...conditions };
  for (const field of ['checkIn', 'checkOut']) {
    const value = normalized[field];
    if (typeof value !== 'string') continue;
    const text = value.trim();
    let month;
    let day;
    const chinese = text.match(/^(\d{1,2})月(\d{1,2})[日号]?$/);
    const numeric = text.match(/^(\d{1,2})[\/-](\d{1,2})$/);
    if (chinese) {
      month = Number(chinese[1]);
      day = Number(chinese[2]);
    } else if (numeric) {
      month = Number(numeric[1]);
      day = Number(numeric[2]);
    } else {
      continue;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    normalized[field] = `${new Date().getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    normalized[`${field}YearAssumed`] = true;
  }
  return normalized;
}

function getMissingReply(missingFields) {
  const labels = missingFields.map((field) => FIELD_LABELS[field] || field);
  return `还缺少${labels.join('、')}，补充后我再帮你查询。`;
}

function getConfirmationReply(resource, conditions) {
  const label = resource === 'hotel' ? '酒店' : '航班';
  const visible = Object.entries(conditions)
    .filter(([key, value]) => value !== undefined && value !== null && key !== 'rooms' && !key.endsWith('YearAssumed'))
    .map(([key, value]) => `${FIELD_LABELS[key] || key}：${value}`);
  if (resource === 'hotel') {
    if (conditions.rooms) visible.push(`房间数：${conditions.rooms}`);
    if (conditions.checkInYearAssumed || conditions.checkOutYearAssumed) {
      visible.push('年份未提供，按当前年份处理');
    }
    const referenceRoom = conditions.referenceRoomType || conditions.roomType;
    if (referenceRoom) {
      visible.push(`查询范围：优先核验${referenceRoom}；如果不可售，同时返回该酒店其他可售房型`);
    } else {
      visible.push('查询范围：核验该酒店目标日期的全部可售房型');
    }
  }
  return `我识别到这是一项${label}查询：${visible.join('；')}。确认后我再查询。`;
}

function getStatus(result) {
  return result?.status || 'tool-error';
}

function getFlightReply(result, formatters) {
  if (getStatus(result) === 'source-unconfirmed') {
    return formatters.formatSourceUnconfirmed?.('flight') || '当前无法核验航班信息。';
  }
  if (getStatus(result) === 'tool-error') return '航班查询暂时失败，请稍后重试。';
  if (getStatus(result) === 'exact-not-found') {
    return '没有找到出发时间和抵达时间完全匹配的航班。目前没有执行替代查询；你可以选择前后三小时内，或查当天任意时段，我再继续查。';
  }
  if (getStatus(result) === 'no-match') return '当前条件下没有匹配的航班。';
  if (formatters.formatFlightCandidatesV1) {
    return formatters.formatFlightCandidatesV1(result?.candidates || result || []);
  }
  return '已返回航班候选。';
}

function getHotelReply(result, formatters) {
  if (formatters.formatHotelAvailability) return formatters.formatHotelAvailability(result);
  if (getStatus(result) === 'source-unconfirmed') return '当前无法核验酒店房态。';
  if (getStatus(result) === 'tool-error') return '酒店查询暂时失败，请稍后重试。';
  if (getStatus(result) === 'no-match') return '目标日期没有可售房型。';
  return '已返回酒店候选。';
}

function getResultState(result, alternative) {
  const status = getStatus(result);
  if (status === 'available') return alternative ? 'alternative_available' : 'same_option_available';
  if (status === 'exact-not-found') return alternative ? 'alternative_search_requested' : 'same_option_unavailable';
  if (['no-match', 'room-unavailable', 'sold-out'].includes(status)) {
    return alternative ? 'alternative_search_requested' : 'same_option_unavailable';
  }
  if (status === 'source-unconfirmed') return 'source_unconfirmed';
  return 'tool_error';
}

function createToolCall(resource, query) {
  return {
    toolName: resource === 'hotel' ? 'hotel_search' : 'flight_search',
    query,
  };
}

function createHotelToolCalls(query, result) {
  if (!Array.isArray(result?.providers) || result.providers.length === 0) {
    return [createToolCall('hotel', query)];
  }
  return result.providers.map((provider) => ({
    ...createToolCall('hotel', query),
    provider: provider.id,
  }));
}

async function executeSearch(flow, resource, conditions, scope) {
  const {
    checkInYearAssumed: _checkInYearAssumed,
    checkOutYearAssumed: _checkOutYearAssumed,
    ...queryConditions
  } = conditions;
  const query = resource === 'hotel'
    ? (scope ? { ...queryConditions, scope } : { ...queryConditions })
    : (scope && scope !== 'same_option'
      ? { ...queryConditions, alternative_scope: scope }
      : { ...queryConditions });
  const rawResult = resource === 'hotel'
    ? await flow.hotelSearch(query)
    : await flow.flightSearch(query);
  const result = rawResult || { status: 'tool-error' };
  const toolCalls = resource === 'hotel'
    ? createHotelToolCalls(query, result)
    : [createToolCall(resource, query)];
  return { query, result, toolCalls };
}

function nextSession(session, resource, state, conditions) {
  return {
    ...session,
    resource,
    state,
    conditions,
  };
}

export function createTravelFlow({
  flightSearch,
  hotelSearch,
  formatters = {},
  logger = { append: () => {} },
} = {}) {
  if (
    typeof flightSearch !== 'function'
    || typeof hotelSearch !== 'function'
  ) {
    throw new TypeError('Travel flow requires flightSearch and a hotel search function');
  }
  return {
    flightSearch,
    hotelSearch,
    formatters,
    logger,
  };
}

export async function handleTravelTurn(flow, {
  sessionId,
  session = {},
  input = '',
  extracted,
  userConfirmation = false,
} = {}) {
  const text = String(input || '').trim();

  if (text === '/new') {
    return {
      session: nextSession(session, undefined, 'onboarding_shown', {}),
      reply: ONBOARDING_REPLY,
      toolCalls: [],
      state: 'onboarding_shown',
      visibleResults: [],
    };
  }

  if (isCancellation(text)) {
    return {
      session: nextSession(session, session.resource, 'user_cancelled', session.conditions || {}),
      reply: '好的，已停止本次查询。',
      toolCalls: [],
      state: 'user_cancelled',
      visibleResults: [],
    };
  }

  const extractedResource = extracted?.resource || session.resource;
  const resource = extractedResource === 'unknown' ? undefined : extractedResource;
  const conditions = cleanConditions({ ...(session.conditions || {}), ...(extracted || {}) });
  const missingFields = getEffectiveMissingFields(resource, extracted, session, conditions);

  if (missingFields.length > 0) {
    return {
      session: { ...nextSession(session, resource, 'missing_required_fields', conditions), missingFields },
      reply: getMissingReply(missingFields),
      toolCalls: [],
      state: 'missing_required_fields',
      visibleResults: [],
    };
  }

  const hasHotelInput = extracted && Object.keys(extracted).some((key) => [
    'hotelName', 'address', 'checkIn', 'checkOut', 'adults', 'rooms',
  ].includes(key));
  const shouldAutoQueryHotel = resource === 'hotel'
    && (session.state === 'missing_required_fields' || hasHotelInput);
  if (shouldAutoQueryHotel) {
    const { query, result, toolCalls } = await executeSearch(flow, resource, conditions, 'same_option');
    const state = getResultState(result, false);
    const reply = getHotelReply(result, flow.formatters);
    return {
      session: nextSession(session, resource, state, query),
      reply,
      toolCalls,
      state,
      visibleResults: result,
    };
  }

  const alternativeScope = ['same_option_available', 'same_option_unavailable', 'alternative_available'].includes(session.state)
    ? getAlternativeScope(text)
    : null;
  if (alternativeScope && resource) {
    const { query, result, toolCalls } = await executeSearch(flow, resource, conditions, alternativeScope);
    const state = getResultState(result, true);
    const reply = resource === 'hotel'
      ? getHotelReply(result, flow.formatters)
      : getFlightReply(result, flow.formatters);
    flow.logger.append?.({ sessionId, eventType: 'alternative_triggered', scope: alternativeScope });
    return {
      session: nextSession(session, resource, state, conditions),
      reply,
      toolCalls,
      state,
      visibleResults: result,
    };
  }

  if (resource && session.state === 'same_option_unavailable') {
    return {
      session: nextSession(session, resource, 'same_option_unavailable', conditions),
      reply: resource === 'flight'
        ? getFlightReply({ status: 'exact-not-found' }, flow.formatters)
        : getHotelReply({ status: 'no-match' }, flow.formatters),
      toolCalls: [],
      state: 'same_option_unavailable',
      visibleResults: [],
    };
  }

  if (userConfirmation === true) {
    if (!resource) {
      return {
        session: { ...session, state: 'missing_required_fields' },
        reply: '请先告诉我想查询机票还是酒店。',
        toolCalls: [],
        state: 'missing_required_fields',
        visibleResults: [],
      };
    }
    const { query, result, toolCalls } = await executeSearch(flow, resource, conditions, 'same_option');
    const state = getResultState(result, false);
    const reply = resource === 'hotel'
      ? getHotelReply(result, flow.formatters)
      : getFlightReply(result, flow.formatters);
    return {
      session: nextSession(session, resource, state, query),
      reply,
      toolCalls,
      state,
      visibleResults: result,
    };
  }

  if (resource) {
    return {
      session: nextSession(session, resource, 'awaiting_confirmation', conditions),
      reply: getConfirmationReply(resource, conditions),
      toolCalls: [],
      state: 'awaiting_confirmation',
      visibleResults: [],
    };
  }

  return {
    session: nextSession(session, undefined, 'missing_required_fields', conditions),
    reply: UNRECOGNIZED_INPUT_REPLY,
    toolCalls: [],
    state: 'missing_required_fields',
    visibleResults: [],
  };
}
