import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import {
  findScopedItem,
  getDescriptionTaskCode,
  normalizeServiceScope,
  pickJiraIssue,
} from "../helpers/matchWorklogTasks.js";
import { applyRedminePrefixMappings } from "../helpers/redminePrefixMappings.js";

import { moveDayWorkLogs } from "../helpers/moveDayWorkLogs.js";
import { ensureWorkLogIds } from "../helpers/ensureWorkLogIds.js";
import { clearSent, markSent } from "../helpers/sentMarks.js";

const initialState = {
  workLogs: null,
  isJiraExport: false,
  isClickUpExport: false,
};

const useWorkLogsStore = create((set, get) => ({
  workLogs: null,
  isJiraExport: false,
  isClickUpExport: false,
  addWorkLogs: (workLogs) => set({ workLogs: ensureWorkLogIds(workLogs) }),
  moveDayWorkLogs: (fromDate, toDate) =>
    set((state) => ({ workLogs: moveDayWorkLogs(state.workLogs, fromDate, toDate) })),
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
  // Marks change only through markCardsSent / clearCardSent, so an edit made
  // from a stale card never brings back or drops a mark.
  markCardsSent: (service, cardIds) =>
    set((state) => {
      const workLogs = markSent(state.workLogs, service, cardIds);
      return workLogs === state.workLogs ? state : { workLogs };
    }),
  clearCardSent: (service, cardId) =>
    set((state) => {
      const workLogs = clearSent(state.workLogs, service, cardId);
      return workLogs === state.workLogs ? state : { workLogs };
    }),
  updateWorkLog: (date, id, edited) => {
    const current = (get().workLogs?.[date] || []).find((card) => card.id === id);
    const updatedData = { ...edited };
    if (current?.sentTo) updatedData.sentTo = current.sentTo;
    else delete updatedData.sentTo;
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
          const matchingIssue = pickJiraIssue(
            jiraIssues,
            taskIdentifier,
            workLog.jiraUrl,
            defaultJiraUrl
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
