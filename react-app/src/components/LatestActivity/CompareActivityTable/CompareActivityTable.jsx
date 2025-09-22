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
} from "@chakra-ui/react";
import { CalendarIcon } from "@chakra-ui/icons";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { round } from "../../../helpers/getHours";
import groupByField from "../../../helpers/groupByField";
import { getLatestRedmineWorkLogs } from "../../../actions/redmine";
import { fetchAllJiraWorklogs } from "../../../actions/jira";
import useRedmineStore from "../../../store/redmineStore";
import useJiraStore from "../../../store/jiraStore";

const isCommentSimilar = (c1 = "", c2 = "") => {
  if (!c1 || !c2) return false;

  // Convert both to strings safely
  const str1 = typeof c1 === 'string' ? c1 : String(c1);
  const str2 = typeof c2 === 'string' ? c2 : String(c2);

  if (!str1 || !str2) return false;

  const lower1 = str1.toLowerCase();
  const lower2 = str2.toLowerCase();

  return lower1.includes(lower2) || lower2.includes(lower1);
};

const pairLogsBySimilarity = (redmineEntries, jiraEntries) => {
  const matchedRows = [];
  const usedJiraIndexes = new Set();
  redmineEntries.forEach((redmineLog) => {
    const matchIndex = jiraEntries.findIndex((jiraLog, idx) => {
      if (usedJiraIndexes.has(idx)) return false;

      return isCommentSimilar(redmineLog.comments, jiraLog?.description);
    });
    if (matchIndex > -1) {
      const jiraLog = jiraEntries[matchIndex];
      usedJiraIndexes.add(matchIndex);
      matchedRows.push({
        redmineLog,
        jiraLog,
        difference: "Match",
      });
    } else {
      matchedRows.push({
        redmineLog,
        jiraLog: undefined,
        difference: "Not match",
      });
    }
  });
  jiraEntries.forEach((jiraLog, idx) => {
    if (!usedJiraIndexes.has(idx)) {
      matchedRows.push({
        redmineLog: undefined,
        jiraLog,
        difference: "Not match",
      });
    }
  });
  return matchedRows;
};

