export const filterWorklogsForClickUp = (worklogs) => {
  const filteredWorklogs = {};

  for (const date in worklogs) {
    const worklogsForDate = worklogs[date];
    const filteredWorklogsForDate = worklogsForDate.filter(
      (worklog) => worklog.clickupTask && worklog.clickupTeamId
    );

    if (filteredWorklogsForDate.length > 0) {
      filteredWorklogs[date] = filteredWorklogsForDate.map((worklog) => ({
        ...worklog,
        task: worklog.clickupTask,
        teamId: worklog.clickupTeamId,
      }));
    }
  }

  return filteredWorklogs;
};
