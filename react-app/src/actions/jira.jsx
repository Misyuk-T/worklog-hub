import { Stack, Text } from "@chakra-ui/react";
import { toast } from "react-toastify";
import { endOfDay, format, startOfDay, subDays } from "date-fns";

import { instance } from "./axios";

import { parseDataFromJira } from "../helpers/parseDataFromJira";
import groupByField from "../helpers/groupByField";
import { formatDateForJira } from "../helpers/getFormattedDate";
import { validateWorkLogsData } from "../helpers/validateWorklogsData";
import useJiraStore from "../store/jiraStore";

// Helper function to convert text to Atlassian Document Format (ADF)
const textToADF = (text) => ({
  type: "doc",
  version: 1,
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: text || "",
        },
      ],
    },
  ],
});

export const jiraLogin = async (jiraUrl) => {
  try {
    const response = await instance.get("/jira/rest/api/3/myself", {
      params: {
        jiraUrl,
      },
    });

    toast.success(
      <Stack>
        <Text fontWeight={600}>
          Successfully connected to JIRA at {jiraUrl}
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

    return response.data;
  } catch (error) {
    console.error(`Login failed for JIRA at ${jiraUrl}:`, error);
    toast.error(
      <Stack>
        <Text fontWeight={600}>Failed to connect to JIRA at {jiraUrl}</Text>
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

export const getJiraWorklogIssues = async (
  jiraUrl,
  startDate,
  endDate,
  jiraEmail,
  nextPageToken = null,
  prevIssues = [],
  showToast = true,
) => {
  try {
    const requestBody = {
      jql: `worklogAuthor = '${jiraEmail}' AND worklogDate >= '${startDate}' AND worklogDate <= '${endDate}'`,
      maxResults: 100,
      fields: [
        "summary",
        "worklog",
        "issuetype",
        "parent",
        "project",
        "status",
        "assignee",
      ],
    };

    console.log(nextPageToken, "console");
    if (nextPageToken) {
      // TODO: could be bottleneck with new endpoint
      requestBody.nextPageToken = nextPageToken;
    }

    const response = await instance.post(
      "/jira/rest/api/3/search/jql",
      requestBody,
      {
        params: {
          jiraUrl,
        },
      },
    );

    const issues = response.data.issues;
    const updatedIssues = [...prevIssues, ...issues];

    if (response.data.nextPageToken) {
      return getJiraWorklogIssues(
        jiraUrl,
        startDate,
        endDate,
        jiraEmail,
        response.data.nextPageToken,
        updatedIssues,
        showToast,
      );
    } else {
      const startOfStartDate = startOfDay(new Date(startDate));
      const endOfEndDate = endOfDay(new Date(endDate));

      const startTimestamp = startOfStartDate.getTime() - 1;
      const endTimestamp = endOfEndDate.getTime();

      const workLogs = [];

      const workLogPromises = updatedIssues.map(async (issue) => {
        const issueKey = issue.key;

        const workLogResponse = await instance.get(
          `/jira/rest/api/3/issue/${issueKey}/worklog`,
          {
            params: {
              jiraUrl,
              authorAccountId: jiraEmail,
              startedAfter: startTimestamp,
              startedBefore: endTimestamp,
            },
          },
        );

        const workLogData = workLogResponse.data;

        const workLogsForIssue = workLogData.worklogs
          .filter((worklog) => worklog.author.emailAddress === jiraEmail)
          .map((worklog) => ({
            ...worklog,
            task: issueKey,
            jiraUrl,
          }));

        workLogs.push(...workLogsForIssue);
      });

      await Promise.all(workLogPromises);
      const parsedData = parseDataFromJira(workLogs);

      if (showToast) {
        toast.success(
          <Stack>
            <Text fontWeight={600}>
              Jira worklogs were successfully fetched. Got ({parsedData.length})
              items for {jiraUrl}
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
    }
  } catch (error) {
    if (showToast) {
      toast.error(
        <Stack>
          <Text fontWeight={600}>
            Can`t fetch jira worklogs due to error: {error.message}
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
    console.error("Error while fetching recent worklogs:", error);
  }
};

export const getAssignedIssues = async (
  jiraUrl,
  userId,
  nextPageToken = null,
  prevIssues = [],
) => {
  try {
    const startDate = format(subDays(new Date(), 60), "yyyy-MM-dd");
    const endDate = format(new Date(), "yyyy-MM-dd");

    const requestBody = {
      jql: `assignee = '${userId}' OR assignee WAS '${userId}' DURING ("${startDate}", "${endDate} 23:59")`,
      maxResults: 100,
      fields: ["summary", "issuetype", "parent", "project", "status"],
    };

    if (nextPageToken) {
      requestBody.nextPageToken = nextPageToken;
    }

    const response = await instance.post(
      "/jira/rest/api/3/search/jql",
      requestBody,
      {
        params: {
          jiraUrl,
        },
      },
    );

    const issues = response.data.issues;
    const updatedIssues = [...prevIssues, ...issues];

    if (response.data.nextPageToken) {
      return getAssignedIssues(
        jiraUrl,
        userId,
        response.data.nextPageToken,
        updatedIssues,
      );
    } else {
      return updatedIssues.map((issue) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        issueType: issue.fields.issuetype.name,
        parent: issue.fields.parent ? issue.fields.parent.key : null,
        project: issue.fields.project.name,
        status: issue.fields.status.name,
        jiraUrl: jiraUrl,
      }));
    }
  } catch (error) {
    console.error(
      `Error while fetching assigned issues from JIRA at ${jiraUrl}:`,
      error,
    );
  }
};

export const createJiraWorklogs = async (worklogs) => {
  try {
    validateWorkLogsData(worklogs, true);
    const requests = [];

    for (const date in worklogs) {
      const worklogsForDate = worklogs[date];
      for (const worklog of worklogsForDate) {
        const { description, hours, date, task } = worklog;

        // Prepare the data for creating the worklog in JIRA API v3 format
        const data = {
          comment: textToADF(description),
          timeSpentSeconds: hours * 3600,
          started: formatDateForJira(date),
        };

        // Make an API call to create the worklog and store the promise
        const request = instance.post(
          `/jira/rest/api/3/issue/${task}/worklog`,
          data,
          { params: { jiraUrl: worklog.jiraUrl } },
        );
        requests.push(request);
      }
    }

    // Execute all API calls concurrently using Promise.all
    await Promise.all(requests).then(() => {
      toast.success(
        <Stack>
          <Text fontWeight={600}>
            Worklogs were successfully tracked to Jira
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
    console.error("Error while creating worklogs:", error);
  }
};

const mergeWorklogs = (allWorklogs, newWorklogs) => {
  if (!newWorklogs) return;

  return Object.entries(newWorklogs).forEach(([date, logs]) => {
    if (allWorklogs[date]) {
      allWorklogs[date] = [...allWorklogs[date], ...logs];
    } else {
      allWorklogs[date] = logs;
    }
  });
};
export const fetchAllJiraWorklogs = async ({
  userEmail,
  organizationURL,
  additionalUrls = {},
  startDate,
  endDate,
}) => {
  const allWorkLogs = {};

  try {
    if (organizationURL && userEmail) {
      const mainWorklogs = await getJiraWorklogIssues(
        organizationURL,
        startDate,
        endDate,
        userEmail,
        null,
        [],
        false,
      );
      mergeWorklogs(allWorkLogs, mainWorklogs);
    }

    const fetchPromises = Object.keys(additionalUrls).map(async (item) => {
      if (userEmail) {
        const worklogs = await getJiraWorklogIssues(
          item,
          startDate,
          endDate,
          userEmail,
          null,
          [],
          false,
        );
        mergeWorklogs(allWorkLogs, worklogs);
      }
    });

    await Promise.all(fetchPromises);
    return allWorkLogs;
  } catch (error) {
    console.error("Error while fetching all Jira worklogs:", error);
    return {};
  }
};

export const getLatestJiraWorkLogs = async (place = "undefined") => {
  const { user, organizationURL, additionalAssignedIssues } =
    useJiraStore.getState();
  if (place) {
    console.log(place, user);
  }
  if (!user?.emailAddress) return;
  const today = new Date();
  const startDate = format(
    new Date(today.getFullYear(), today.getMonth(), 1),
    "yyyy-MM-dd",
  );
  const endDate = format(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
    "yyyy-MM-dd",
  );
  const truncatedOrgUrl = organizationURL?.replace(/^https?:\/\//, "");
  const allWorklogs = await fetchAllJiraWorklogs({
    userEmail: user?.emailAddress,
    organizationURL: truncatedOrgUrl,
    additionalUrls: additionalAssignedIssues,
    startDate,
    endDate,
  });

  console.log("user: ", user);
  console.log(
    allWorklogs,
    "after fetch",
    "truncatedOrgUrl: ",
    truncatedOrgUrl,
    "additionalAssignedIssues: ",
    additionalAssignedIssues,
  );
  useJiraStore.getState().addAllJiraWorklogs(allWorklogs);
};
