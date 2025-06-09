import { useMemo } from "react";
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
} from "@chakra-ui/react";
import { parse, isWeekend } from "date-fns";
import useRedmineStore from "../../../store/redmineStore";
import groupByField from "../../../helpers/groupByField";
import { round } from "../../../helpers/getHours";

function parseRedmineDate(dateString) {
  return parse(dateString, "yyyy-MM-dd", new Date());
}

function isDayWeekend(dateString) {
  return isWeekend(parseRedmineDate(dateString));
}

const RedmineActivityTable = ({ panelSize }) => {
  const { latestActivity, projects } = useRedmineStore();
  const groupedByDate = useMemo(
    () => groupByField(latestActivity, "spent_on"),
    [latestActivity]
  );
  const groupedByDateArray = useMemo(() => {
    return Object.entries(groupedByDate).sort((a, b) => {
      const dateA = parseRedmineDate(a[0]);
      const dateB = parseRedmineDate(b[0]);
      return dateB - dateA;
    });
  }, [groupedByDate]);
  const containerMaxHeight = panelSize === "partial" ? "200px" : "auto";

  return (
    <Collapse in={panelSize !== "collapsed"}>
      <Box
        minH="200px"
        maxH={containerMaxHeight}
        transition="max-height 0.3s ease"
        border="1px solid lightgray"
        borderRadius="md"
        overflow={"auto"}
        p={4}
      >
        <Heading as="h2" size="md" mb={4}>
          Latest Redmine Activity
        </Heading>
        {groupedByDateArray.length ? (
          groupedByDateArray.map(([date, activities]) => {
            const totalHours = activities.reduce(
              (acc, item) => acc + item.hours,
              0
            );
            const weekend = isDayWeekend(date);
            return (
              <Box key={date} mb={8}>
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
                    {date.split("-").reverse().join("-")}{" "}
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
                      <Th fontSize="14px">Project</Th>
                      <Th fontSize="14px">Issue</Th>
                      <Th fontSize="14px">Hours</Th>
                      <Th fontSize="14px">Comments</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {activities.map((activity) => {
                      const projectId = activity.issue.id;
                      const projectInfo = projects.find(
                        (p) => p.id === projectId
                      );
                      const blb =
                        activity.custom_fields?.[0]?.value === "3"
                          ? "nblb"
                          : "blb";
                      const redmineIssueUrl = `https://redmine.anyforsoft.com/issues/${activity.issue.id}`;
                      const redmineEditUrl = `https://redmine.anyforsoft.com/time_entries/${activity.id}/edit`;
                      return (
                        <Tr key={activity.id}>
                          <Td fontSize="14px" minWidth="200px">
                            {projectInfo
                              ? projectInfo.projectName
                              : "Untracked project"}
                          </Td>
                          <Td fontSize="14px" minWidth="200px">
                            {projectInfo?.subject ? (
                              <Link href={redmineIssueUrl} isExternal>
                                {projectInfo.subject}
                              </Link>
                            ) : (
                              activity.issue.id
                            )}
                          </Td>
                          <Td
                            fontSize="14px"
                            color={blb === "blb" ? "green.600" : "orange.600"}
                            whiteSpace="nowrap"
                          >
                            {round(activity.hours)}h ({blb})
                          </Td>
                          <Td fontSize="14px" w="100%">
                            <Link
                              color="blue.500"
                              href={redmineEditUrl}
                              isExternal
                            >
                              {activity.comments || "No comment"}
                            </Link>
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

export default RedmineActivityTable;
