import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";

import {
  Button,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

import useRedmineStore from "../../../store/redmineStore";
import useWorkLogsStore from "../../../store/worklogsStore";
import {
  getLatestRedmineWorkLogs,
  transformRedmineWorkLogsToCards,
} from "../../../actions/redmine";

const RedmineModal = ({ isOpen, onClose }) => {
  const { user, organizationURL } = useRedmineStore();
  const {
    addWorkLogs,
    resetWorkLogs,
    setIsJiraExport,
    setIsClickUpExport,
  } = useWorkLogsStore();

  const [range, setRange] = useState({ from: new Date(), to: new Date() });
  const [isLoading, setIsLoading] = useState(false);

  const border = useColorModeValue("gray.200", "gray.700");

  const handleSubmit = async () => {
    if (!user?.id || !range?.from || !range?.to) return;

    setIsLoading(true);
    resetWorkLogs();

    const startDate = format(range.from, "yyyy-MM-dd");
    const endDate = format(range.to, "yyyy-MM-dd");
    const redmineWorkLogs = await getLatestRedmineWorkLogs(
      user.id,
      startDate,
      endDate,
    );

    addWorkLogs(transformRedmineWorkLogsToCards(redmineWorkLogs || []));
    setIsJiraExport(false);
    setIsClickUpExport(false);
    onClose();
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent borderRadius="0" borderWidth="1px" borderColor={border}>
        <ModalHeader
          w="100%"
          p={5}
          borderBottomWidth="1px"
          borderBottomColor={border}
          textAlign="center"
          fontSize="xs"
          fontWeight={700}
          letterSpacing="0.08em"
          textTransform="uppercase"
        >
          Select date range to generate Redmine cards
        </ModalHeader>
        <ModalCloseButton />

        <Stack as={ModalBody} alignItems="center" mb={3} px={5}>
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
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Cards will be generated from your Redmine time entries
            {organizationURL ? (
              <>
                {" "}
                in{" "}
                <Link color="blue.500" href={organizationURL} isExternal>
                  {organizationURL.replace(/^https?:\/\//, "")}
                </Link>
              </>
            ) : null}
            .
          </Text>
        </Stack>

        <ModalFooter borderTopWidth="1px" borderTopColor={border} pt={4}>
          <Button
            borderRadius="0"
            h="34px"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            onClick={handleSubmit}
            isDisabled={!user?.id || !range?.from || !range?.to}
            isLoading={isLoading}
            loadingText="Generating..."
          >
            Generate cards
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RedmineModal;
