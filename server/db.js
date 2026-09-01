/**
 * json-server database factory.
 *
 * Derives the `users` and `activities` collections from the committed task
 * fixtures so `generate-data.js` stays the single source of truth. Because the
 * source is a JS module, json-server keeps the database in memory: writes
 * behave like a real API but the fixtures on disk are never mutated.
 */

const tasksFixture = require('../data-fetching/tasks.json');
const statisticsFixture = require('../data-fetching/statistics.json');

const AVATAR_COLORS = ['#1976D2', '#7B1FA2', '#00897B', '#EF6C00', '#C2185B', '#455A64'];

/** Distinct assignees found on the tasks, in first-seen order. */
function deriveUsers(tasks) {
  const byId = new Map();

  for (const task of tasks) {
    const assignee = task.assignee;
    if (!assignee || byId.has(assignee.id)) {
      continue;
    }
    byId.set(assignee.id, {
      id: assignee.id,
      name: assignee.name,
      avatar: assignee.avatar,
      email: assignee.email,
      color: AVATAR_COLORS[byId.size % AVATAR_COLORS.length],
    });
  }

  return [...byId.values()];
}

function seedMessage(task) {
  switch (task.status) {
    case 'done':
      return `completed "${task.title}"`;
    case 'in_progress':
      return `moved "${task.title}" to In Progress`;
    default:
      return `updated "${task.title}"`;
  }
}

function seedType(task) {
  if (task.status === 'done') {
    return 'completed';
  }
  return task.status === 'in_progress' ? 'status_changed' : 'updated';
}

/** Seeds the activity feed from the eight most recently updated tasks. */
function deriveActivities(tasks) {
  return [...tasks]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 8)
    .map((task, index) => ({
      id: `activity-${String(index + 1).padStart(3, '0')}`,
      type: seedType(task),
      taskId: task.id,
      taskTitle: task.title,
      userId: task.assignee.id,
      userName: task.assignee.name,
      userAvatar: task.assignee.avatar,
      message: seedMessage(task),
      timestamp: task.updatedAt,
    }));
}

module.exports = () => {
  const tasks = tasksFixture.tasks;

  return {
    tasks,
    users: deriveUsers(tasks),
    activities: deriveActivities(tasks),
    statistics: statisticsFixture.statistics,
    meta: { ...tasksFixture.meta, statisticsLastUpdated: statisticsFixture.lastUpdated },
  };
};
