export function createConfirmedConditions(conditions) {
  return {
    version: 1,
    confirmed: true,
    conditions: { ...conditions },
  };
}

export function updateConditions(state, changes) {
  return {
    version: state.version + 1,
    confirmed: false,
    conditions: { ...state.conditions, ...changes },
  };
}

export function confirmConditions(state) {
  state.confirmed = true;
}

export function canStartSearch(state) {
  if (!state?.confirmed) {
    return false;
  }

  const conditions = state.conditions ?? {};
  const hasDestination = nonEmpty(conditions.destination);
  const hasOrigins = Array.isArray(conditions.origins)
    ? conditions.origins.some(nonEmpty)
    : nonEmpty(conditions.origin);
  const hasDate = nonEmpty(conditions.date) || hasDateRange(conditions.dateRange);

  return hasDestination && hasOrigins && hasDate;
}

function nonEmpty(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function hasDateRange(value) {
  return Boolean(value)
    && nonEmpty(value.start)
    && nonEmpty(value.end);
}
