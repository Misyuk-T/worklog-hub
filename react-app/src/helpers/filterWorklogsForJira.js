import { isSentTo } from "./sentMarks.js";

export const canSendToJira = (worklog) => Boolean(worklog?.task);

// Jira logs only cards with an issue that were not sent to Jira before.
export const filterWorklogsByTask = (worklogs) => {
  const filteredWorklogs = {};

  for (const date in worklogs) {
    const worklogsForDate = worklogs[date];
    if (!Array.isArray(worklogsForDate)) continue;
    const filteredWorklogsForDate = worklogsForDate.filter(
      (worklog) => canSendToJira(worklog) && !isSentTo(worklog, "jira")
    );

    if (filteredWorklogsForDate.length > 0) {
      filteredWorklogs[date] = filteredWorklogsForDate;
    }
  }

  return filteredWorklogs;
};
