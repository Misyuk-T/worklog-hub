export const filterWorklogsForClickUp = (worklogs, defaultTeamId) => {
  const filteredWorklogs = {};

  for (const date in worklogs) {
    const worklogsForDate = worklogs[date];
    const filteredWorklogsForDate = worklogsForDate.filter(
      (worklog) => worklog.clickupTask && (worklog.clickupTeamId || defaultTeamId)
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
