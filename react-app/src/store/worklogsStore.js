import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import {
  findScopedItem,
  getDescriptionTaskCode,
  normalizeServiceScope,
} from "../helpers/matchWorklogTasks.js";
import { applyRedminePrefixMappings } from "../helpers/redminePrefixMappings.js";

const initialState = {
  workLogs: null,
  isJiraExport: false,
  isClickUpExport: false,
};

const useWorkLogsStore = create((set, get) => ({
  workLogs: null,
  isJiraExport: false,
  isClickUpExport: false,
  addWorkLogs: (workLogs) => set({ workLogs }),
  resetWorkLogs: () => set({ workLogs: null }),
  addWorkLog: (date, data) => {
    set((state) => {
      const oldState = { ...state.workLogs };
      const newWorkLog = { id: uuidv4(), ...data };
      if (!oldState[date]) {
        oldState[date] = [];
      }
      oldState[date].push(newWorkLog);

      return { workLogs: oldState };
    });
  },
  updateWorkLog: (date, id, updatedData) => {
    set(() => {
      let oldState;

      if (date !== updatedData.date) {
        get().deleteWorkLog(date, id);
        get().addWorkLog(updatedData.date, updatedData);
      } else {
        oldState = { ...get().workLogs };

        oldState[date] = oldState[date].map((workLog) =>
          workLog.id === id ? { ...workLog, ...updatedData } : workLog
        );
      }

      return { workLogs: oldState || get().workLogs };
    });
  },
  deleteWorkLog: (date, id) => {
    set((state) => {
      const oldState = { ...state.workLogs };
      oldState[date] = oldState[date].filter((workLog) => workLog.id !== id);

      if (oldState[date].length === 0) {
        delete oldState[date];
      }

      return { workLogs: oldState };
    });
  },
  addBulkWorkLogProject: (projectId) => {
    set((state) => {
      const oldState = { ...state.workLogs };
      const dates = Object.keys(oldState);
      dates.forEach((date) => {
        oldState[date] = oldState[date].map((workLog) => ({
          ...workLog,
          project: projectId,
        }));
      });

      return { workLogs: oldState };
    });
  },
  applyRedminePrefixMappings: (mappings, allowedIssueIds, options) => {
    let result;
    set((state) => {
      result = applyRedminePrefixMappings(
        state.workLogs,
        mappings,
        allowedIssueIds,
        options
      );
      return result.workLogs === state.workLogs
        ? state
        : { workLogs: result.workLogs };
    });
    return result;
  },
  bulkUpdateWorkLogsWithJira: (jiraIssues, defaultJiraUrl = "") => {
    set((state) => {
      const oldState = { ...state.workLogs };

      let updatedWorkLogs = [];

      Object.keys(oldState).forEach((date) => {
        oldState[date] = oldState[date].map((workLog) => {
          const taskIdentifier = getDescriptionTaskCode(
            workLog.description,
            false
          );
          const jiraScope = normalizeServiceScope(
            workLog.jiraUrl || defaultJiraUrl
          );
          const matchingIssue =
            jiraScope &&
            findScopedItem(jiraIssues, taskIdentifier, jiraScope, (issue) =>
              normalizeServiceScope(issue.jiraUrl)
            );

          if (matchingIssue) {
            updatedWorkLogs.push(workLog.description);
            return {
              ...workLog,
              jiraUrl: normalizeServiceScope(matchingIssue.jiraUrl),
              task: matchingIssue.key,
            };
          }
          return workLog;
        });
      });

      if (updatedWorkLogs.length > 0) {
        toast.success(
          `${updatedWorkLogs.length} worklog(s) successfully updated.`,
          {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          }
        );
      } else {
        toast.info("No worklogs were updated.", {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }

      return { workLogs: oldState };
    });
  },
  setIsJiraExport: (isJiraExport) => set({ isJiraExport }),
  setIsClickUpExport: (isClickUpExport) => set({ isClickUpExport }),
  bulkUpdateWorkLogsWithClickUp: (clickUpTasks, defaultTeamId = null) => {
    set((state) => {
      const oldState = { ...state.workLogs };

      let updatedWorkLogs = [];

      Object.keys(oldState).forEach((date) => {
        oldState[date] = oldState[date].map((workLog) => {
          const taskIdentifier = getDescriptionTaskCode(workLog.description);
          const teamScope = workLog.clickupTeamId || defaultTeamId;
          const matchingTask =
            teamScope &&
            findScopedItem(
              clickUpTasks,
              taskIdentifier,
              teamScope,
              (task) => task.teamId
            );

          if (matchingTask) {
            updatedWorkLogs.push(workLog.description);
            return {
              ...workLog,
              clickupTeamId: matchingTask.teamId,
              clickupTask: matchingTask.id,
            };
          }
          return workLog;
        });
      });

      if (updatedWorkLogs.length > 0) {
        toast.success(
          `${updatedWorkLogs.length} worklog(s) successfully updated.`,
          {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          }
        );
      } else {
        toast.info("No worklogs were updated.", {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }

      return { workLogs: oldState };
    });
  },
  resetAll: () => set({ ...initialState }),
}));

export default useWorkLogsStore;
