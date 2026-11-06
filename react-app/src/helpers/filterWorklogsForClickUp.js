import { isSentTo } from "./sentMarks.js";

export const canSendToClickUp = (worklog, defaultTeamId) =>
  Boolean(worklog?.clickupTask && (worklog.clickupTeamId || defaultTeamId));

// ClickUp logs only cards with a task and a team that were not sent to
// ClickUp before.
export const filterWorklogsForClickUp = (worklogs, defaultTeamId) => {
  const filteredWorklogs = {};

  for (const date in worklogs) {
    const worklogsForDate = worklogs[date];
    if (!Array.isArray(worklogsForDate)) continue;
    const filteredWorklogsForDate = worklogsForDate.filter(
      (worklog) =>
        canSendToClickUp(worklog, defaultTeamId) && !isSentTo(worklog, "clickup")
    );

    if (filteredWorklogsForDate.length > 0) {
      filteredWorklogs[date] = filteredWorklogsForDate.map((worklog) => ({
        ...worklog,
        task: worklog.clickupTask,
        teamId: worklog.clickupTeamId || defaultTeamId,
      }));
    }
  }

  return filteredWorklogs;
};
