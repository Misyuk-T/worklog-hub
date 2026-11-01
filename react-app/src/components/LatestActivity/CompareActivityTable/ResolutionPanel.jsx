import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import Select from "react-select";

import { getJiraUserByAccountId } from "../../../actions/people";
import {
  describeCandidate,
  isAccountId,
  jiraUserToCandidate,
  normalizeEmail,
  sanitizeAccountIdInput,
} from "../../../helpers/personMatching";
import { connectionLabel } from "../../../helpers/trackerConnections";
import { compareSelectStyles } from "./PersonPicker";

export const CLICKUP_ADMIN_NOTE =
  "Other people's ClickUp time is visible only to Workspace Owners/Admins.";

const STATUS = {
  loading: { text: "Searching…", color: "gray.600" },
  matched: { text: "Matched", color: "green.700" },
  suggest: { text: "Suggested by name, confirm", color: "orange.600" },
  choose: { text: "Choose a match", color: "orange.600" },
  notFound: { text: "Not found", color: "gray.700" },
  noPermission: { text: "No permission to search users on this site", color: "red.600" },
  error: { text: "Error", color: "red.600" },
};

const LOADING_ROW = { status: "loading", candidates: [], selectedId: null, confirmed: false };

const candidateWarning = (candidate, person) => {
  if (!candidate) return "";
  if (candidate.kind === "conflict") {
    return `Warning: its email (${candidate.email}) differs from Redmine's (${person.mail || "none"}).`;
  }
  if (candidate.kind === "suggested" && !candidate.email) {
    return "Its email is hidden on this site, so this is a name match only.";
  }
  if (
    candidate.email &&
    person.mail &&
    normalizeEmail(candidate.email) !== normalizeEmail(person.mail)
  ) {
    return `Warning: its email (${candidate.email}) differs from Redmine's (${person.mail}).`;
  }
  return "";
};

const ManualAccountId = ({ connection, onValid, beginAction }) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const validate = async () => {
    if (!isAccountId(value)) {
      setError("An Atlassian account id looks like 5b10ac8d82e05b22cc7d4ef5 or 712020:…");
      return;
    }
    // Person, preset and generation are captured now; an answer that arrives
    // after any of them changed is dropped.
    const isCurrent = beginAction();
    setChecking(true);
    setError("");
    try {
      const user = await getJiraUserByAccountId(connection, value);
      if (isCurrent()) onValid(jiraUserToCandidate(user), isCurrent);
    } catch (checkError) {
      if (isCurrent()) setError(checkError.message || "This account id was not found.");
    } finally {
      if (isCurrent()) setChecking(false);
    }
  };

  return (
    <FormControl isInvalid={Boolean(error)} mt={2}>
      <Flex gap={2} align="flex-start" direction={{ base: "column", md: "row" }}>
        <Input
          size="sm"
          h="32px"
          borderRadius={0}
          fontSize="14px"
          maxW="420px"
          placeholder="Jira accountId of this person"
          aria-label={`Jira accountId on ${connection.host}`}
          value={value}
          onChange={(event) => {
            setValue(sanitizeAccountIdInput(event.target.value));
            setError("");
          }}
          onKeyDown={(event) => event.key === "Enter" && validate()}
        />
        <Button
          size="sm"
          h="32px"
          borderRadius={0}
          variant="outline"
          onClick={validate}
          isLoading={checking}
          isDisabled={!value}
        >
          Check and use
        </Button>
      </Flex>
      <FormErrorMessage fontSize="14px">{error}</FormErrorMessage>
    </FormControl>
  );
};

const ResolutionRow = ({ connection, row, person, onChoose, onConfirm, onManual, beginAction }) => {
  const status = STATUS[row.status] || STATUS.error;
  const options = row.candidates.map((candidate) => ({
    value: candidate.id,
    label: describeCandidate(candidate),
    candidate,
  }));
  const selected = options.find((option) => option.value === row.selectedId) || null;
  const warning = candidateWarning(selected?.candidate, person);
  const rowId = `resolution-${connection.id}`;

  return (
    <Box py={2} borderTopWidth="1px" borderColor="gray.200">
      <Flex gap={2} direction={{ base: "column", lg: "row" }} align={{ lg: "center" }}>
        <Text fontSize="14px" fontWeight={600} minW={{ lg: "300px" }} id={rowId}>
          {connectionLabel(connection)}
        </Text>
        <Flex align="center" gap={2} minW={{ lg: "250px" }}>
          {row.status === "loading" && <Spinner size="xs" />}
          <Text fontSize="14px" fontWeight={600} color={status.color} role="status">
            {status.text}
          </Text>
        </Flex>
        <Box flex="1" minW={{ lg: "260px" }}>
          <Select
            aria-labelledby={rowId}
            options={options}
            value={selected}
            onChange={(option) => onChoose(option ? option.value : null)}
            isClearable
            isDisabled={options.length === 0}
            placeholder={options.length ? "Choose a match…" : "No candidates"}
            styles={compareSelectStyles}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
        </Box>
        {row.status === "suggest" && (
          <Button
            size="sm"
            h="32px"
            borderRadius={0}
            colorScheme="orange"
            variant="outline"
            onClick={onConfirm}
          >
            Confirm
          </Button>
        )}
      </Flex>
      {row.status === "error" && (
        <Text fontSize="14px" color="red.600" mt={1}>{row.error}</Text>
      )}
      {row.note && <Text fontSize="14px" color="gray.700" mt={1}>{row.note}</Text>}
      {warning && <Text fontSize="14px" color="orange.600" mt={1}>{warning}</Text>}
      {connection.service === "clickup" && (
        <Text fontSize="14px" color="gray.600" mt={1}>{CLICKUP_ADMIN_NOTE}</Text>
      )}
      {row.status === "noPermission" && connection.service === "jira" && (
        <ManualAccountId connection={connection} onValid={onManual} beginAction={beginAction} />
      )}
    </Box>
  );
};

const ResolutionPanel = ({ person, resolution }) => {
  const { connections, rows, failures, loading } = resolution;

  return (
    <Box mt={3} aria-live="polite">
      <Flex align="center" gap={2} mb={1}>
        <Text fontSize="14px" color="gray.700">
          {person.mailLoading
            ? "Reading the email from Redmine…"
            : `Looking for ${person.name}${person.mail ? ` (${person.mail})` : " (no email in Redmine)"} in your other trackers. Nothing is read from a site until its match is confirmed.`}
        </Text>
        {(loading || person.mailLoading) && <Spinner size="xs" />}
      </Flex>
      {failures.map((failure) => (
        <Text key={`${failure.presetName}:${failure.message}`} fontSize="14px" color="red.600">
          ClickUp workspaces could not be read{failure.presetName ? ` with preset ${failure.presetName}` : ""}: {failure.message}
        </Text>
      ))}
      {!loading && !person.mailLoading && connections.length === 0 && (
        <Text fontSize="14px" color="gray.700">
          No Jira site or ClickUp workspace with an API key was found in your presets.
        </Text>
      )}
      {connections.map((connection) => (
        <ResolutionRow
          key={connection.id}
          connection={connection}
          row={rows[connection.id] || LOADING_ROW}
          person={person}
          onChoose={(candidateId) => resolution.choose(connection.id, candidateId)}
          onConfirm={() => resolution.confirm(connection.id)}
          onManual={(candidate, isCurrent) =>
            resolution.setManual(connection.id, candidate, isCurrent)
          }
          beginAction={resolution.beginAction}
        />
      ))}
    </Box>
  );
};

export default ResolutionPanel;
