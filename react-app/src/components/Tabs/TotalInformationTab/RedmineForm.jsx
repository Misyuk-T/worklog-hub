import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormLabel,
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
} from "@chakra-ui/react";
import Select from "react-select";

import useWorkLogsStore from "../../../store/worklogsStore";
import useRedmineStore from "../../../store/redmineStore";
import useJiraStore from "../../../store/jiraStore";

import {
  getLatestRedmineWorkLogs,
  trackTimeToRedmine,
} from "../../../actions/redmine";
import {
  createJiraWorklogs,
  getLatestJiraWorkLogs,
} from "../../../actions/jira";
import { transformToProjectData } from "../../../helpers/transformToSelectData";
import { getTotalHoursFromObject } from "../../../helpers/getHours";
import { filterWorklogsByTask } from "../../../helpers/filterWorklogsForJira";

import ModalDialog from "../../ModalDialog";
import { QuestionIcon } from "@chakra-ui/icons";

const renderPopover = () => {
  return (
    <Popover boundary="scrollParent" size={"xl"}>
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
            This button will attempt to match Jira issues to card descriptions,
            but only if the description starts with a valid task ID (e.g.,
            <strong>CE-580:</strong> some text here).
          </Text>
          <Text mt={2}>
            If a match is found, the card will be linked to the corresponding
            Jira issue. If no match exists, nothing will happen.
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
    resetWorkLogs,
  } = useWorkLogsStore();
  const { projects, resetLatestActivity, addLatestActivity, user } =
    useRedmineStore();
  const {
    user: jiraUser,
    assignedIssues,
    additionalAssignedIssues,
  } = useJiraStore();

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
      ...assignedIssues, // Main Jira issues
      ...Object.values(additionalAssignedIssues).flat(),
    ];
    bulkUpdateWorkLogsWithJira(allJiraIssues);
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
    // await getLatestJiraWorkLogs();
  };

  return (
    <Stack mt={5} gap={"10px"} justifyContent="space-between">
      <Stack p={"10px"} bg={"gray.50"} borderRadius={"5px"} gap={"20px"}>
        <Text textTransform={"uppercase"} fontSize={13} fontWeight={500}>
          Bulk edit block: functionality here will edit all existing cards
        </Text>

        <Flex gap={8} alignItems="center">
          <Flex alignItems="center" gap={3}>
            <FormLabel
              htmlFor="blb"
              fontSize={"15px"}
              mb={"2px"}
              fontWeight={400}
            >
              Billability toggle:
            </FormLabel>
            <Switch
              id="blb"
              isDisabled={!user?.id || !isWorkLogsExist}
              onChange={handleBlbStatus}
              size="md"
            />
          </Flex>

          <Flex gap={3} alignItems={"center"}>
            <Box w="300px">
              <Select
                value={selectedItem}
                onChange={setSelectedItem}
                options={formattedProjectData}
                placeholder="Select redmine project ..."
                menuPlacement="auto"
                styles={{
                  control: (baseStyles) => ({
                    ...baseStyles,
                    minHeight: "37px !important",
                    height: "37px !important",
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
            >
              Set project
            </Button>
          </Flex>

          <Flex ml={"auto"} gap={"30px"}>
            <Flex alignItems={"center"}>
              <Button
                color={"blue"}
                border={"1px solid blue"}
                bg={"white"}
                size={"sm"}
                onClick={handleBulkUpdate}
                isDisabled={!isWorkLogsExist}
              >
                Match jira issues
              </Button>
              {renderPopover()}
            </Flex>

            <Flex alignItems={"center"}>
              <Button
                colorScheme={"red"}
                onClick={resetWorkLogs}
                size={"sm"}
                isDisabled={!isWorkLogsExist}
              >
                Clear Cards
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Stack>

      <Flex gap={5} mt={"20px"} justifyContent={"end"}>
        <ModalDialog
          headerTitle="Submitting to Jira"
          trigger={
            <Button
              isDisabled={!jiraUser || !isWorkLogsExist}
              colorScheme="blue"
              size="md"
            >
              Submit cards to jira
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
          headerTitle="Submitting to Redmine"
          trigger={
            <Button
              isDisabled={
                !isWorklogHaveProject || !user?.id || !isWorkLogsExist
              }
              colorScheme="teal"
              size="md"
            >
              Submit cards to redmine
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
