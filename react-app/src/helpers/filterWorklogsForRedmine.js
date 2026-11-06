import { isSentTo } from "./sentMarks.js";

export const canSendToRedmine = (worklog) => Boolean(worklog?.project);

// Redmine logs only cards that have a Redmine project and were not sent to it
// before; the rest are skipped.
export const filterWorklogsForRedmine = (worklogs) => {
  const filteredWorklogs = {};

  for (const date in worklogs) {
    const worklogsForDate = worklogs[date];
    if (!Array.isArray(worklogsForDate)) continue;
    const filteredWorklogsForDate = worklogsForDate.filter(
      (worklog) => canSendToRedmine(worklog) && !isSentTo(worklog, "redmine")
    );

    if (filteredWorklogsForDate.length > 0) {
      filteredWorklogs[date] = filteredWorklogsForDate;
    }
  }

  return filteredWorklogs;
};
