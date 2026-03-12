import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Stack,
  Switch,
  Text,
  Card,
  CardBody,
  Divider,
} from "@chakra-ui/react";
import Select from "react-select";

import useWorkLogsStore from "../../../store/worklogsStore";
import useRedmineStore from "../../../store/redmineStore";
import useJiraStore from "../../../store/jiraStore";
import useClickUpStore from "../../../store/clickupStore";

import {
  getLatestRedmineWorkLogs,
  trackTimeToRedmine,
} from "../../../actions/redmine";
import {
  createJiraWorklogs,
  getLatestJiraWorkLogs,
} from "../../../actions/jira";
import {
  createClickUpTimeEntries,
  getLatestClickUpTimeEntries,
} from "../../../actions/clickup";
import { transformToProjectData } from "../../../helpers/transformToSelectData";
import { getTotalHoursFromObject } from "../../../helpers/getHours";
import { filterWorklogsByTask } from "../../../helpers/filterWorklogsForJira";
import { filterWorklogsForClickUp } from "../../../helpers/filterWorklogsForClickUp";

import ModalDialog from "../../ModalDialog";
import { QuestionIcon } from "@chakra-ui/icons";

const renderPopover = () => {
  return (
    <Popover boundary="scrollParent" size={"xl"} placement={"top"}>
      <PopoverTrigger>
        <Box>
          <IconButton
            opacity={0.5}
            p={0}
            h="15px"
            w="10px"
            background="transparent"
            aria-label="helper popup"
            icon={<QuestionIcon />}
            transition="all .3s"
            _hover={{
              background: "transparent",
              svg: {
                opacity: "0.5",
              },
            }}
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent p={5}>
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverBody>
          <Text>
            These buttons will attempt to match Jira issues or ClickUp tasks to
            card descriptions, but only if the description starts with a valid
            task ID (e.g.,
            <strong> CE-580:</strong> some text here for Jira or{" "}
            <strong> CP-47:</strong> for ClickUp).
          </Text>
          <Text mt={2}>
            If a match is found, the card will be linked to the corresponding
            issue/task. If no match exists, nothing will happen.
          </Text>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

const RedmineForm = () => {
  const {
    addBulkWorkLogProject,
    workLogs,
    addWorkLogs,
    bulkUpdateWorkLogsWithJira,
    bulkUpdateWorkLogsWithClickUp,
    resetWorkLogs,
  } = useWorkLogsStore();
  const { projects, resetLatestActivity, addLatestActivity, user } =
    useRedmineStore();
  const {
    user: jiraUser,
    assignedIssues,
    additionalAssignedIssues,
  } = useJiraStore();
  const {
    user: clickUpUser,
    assignedTasks: clickUpTasks,
    additionalAssignedTasks: additionalClickUpTasks,
  } = useClickUpStore();

  const [selectedItem, setSelectedItem] = useState(null);
  const [isBlbLog, setIsBlbLog] = useState(false);

  const jiraWoklogs = filterWorklogsByTask(workLogs);
  const formattedProjectData = transformToProjectData(projects);
  const worklogsArray = workLogs && Object.entries(workLogs);
  const isWorkLogsExist = worklogsArray?.length > 0;
  const isWorklogHaveProject =
    isWorkLogsExist && worklogsArray[0][1][0].project;

  const handleBulkUpdate = () => {
    const allJiraIssues = [
      ...assignedIssues,
      ...Object.values(additionalAssignedIssues).flat(),
    ];
    bulkUpdateWorkLogsWithJira(allJiraIssues);
  };

  const handleClickUpBulkUpdate = () => {
    const allClickUpTasks = [
      ...clickUpTasks,
      ...Object.values(additionalClickUpTasks).flat(),
    ];
    bulkUpdateWorkLogsWithClickUp(allClickUpTasks);
  };

  const handleAddProject = () => {
    addBulkWorkLogProject(selectedItem.value);
  };

  const handleBlbStatus = () => {
    const updatedWorkLog = { ...workLogs };

    for (let log in updatedWorkLog) {
      updatedWorkLog[log] = updatedWorkLog[log].map((item) => {
        return {
          ...item,
          blb: isBlbLog ? "nblb" : "blb",
        };
      });
    }
    addWorkLogs(updatedWorkLog);
    setIsBlbLog((prevState) => !prevState);
  };

  const handleRedmineSubmit = async () => {
    await trackTimeToRedmine(workLogs).then(async () => {
      resetLatestActivity();
      addLatestActivity(await getLatestRedmineWorkLogs(user.id));
    });
  };

  const handleJiraSubmit = async () => {
    await createJiraWorklogs(jiraWoklogs);
    await getLatestJiraWorkLogs();
  };

  const handleClickUpSubmit = async () => {
    const clickUpWorklogs = filterWorklogsForClickUp(workLogs);
    await createClickUpTimeEntries(clickUpWorklogs);
    await getLatestClickUpTimeEntries();
  };

  return (
    <Stack spacing={4}>
      <Card boxShadow="sm" sx={{ borderRadius: "0" }}>
        <CardBody>
          <Text
            fontWeight={700}
            fontSize={"xs"}
            textTransform={"uppercase"}
            color="gray.600"
            mb={4}
            letterSpacing="wide"
          >
            Bulk Edit Block: Functionality here will edit all existing cards
          </Text>

          <Flex gap={4} alignItems="center" flexWrap="wrap">
            <Flex alignItems="center" gap={2}>
              <Text fontSize={"sm"} fontWeight={600}>
                Billability toggle:
              </Text>
              <Switch
                id="blb"
                size="sm"
                isDisabled={!user?.id || !isWorkLogsExist}
                onChange={handleBlbStatus}
              />
            </Flex>

            <Flex gap={2} alignItems={"center"} flex={1} minW="0">
              <Box flex={1} maxW="300px" minW="200px">
                <Select
                  value={selectedItem}
                  onChange={setSelectedItem}
                  options={formattedProjectData}
                  placeholder="Select redmine project ..."
                  menuPlacement="auto"
                  styles={{
                    control: (baseStyles) => ({
                      ...baseStyles,
                      minHeight: "32px",
                      height: "32px",
                      fontSize: "14px",
                    }),
                    valueContainer: (baseStyles) => ({
                      ...baseStyles,
                      padding: "0 8px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                    }),
                    placeholder: (baseStyles) => ({
                      ...baseStyles,
                      padding: "0 0 5px 0",
                      fontSize: "14px",
                    }),
                    singleValue: (baseStyles) => ({
                      ...baseStyles,
                      fontSize: "14px",
                    }),
                  }}
                />
              </Box>
              <Button
                onClick={handleAddProject}
                variant="outline"
                colorScheme="orange"
                size={"sm"}
                isDisabled={!selectedItem || !isWorkLogsExist}
                flexShrink={0}
              >
                Set project
              </Button>
            </Flex>
          </Flex>

          <Divider my={4} />

          <Flex
            gap={3}
            flexWrap="wrap"
            justifyContent="space-between"
            alignItems="center"
          >
            <Flex gap={2} alignItems={"center"}>
              <Button
                variant="outline"
                colorScheme="blue"
                size={"sm"}
                onClick={handleBulkUpdate}
                isDisabled={!isWorkLogsExist}
              >
                Match jira issues
              </Button>

              <Button
                variant="outline"
                colorScheme="purple"
                size={"sm"}
                onClick={handleClickUpBulkUpdate}
                isDisabled={!isWorkLogsExist}
              >
                Match ClickUp tasks
              </Button>

              {renderPopover()}
            </Flex>

            <Button
              variant="outline"
              colorScheme="red"
              size={"sm"}
              onClick={resetWorkLogs}
              isDisabled={!isWorkLogsExist}
            >
              Clear Cards
            </Button>
          </Flex>
        </CardBody>
      </Card>

      <Flex gap={3} justifyContent={"flex-end"} flexWrap="wrap">
        <ModalDialog
          headerTitle="Submitting to Jira"
          trigger={
            <Button
              isDisabled={!jiraUser || !isWorkLogsExist}
              colorScheme="blue"
              size="sm"
              minW="160px"
            >
              Submit cards to Jira
            </Button>
          }
          onConfirm={handleJiraSubmit}
        >
          <Text>
            Do you really want to submit{" "}
            <strong> {getTotalHoursFromObject(jiraWoklogs)} </strong>
            hours to <strong>Jira</strong>?
          </Text>
        </ModalDialog>

        <ModalDialog
          headerTitle="Submitting to ClickUp"
          trigger={
            <Button
              isDisabled={!clickUpUser || !isWorkLogsExist}
              colorScheme="purple"
              size="sm"
              minW="160px"
            >
              Submit cards to ClickUp
            </Button>
          }
          onConfirm={handleClickUpSubmit}
        >
          <Text>
            Do you really want to submit{" "}
            <strong>
              {getTotalHoursFromObject(filterWorklogsForClickUp(workLogs))}{" "}
            </strong>
            hours to <strong>ClickUp</strong>?
          </Text>
        </ModalDialog>

        <ModalDialog
          headerTitle="Submitting to Redmine"
          trigger={
            <Button
              isDisabled={
                !isWorklogHaveProject || !user?.id || !isWorkLogsExist
              }
              colorScheme="red"
              size="sm"
              minW="160px"
            >
              Submit cards to Redmine
            </Button>
          }
          onConfirm={handleRedmineSubmit}
        >
          <Text>
            Do you really want to submit{" "}
            <strong>{getTotalHoursFromObject(workLogs)} </strong>
            hours to <strong>Redmine</strong>?
          </Text>
        </ModalDialog>
      </Flex>
    </Stack>
  );
};

export default RedmineForm;
