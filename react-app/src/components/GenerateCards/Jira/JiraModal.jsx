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

import useJiraStore from "../../../store/jiraStore";
import useWorkLogsStore from "../../../store/worklogsStore";
import { getJiraWorklogIssues } from "../../../actions/jira";

const JiraModal = ({ isOpen, onClose }) => {
  const { user, organizationURL, additionalAssignedIssues } = useJiraStore();
  const { addWorkLogs, setIsJiraExport, resetWorkLogs } = useWorkLogsStore();

  const [range, setRange] = useState({ from: new Date(), to: new Date() });
  const [selectedUrls, setSelectedUrls] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const truncatedOrganizationUrl = organizationURL?.slice(
    8,
    organizationURL.length
  );

  const handleCheckboxChange = (url) => {
    setSelectedUrls((prevSelectedUrls) => ({
      ...prevSelectedUrls,
      [url]: !prevSelectedUrls[url],
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    resetWorkLogs();

    const startDate = format(range.from, "yyyy-MM-dd");
    const endDate = format(range.to, "yyyy-MM-dd");

    let allWorkLogs = {};

    for (const [url, isSelected] of Object.entries(selectedUrls)) {
      if (isSelected && user?.emailAddress) {
        const worklogs = await getJiraWorklogIssues(
          url,
          startDate,
          endDate,
          user?.emailAddress
        );

        for (const [date, logs] of Object.entries(worklogs)) {
          if (allWorkLogs[date]) {
            allWorkLogs[date] = [...allWorkLogs[date], ...logs];
          } else {
            allWorkLogs[date] = logs;
          }
        }
      }
    }

    addWorkLogs(allWorkLogs);
    setIsJiraExport(true);
    onClose();
    setIsLoading(false);
  };

  useEffect(() => {
    if (truncatedOrganizationUrl) {
      setSelectedUrls((prevSelectedUrls) => ({
        ...prevSelectedUrls,
        [truncatedOrganizationUrl]: true,
      }));
    }
  }, [organizationURL]);

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
          Select date range and URLs to export worklogs
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
            <Checkbox isChecked isDisabled size={"lg"}>
              <Link
                ml={2}
                color="blue.500"
                fontSize="md"
                href={organizationURL}
                target="_blank"
              >
                {truncatedOrganizationUrl}
              </Link>
            </Checkbox>
            {Object.keys(additionalAssignedIssues).map((url) => (
              <Checkbox
                key={url}
                isChecked={!!selectedUrls[url]}
                onChange={() => handleCheckboxChange(url)}
                size={"lg"}
              >
                <Link
                  ml={2}
                  color="blue.500"
                  fontSize="md"
                  href={url}
                  target="_blank"
                >
                  {url}
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
            Export worklogs
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default JiraModal;
