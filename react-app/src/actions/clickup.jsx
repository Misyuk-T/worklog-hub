import { Stack, Text } from "@chakra-ui/react";
import { toast } from "react-toastify";
import { endOfDay, format, parse, startOfDay } from "date-fns";

import { instance } from "./axios";
import groupByField from "../helpers/groupByField";
import { validateWorkLogsData } from "../helpers/validateWorklogsData";
import useClickUpStore from "../store/clickupStore";

export const clickupLogin = async () => {
  try {
    const response = await instance.get("/clickup/user");

    toast.success(
      <Stack>
        <Text fontWeight={600}>Successfully connected to ClickUp</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      },
    );

    return response.data.user;
  } catch (error) {
    console.error("Login failed for ClickUp:", error);
    toast.error(
      <Stack>
        <Text fontWeight={600}>Failed to connect to ClickUp</Text>
        <Text>{error.message}</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      },
    );
    return null;
  }
};

export const getClickUpTeams = async () => {
  try {
    const response = await instance.get("/clickup/team");
    return response.data.teams;
  } catch (error) {
    console.error("Error while fetching ClickUp teams:", error);
    toast.error(
      <Stack>
        <Text fontWeight={600}>Failed to fetch ClickUp teams</Text>
        <Text>{error.message}</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      },
    );
    return [];
  }
};

export const getClickUpTimeEntries = async (
  teamId,
  startDate,
  endDate,
  userId,
  showToast = true,
) => {
  try {
    // Local day boundaries of the requested range. ClickUp stores entry starts
    // as absolute timestamps, so we bucket/compare in local time to match how
    // the user sees them (e.g. 00:00 EEST belongs to that local day even though
    // its UTC instant is the previous day at 21:00).
    const windowStart = startOfDay(
      parse(startDate, "yyyy-MM-dd", new Date()),
    ).getTime();
    const windowEnd = endOfDay(
      parse(endDate, "yyyy-MM-dd", new Date()),
    ).getTime();

    // Query with a ±1 day margin: ClickUp's start_date/end_date filtering can
    // drop entries that sit exactly on the boundary, so we fetch a little wider
    // and trim precisely below with an inclusive local-time comparison.
    const DAY_MS = 24 * 60 * 60 * 1000;

    const response = await instance.get(
      `/clickup/team/${teamId}/time_entries`,
      {
        params: {
          start_date: windowStart - DAY_MS,
          end_date: windowEnd + DAY_MS,
          assignee: userId,
        },
      },
    );

    const timeEntries = (response.data.data || []).filter((entry) => {
      const start =
        typeof entry.start === "string"
          ? parseInt(entry.start, 10)
          : entry.start;
      return start >= windowStart && start <= windowEnd;
    });

    const parsedData = timeEntries.map((entry) => {
      const startTimestamp =
        typeof entry.start === "string"
          ? parseInt(entry.start, 10)
          : entry.start;
      const dateObj = new Date(startTimestamp);
      const formattedDate = format(dateObj, "dd-MM-yyyy");

      return {
        id: entry.id,
        clickupTask: entry.task?.id || "No task",
        taskKey: entry.task?.custom_id || entry.task?.id || "No task",
        taskName: entry.task?.name || "No task",
        description: entry.description || "",
        hours: parseInt(entry.duration, 10) / 3600000,
        date: formattedDate,
        clickupTeamId: teamId,
        teamId: teamId,
        blb: entry.billable ? "blb" : "nblb",
        billable: entry.billable,
        url: entry.task_url || entry.task?.url || null,
      };
    });

    if (showToast) {
      toast.success(
        <Stack>
          <Text fontWeight={600}>
            ClickUp time entries were successfully fetched. Got (
            {parsedData.length}) items for team {teamId}
          </Text>
        </Stack>,
        {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          progress: undefined,
          theme: "light",
        },
      );
    }

    return groupByField(parsedData, "date");
  } catch (error) {
    if (showToast) {
      toast.error(
        <Stack>
          <Text fontWeight={600}>
            Can't fetch ClickUp time entries due to error: {error.message}
          </Text>
        </Stack>,
        {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          progress: undefined,
          theme: "light",
        },
      );
    }
    console.error("Error while fetching ClickUp time entries:", error);
    return {};
  }
};

export const getAssignedTasks = async (
  teamId,
  userId,
  page = 0,
  prevTasks = [],
) => {
  try {
    const response = await instance.get(`/clickup/team/${teamId}/task`, {
      params: {
        page,
        assignees: [userId],
        include_closed: true,
        subtasks: true,
      },
    });

    const tasks = response.data.tasks || [];
    const updatedTasks = [...prevTasks, ...tasks];

    if (!response.data.last_page) {
      return getAssignedTasks(teamId, userId, page + 1, updatedTasks);
    } else {
      return updatedTasks.map((task) => ({
        id: task.id,
        key: task.custom_id || task.id,
        summary: task.name,
        status: task.status?.status || "No status",
        teamId: teamId,
        url: task.url,
      }));
    }
  } catch (error) {
    console.error(
      `Error while fetching assigned tasks from ClickUp for team ${teamId}:`,
      error,
    );
    return [];
  }
};

// ClickUp accepts two id flavours: the native id (86abc123) and the workspace
// custom id (CP-170). The custom one only resolves when we ask for it
// explicitly and scope the lookup to a team.
const CUSTOM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*-\d+$/;

