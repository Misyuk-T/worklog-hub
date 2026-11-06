// Redmine logs only cards that have a Redmine project; the rest are skipped.
export const filterWorklogsForRedmine = (worklogs) => {
  const filteredWorklogs = {};

  for (const date in worklogs) {
    const worklogsForDate = worklogs[date];
    if (!Array.isArray(worklogsForDate)) continue;
    const filteredWorklogsForDate = worklogsForDate.filter(
      (worklog) => worklog?.project
    );

    if (filteredWorklogsForDate.length > 0) {
      filteredWorklogs[date] = filteredWorklogsForDate;
    }
  }

  return filteredWorklogs;
};