const CompareActivityTable = ({ panelSize }) => {
  const { user: redmineUser } = useRedmineStore();
  const { user, organizationURL, additionalAssignedIssues } = useJiraStore();
  const [range, setRange] = useState({ from: new Date(), to: new Date() });
  const [redmineLogs, setRedmineLogs] = useState({});
  const [jiraLogs, setJiraLogs] = useState({});
  const [loading, setLoading] = useState(false);
  const truncatedOrgUrl = organizationURL?.replace(/^https?:\/\//, "");

  const fetchLogs = async () => {
    if (!range.from || !range.to) return;
    const startDateStr = format(range.from, "yyyy-MM-dd");
    const endDateStr = format(range.to, "yyyy-MM-dd");
    try {
      setLoading(true);
      const redmineWorkLogs = await getLatestRedmineWorkLogs(
        redmineUser.id,
        startDateStr,
        endDateStr
      );
      const normalizedRedmineLogs = redmineWorkLogs.map((log) => ({
        ...log,
        spent_on: format(new Date(log.spent_on), "dd-MM-yyyy"),
      }));
      const redmineGrouped = groupByField(normalizedRedmineLogs, "spent_on");
      setRedmineLogs(redmineGrouped);
      const allWorklogs = await fetchAllJiraWorklogs({
        userEmail: user?.emailAddress,
        organizationURL: truncatedOrgUrl,
        additionalUrls: additionalAssignedIssues,
        startDate: startDateStr,
        endDate: endDateStr,
      });
      setJiraLogs(allWorklogs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };
  const allDates = useMemo(() => {
    const redmineDates = Object.keys(redmineLogs);
    const jiraDates = Object.keys(jiraLogs);
    const uniqueDates = Array.from(new Set([...redmineDates, ...jiraDates]));
    uniqueDates.sort((a, b) => new Date(b) - new Date(a));
    return uniqueDates;
  }, [redmineLogs, jiraLogs]);

  return (
    <Collapse in={panelSize !== "collapsed"}>
      <Box
        p={4}
        height={panelSize === "partial" ? "200px" : "auto"}
        minH={"200px"}
        overflow={"auto"}
      >
        <Heading as="h2" size="md" mb={4}>
          Compare Redmine & Jira Worklogs
        </Heading>
        <Flex mb={4} gap={4} alignItems="center">
          <Popover>
            <PopoverTrigger>
              <Button leftIcon={<CalendarIcon />} variant="outline">
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
          <Button onClick={fetchLogs} isLoading={loading} isDisabled={!range}>
            Compare
          </Button>
        </Flex>
        {allDates.length === 0 ? (
          <Text>No data available for the selected period.</Text>
        ) : (
          allDates.map((date) => {
            const redmineEntries = redmineLogs[date] || [];
            const jiraEntries = jiraLogs[date] || [];
            const paired = pairLogsBySimilarity(redmineEntries, jiraEntries);
            const totalRedmineHours = redmineEntries.reduce(
              (sum, log) => sum + (parseFloat(log.hours) || 0),
              0
            );
            const totalJiraHours = jiraEntries.reduce(
              (sum, log) => sum + (parseFloat(log.hours) || 0),
              0
            );
            return (
              <Box key={date} mb={8}>
                <Heading as="h3" size="sm" mb={2}>
                  {date}
                </Heading>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr w="100%">
                      <Th fontSize="14px" width="33.33%">
                        Redmine
                      </Th>
                      <Th fontSize="14px" width="33.33%" textAlign="center">
                        Difference
                      </Th>
                      <Th fontSize="14px" width="33.33%" textAlign="right">
                        Jira
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr bg="gray.100">
                      <Td fontWeight="bold">
                        Total: {round(totalRedmineHours)}h
                      </Td>
                      <Td></Td>
                      <Td fontWeight="bold" textAlign="right">
                        Total: {round(totalJiraHours)}h
                      </Td>
                    </Tr>
                    {paired.map((row, idx) => {
                      const { redmineLog, jiraLog, difference } = row;
                      let redmineContent = null;
                      if (redmineLog) {
                        redmineContent = (
                          <>
                            <Flex
                              alignItems="center"
                              gap="10px"
                              justifyContent="start"
                              mb="5px"
                            >
                              <Text
                                fontSize="14px"
                                color="blue.600"
                                fontWeight={500}
                              >
                                Issue: {redmineLog.issue?.id ?? "?"}
                              </Text>
                              <Text fontSize="12px" fontWeight={500}>
                                Hours: {round(redmineLog.hours)}h
                              </Text>
                            </Flex>
                            <Link
                              href={`https://redmine.anyforsoft.com/time_entries/${redmineLog.id}/edit`}
                              isExternal
                              fontSize="12px"
                            >
                              {redmineLog.comments || "No comment"}
                            </Link>
                          </>
                        );
                      }
                      let jiraContent = null;
                      if (jiraLog) {
                        jiraContent = (
                          <>
                            <Flex
                              alignItems="center"
                              gap="10px"
                              justifyContent="end"
                              mb="5px"
                            >
                              {jiraLog.jiraUrl ? (
                                <Link
                                  href={`https://${jiraLog.jiraUrl}/browse/${jiraLog.task}`}
                                  isExternal
                                  fontSize="12px"
                                  fontWeight={500}
                                  color={"green"}
                                >
                                  Task: {jiraLog.task}
                                </Link>
                              ) : (
                                <Text
                                  fontSize="14px"
                                  color="green.600"
                                  fontWeight={500}
                                >
                                  Task: {jiraLog.task}
                                </Text>
                              )}
                              <Text fontSize="12px" fontWeight={500}>
                                Hours: {round(jiraLog.hours)}h
                              </Text>
                            </Flex>
                            {jiraLog.jiraUrl ? (
                              <Link
                                href={`https://${jiraLog.jiraUrl}/browse/${jiraLog.task}`}
                                isExternal
                                fontSize="12px"
                              >
                                {jiraLog.description}
                              </Link>
                            ) : (
                              <Text fontSize="12px">{jiraLog.description}</Text>
                            )}
                          </>
                        );
                      }
                      return (
                        <Tr key={idx} _hover={{ bg: "rgba(0, 0, 0, 0.05)" }}>
                          <Td>{redmineContent}</Td>
                          <Td
                            textAlign="center"
                            color={
                              difference === "Not match" ? "red.500" : "black"
                            }
                          >
                            {difference}
                          </Td>
                          <Td textAlign="right">{jiraContent}</Td>
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
