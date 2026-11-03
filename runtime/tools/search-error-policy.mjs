const retryableStatuses = new Set(['timeout', 'rate-limited', 'failed']);
const statusMessages = {
  completed: '这部分查询已完成。',
  timeout: '这部分还没查完，可以重试未完成的组合。',
  'rate-limited': '这部分查询受到限流，可以稍后重试。',
  'no-match': '没有找到符合条件的方案，可以修改条件后重新搜索。',
  failed: '这部分查询失败，可以重试未完成的组合。',
};

export function classifySearchOutcome(result) {
  if (statusMessages[result.status]) return result.status;
  return 'failed';
}

export function retryableCombinations(combinations, maxRetries = 3) {
  return combinations.filter(
    (combination) => retryableStatuses.has(combination.status)
      && (combination.retryCount ?? 0) < maxRetries,
  );
}

export function describeSearchOutcome(result) {
  if (result.status === 'failed' && (result.retryCount ?? 0) >= 3) {
    return '这部分查询失败，已达到重试上限。可以修改条件后重新搜索。';
  }
  return statusMessages[classifySearchOutcome(result)];
}
