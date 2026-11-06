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
  Portal,
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
import { DEMO_BUILD } from "../../../demo/demoMode";
import { QuestionOutlineIcon } from "@chakra-ui/icons";
import RedminePrefixMappings from "./RedminePrefixMappings";

const ControlHelp = ({ control, children }) => (
  <Popover placement="top">
    <PopoverTrigger>
      <IconButton
        size="xs" variant="ghost" borderRadius={0}
        aria-label={`What does ${control} do?`}
        icon={<QuestionOutlineIcon />}
      />
    </PopoverTrigger>
    <Portal>
      <PopoverContent borderRadius={0} maxW="calc(100vw - 24px)" fontSize="sm">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverBody pr={8}>{children}</PopoverBody>
      </PopoverContent>
    </Portal>
  </Popover>
);

const BulkRow = ({ label, children }) => (
  <Flex gap={3} direction={{ base: "column", md: "row" }} alignItems={{ base: "stretch", md: "center" }}>
    <Text fontSize="sm" fontWeight={600} minW="90px">{label}</Text>
    <Flex gap={3} alignItems="center" flexWrap="wrap" minW={0} flex={1}>{children}</Flex>
  </Flex>
);

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
  const clickUpWorklogs = filterWorklogsForClickUp(workLogs, selectedTeamId);
  const clickUpHours = getTotalHoursFromObject(clickUpWorklogs);
  const allCards = Object.values(workLogs || {}).flat();
  const cardsWithoutClickUpTask = allCards.filter((card) => !card.clickupTask).length;
  const cardsWithoutClickUpTeam = allCards.filter(
    (card) => card.clickupTask && !card.clickupTeamId && !selectedTeamId
  ).length;
  const formattedProjectData = transformToProjectData(projects);
  const worklogsArray = workLogs && Object.entries(workLogs);
  const isWorkLogsExist = worklogsArray?.length > 0;
  const isWorklogHaveProject =
    isWorkLogsExist && worklogsArray[0][1][0].project;

  const handleBulkUpdate = async () => {
    if (!jiraUser) {
      toast.info("Jira is not set up in settings.");
      return;
    }
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
    if (DEMO_BUILD) {
      // Jira keys in descriptions would be looked up as ClickUp ids over the network.
      toast.info("Demo: the cards already point at their ClickUp tasks.");
      return;
    }
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
      // The demo sent nothing, so there is nothing new to read back.
      if (DEMO_BUILD) return;
      resetLatestActivity();
      addLatestActivity(await getLatestRedmineWorkLogs(user.id));
    });
  };

  const handleJiraSubmit = async () => {
    await createJiraWorklogs(jiraWoklogs);
    await getLatestJiraWorkLogs();
  };

  const handleClickUpSubmit = async () => {
    await createClickUpTimeEntries(clickUpWorklogs);
    await getLatestClickUpTimeEntries();
  };

  return (
    <Stack spacing={4}>
      <Card boxShadow="sm" sx={{ borderRadius: "0" }}>
        <CardBody>
          <Text fontWeight={700}>Bulk edit</Text>
          <Text fontSize="sm" color="gray.600" mb={4}>Applies to every card in all tabs</Text>
          <Stack spacing={3} sx={{ button: { borderRadius: 0 }, "button:not([aria-label])": { height: "32px" } }}>
            <BulkRow label="Billability">
              <Flex alignItems="center" gap={1} minH="32px">
                <Switch
                  id="blb" aria-label="Billability toggle" size="sm"
                  isDisabled={!user?.id || !isWorkLogsExist}
                  onChange={handleBlbStatus}
                />
                <ControlHelp control="Billability toggle">Marks every card billable or non-billable.</ControlHelp>
              </Flex>
            </BulkRow>
            <BulkRow label="Redmine">
              <Box
                flex={1}
                maxW="360px"
                minW={{ base: "100%", md: "220px" }}
              >
                <Select
                  aria-label="Redmine project"
                  value={selectedItem}
                  onChange={setSelectedItem}
                  options={formattedProjectData}
                  placeholder="Select redmine project ..."
                  menuPlacement="top"
                  styles={{
                    control: (baseStyles) => ({
                      ...baseStyles,
                      borderRadius: 0,
                      minHeight: "32px",
                      height: "32px",
                      fontSize: "14px",
                    }),
                    valueContainer: (baseStyles) => ({
                      ...baseStyles,
                      padding: "0 8px",
                      height: "30px",
                      display: "flex",
                      alignItems: "center",
                    }),
                    placeholder: (baseStyles) => ({
                      ...baseStyles,
                      fontSize: "14px",
                      minWidth: 0,
                      maxWidth: "100%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }),
                    singleValue: (baseStyles) => ({
                      ...baseStyles,
                      fontSize: "14px",
                      minWidth: 0,
                      maxWidth: "100%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }),
                    indicatorsContainer: (baseStyles) => ({
                      ...baseStyles,
                      height: "30px",
                    }),
                    dropdownIndicator: (baseStyles) => ({
                      ...baseStyles,
                      padding: "4px",
                    }),
                    menuList: (baseStyles) => ({
                      ...baseStyles,
                      maxHeight: "250px",
                    }),
                  }}
                />
              </Box>
              <Flex alignItems="center" gap={1}>
                <Button onClick={handleAddProject} variant="outline" colorScheme="orange" size="sm" isDisabled={!selectedItem || !isWorkLogsExist}>
                  Set project
                </Button>
                <ControlHelp control="Set project">Sets the chosen Redmine project on every card.</ControlHelp>
              </Flex>
              <Flex alignItems="center" gap={1}>
                <RedminePrefixMappings />
                <ControlHelp control="Mappings">Links description prefixes (e.g. CP-) to Redmine tasks. Open Mappings, choose tasks, then apply the rules to matching cards; existing assignments can be kept.</ControlHelp>
              </Flex>
            </BulkRow>
            <BulkRow label="Match">
              <Flex alignItems="center" gap={1}>
                <Button variant="outline" colorScheme="blue" size="sm" onClick={handleBulkUpdate} isDisabled={!isWorkLogsExist || isMatchingJira} isLoading={isMatchingJira}>
                  Match jira issues
                </Button>
                <ControlHelp control="Match jira issues">Links descriptions starting with Jira keys (e.g. CE-580:) to issues, loading missing issues even when you are no longer assigned. Uses the card's Jira instance; cards on the main instance can also match a unique issue on another configured instance.</ControlHelp>
              </Flex>
              <Flex alignItems="center" gap={1}>
                <Button variant="outline" colorScheme="purple" size="sm" onClick={handleClickUpBulkUpdate} isDisabled={!isWorkLogsExist || isMatchingClickUp} isLoading={isMatchingClickUp}>
                  Match ClickUp tasks
                </Button>
                <ControlHelp control="Match ClickUp tasks">Links descriptions starting with ClickUp task IDs (e.g. CP-47:) to tasks in the card's team, falling back to the team selected in Settings. Missing tasks are loaded from ClickUp; in the demo this action only shows a notice.</ControlHelp>
              </Flex>
            </BulkRow>
            <Divider />
            <Flex alignItems="center" gap={1} justifyContent="flex-end">
              <Button variant="outline" colorScheme="red" size="sm" onClick={resetWorkLogs} isDisabled={!isWorkLogsExist}>Clear Cards</Button>
              <ControlHelp control="Clear cards">Removes all cards from this page. Nothing is deleted in Redmine, Jira or ClickUp.</ControlHelp>
            </Flex>
          </Stack>
        </CardBody>
      </Card>

      <Flex
        gap={3}
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        maxW={{ base: "calc(100vw - 32px)", sm: "calc(100vw - 48px)" }}
      >
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
            isConfirmDisabled={clickUpHours === 0}
          >
            <Text>
              Do you really want to submit{" "}
              <strong>
                {clickUpHours}{" "}
              </strong>
              hours to <strong>ClickUp</strong>?
            </Text>
            {cardsWithoutClickUpTask > 0 && (
              <Text mt={2}>
                {cardsWithoutClickUpTask} of {allCards.length} cards have no ClickUp task and will be skipped.
              </Text>
            )}
            {cardsWithoutClickUpTeam > 0 && (
              <Text mt={2}>
                {cardsWithoutClickUpTeam} of {allCards.length} cards have no ClickUp team and will be skipped. Select a team in Settings or on the card.
              </Text>
            )}
            {clickUpHours === 0 && (
              <Text mt={2}>
                {allCards.every((card) => !card.clickupTask)
                  ? "No cards have a ClickUp task yet."
                  : "No hours are available to submit to ClickUp."}
              </Text>
            )}
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
