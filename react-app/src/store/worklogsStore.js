import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";

const initialState = {
  workLogs: null,
  isJiraExport: false,
};

const useWorkLogsStore = create((set, get) => ({
  workLogs: null,
  isJiraExport: false,
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
  bulkUpdateWorkLogsWithJira: (jiraIssues) => {
    set((state) => {
      const oldState = { ...state.workLogs };

      let updatedWorkLogs = [];

      Object.keys(oldState).forEach((date) => {
        oldState[date] = oldState[date].map((workLog) => {
          const taskIdentifier = workLog.description.split(":")[0].trim();
          const matchingIssue = jiraIssues.find(
            (issue) => issue.key === taskIdentifier
          );

          if (matchingIssue) {
            updatedWorkLogs.push(workLog.description);
            return {
              ...workLog,
              jiraUrl: matchingIssue.jiraUrl,
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
  resetAll: () => set({ ...initialState }),
}));

export default useWorkLogsStore;
