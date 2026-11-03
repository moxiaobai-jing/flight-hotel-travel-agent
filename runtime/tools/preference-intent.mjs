function preferenceValue(text) {
  if (/(时间|时长|快一点|耗时)/.test(text)) return 'duration';
  if (/(价格|便宜|省钱|低价)/.test(text)) return 'price';
  return undefined;
}

export function detectPreferenceIntent(text) {
  const value = preferenceValue(text);
  if (!value) return { intent: 'none', key: 'sort', value };

  if (/(不要再记住|删掉|删除|取消).*(价格|便宜|省钱|低价|时间|时长)|取消.*(价格|时间)/.test(text)) {
    return { intent: 'delete', key: 'sort', value };
  }

  if (/(记住|保存|设为.*默认|默认按|下次也按照|以后.*(都|也|默认))/.test(text)) {
    return { intent: 'save', key: 'sort', value };
  }

  if (/(这次|本次|今天)/.test(text)) return { intent: 'none', key: 'sort', value };
  return { intent: 'ask', key: 'sort', value };
}
