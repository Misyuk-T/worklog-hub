import { useState, useMemo } from "react";
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Flex,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  Link,
  Collapse,
  Checkbox,
  Stack,
  Divider,
} from "@chakra-ui/react";
import { CalendarIcon } from "@chakra-ui/icons";
import { DayPicker } from "react-day-picker";
import { format, parse } from "date-fns";
import { round } from "../../../helpers/getHours";
import groupByField from "../../../helpers/groupByField";
import { getLatestRedmineWorkLogs } from "../../../actions/redmine";
import { fetchAllJiraWorklogs } from "../../../actions/jira";
import { fetchAllClickUpTimeEntries } from "../../../actions/clickup";
import useRedmineStore from "../../../store/redmineStore";
import useJiraStore from "../../../store/jiraStore";
import useClickUpStore from "../../../store/clickupStore";

const isCommentSimilar = (c1 = "", c2 = "") => {
  if (!c1 || !c2) return false;

  // Convert both to strings safely
  const str1 = typeof c1 === "string" ? c1 : String(c1);
  const str2 = typeof c2 === "string" ? c2 : String(c2);

  if (!str1 || !str2) return false;

  const lower1 = str1.toLowerCase();
  const lower2 = str2.toLowerCase();

  return lower1.includes(lower2) || lower2.includes(lower1);
};

const pairLogsBySimilarity = (source1Entries, source2Entries) => {
  const matchedRows = [];
  const usedSource2Indexes = new Set();

  source1Entries.forEach((log1) => {
    const matchIndex = source2Entries.findIndex((log2, idx) => {
      if (usedSource2Indexes.has(idx)) return false;
      return isCommentSimilar(log1.description, log2.description);
    });

    if (matchIndex > -1) {
      const log2 = source2Entries[matchIndex];
      usedSource2Indexes.add(matchIndex);
      matchedRows.push({
        log1,
        log2,
        difference: "Match",
      });
    } else {
      matchedRows.push({
        log1,
        log2: undefined,
        difference: "Not match",
      });
    }
  });

  source2Entries.forEach((log2, idx) => {
    if (!usedSource2Indexes.has(idx)) {
      matchedRows.push({
        log1: undefined,
        log2,
        difference: "Not match",
      });
    }
  });

  return matchedRows;
};

const getServiceOrder = (source) => {
  const serviceOrder = {
    redmine: 0,
    jira: 1,
    clickup: 2,
  };

  return serviceOrder[source] ?? Number.MAX_SAFE_INTEGER;
};

const getLogSortValue = (log) => {
  if (typeof log?.sortTimestamp === "number") {
    return log.sortTimestamp;
  }

  if (log?.sortTimestamp) {
    const parsedSortTimestamp = new Date(log.sortTimestamp).getTime();

    if (!Number.isNaN(parsedSortTimestamp)) {
      return parsedSortTimestamp;
    }
  }

  if (log?.date) {
    return parse(log.date, "dd-MM-yyyy", new Date()).getTime();
  }

  return 0;
};

const sortLogs = (logs) =>
  [...logs].sort((a, b) => {
    const sortDiff = getLogSortValue(a) - getLogSortValue(b);

    if (sortDiff !== 0) {
      return sortDiff;
    }

    const serviceDiff = getServiceOrder(a?.source) - getServiceOrder(b?.source);

    if (serviceDiff !== 0) {
      return serviceDiff;
    }

    const taskDiff = `${a?.taskKey || a?.task || a?.issue?.id || ""}`.localeCompare(
      `${b?.taskKey || b?.task || b?.issue?.id || ""}`,
    );

    if (taskDiff !== 0) {
      return taskDiff;
    }

    return `${a?.description || a?.comments || a?.taskName || ""}`.localeCompare(
      `${b?.description || b?.comments || b?.taskName || ""}`,
    );
  });

