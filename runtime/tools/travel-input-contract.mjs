const FLIGHT_REQUIRED_FIELDS = [
  'origin',
  'destination',
  'date',
  'departureTime',
  'arrivalTime',
];

const HOTEL_REQUIRED_FIELDS = ['checkIn', 'checkOut'];

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function containsAny(text, candidates) {
  return candidates.some((candidate) => text.includes(candidate));
}

/**
 * 将用户输入归类为模糊意向或参考材料，并给出粗粒度资源类型。
 * 不在这里执行 OCR、LLM 调用或任何外部查询。
 */
export function classifyTravelInput({ text = '', attachments = [], links = [] } = {}) {
  const normalizedText = String(text);
  const hasReferenceMaterial = attachments.length > 0
    || links.length > 0
    || containsAny(normalizedText, ['截图', '图片', '照片', '链接', '订单', '这张', '这个航班', '这个酒店']);

  let resource = 'unknown';
  if (containsAny(normalizedText, ['机票', '航班', '飞机', '起飞', '抵达', '机场'])) {
    resource = 'flight';
  } else if (containsAny(normalizedText, ['酒店', '住宿', '入住', '离店', '房型', '房间'])) {
    resource = 'hotel';
  }

  return {
    mode: hasReferenceMaterial ? 'reference_material' : 'vague_intent',
    resource,
  };
}

/**
 * 归一化上层已经抽取出的航班参考信息。
 * 乘客人数、儿童人数、座位和行李不属于本契约的必要字段。
 */
export function normalizeFlightReference(extracted = {}) {
  const normalized = {
    flightNumber: extracted.flightNumber,
    airline: extracted.airline,
    origin: extracted.origin,
    destination: extracted.destination,
    date: extracted.date,
    departureTime: extracted.departureTime,
    arrivalTime: extracted.arrivalTime,
    duration: extracted.duration,
    totalDuration: extracted.totalDuration,
    direct: extracted.direct,
  };

  return {
    ...normalized,
    missingFields: getMissingRequiredFields('flight', normalized),
  };
}

/**
 * 归一化上层已经抽取出的酒店查询条件。
 * 房间数默认一间，入住成人数默认一位。
 */
export function normalizeHotelQuery({
  hotelName,
  hotelAliases,
  address,
  checkIn,
  checkOut,
  adults,
  rooms,
} = {}) {
  const normalized = {
    hotelName,
    hotelAliases: Array.isArray(hotelAliases)
      ? hotelAliases.filter((alias) => hasValue(alias)).map((alias) => String(alias).trim())
      : [],
    address,
    checkIn,
    checkOut,
    adults: hasValue(adults) ? adults : 1,
    rooms: hasValue(rooms) ? rooms : 1,
  };

  return {
    ...normalized,
    missingFields: getMissingRequiredFields('hotel', normalized),
  };
}

/**
 * 返回指定资源仍缺失的必要字段。
 */
export function getMissingRequiredFields(resource, normalized = {}) {
  if (resource === 'flight') {
    return FLIGHT_REQUIRED_FIELDS.filter((field) => !hasValue(normalized[field]));
  }

  if (resource === 'hotel') {
    const missing = [];
    if (!hasValue(normalized.hotelName) && !hasValue(normalized.address)) {
      missing.push('hotelNameOrAddress');
    }
    missing.push(...HOTEL_REQUIRED_FIELDS.filter((field) => !hasValue(normalized[field])));
    return missing;
  }

  return [];
}
