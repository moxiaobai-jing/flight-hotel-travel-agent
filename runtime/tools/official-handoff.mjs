export function createHandoffIndex(candidates) {
  return new Map(candidates.map((candidate) => [candidate.id, candidate.officialUrl]));
}

export function openCandidate(index, candidateId) {
  const url = index.get(candidateId);
  if (!url) throw new Error(`找不到对应候选：${candidateId}`);
  return { candidateId, url };
}

export function resumeSearch(previous) {
  return {
    round: previous.round + 1,
    conditions: structuredClone(previous.conditions),
    candidates: [],
    completed: 0,
  };
}

export function formatResumeMessage(conditions) {
  const origins = conditions.origins.join('、');
  return `好的，我会按原来的条件重新查询：${origins} → ${conditions.destination}，${conditions.date}。`;
}