// The task dropdowns are built from tasks assigned to the user, so a task you
// were unassigned from vanishes even though ClickUp still accepts time for it.
// This pulls any task the API key can reach back into the list by its id.
export const getClickUpTaskById = async (rawTaskId, teamId) => {
  const taskId = (rawTaskId || "").trim();
  if (!taskId) return null;

  const isCustomId = CUSTOM_ID_PATTERN.test(taskId);

  if (isCustomId && !teamId) {
    toast.error(
      <Stack>
        <Text fontWeight={600}>Select a ClickUp team first</Text>
        <Text>A custom task id like {taskId} can only be resolved within a team.</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      },
    );
    return null;
  }

  try {
    const response = await instance.get(
      `/clickup/task/${encodeURIComponent(taskId)}`,
      {
        params: isCustomId
          ? { custom_task_ids: true, team_id: teamId }
          : undefined,
      },
    );

    const task = response.data;

    if (!task?.id) {
      throw new Error(`Task ${taskId} was not found`);
    }

    toast.success(
      <Stack>
        <Text fontWeight={600}>Loaded task {task.custom_id || task.id}</Text>
        <Text>{task.name}</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      },
    );

    return {
      id: task.id,
      key: task.custom_id || task.id,
      summary: task.name,
      status: task.status?.status || "No status",
      teamId: task.team_id || teamId,
      url: task.url,
    };
  } catch (error) {
    console.error(`Error while fetching ClickUp task ${taskId}:`, error);
    toast.error(
      <Stack>
        <Text fontWeight={600}>Can't load task {taskId}</Text>
        <Text>Check the id and that your API key has access to it.</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      },
    );
    return null;
  }
};

export const createClickUpTimeEntries = async (worklogs) => {
  try {
    validateWorkLogsData(worklogs, true);
    const requests = [];

    for (const date in worklogs) {
      const worklogsForDate = worklogs[date];
      for (const worklog of worklogsForDate) {
        const { description, hours, date, task, teamId } = worklog;

        const dateObj = parse(date, "dd-MM-yyyy", new Date());
        const startTimestamp = dateObj.getTime();
        const durationMs = hours * 3600 * 1000;

        const data = {
          description: description || "",
          start: startTimestamp,
          duration: durationMs,
          tid: task,
        };

        const request = instance.post(
          `/clickup/team/${teamId}/time_entries`,
          data,
        );
        requests.push(request);
      }
    }

    await Promise.all(requests).then(() => {
      toast.success(
        <Stack>
          <Text fontWeight={600}>
            Time entries were successfully tracked to ClickUp
          </Text>
        </Stack>,
        {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          progress: undefined,
          theme: "light",
        },
      );
    });
  } catch (error) {
    toast.error(
      <Stack>
        <Text fontWeight={600}>Can't submit due to error: {error.message}</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      },
    );
    console.error("Error while creating ClickUp time entries:", error);
  }
};

export const updateClickUpTimeEntry = async ({
  teamId,
  id,
  description,
  taskId,
  duration,
}) => {
  const data = {};
  if (description !== undefined) data.description = description;
  // `tid` reassigns the entry to another task; ClickUp keeps the existing
  // start, so we don't touch it here (its update endpoint requires start+end
  // together, not start+duration).
  if (taskId !== undefined && taskId !== null && taskId !== "") {
    data.tid = taskId;
  }
  // duration is standalone (milliseconds) for a stopped entry
  if (duration !== undefined && duration !== null) {
    data.duration = duration;
  }

  await instance.put(`/clickup/team/${teamId}/time_entries/${id}`, data);
};

export const deleteClickUpTimeEntry = async ({ teamId, id }) => {
  await instance.delete(`/clickup/team/${teamId}/time_entries/${id}`);
};

const mergeTimeEntries = (allTimeEntries, newTimeEntries) => {
  if (!newTimeEntries) return;

  return Object.entries(newTimeEntries).forEach(([date, entries]) => {
    if (allTimeEntries[date]) {
      allTimeEntries[date] = [...allTimeEntries[date], ...entries];
    } else {
      allTimeEntries[date] = entries;
    }
  });
};

export const fetchAllClickUpTimeEntries = async ({
  userId,
  selectedTeamId,
  additionalTeams = {},
  startDate,
  endDate,
}) => {
  const allTimeEntries = {};

  try {
    if (selectedTeamId && userId) {
      const mainTimeEntries = await getClickUpTimeEntries(
        selectedTeamId,
        startDate,
        endDate,
        userId,
        false,
      );
      mergeTimeEntries(allTimeEntries, mainTimeEntries);
    }

    const fetchPromises = Object.keys(additionalTeams).map(async (teamId) => {
      if (userId) {
        const timeEntries = await getClickUpTimeEntries(
          teamId,
          startDate,
          endDate,
          userId,
          false,
        );
        mergeTimeEntries(allTimeEntries, timeEntries);
      }
    });

    await Promise.all(fetchPromises);
    return allTimeEntries;
  } catch (error) {
    console.error("Error while fetching all ClickUp time entries:", error);
    return {};
  }
};

export const getLatestClickUpTimeEntries = async () => {
  const { user, selectedTeamId, additionalAssignedTasks } =
    useClickUpStore.getState();

  if (!user?.id) return;

  const today = new Date();
  const startDate = format(
    new Date(today.getFullYear(), today.getMonth(), 1),
    "yyyy-MM-dd",
  );
  const endDate = format(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
    "yyyy-MM-dd",
  );

  const allTimeEntries = await fetchAllClickUpTimeEntries({
    userId: user.id,
    selectedTeamId,
    additionalTeams: additionalAssignedTasks,
    startDate,
    endDate,
  });

  console.log("ClickUp time entries: ", allTimeEntries);
  useClickUpStore.getState().addAllClickUpTimeEntries(allTimeEntries);
};
