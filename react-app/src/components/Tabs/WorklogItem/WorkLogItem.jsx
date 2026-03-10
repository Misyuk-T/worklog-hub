import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Stack,
  Text,
  IconButton,
  Icon,
  Box,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";

import useJiraStore from "../../../store/jiraStore";
import useClickUpStore from "../../../store/clickupStore";
import useWorkLogsStore from "../../../store/worklogsStore";
import {
  getFormattedStringDate,
  getCorrectGMTDateObject,
} from "../../../helpers/getFormattedDate";
import {
  getIssueValue,
  getClickUpTaskValue,
} from "../../../helpers/transformToSelectData";
import { getAssignedTasks } from "../../../actions/clickup";

import DescriptionInput from "./DescriptionInput";
import DatePicker from "./DatePicker";
import HoursInput from "./HoursInput";
import StatusSwitch from "./StatusSwitch";
import ProjectsSelect from "./ProjectsSelect";
import IssuesSelect from "./IssuesSelect";
import JiraInstanceSelect from "./JiraInstanceSelect";
import ClickUpTeamSelect from "./ClickUpTeamSelect";
import ClickUpTaskSelect from "./ClickUpTaskSelect";

const handleNumbersValidate = (value) => {
  if (isNaN(value) || value > 8 || value <= 0) {
    return "Incorrect hours field";
  }
  return true;
};

const handleTextValidate = (value) => {
  if (value.length < 1) {
    return "Description can't be empty";
  }
  return true;
};

