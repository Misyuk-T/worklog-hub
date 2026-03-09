export const getProjectValue = (projectId, projects) => {
  if (!projects || !projectId) {
    return {
      value: 0,
      label: "undefined",
    };
  }

  const project = projects.find((item) => item.id === projectId);

  return {
    value: project.id,
    label: `${project.projectName}  #${project.id} ${project.subject}`,
  };
};

export const transformToProjectData = (projects) => {
  return [...projects].map((item) => {
    return {
      value: item.id,
      label: `${item.projectName}  #${item.id} ${item.subject}`,
    };
  });
};

export const getIssueValue = (issueKey, issues) => {
  if (!issues || !issueKey) {
    return {
      value: 0,
      label: "undefined",
    };
  }

  const issue = issues.find((item) => item.key === issueKey);
  const issueTask = issue?.key || issueKey;
  const issueSummary = issue?.summary || "Currently untracked task";

  return {
    value: issueTask,
    label: `${issueTask} - ${issueSummary}`,
  };
};

export const transformToIssueData = (issues) => {
  return issues.map((issue) => ({
    value: issue.key,
    label: `${issue.key} - ${issue.summary}`,
  }));
};

export const getClickUpTaskValue = (taskId, tasks) => {
  if (!tasks || !taskId) {
    return {
      value: 0,
      label: "undefined",
    };
  }

  const task = tasks.find((item) => item.id === taskId);
  const taskKey = task?.key || taskId;
  const taskName = task?.summary || "Currently untracked task";

  return {
    value: taskId,
    label: `${taskKey} - ${taskName}`,
  };
};

export const transformToClickUpTaskData = (tasks) => {
  return tasks.map((task) => ({
    value: task.id,
    label: `${task.key} - ${task.summary}`,
  }));
};
