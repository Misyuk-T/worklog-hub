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
import { toast } from "react-toastify";

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
  getJiraIssueByKey,
  getLatestJiraWorkLogs,
} from "../../../actions/jira";
import {
  createClickUpTimeEntries,
  getClickUpTaskById,
  getLatestClickUpTimeEntries,
} from "../../../actions/clickup";
import { transformToProjectData } from "../../../helpers/transformToSelectData";
import { getTotalHoursFromObject } from "../../../helpers/getHours";
import { filterWorklogsByTask } from "../../../helpers/filterWorklogsForJira";
import { filterWorklogsForClickUp } from "../../../helpers/filterWorklogsForClickUp";
import {
  buildJiraIssuePool,
  collectScopedTaskCodes,
  countUnscopedTaskCodes,
  formatMissingJiraCodes,
  normalizeServiceScope,
  resolveMissingJiraIssues,
  resolveMissingScopedItems,
} from "../../../helpers/matchWorklogTasks";

import ModalDialog from "../../ModalDialog";
import { QuestionIcon } from "@chakra-ui/icons";
import RedminePrefixMappings from "./RedminePrefixMappings";

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
            Missing items are loaded from the Jira instance or ClickUp team
            selected on each card, including items no longer assigned to you.
            Matching only reads issue/task details; it does not create remote
            worklogs.
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
    organizationURL,
    addFetchedIssue,
  } = useJiraStore();
  const {
    user: clickUpUser,
    assignedTasks: clickUpTasks,
    additionalAssignedTasks: additionalClickUpTasks,
    manualTasks,
    selectedTeamId,
    addManualTask,
  } = useClickUpStore();

  const [selectedItem, setSelectedItem] = useState(null);
  const [isBlbLog, setIsBlbLog] = useState(false);
  const [isMatchingJira, setIsMatchingJira] = useState(false);
  const [isMatchingClickUp, setIsMatchingClickUp] = useState(false);

  const jiraWoklogs = filterWorklogsByTask(workLogs);
  const formattedProjectData = transformToProjectData(projects);
  const worklogsArray = workLogs && Object.entries(workLogs);
  const isWorkLogsExist = worklogsArray?.length > 0;
  const isWorklogHaveProject =
    isWorkLogsExist && worklogsArray[0][1][0].project;

  const handleBulkUpdate = async () => {
    setIsMatchingJira(true);
    try {
      const mainJiraUrl = normalizeServiceScope(organizationURL);
      const allJiraIssues = buildJiraIssuePool(
        assignedIssues,
        additionalAssignedIssues,
        mainJiraUrl
      );
      const { notFound } = await resolveMissingJiraIssues({
        workLogs,
        issues: allJiraIssues,
        mainJiraUrl,
        instanceUrls: Object.keys(additionalAssignedIssues),
        load: getJiraIssueByKey,
        onLoaded: (issue, jiraUrl) => addFetchedIssue(jiraUrl, issue),
      });

      bulkUpdateWorkLogsWithJira(allJiraIssues, mainJiraUrl);
      if (notFound.length) {
        toast.warning(formatMissingJiraCodes(notFound));
      }
    } finally {
      setIsMatchingJira(false);
    }
  };

  const handleClickUpBulkUpdate = async () => {
    setIsMatchingClickUp(true);
    try {
      const allClickUpTasks = [
        ...clickUpTasks.map((task) => ({
          ...task,
          teamId: task.teamId || selectedTeamId,
        })),
        ...Object.values(additionalClickUpTasks).flat(),
        ...Object.values(manualTasks).flat(),
      ];
      const scopedCodes = collectScopedTaskCodes(
        workLogs,
        (workLog) => workLog.clickupTeamId || selectedTeamId
      );
      const missingScope = countUnscopedTaskCodes(
        workLogs,
        (workLog) => workLog.clickupTeamId || selectedTeamId
      );
      const { failed: failedLookups } = await resolveMissingScopedItems({
        scopedCodes,
        items: allClickUpTasks,
        getScope: (task) => task.teamId,
        load: (code, teamId) => getClickUpTaskById(code, teamId, false),
        withScope: (task, teamId) => ({
          ...task,
          teamId: task.teamId || teamId,
        }),
        onLoaded: (task, teamId) => addManualTask(teamId, task),
      });

      bulkUpdateWorkLogsWithClickUp(allClickUpTasks, selectedTeamId);
      if (failedLookups) {
        toast.warning(
          `${failedLookups} ClickUp task(s) could not be loaded. Check access and task codes.`
        );
      }
      if (missingScope) {
        toast.info(
          `${missingScope} card(s) need a ClickUp team before matching.`
        );
      }
    } finally {
      setIsMatchingClickUp(false);
    }
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
                  menuPlacement="top"
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
                    menuList: (baseStyles) => ({
                      ...baseStyles,
                      maxHeight: "250px",
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
                isDisabled={!isWorkLogsExist || isMatchingJira}
                isLoading={isMatchingJira}
              >
                Match jira issues
              </Button>

              <Button
                variant="outline"
                colorScheme="purple"
                size={"sm"}
                onClick={handleClickUpBulkUpdate}
                isDisabled={!isWorkLogsExist || isMatchingClickUp}
                isLoading={isMatchingClickUp}
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

      <Flex
        gap={3}
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        maxW={{ base: "calc(100vw - 32px)", sm: "calc(100vw - 48px)" }}
      >
        <RedminePrefixMappings />
        <Flex
          gap={3}
          ml="auto"
          justifyContent="flex-end"
          flexWrap="wrap"
          minW={0}
        >
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
      </Flex>
    </Stack>
  );
};

export default RedmineForm;
