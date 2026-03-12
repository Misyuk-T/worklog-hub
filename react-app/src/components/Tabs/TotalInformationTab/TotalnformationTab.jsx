import { forwardRef } from "react";
import {
  Box,
  Flex,
  Stack,
  TabPanel,
  Text,
  Card,
  CardBody,
} from "@chakra-ui/react";

import useRedmineStore from "../../../store/redmineStore";

import { getHours, getTotalHours, round } from "../../../helpers/getHours";
import getProjectName from "../../../helpers/getProjectName";

import RedmineForm from "./RedmineForm";

const getUniqueProjectIds = (dataItem) => {
  const uniqueProjectIds = new Set();

  for (const log of dataItem) {
    const { project } = log;
    if (project !== "") {
      uniqueProjectIds.add(project);
    } else {
      uniqueProjectIds.add("undefined");
    }
  }

  return Array.from(uniqueProjectIds);
};

const subLinkStyles = {
  borderBottom: "1px solid",
  borderColor: "gray.200",
  lineHeight: 1,
  py: 3,
  textAlign: "center",
  fontWeight: 500,
  fontSize: "sm",
};

const mainLinkStyles = {
  lineHeight: 1,
  py: 3,
  fontWeight: 700,
  borderBottom: "1px solid",
  borderColor: "gray.200",
  fontSize: "sm",
  bg: "gray.50",
};

const TotalInformationTab = forwardRef(({ data }, ref) => {
  const { projects } = useRedmineStore();

  const totalPeriodHours = getTotalHours(data);

  return (
    <TabPanel px={0} mr="40px">
      <Stack spacing={4} style={{ overflowY: "clip" }}>
        <Card boxShadow="sm" borderRadius="md">
          <CardBody p={0}>
            <Flex>
              <Stack
                justifyContent="center"
                gap={0}
                minW="131px"
                alignSelf="stretch"
                width="100%"
              >
                <Text h="100%" {...mainLinkStyles} pl={3}>
                  Project:
                </Text>
                <Text {...mainLinkStyles} pl={3}>
                  NBLB:
                </Text>
                <Text {...mainLinkStyles} pl={3}>
                  BLB:
                </Text>
                <Text {...mainLinkStyles} pl={3}>
                  Total by date:
                </Text>
                <Text
                  lineHeight={1}
                  py={3}
                  fontWeight={700}
                  fontSize="sm"
                  bg="gray.100"
                  pl={3}
                >
                  Total by period:
                </Text>
              </Stack>
              {data.map(([date, logs], index) => {
                const { nblbHours, blbHours, totalHours } = getHours(logs);
                const totalTextColor =
                  totalHours === 8
                    ? "green"
                    : totalHours > 8 || totalHours < 0
                      ? "red"
                      : "orange";
                const isLastItem = index === data.length - 1;
                const projectsByDay = getUniqueProjectIds(logs);

                return (
                  <Stack
                    justifyContent="center"
                    key={index}
                    gap={0}
                    minW="91px"
                    w="100%"
                    alignSelf="stretch"
                    bg={"white"}
                  >
                    <Stack
                      justifyContent="center"
                      borderBottom="1px solid"
                      borderColor="gray.200"
                      gap={0}
                      minW="91px"
                      h="100%"
                    >
                      {projectsByDay.length ? (
                        projectsByDay.map((item, idx) => {
                          const hasUndefinedProject = item === "undefined";
                          return (
                            <Text
                              key={idx}
                              textAlign="center"
                              fontWeight={500}
                              fontSize="xs"
                              my={1}
                              h="100%"
                              color={hasUndefinedProject ? "tomato" : "black"}
                            >
                              {hasUndefinedProject
                                ? item
                                : getProjectName(item, projects)}
                            </Text>
                          );
                        })
                      ) : (
                        <Text
                          color="tomato"
                          lineHeight={1}
                          py={4}
                          textAlign="center"
                          fontWeight={500}
                          fontSize="xs"
                        >
                          Empty
                        </Text>
                      )}
                    </Stack>
                    <Text {...subLinkStyles}>{round(nblbHours)}h</Text>
                    <Text {...subLinkStyles}>{round(blbHours)}h</Text>
                    <Text
                      {...subLinkStyles}
                      fontWeight={600}
                      color={totalTextColor}
                    >
                      {round(totalHours)}h
                    </Text>
                    <Text
                      lineHeight={1}
                      py={3}
                      textAlign="center"
                      fontWeight={700}
                      fontSize="sm"
                      bg="gray.100"
                    >
                      {isLastItem ? `${round(totalPeriodHours)}h` : "ㅤ"}
                    </Text>
                    )
                  </Stack>
                );
              })}
            </Flex>
          </CardBody>
        </Card>

        <Box ref={ref}>
          <RedmineForm />
        </Box>
      </Stack>
    </TabPanel>
  );
});

export default TotalInformationTab;