const renderLogContent = (log) => {
  if (!log) return null;

  const source = log.source;
  const hours = round(log.hours);
  const description =
    log.description || log.comments || log.taskName || "No description";

  if (source === "redmine") {
    return (
      <>
        <Flex alignItems="center" gap="10px" mb="5px">
          <Text fontSize="14px" color="blue.600" fontWeight={500}>
            Issue: {log.issue?.id ?? "?"}
          </Text>
          <Text fontSize="12px" fontWeight={500}>
            Hours: {hours}h
          </Text>
        </Flex>
        <Link
          href={`https://redmine.anyforsoft.com/time_entries/${log.id}/edit`}
          isExternal
          fontSize="12px"
        >
          {description}
        </Link>
      </>
    );
  }

  if (source === "jira") {
    return (
      <>
        <Flex alignItems="center" gap="10px" mb="5px">
          {log.jiraUrl ? (
            <Link
              href={`https://${log.jiraUrl}/browse/${log.task}`}
              isExternal
              fontSize="12px"
              fontWeight={500}
              color="green"
            >
              Task: {log.task}
            </Link>
          ) : (
            <Text fontSize="14px" color="blue.600" fontWeight={500}>
              Task: {log.task}
            </Text>
          )}
          <Text fontSize="12px" fontWeight={500}>
            Hours: {hours}h
          </Text>
        </Flex>
        <Text fontSize="12px">{description}</Text>
      </>
    );
  }

  if (source === "clickup") {
    return (
      <>
        <Flex alignItems="center" gap="10px" mb="5px">
          {log.url ? (
            <Link
              href={log.url}
              isExternal
              fontSize="12px"
              fontWeight={500}
              color="purple.600"
            >
              Task: {log.taskKey || log.task}
            </Link>
          ) : (
            <Text fontSize="14px" color="purple.600" fontWeight={500}>
              Task: {log.taskKey || log.task}
            </Text>
          )}
          <Text fontSize="12px" fontWeight={500}>
            Hours: {hours}h
          </Text>
        </Flex>
        <Text fontSize="12px">{description}</Text>
      </>
    );
  }

  return null;
};

