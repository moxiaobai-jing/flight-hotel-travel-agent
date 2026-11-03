const EVENT_TYPES = new Set([
  'onboarding_shown',
  'input_received',
  'fields_extracted',
  'conditions_confirmed',
  'tool_invoked',
  'tool_result_received',
  'response_rendered',
  'alternative_triggered',
  'user_link_opened',
  'user_outcome',
  'safety_decision',
]);

const SENSITIVE_KEY_PATTERN = /(raw(text|input|prompt|message)|payment|card(number)?|password|secret|token|身份证|护照|银行卡|信用卡|cvv)/i;
const SENSITIVE_VALUE_PATTERN = /(身份证号|护照号|银行卡号|信用卡号|支付密码|安全码|CVV)/i;

function assertSafeValue(value, path) {
  if (typeof value === 'string' && SENSITIVE_VALUE_PATTERN.test(value)) {
    throw new Error(`日志包含敏感字段：${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeValue(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        throw new Error(`日志包含敏感字段：${path}.${key}`);
      }
      assertSafeValue(nested, `${path}.${key}`);
    }
  }
}

export function createTravelEventLog({ clock = () => new Date().toISOString() } = {}) {
  return { events: [], clock };
}

export function appendTravelEvent(log, event = {}) {
  if (!log || !Array.isArray(log.events) || typeof log.clock !== 'function') {
    throw new TypeError('无效的旅行事件日志');
  }
  if (!event.sessionId) throw new Error('日志缺少 sessionId');
  if (!EVENT_TYPES.has(event.eventType)) {
    throw new Error(`不支持的事件类型：${event.eventType}`);
  }

  assertSafeValue(event, 'event');
  const record = {
    ...event,
    occurredAt: log.clock(),
  };
  log.events.push(record);
  return record;
}

export function listTravelEvents(log, sessionId) {
  if (!log || !Array.isArray(log.events)) return [];
  return log.events
    .filter((event) => event.sessionId === sessionId)
    .map((event) => ({ ...event }));
}
