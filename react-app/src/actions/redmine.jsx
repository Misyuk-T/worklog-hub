import { Stack, Text } from "@chakra-ui/react";

import { toast } from "react-toastify";
import { instance } from "./axios";

import { transformToRedmineData } from "../helpers/transformToRedmineData";
import { validateWorkLogsData } from "../helpers/validateWorklogsData";
import { endOfMonth, format, startOfMonth } from "date-fns";

export const redmineLogin = async () => {
  try {
    const response = await instance
      .get(`/redmine/users/current.json`)
      .then((data) => {
        toast.success(
          <Stack>
            <Text fontWeight={600}>Successfully connected to redmine</Text>
          </Stack>,
          {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            progress: undefined,
            theme: "light",
          }
        );
        return data;
      });

    return response.data.user;
  } catch (error) {
    console.error("Error during login:", error);
  }
};

export const getRedmineProjects = async (id) => {
  try {
    const assignedResponse = await instance.get(
      `/redmine/issues.json?assigned_to_id=${id}`
    );
    const watchedResponse = await instance.get(
      `/redmine/issues.json?&watcher_id=${id}`
    );
    const assignedIssues = assignedResponse.data.issues;
    const watchedIssues = watchedResponse.data.issues;

    const extractedData = [...assignedIssues, ...watchedIssues].map((item) => {
      return {
        id: item.id,
        projectName: item.project.name,
        subject: item.subject,
      };
    });

    return [...new Set(extractedData)];
  } catch (error) {
    console.error("Error while getting issues:", error.response.data);
  }
};

export const getLatestRedmineWorkLogs = async (
  id,
  startDate,
  endDate,
  offset = 0,
  workLogs = []
) => {
  if (!startDate || !endDate) {
    const now = new Date();
    const defaultStartDate = format(startOfMonth(now), "yyyy-MM-dd");
    const defaultEndDate = format(endOfMonth(now), "yyyy-MM-dd");
    startDate = startDate || defaultStartDate;
    endDate = endDate || defaultEndDate;
  }
  try {
    const response = await instance.get("/redmine/time_entries.json", {
      params: {
        from: startDate,
        to: endDate,
        user_id: id,
        limit: 100,
        offset: offset,
      },
    });
    const data = response.data.time_entries;
    workLogs.push(...data);
    if (data.length === 100) {
      return getLatestRedmineWorkLogs(
        id,
        startDate,
        endDate,
        offset + 100,
        workLogs
      );
    } else {
      return workLogs;
    }
  } catch (error) {
    console.error("Error fetching worklogs:", error);
  }
};

export const trackTimeToRedmine = async (data) => {
  try {
    validateWorkLogsData(data, false);
    const redmineData = transformToRedmineData(data);

    const requests = redmineData.map((entry) => {
      return instance.post(`/redmine/time_entries.json`, entry);
    });

    await Promise.all(requests).then(() => {
      toast.success(
        <Stack>
          <Text fontWeight={600}>
            Worklogs were successfully tracked to redmine
          </Text>
        </Stack>,
        {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          progress: undefined,
          theme: "light",
        }
      );
    });
  } catch (error) {
    toast.error(
      <Stack>
        <Text fontWeight={600}>Can`t submit due to error: {error.message}</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      }
    );
    console.error("Error while tracking time:", error);
  }
};
