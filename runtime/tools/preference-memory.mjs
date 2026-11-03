export function createPreferenceMemory() {
  return {};
}

export function savePreference(memory, preference, authorized) {
  if (!authorized) return { saved: false };
  memory[preference.key] = preference.value;
  return { saved: true };
}

export function getEffectivePreference(memory, key, currentValue) {
  return currentValue ?? memory[key];
}

export function deletePreference(memory, key) {
  delete memory[key];
}
