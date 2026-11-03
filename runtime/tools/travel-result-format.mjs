function formatPrice(price) {
  if (typeof price === 'number') return `¥${price}`;
  if (typeof price === 'string' && price.trim() !== '') {
    return price.startsWith('¥') ? price : `¥${price}`;
  }
  return '价格待核验';
}

function formatHotelName(hotel) {
  if (typeof hotel === 'string') return hotel;
  return hotel?.hotelName || hotel?.name || '酒店';
}

function formatDetailLink(label, detailUrl) {
  return detailUrl ? `[${label}](${detailUrl})` : `暂无${label}`;
}

/**
 * 严格复用 V1.0 的逐候选航班文本格式。
 * 额外的来源、查询时间、行李等字段不会进入用户可见文本。
 */
export function formatFlightCandidateV1(candidate) {
  const direct = candidate.direct === true ? '是' : '否';
  return [
    `候选 ${candidate.index}｜${candidate.airline} ${candidate.flightNumber}｜¥${candidate.price}`,
    `${candidate.date}（${candidate.weekday}）｜${candidate.origin} → ${candidate.destination}`,
    `出发：${candidate.departureTime}   抵达：${candidate.arrivalTime}`,
    `飞行时长：${candidate.flightDuration}   总耗时：${candidate.totalDuration}   直达：${direct}`,
    formatDetailLink('点击详情', candidate.detailUrl),
  ].join('\n');
}

export function formatFlightCandidatesV1(candidates = []) {
  return candidates.map(formatFlightCandidateV1).join('\n\n');
}

/**
 * 将酒店房态结果格式化为结构化文字，不改变工具返回的房型和价格事实。
 */
export function formatHotelAvailability(result = {}) {
  const hotelName = formatHotelName(result.hotel);
  const lines = [`酒店：${hotelName}`];
  const hotel = typeof result.hotel === 'object' && result.hotel !== null ? result.hotel : {};
  const hasProviderSummary = result.multiProvider === true && Boolean(result.summary);

  if (hotel.description) lines.push(`酒店特点：${hotel.description}`);
  if (hotel.address) lines.push(`地址：${hotel.address}`);
  if (hotel.rating) lines.push(`评分：${hotel.rating}`);
  if (hotel.reviewSummary) lines.push(`评价参考：${hotel.reviewSummary}`);
  if (result.source) lines.push(`来源：${result.source}`);
  if (result.queriedAt) lines.push(`查询时间：${result.queriedAt}`);
  if (result.summary) lines.push(`供应商状态：${result.summary}`);
  if (result.referenceRoomType) {
    const referenceStatus = result.referenceRoomAvailable === true
      ? '有房'
      : result.referenceRoomAvailable === false
        ? '不可售'
        : '状态待核验';
    lines.push(`参考房型：${result.referenceRoomType}｜${referenceStatus}`);
  }

  if (result.status === 'available') {
    lines.push('房态：有房');
    const rooms = Array.isArray(result.rooms) ? result.rooms : [];
    if (rooms.length === 0) {
      const alternatives = Array.isArray(result.alternatives) ? result.alternatives : [];
      if (alternatives.length > 0) {
        lines.push('附近替代：');
        alternatives.forEach((alternative) => {
          const details = [
            alternative.hotelName || alternative.hotel_name || alternative.name || '未标注酒店',
          ];
          if (alternative.hotelNameEn || alternative.hotel_name_en || alternative.nameEn) {
            details.push(alternative.hotelNameEn || alternative.hotel_name_en || alternative.nameEn);
          }
          if (alternative.address) details.push(`地址：${alternative.address}`);
          if (alternative.distance) details.push(`距离：${alternative.distance}`);
          if (typeof alternative.distanceMeters === 'number') details.push(`距离：${Math.round(alternative.distanceMeters)}米`);
          if (typeof alternative.distance_meters === 'number') details.push(`距离：${Math.round(alternative.distance_meters)}米`);
          if (alternative.price !== undefined) details.push(formatPrice(alternative.price));
          if (alternative.roomName || alternative.room_name) details.push(`房型：${alternative.roomName || alternative.room_name}`);
          if (alternative.meal) details.push(`餐食：${alternative.meal}`);
          if (alternative.cancellation) details.push(`取消：${alternative.cancellation}`);
          details.push(formatDetailLink('查看详情', alternative.detailUrl));
          lines.push(details.join('｜'));
        });
      } else {
        lines.push('当前未返回可入住的房型详情');
      }
    } else {
      rooms.forEach((room) => {
        const roomName = room.name || room.roomName || '未标注房型';
        const details = [`房型：${roomName}`, formatPrice(room.price)];
        if (room.provider) details.push(`供应商：${room.provider}`);
        if (room.bedType) details.push(`床型：${room.bedType}`);
        if (room.area) details.push(`面积：${room.area}`);
        if (room.breakfast) details.push(`餐食：${room.breakfast}`);
        if (room.cancellation) details.push(`取消：${room.cancellation}`);
        details.push(formatDetailLink('查看详情', room.detailUrl));
        lines.push(details.join('｜'));
      });
    }
  } else if (result.status === 'no-match') {
    if (!hasProviderSummary) lines.push(result.reason === 'room-unavailable'
      ? '房态：指定房型不可售'
      : '房态：目标日期售罄');
  } else if (result.status === 'room-unavailable') {
    if (!hasProviderSummary) lines.push('房态：指定房型不可售');
  } else if (result.status === 'sold-out') {
    if (!hasProviderSummary) lines.push('房态：目标日期售罄');
  } else if (result.status === 'source-unconfirmed') {
    if (!hasProviderSummary) lines.push('房态：当前无法核验房态');
  } else if (result.status === 'tool-error') {
    if (!hasProviderSummary) lines.push('房态：查询失败，暂无法核验');
  } else if (result.status === 'quote-or-link-invalid') {
    lines.push('房态：报价或详情链接已失效，需要重新核验');
  } else {
    lines.push('房态：当前无法核验房态');
  }

  return lines.join('\n');
}

export function formatSourceUnconfirmed(resource) {
  if (resource === 'flight') {
    return '当前无法核验航班票价或余票，暂不能判断是否可购买。';
  }
  if (resource === 'hotel') {
    return '当前无法核验酒店房态，暂不能判断是否有房。';
  }
  return '当前无法核验相关信息，暂不能给出可购买结论。';
}