const WorkLogItem = ({ data }) => {
  const { assignedIssues, additionalAssignedIssues, organizationURL } =
    useJiraStore();
  const {
    assignedTasks: clickUpTasks,
    additionalAssignedTasks: additionalClickUpTasks,
    selectedTeamId,
    teams,
    user: clickUpUser,
    addAdditionalAssignedTasks,
  } = useClickUpStore();
  const { updateWorkLog, deleteWorkLog } = useWorkLogsStore();

  const truncatedOrganizationURL = organizationURL?.slice(
    8,
    organizationURL?.length,
  );

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    register,
    getValues,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      description: data.description,
      date: getCorrectGMTDateObject(data.date),
      project: data.project,
      hours: data.hours,
      blb: data.blb,
      task: getIssueValue(data.task, assignedIssues),
      jiraUrl: data.jiraUrl || truncatedOrganizationURL,
      clickupTeamId: data.clickupTeamId || selectedTeamId,
      clickupTask: getClickUpTaskValue(data.clickupTask, clickUpTasks),
    },
  });

  const [isEdited, setIsEdited] = useState(false);
  const originDate = useRef(data.date);

  const isNewTask = data.description === "New task";
  const isNotValidCard = Object.entries(errors).length;
  const borderCardColor = isNotValidCard
    ? "tomato"
    : isNewTask
      ? "blue.600"
      : "transparent";

  const mainJiraOptionItem = {
    value: truncatedOrganizationURL,
    label: truncatedOrganizationURL,
  };
  const jiraInstanceOptions = [
    mainJiraOptionItem,
    ...Object.keys(additionalAssignedIssues).map((url) => ({
      value: url,
      label: url,
    })),
  ];

  const selectedJiraUrl = getValues().jiraUrl?.value || watch("jiraUrl");
  const isMainOrganizationSelected =
    selectedJiraUrl === truncatedOrganizationURL;
  const assignedIssuesForSelectedJira = isMainOrganizationSelected
    ? assignedIssues
    : additionalAssignedIssues[selectedJiraUrl] || [];

  const clickUpTeamOptions = teams.map((team) => ({
    value: team.id,
    label: team.name || `Team ${team.id}`,
  }));

  const selectedClickUpTeamId =
    getValues().clickupTeamId?.value || watch("clickupTeamId");
  const isMainClickUpTeamSelected = selectedClickUpTeamId === selectedTeamId;
  const assignedTasksForSelectedTeam = isMainClickUpTeamSelected
    ? clickUpTasks
    : additionalClickUpTasks[selectedClickUpTeamId] || [];

  const handleCancel = () => {
    reset({
      description: data.description,
      date: getCorrectGMTDateObject(data.date),
      project: data.project,
      hours: data.hours,
      blb: data.blb,
      task: getIssueValue(data.task, assignedIssues),
      jiraUrl: data.jiraUrl || truncatedOrganizationURL,
      clickupTeamId: data.clickupTeamId || selectedTeamId,
      clickupTask: getClickUpTaskValue(data.clickupTask, clickUpTasks),
    });
    setIsEdited(false);
  };

  const handleSave = (formData) => {
    const {
      description,
      date,
      hours,
      blb,
      project,
      task,
      jiraUrl,
      clickupTeamId,
      clickupTask,
    } = formData;

    const updatedData = {
      ...data,
      description: description || data.description,
      date: getFormattedStringDate(date),
      hours: +hours || +data.hours,
      blb: blb || data.blb,
      project: project?.value || data.project,
      task: task?.value || "",
      jiraUrl: jiraUrl?.value || data.jiraUrl || organizationURL,
      clickupTeamId: clickupTeamId?.value || data.clickupTeamId,
      clickupTask: clickupTask?.value || data.clickupTask || "",
    };

    updateWorkLog(originDate.current, data.id, updatedData);
    setIsEdited(false);
  };

  const handleDelete = () => {
    deleteWorkLog(originDate.current, data.id);
  };

  useEffect(() => {
    setValue("blb", data.blb);
  }, [data.blb]);

  useEffect(() => {
    setValue("jiraUrl", data.jiraUrl);
  }, [data.jiraUrl]);

  useEffect(() => {
    setValue("task", getIssueValue(data.task, assignedIssues));
  }, [data.task]);

  useEffect(() => {
    setValue("clickupTeamId", data.clickupTeamId);
  }, [data.clickupTeamId]);

  useEffect(() => {
    setValue(
      "clickupTask",
      getClickUpTaskValue(data.clickupTask, clickUpTasks),
    );
  }, [data.clickupTask]);

  useEffect(() => {
    const teamId = data.clickupTeamId || selectedTeamId;
    if (teamId && teamId !== selectedTeamId && clickUpUser?.id) {
      if (!additionalClickUpTasks[teamId]) {
        getAssignedTasks(teamId, clickUpUser.id).then((tasks) => {
          addAdditionalAssignedTasks(teamId, tasks);
        });
      }
    }
  }, [data.clickupTeamId, selectedTeamId, clickUpUser, additionalClickUpTasks]);

  return (
    <Card
      borderWidth="2px"
      borderRadius="md"
      position="relative"
      p={3}
      pt={6}
      px={6}
      boxShadow="sm"
      bg="white"
      border="2px solid transparent"
      borderColor={borderCardColor}
    >
      <CardHeader position="relative" p={0} mb={2}>
        <IconButton
          colorScheme="red"
          position="absolute"
          size="xs"
          aria-label="delete"
          right={-5}
          top={-5}
          opacity={0.3}
          onClick={handleDelete}
          icon={<Icon as={DeleteIcon} />}
          _hover={{
            opacity: 1,
          }}
        />

        <Flex alignItems="flex-start" position="relative" minH="40px">
          <DescriptionInput
            register={register("description", {
              validate: handleTextValidate,
            })}
            defaultValue={data.description}
            value={watch("description")}
            onChange={(value) => {
              setValue("description", value.target.value);
              setIsEdited(true);
            }}
            error={errors?.description}
          />
        </Flex>
      </CardHeader>

      <CardBody as={Stack} gap={0} justifyContent="flex-end" p={0}>
        <Flex alignItems="center" mb={2}>
          <DatePicker
            defaultValue={data.date}
            value={watch("date")}
            control={control}
            onChange={(date) => {
              setValue("date", date);
              setIsEdited(true);
            }}
          />

          <Flex w="50%" alignItems="center">
            <Text m={0} mr={1}>
              <strong>Hours:</strong>
            </Text>
            <HoursInput
              register={register("hours", {
                validate: handleNumbersValidate,
              })}
              defaultValue={data.hours}
              value={watch("hours")}
              onChange={(value) => {
                setValue("hours", value);
                setIsEdited(true);
              }}
            />
          </Flex>
        </Flex>

        <Stack gap={2}>
          {/* Redmine Block */}
          <Box
            p={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor="red.200"
            bg="red.50"
          >
            <Text
              fontSize="xs"
              fontWeight="700"
              color="red.700"
              mb={1}
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Redmine
            </Text>
            <Flex alignItems="center" w="100%" gap={2}>
              <Text m={0} fontSize="xs" minW="50px" fontWeight="600">
                Project:
              </Text>
              <Box flex={1}>
                <ProjectsSelect
                  value={watch("project") || data.project}
                  control={control}
                  onChange={(project) => {
                    setValue("project", project);
                    setIsEdited(true);
                  }}
                />
              </Box>
            </Flex>
          </Box>

          {/* ClickUp Block */}
          <Box
            p={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor="purple.200"
            bg="purple.50"
          >
            <Text
              fontSize="xs"
              fontWeight="700"
              color="purple.700"
              mb={1}
              textTransform="uppercase"
              letterSpacing="wide"
            >
              ClickUp
            </Text>
            <Stack spacing={1}>
              <Flex alignItems="center" w="100%" gap={2}>
                <Text
                  m={0}
                  fontSize="xs"
                  minW="50px"
                  whiteSpace="nowrap"
                  fontWeight="600"
                >
                  Team:
                </Text>
                <Box flex={1}>
                  <ClickUpTeamSelect
                    control={control}
                    options={clickUpTeamOptions}
                    onChange={async (teamId) => {
                      setValue("clickupTeamId", teamId);
                      setIsEdited(true);
                      setValue("clickupTask", "");

                      const teamIdValue = teamId?.value;
                      if (
                        teamIdValue &&
                        teamIdValue !== selectedTeamId &&
                        clickUpUser?.id
                      ) {
                        if (!additionalClickUpTasks[teamIdValue]) {
                          const tasks = await getAssignedTasks(
                            teamIdValue,
                            clickUpUser.id,
                          );
                          addAdditionalAssignedTasks(teamIdValue, tasks);
                        }
                      }
                    }}
                    value={clickUpTeamOptions.find(
                      (item) => item.value === selectedClickUpTeamId,
                    )}
                  />
                </Box>
              </Flex>

              <Flex alignItems="center" w="100%" gap={2}>
                <Text
                  m={0}
                  fontSize="xs"
                  minW="50px"
                  whiteSpace="nowrap"
                  fontWeight="600"
                >
                  Task:
                </Text>
                <Box flex={1}>
                  <ClickUpTaskSelect
                    value={watch("clickupTask")}
                    control={control}
                    onChange={(task) => {
                      setValue("clickupTask", task);
                      setIsEdited(true);
                    }}
                    assignedTasks={assignedTasksForSelectedTeam}
                  />
                </Box>
              </Flex>
            </Stack>
          </Box>

          {/* Jira Block */}
          <Box
            p={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor="blue.200"
            bg="blue.50"
          >
            <Text
              fontSize="xs"
              fontWeight="700"
              color="blue.700"
              mb={1}
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Jira
            </Text>
            <Stack spacing={1}>
              <Flex alignItems="center" w="100%" gap={2}>
                <Text
                  m={0}
                  fontSize="xs"
                  minW="50px"
                  whiteSpace="nowrap"
                  fontWeight="600"
                >
                  URL:
                </Text>
                <Box flex={1}>
                  <JiraInstanceSelect
                    control={control}
                    options={jiraInstanceOptions}
                    onChange={(jiraUrl) => {
                      setValue("jiraUrl", jiraUrl);
                      setIsEdited(true);
                      setValue("task", "");
                    }}
                    value={jiraInstanceOptions.find(
                      (item) => item.value === selectedJiraUrl,
                    )}
                  />
                </Box>
              </Flex>

              <Flex alignItems="center" w="100%" gap={2}>
                <Text
                  m={0}
                  fontSize="xs"
                  minW="50px"
                  whiteSpace="nowrap"
                  fontWeight="600"
                >
                  Issue:
                </Text>
                <Box flex={1}>
                  <IssuesSelect
                    jiraUrl={selectedJiraUrl}
                    value={watch("task")}
                    control={control}
                    onChange={(task) => {
                      setValue("task", task);
                      setIsEdited(true);
                    }}
                    assignedIssues={assignedIssuesForSelectedJira}
                  />
                </Box>
              </Flex>
            </Stack>
          </Box>
        </Stack>

        <Flex alignItems="center" justifyContent="space-between" mt={2}>
          <Controller
            name="blb"
            control={control}
            render={({ field }) => {
              return (
                <StatusSwitch
                  value={watch("blb")}
                  onChange={(value) => {
                    field.onChange(value);
                    setIsEdited(true);
                  }}
                />
              );
            }}
          />

          {isEdited && (
            <ButtonGroup justifyContent="center" size="sm">
              <Button
                disabled={!isValid}
                colorScheme="teal"
                type="submit"
                onClick={handleSubmit(handleSave)}
                mr={2}
              >
                Save
              </Button>
              <Button color="tomato" onClick={handleCancel}>
                Cancel
              </Button>
            </ButtonGroup>
          )}
        </Flex>
      </CardBody>

      <Text
        fontSize="sm"
        m={0}
        fontWeight={400}
        color="tomato"
        position="absolute"
        top="100%"
      >
        {errors?.description && errors?.description.message}
        <br />
        {errors?.hours && errors?.hours.message}
      </Text>
    </Card>
  );
};

export default WorkLogItem;
