import { useEffect, useState } from "react";
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
  Link,
  Flex,
  Collapse,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { Scrollbars } from "react-custom-scrollbars-2";
import { parse, isWeekend } from "date-fns";
import { round } from "../../../helpers/getHours";
import useJiraStore from "../../../store/jiraStore";
import { getLatestJiraWorkLogs } from "../../../actions/jira";

function parseJiraDate(dateString) {
  return parse(dateString, "dd-MM-yyyy", new Date());
}
function isDayWeekend(dateString) {
  return isWeekend(parseJiraDate(dateString));
}

const JiraActivityTable = ({ panelSize }) => {
  const { allJiraWorklogs, user } = useJiraStore();
  const [isLoading, setIsLoading] = useState(false);
  const groupedByDateArray = allJiraWorklogs
    ? Object.entries(allJiraWorklogs).sort((a, b) => {
        const dateA = parseJiraDate(a[0]);
        const dateB = parseJiraDate(b[0]);
        return dateB - dateA;
      })
    : [];
  const containerMaxHeight = panelSize === "partial" ? "400px" : "auto";
  const isInitialLoading = allJiraWorklogs === null;

  console.log(allJiraWorklogs);

  useEffect(() => {
    if (user && isInitialLoading) {
      setIsLoading(true);
      getLatestJiraWorkLogs().finally(() => setIsLoading(false));
    }
  }, [user]);

  return (
    <Collapse in={panelSize !== "collapsed"}>
      <Box
        minH="200px"
        maxH={containerMaxHeight}
        transition="max-height 0.3s ease"
        border="1px solid lightgray"
        borderRadius="md"
        overflow="hidden"
        p={4}
      >
        <Heading as="h2" size="md" mb={4}>
          Latest Jira Activity
        </Heading>
        {isLoading ? (
          <Center minH="150px">
            <Spinner size="xl" color="blue.500" thickness="4px" />
          </Center>
        ) : groupedByDateArray.length ? (
          <Scrollbars
            autoHeight={panelSize === "partial"}
            autoHeightMin={150}
            autoHeightMax={350}
            style={{ height: panelSize === "full" ? "600px" : "auto" }}
            renderThumbVertical={(props) => (
              <div {...props} style={{ ...props.style, backgroundColor: "#A0AEC0", borderRadius: "4px", width: "6px", zIndex: 999 }} />
            )}
            renderTrackVertical={(props) => (
              <div {...props} style={{ ...props.style, right: "2px", bottom: "2px", top: "2px", borderRadius: "4px" }} />
            )}
            hideTracksWhenNotNeeded
          >
          {
          groupedByDateArray.map(([date, logs]) => {
            const totalHours = logs.reduce((acc, log) => acc + log.hours, 0);
            const weekend = isDayWeekend(date);
            return (
              <Box key={date} mb={8} position="relative">
                <Flex
                  mb={2}
                  mx="-16px"
                  p={2}
                  bg="gray.50"
                  px="28px"
                  border="1px solid"
                  borderColor="gray.200"
                  position="sticky"
                  top="-17px"
                  zIndex="10"
                  alignItems="center"
                  gap="10px"
                >
                  <Text fontSize="14px" fontWeight="bold">
                    {date}{" "}
                    {weekend && (
                      <Text as="span" color="tomato">
                        (Weekend)
                      </Text>
                    )}
                  </Text>
                  <Text color={totalHours === 8 ? "green.500" : "tomato.500"}>
                    {round(totalHours)}h total
                  </Text>
                </Flex>
                <Table size="sm" variant="striped" sx={{ tableLayout: "fixed", width: "100%" }}>
                  <Thead>
                    <Tr>
                      <Th fontSize="14px" width="120px">Task</Th>
                      <Th fontSize="14px" width="80px">Hours</Th>
                      <Th fontSize="14px">Description</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {logs.map((item, idx) => {
                      const isBlb = item.blb === "blb";
                      const jiraLink = item.jiraUrl
                        ? `https://${item.jiraUrl}/browse/${item.task}`
                        : null;
                      return (
                        <Tr key={idx}>
                          <Td
                            fontSize="14px"
                            color={isBlb ? "green.600" : "orange.600"}
                            whiteSpace="nowrap"
                            overflow="hidden"
                            textOverflow="ellipsis"
                          >
                            {jiraLink ? (
                              <Link href={jiraLink} isExternal>
                                {item.task}
                              </Link>
                            ) : (
                              item.task
                            )}
                          </Td>
                          <Td fontSize="14px" whiteSpace="nowrap">{round(item.hours)}h</Td>
                          <Td 
                            fontSize="14px"
                            overflow="hidden"
                            textOverflow="ellipsis"
                            whiteSpace="nowrap"
                          >
                            <Link href={jiraLink} isExternal>
                              {item.description}
                            </Link>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            );
          })}
          </Scrollbars>
        ) : (
          <Text>No latest activity</Text>
        )}
      </Box>
    </Collapse>
  );
};

export default JiraActivityTable;
