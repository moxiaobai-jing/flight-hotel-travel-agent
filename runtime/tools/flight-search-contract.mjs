const keyOf = ({ destination, origin, date }) => `${destination}|${origin}|${date}`;

export function createControlledSearch({ resultsByCombination }) {
  return async function search(combinations) {
    for (const combination of combinations) {
      if (!combination.destination) throw new Error('目的地不能为空');
      if (!combination.origin) throw new Error('出发地不能为空');
      if (!combination.date) throw new Error('日期不能为空');
    }

    const normalized = combinations.map((combination) => {
      const result = resultsByCombination[keyOf(combination)] ?? {
        status: 'no-match',
        candidates: [],
      };
      return {
        ...combination,
        status: result.status,
        candidates: result.candidates,
      };
    });

    return {
      demoData: true,
      combinations: normalized,
    };
  };
}

export function summarizeSearch(result) {
  return result.combinations.reduce(
    (summary, combination) => ({
      ...summary,
      total: summary.total + 1,
      [combination.status]: (summary[combination.status] ?? 0) + 1,
    }),
    { total: 0 },
  );
}

export function selectCandidates(result, { limit = 10, sortBy = 'price' } = {}) {
  const unique = new Map();
  for (const combination of result.combinations) {
    if (combination.status !== 'completed') continue;
    for (const candidate of combination.candidates) {
      if (!unique.has(candidate.id)) unique.set(candidate.id, candidate);
    }
  }

  return [...unique.values()]
    .sort((left, right) => {
      if (sortBy === 'duration') return left.durationHours - right.durationHours;
      return left.price - right.price;
    })
    .slice(0, limit);
}
