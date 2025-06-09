export const filterWorklogsByTask = (worklogs) => {
  const filteredWorklogs = {};

  for (const date in worklogs) {
    const worklogsForDate = worklogs[date];
    const filteredWorklogsForDate = worklogsForDate.filter(
      (worklog) => worklog.task !== ""
    );

    if (filteredWorklogsForDate.length > 0) {
      filteredWorklogs[date] = filteredWorklogsForDate;
    }
  }

  return filteredWorklogs;
};
