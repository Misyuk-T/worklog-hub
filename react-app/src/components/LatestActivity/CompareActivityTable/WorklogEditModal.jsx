import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import Select from "react-select";

import useRedmineStore from "../../../store/redmineStore";
import useJiraStore from "../../../store/jiraStore";
import useClickUpStore from "../../../store/clickupStore";
import {
  updateRedmineTimeEntry,
  deleteRedmineTimeEntry,
} from "../../../actions/redmine";
import {
  updateJiraWorklog,
  deleteJiraWorklog,
  replaceJiraWorklogIssue,
} from "../../../actions/jira";
import {
  updateClickUpTimeEntry,
  deleteClickUpTimeEntry,
} from "../../../actions/clickup";
import {
  transformToProjectData,
  getProjectValue,
  transformToIssueData,
  getIssueValue,
  transformToClickUpTaskData,
  getClickUpTaskValue,
} from "../../../helpers/transformToSelectData";
import { round } from "../../../helpers/getHours";

const SOURCE_LABELS = {
  redmine: "Redmine",
  jira: "Jira",
  clickup: "ClickUp",
};

const WorklogEditModal = ({ isOpen, onClose, log, onMutated }) => {
  const toast = useToast();
  const { projects } = useRedmineStore();
  const { assignedIssues, additionalAssignedIssues } = useJiraStore();
  const { assignedTasks, additionalAssignedTasks } = useClickUpStore();

  const [description, setDescription] = useState("");
  const [taskOption, setTaskOption] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const source = log?.source;

  // Task option list + the log's current task option, per source.
  const { taskOptions, currentTaskOption, taskLabel } = useMemo(() => {
    if (!log) return { taskOptions: [], currentTaskOption: null, taskLabel: "" };

    if (source === "redmine") {
      return {
        taskOptions: transformToProjectData(projects),
        currentTaskOption: getProjectValue(log.issue?.id, projects),
        taskLabel: "Issue",
      };
    }

    if (source === "jira") {
      const extra = additionalAssignedIssues?.[log.jiraUrl] || [];
      const issues = [...(assignedIssues || []), ...extra];
      return {
        taskOptions: transformToIssueData(issues),
        currentTaskOption: getIssueValue(log.issueKey || log.task, issues),
        taskLabel: "Issue",
      };
    }

    if (source === "clickup") {
      const teamId = log.teamId || log.clickupTeamId;
      const extra = additionalAssignedTasks?.[teamId] || [];
      const tasks = [...(assignedTasks || []), ...extra];
      return {
        taskOptions: transformToClickUpTaskData(tasks),
        currentTaskOption: getClickUpTaskValue(log.clickupTask, tasks),
        taskLabel: "Task",
      };
    }

    return { taskOptions: [], currentTaskOption: null, taskLabel: "" };
  }, [
    log,
    source,
    projects,
    assignedIssues,
    additionalAssignedIssues,
    assignedTasks,
    additionalAssignedTasks,
  ]);

  // Seed the form when the modal opens or the targeted log changes. Keyed on the
  // log's real identity (not object reference) so typing isn't clobbered on
  // every re-render, and so reopening on a different row loads fresh values.
  const logKey = log ? `${source}:${log.worklogId || log.id}` : null;
  const currentTaskOptionRef = useRef(currentTaskOption);
  currentTaskOptionRef.current = currentTaskOption;

  useEffect(() => {
    if (!isOpen || !log) return;
    setDescription(log.description ?? "");
    setTaskOption(currentTaskOptionRef.current);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, logKey]);

  const handleClose = () => {
    setConfirmDelete(false);
    onClose();
  };

  // Jira edits/deletes need the real worklog id, which older cached fetches
  // may lack. Block mutation instead of hitting the wrong endpoint.
  const jiraIdMissing = source === "jira" && !log?.worklogId;
  const taskChanged =
    taskOption && taskOption.value !== currentTaskOption?.value;

  const handleSave = async () => {
    if (!log) return;
    try {
      setSaving(true);

      if (source === "redmine") {
        await updateRedmineTimeEntry({
          id: log.id,
          comments: description,
          // value is 0 ("undefined" sentinel) when projects aren't loaded —
          // don't overwrite the entry's issue with an invalid id in that case.
          issueId: taskOption?.value || undefined,
          activityId: log.activity?.id,
        });
      } else if (source === "clickup") {
        await updateClickUpTimeEntry({
          teamId: log.teamId || log.clickupTeamId,
          id: log.id,
          description,
          taskId: taskChanged ? taskOption?.value : undefined,
        });
      } else if (source === "jira") {
        const oldIssueKey = log.issueKey || log.task;
        if (taskChanged) {
          await replaceJiraWorklogIssue({
            oldIssueKey,
            worklogId: log.worklogId,
            newIssueKey: taskOption.value,
            description,
            timeSpentSeconds: log.timeSpentSeconds,
            started: log.started,
            jiraUrl: log.jiraUrl,
          });
        } else {
          await updateJiraWorklog({
            issueKey: oldIssueKey,
            worklogId: log.worklogId,
            description,
            timeSpentSeconds: log.timeSpentSeconds,
            started: log.started,
            jiraUrl: log.jiraUrl,
          });
        }
      }

      toast({
        title: `${SOURCE_LABELS[source]} worklog updated`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "bottom-center",
      });
      handleClose();
      await onMutated?.();
    } catch (error) {
      console.error("Error while updating worklog:", error);
      toast({
        title: "Failed to update worklog",
        description: error?.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-center",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!log) return;
    try {
      setDeleting(true);

      if (source === "redmine") {
        await deleteRedmineTimeEntry(log.id);
      } else if (source === "clickup") {
        await deleteClickUpTimeEntry({
          teamId: log.teamId || log.clickupTeamId,
          id: log.id,
        });
      } else if (source === "jira") {
        await deleteJiraWorklog({
          issueKey: log.issueKey || log.task,
          worklogId: log.worklogId,
          jiraUrl: log.jiraUrl,
        });
      }

      toast({
        title: `${SOURCE_LABELS[source]} worklog deleted`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "bottom-center",
      });
      handleClose();
      await onMutated?.();
    } catch (error) {
      console.error("Error while deleting worklog:", error);
      toast({
        title: "Failed to delete worklog",
        description: error?.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-center",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!log) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Edit {SOURCE_LABELS[source]} worklog
          <Text fontSize="12px" fontWeight={400} color="gray.500">
            {log.date} · {round(log.hours)}h
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {jiraIdMissing && (
            <Alert status="warning" mb={4} fontSize="13px" borderRadius="md">
              <AlertIcon />
              This worklog was loaded before edit support was added. Re-run
              Compare to enable editing/deleting it.
            </Alert>
          )}

          <FormControl mb={4}>
            <FormLabel fontSize="14px">{taskLabel}</FormLabel>
            <Select
              value={taskOption}
              onChange={setTaskOption}
              options={taskOptions}
              menuPortalTarget={document.body}
              menuPlacement="auto"
              placeholder="Select task"
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 2000 }),
              }}
            />
            {source === "jira" && taskChanged && (
              <Text fontSize="12px" color="orange.500" mt={1}>
                Jira can't move a worklog — it will be recreated on the new issue
                and the old one deleted.
              </Text>
            )}
          </FormControl>

          <FormControl>
            <FormLabel fontSize="14px">Description</FormLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              fontSize="14px"
            />
          </FormControl>
        </ModalBody>

        <ModalFooter justifyContent="space-between">
          {confirmDelete ? (
            <Button
              colorScheme="red"
              variant="solid"
              isLoading={deleting}
              onClick={handleDelete}
              isDisabled={jiraIdMissing}
              size="sm"
            >
              Confirm delete
            </Button>
          ) : (
            <Button
              colorScheme="red"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              isDisabled={jiraIdMissing}
              size="sm"
            >
              Delete
            </Button>
          )}

          <div>
            <Button variant="ghost" mr={3} onClick={handleClose} size="sm">
              Cancel
            </Button>
            <Button
              colorScheme="teal"
              isLoading={saving}
              onClick={handleSave}
              isDisabled={jiraIdMissing}
              size="sm"
            >
              Save
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WorklogEditModal;