const CompareActivityTable = ({ panelSize }) => {
  const { user: redmineUser } = useRedmineStore();
  const {
    user: jiraUser,
    organizationURL,
    additionalAssignedIssues,
  } = useJiraStore();
  const {
    user: clickUpUser,
    selectedTeamId,
    additionalAssignedTasks,
  } = useClickUpStore();

  const [range, setRange] = useState({ from: new Date(), to: new Date() });
  const [source1Services, setSource1Services] = useState(["jira", "clickup"]);
  const [source2Services, setSource2Services] = useState(["redmine"]);
  const [source1Logs, setSource1Logs] = useState({});
  const [source2Logs, setSource2Logs] = useState({});
  const [loading, setLoading] = useState(false);
  const truncatedOrgUrl = organizationURL?.replace(/^https?:\/\//, "");

  const availableServices = [
    { key: "jira", label: "Jira", available: !!jiraUser },
    { key: "clickup", label: "ClickUp", available: !!clickUpUser },
    { key: "redmine", label: "Redmine", available: !!redmineUser },
  ];

  const handleSource1Toggle = (serviceKey) => {
    setSource1Services((prev) => {
      const newServices = prev.includes(serviceKey)
        ? prev.filter((s) => s !== serviceKey)
        : [...prev, serviceKey];

      // Remove from source2 if added to source1
      if (newServices.includes(serviceKey)) {
        setSource2Services((s2) => s2.filter((s) => s !== serviceKey));
      }

      return newServices;
    });
  };

  const handleSource2Toggle = (serviceKey) => {
    setSource2Services((prev) => {
      const newServices = prev.includes(serviceKey)
        ? prev.filter((s) => s !== serviceKey)
        : [...prev, serviceKey];

      // Remove from source1 if added to source2
      if (newServices.includes(serviceKey)) {
        setSource1Services((s1) => s1.filter((s) => s !== serviceKey));
      }

      return newServices;
    });
  };

  const fetchServiceLogs = async (services, startDateStr, endDateStr) => {
    const allLogs = {};

    for (const serviceKey of services) {
      try {
        if (serviceKey === "redmine" && redmineUser) {
          const redmineWorkLogs = await getLatestRedmineWorkLogs(
            redmineUser.id,
            startDateStr,
            endDateStr,
          );
          const normalizedRedmineLogs = redmineWorkLogs.map((log) => ({
            ...log,
            source: "redmine",
            date: format(new Date(log.spent_on), "dd-MM-yyyy"),
            hours: log.hours,
            description: log.comments,
            sortTimestamp: log.created_on || log.updated_on || log.spent_on,
          }));
          const redmineGrouped = groupByField(normalizedRedmineLogs, "date");
          Object.keys(redmineGrouped).forEach((date) => {
            if (!allLogs[date]) allLogs[date] = [];
            allLogs[date].push(...redmineGrouped[date]);
          });
        }

        if (serviceKey === "jira" && jiraUser) {
          const jiraWorklogs = await fetchAllJiraWorklogs({
            userEmail: jiraUser?.emailAddress,
            organizationURL: truncatedOrgUrl,
            additionalUrls: additionalAssignedIssues,
            startDate: startDateStr,
            endDate: endDateStr,
          });
          Object.keys(jiraWorklogs).forEach((date) => {
            if (!allLogs[date]) allLogs[date] = [];
            const logsWithSource = jiraWorklogs[date].map((log) => ({
              ...log,
              source: "jira",
              date,
              sortTimestamp: log.started,
            }));
            allLogs[date].push(...logsWithSource);
          });
        }

        if (serviceKey === "clickup" && clickUpUser) {
          const clickUpLogs = await fetchAllClickUpTimeEntries({
            userId: clickUpUser.id,
            selectedTeamId,
            additionalTeams: additionalAssignedTasks,
            startDate: startDateStr,
            endDate: endDateStr,
          });
          Object.keys(clickUpLogs).forEach((date) => {
            if (!allLogs[date]) allLogs[date] = [];
            const logsWithSource = clickUpLogs[date].map((log) => ({
              ...log,
              source: "clickup",
              date,
            }));
            allLogs[date].push(...logsWithSource);
          });
        }
      } catch (error) {
        console.error(`Error fetching ${serviceKey} logs:`, error);
      }
    }

    Object.keys(allLogs).forEach((date) => {
      allLogs[date] = sortLogs(allLogs[date]);
    });

    return allLogs;
  };

  const fetchLogs = async () => {
    if (!range.from || !range.to) return;
    const startDateStr = format(range.from, "yyyy-MM-dd");
    const endDateStr = format(range.to, "yyyy-MM-dd");

    try {
      setLoading(true);
      const [logs1, logs2] = await Promise.all([
        fetchServiceLogs(source1Services, startDateStr, endDateStr),
        fetchServiceLogs(source2Services, startDateStr, endDateStr),
      ]);
      setSource1Logs(logs1);
      setSource2Logs(logs2);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };
  const allDates = useMemo(() => {
    const dates1 = Object.keys(source1Logs);
    const dates2 = Object.keys(source2Logs);
    const uniqueDates = Array.from(new Set([...dates1, ...dates2]));
    uniqueDates.sort(
      (a, b) =>
        parse(b, "dd-MM-yyyy", new Date()).getTime() -
        parse(a, "dd-MM-yyyy", new Date()).getTime(),
    );
    return uniqueDates;
  }, [source1Logs, source2Logs]);

  return (
    <Collapse in={panelSize !== "collapsed"}>
      <Box
        p={4}
        height={
          panelSize === "partial"
            ? "400px"
            : panelSize === "full"
              ? "100vh"
              : "auto"
        }
        minH={"200px"}
        overflow={"auto"}
        sx={{
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#f1f1f1",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#A0AEC0",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#718096",
          },
        }}
      >
        <Heading as="h2" size="md" mb={4}>
          Compare Worklogs
        </Heading>

        <Flex mb={4} gap={6} alignItems="flex-start" flexWrap="wrap">
          <Stack spacing={2}>
            <Text fontSize="sm" fontWeight="600">
              Source 1:
            </Text>
            {availableServices.map((service) => (
              <Checkbox
                key={service.key}
                isChecked={source1Services.includes(service.key)}
                onChange={() => handleSource1Toggle(service.key)}
                isDisabled={!service.available}
                size="sm"
              >
                {service.label}
              </Checkbox>
            ))}
          </Stack>

          <Divider orientation="vertical" h="80px" />

          <Stack spacing={2}>
            <Text fontSize="sm" fontWeight="600">
              Source 2:
            </Text>
            {availableServices.map((service) => (
              <Checkbox
                key={service.key}
                isChecked={source2Services.includes(service.key)}
                onChange={() => handleSource2Toggle(service.key)}
                isDisabled={!service.available}
                size="sm"
              >
                {service.label}
              </Checkbox>
            ))}
          </Stack>

          <Divider orientation="vertical" h="80px" />

          <Popover>
            <PopoverTrigger>
              <Button leftIcon={<CalendarIcon />} variant="outline" size="sm">
                Select Dates
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <DayPicker mode="range" selected={range} onSelect={setRange} />
              </PopoverBody>
            </PopoverContent>
          </Popover>
          <Button
            onClick={fetchLogs}
            isLoading={loading}
            isDisabled={
              !range ||
              (source1Services.length === 0 && source2Services.length === 0)
            }
            size="sm"
          >
            Compare
          </Button>
        </Flex>
        {allDates.length === 0 ? (
          <Text>No data available for the selected period.</Text>
        ) : (
          allDates.map((date) => {
            const source1Entries = sortLogs(source1Logs[date] || []);
            const source2Entries = sortLogs(source2Logs[date] || []);
            const paired = pairLogsBySimilarity(source1Entries, source2Entries);
            const totalSource1Hours = source1Entries.reduce(
              (sum, log) => sum + (parseFloat(log.hours) || 0),
              0,
            );
            const totalSource2Hours = source2Entries.reduce(
              (sum, log) => sum + (parseFloat(log.hours) || 0),
              0,
            );

            const source1Label = source1Services
              .map((s) => availableServices.find((srv) => srv.key === s)?.label)
              .filter(Boolean)
              .join(" + ");

            const source2Label = source2Services
              .map((s) => availableServices.find((srv) => srv.key === s)?.label)
              .filter(Boolean)
              .join(" + ");

            return (
              <Box key={date} mb={8}>
                <Heading as="h3" size="sm" mb={2}>
                  {date}
                </Heading>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr w="100%">
                      <Th fontSize="14px" width="33.33%">
                        {source1Label || "Source 1"}
                      </Th>
                      <Th fontSize="14px" width="33.33%" textAlign="center">
                        Difference
                      </Th>
                      <Th fontSize="14px" width="33.33%" textAlign="right">
                        {source2Label || "Source 2"}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr bg="gray.100">
                      <Td fontWeight="bold">
                        Total: {round(totalSource1Hours)}h
                      </Td>
                      <Td></Td>
                      <Td fontWeight="bold" textAlign="right">
                        Total: {round(totalSource2Hours)}h
                      </Td>
                    </Tr>
                    {paired.map((row, idx) => {
                      const { log1, log2, difference } = row;
                      let source1Content = renderLogContent(log1);
                      let source2Content = renderLogContent(log2);

                      return (
                        <Tr key={idx} _hover={{ bg: "rgba(0, 0, 0, 0.05)" }}>
                          <Td>{source1Content}</Td>
                          <Td textAlign="center">
                            <Text
                              fontSize="12px"
                              fontWeight={600}
                              color={
                                difference === "Match" ? "green.600" : "red.600"
                              }
                            >
                              {difference}
                            </Text>
                          </Td>
                          <Td textAlign="right">{source2Content}</Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            );
          })
        )}
      </Box>
    </Collapse>
  );
};

export default CompareActivityTable;
