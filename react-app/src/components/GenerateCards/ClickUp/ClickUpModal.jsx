import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";

import {
  Button,
  Checkbox,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
} from "@chakra-ui/react";

import useClickUpStore from "../../../store/clickupStore";
import useWorkLogsStore from "../../../store/worklogsStore";
import { getClickUpTimeEntries } from "../../../actions/clickup";

const ClickUpModal = ({ isOpen, onClose }) => {
  const { user, selectedTeamId, additionalAssignedTasks } = useClickUpStore();
  const { addWorkLogs, setIsClickUpExport, resetWorkLogs } = useWorkLogsStore();

  const [range, setRange] = useState({ from: new Date(), to: new Date() });
  const [selectedTeams, setSelectedTeams] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckboxChange = (teamId) => {
    setSelectedTeams((prevSelectedTeams) => ({
      ...prevSelectedTeams,
      [teamId]: !prevSelectedTeams[teamId],
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    resetWorkLogs();

    const startDate = format(range.from, "yyyy-MM-dd");
    const endDate = format(range.to, "yyyy-MM-dd");

    let allWorkLogs = {};

    for (const [teamId, isSelected] of Object.entries(selectedTeams)) {
      if (isSelected && user?.id) {
        const timeEntries = await getClickUpTimeEntries(
          teamId,
          startDate,
          endDate,
          user.id,
          false
        );

        for (const [date, entries] of Object.entries(timeEntries)) {
          if (allWorkLogs[date]) {
            allWorkLogs[date] = [...allWorkLogs[date], ...entries];
          } else {
            allWorkLogs[date] = entries;
          }
        }
      }
    }

    addWorkLogs(allWorkLogs);
    setIsClickUpExport(true);
    onClose();
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedTeamId) {
      setSelectedTeams((prevSelectedTeams) => ({
        ...prevSelectedTeams,
        [selectedTeamId]: true,
      }));
    }
  }, [selectedTeamId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader
          w="100%"
          p="20px 30px"
          borderBottom="1px solid"
          borderColor="gray.300"
          mb="20px"
          textAlign={"center"}
        >
          Select date range and teams to export time entries
        </ModalHeader>
        <ModalCloseButton />

        <Stack as={ModalBody} alignItems="center" mb={3}>
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            styles={{
              head_cell: {
                width: "50px",
                height: "50px",
                margin: 0,
                button: { margin: 0 },
              },
              table: {
                maxWidth: "none",
                margin: 0,
              },
              day: {
                display: "block",
                width: "50px",
                maxWidth: "50px",
                height: "50px",
                margin: "0",
              },
            }}
          />
          <Stack spacing={3} w={"100%"} maxW={"280px"}>
            {selectedTeamId && (
              <Checkbox isChecked isDisabled size={"lg"}>
                <Link
                  ml={2}
                  color="blue.500"
                  fontSize="md"
                  href={`https://app.clickup.com/${selectedTeamId}`}
                  target="_blank"
                >
                  Team {selectedTeamId}
                </Link>
              </Checkbox>
            )}
            {Object.keys(additionalAssignedTasks).map((teamId) => (
              <Checkbox
                key={teamId}
                isChecked={!!selectedTeams[teamId]}
                onChange={() => handleCheckboxChange(teamId)}
                size={"lg"}
              >
                <Link
                  ml={2}
                  color="blue.500"
                  fontSize="md"
                  href={`https://app.clickup.com/${teamId}`}
                  target="_blank"
                >
                  Team {teamId}
                </Link>
              </Checkbox>
            ))}
          </Stack>
        </Stack>

        <ModalFooter>
          <Button
            colorScheme="teal"
            onClick={handleSubmit}
            isDisabled={!range?.from || !range?.to}
            isLoading={isLoading}
            loadingText="Exporting..."
          >
            Export time entries
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ClickUpModal;
