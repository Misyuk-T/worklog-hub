import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { toast } from "react-toastify";

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
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

import useJiraStore from "../../../store/jiraStore";
import useWorkLogsStore from "../../../store/worklogsStore";
import { captureCredentials } from "../../../actions/axios";
import { getJiraWorklogIssues } from "../../../actions/jira";

const JiraModal = ({ isOpen, onClose }) => {
  const { user, organizationURL, additionalAssignedIssues } = useJiraStore();
  const { addWorkLogs, setIsJiraExport, resetWorkLogs } = useWorkLogsStore();

  const [range, setRange] = useState({ from: new Date(), to: new Date() });
  const [selectedUrls, setSelectedUrls] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const border = useColorModeValue("gray.200", "gray.700");

  const truncatedOrganizationUrl = organizationURL?.slice(
    8,
    organizationURL.length,
  );

  const handleCheckboxChange = (url) => {
    setSelectedUrls((prevSelectedUrls) => ({
      ...prevSelectedUrls,
      [url]: !prevSelectedUrls[url],
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const notify = (type, message) => toast[type](
      <Stack><Text fontWeight={600}>{message}</Text></Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
      },
    );

    try {
      if (!range?.from || !range?.to) {
        throw new Error("Select a complete date range before generating cards.");
      }
      if (!user?.accountId) {
        throw new Error("Connect your Jira user in Settings before generating cards.");
      }
      const urls = Object.keys(selectedUrls).filter((url) => selectedUrls[url]);
      if (!urls.length) {
        throw new Error("Tick at least one Jira site before generating cards.");
      }
      const startDate = format(range.from, "yyyy-MM-dd");
      const endDate = format(range.to, "yyyy-MM-dd");

      const allWorkLogs = {};
      const failures = [];
      // One preset for every site of this export, even if the active one changes.
      const credentials = captureCredentials();

      for (const url of urls) {
        try {
          const worklogs = await getJiraWorklogIssues(
            url,
            startDate,
            endDate,
            user.accountId,
            null,
            [],
            false,
            { credentials, throwOnError: true },
          );
          if (!worklogs) throw new Error("no response");

          for (const [date, logs] of Object.entries(worklogs)) {
            allWorkLogs[date] = [...(allWorkLogs[date] || []), ...logs];
          }
        } catch (error) {
          failures.push(`${url}: ${error.message || String(error)}`);
        }
      }
      if (failures.length) {
        throw new Error(failures.join("; "));
      }
      const count = Object.values(allWorkLogs).reduce((total, logs) => total + logs.length, 0);
      if (!count) {
        notify("info", `No Jira worklogs for ${startDate} – ${endDate}`);
        return;
      }
      // Existing cards are replaced only now, by a fetch that returned entries.
      resetWorkLogs();
      addWorkLogs(allWorkLogs);
      setIsJiraExport(true);
      notify("success", `Generated ${count} card${count === 1 ? "" : "s"} from Jira worklogs.`);
      onClose();
    } catch (error) {
      notify("error", `Could not generate Jira cards: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Hosts the active preset declares; when they change (preset switch), the
  // selection starts over from them instead of keeping hosts that are gone.
  const declaredKey = [truncatedOrganizationUrl, ...Object.keys(additionalAssignedIssues)].join("|");
  useEffect(() => {
    const declared = new Set(Object.keys(additionalAssignedIssues));
    setSelectedUrls((prevSelectedUrls) => {
      const next = {};
      Object.keys(prevSelectedUrls).forEach((url) => {
        if (declared.has(url) && prevSelectedUrls[url]) next[url] = true;
      });
      if (truncatedOrganizationUrl) next[truncatedOrganizationUrl] = true;
      return next;
    });
  }, [declaredKey]);

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
          letterSpacing="0.03em"
          textTransform="uppercase"
        >
          Select date range and URLs to export worklogs
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
          <Stack spacing={3} w="100%" maxW="280px">
            <Checkbox
              isChecked
              isDisabled
              size="lg"
              sx={{ "& .chakra-checkbox__control": { borderRadius: 0 } }}
            >
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
                size="lg"
                sx={{ "& .chakra-checkbox__control": { borderRadius: 0 } }}
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

        <ModalFooter borderTopWidth="1px" borderTopColor={border} pt={4}>
          <Button
            borderRadius="0"
            h="34px"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
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
