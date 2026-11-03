export function createSearchTask(combinations) {
  return {
    status: 'running',
    combinations: combinations.map((combination) => ({ ...combination })),
  };
}

export function getProgress(task) {
  return {
    total: task.combinations.length,
    completed: task.combinations.filter((item) => item.status === 'completed').length,
    running: task.combinations.filter((item) => item.status === 'running').length,
    stopped: task.status === 'stopped',
  };
}

export function stopSearchTask(task) {
  task.status = 'stopped';
}

export function canStartNextCall(task) {
  return task.status !== 'stopped';
}
