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
import { parse, isWeekend } from "date-fns";
import { round } from "../../../helpers/getHours";
import useClickUpStore from "../../../store/clickupStore";
import { getLatestClickUpTimeEntries } from "../../../actions/clickup";

const parseClickUpDate = (dateString) => {
  return parse(dateString, "dd-MM-yyyy", new Date());
};

const isDayWeekend = (dateString) => {
  return isWeekend(parseClickUpDate(dateString));
};

const ClickUpActiveTable = ({ panelSize }) => {
  const { allClickUpTimeEntries, user, selectedTeamId } = useClickUpStore();
  const [isLoading, setIsLoading] = useState(false);
  const groupedByDateArray = allClickUpTimeEntries
    ? Object.entries(allClickUpTimeEntries).sort((a, b) => {
        const dateA = parseClickUpDate(a[0]);
        const dateB = parseClickUpDate(b[0]);
        return dateB - dateA;
      })
    : [];
  const containerMaxHeight = panelSize === "partial" ? "400px" : panelSize === "full" ? "calc(100vh - 200px)" : "auto";
  const isInitialLoading = allClickUpTimeEntries === null;

  useEffect(() => {
    if (user && isInitialLoading) {
      setIsLoading(true);
      getLatestClickUpTimeEntries().finally(() => setIsLoading(false));
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
        overflow="auto"
        p={4}
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
          Latest ClickUp Activity
        </Heading>
        {isLoading ? (
          <Center minH="150px">
            <Spinner size="xl" color="blue.500" thickness="4px" />
          </Center>
        ) : groupedByDateArray.length ? (
          groupedByDateArray.map(([date, entries]) => {
            const totalHours = entries.reduce(
              (acc, entry) => acc + entry.hours,
              0,
            );
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
                <Table size="sm" variant="striped">
                  <Thead>
                    <Tr>
                      <Th fontSize="14px">Task</Th>
                      <Th fontSize="14px">Hours</Th>
                      <Th fontSize="14px">Billable</Th>
                      <Th fontSize="14px">Description</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {entries.map((item, idx) => {
                      const teamId = item.teamId || selectedTeamId;
                      const taskKey = item.taskKey || item.task || "No task";
                      const taskUrl =
                        item.url ||
                        (teamId && taskKey
                          ? `https://app.clickup.com/t/${teamId}/${taskKey}`
                          : null);
                      const billableStatus = item.billable ? "blb" : "nblb";
                      return (
                        <Tr key={idx}>
                          <Td
                            fontSize="14px"
                            color="blue.600"
                            whiteSpace="nowrap"
                          >
                            {taskUrl ? (
                              <Link href={taskUrl} isExternal>
                                {taskKey}
                              </Link>
                            ) : (
                              taskKey
                            )}
                          </Td>
                          <Td fontSize="14px" whiteSpace="nowrap">{round(item.hours)}h</Td>
                          <Td
                            fontSize="14px"
                            color={item.billable ? "green.600" : "orange.600"}
                            fontWeight="500"
                            whiteSpace="nowrap"
                          >
                            {billableStatus}
                          </Td>
                          <Td fontSize="14px" w="100%">
                            {item.description || item.taskName || "-"}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            );
          })
        ) : (
          <Text>No latest activity</Text>
        )}
      </Box>
    </Collapse>
  );
};

export default ClickUpActiveTable;
