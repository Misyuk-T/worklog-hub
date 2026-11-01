import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Link,
  Collapse,
} from "@chakra-ui/react";
import { DEMO_PRESET, getDemoJiraHost, isDemoActive } from "../../../demo/demoMode";
import { format, parse, subDays } from "date-fns";
import { round } from "../../../helpers/getHours";
import {
  fetchCompareClickUp,
  fetchCompareJira,
  fetchCompareRedmine,
} from "../../../actions/compareLogs";
import {
  getMeClickUp,
  getMeJiraAccountId,
  getMeRedmineId,
  getRedmineUserMail,
} from "../../../actions/people";
import { declaredJiraHosts } from "../../../helpers/credentialHost";
import { normalizeServiceScope } from "../../../helpers/matchWorklogTasks";
import { canEditResults, captureContext } from "../../../helpers/contextGuard";
import { isJiraConfigured } from "../../../helpers/jiraSettings";
import { credentialsSignature } from "../../../helpers/trackerConnections";
import useSettingsStore from "../../../store/settingsStore";
import useRedmineStore from "../../../store/redmineStore";
import useJiraStore from "../../../store/jiraStore";
import useClickUpStore from "../../../store/clickupStore";
import WorklogEditModal from "./WorklogEditModal";
import CompareToolbar from "./CompareToolbar";
import SourceSummary from "./SourceSummary";
import usePersonResolution from "./usePersonResolution";
import { CLICKUP_ADMIN_NOTE } from "./ResolutionPanel";

const isCommentSimilar = (c1 = "", c2 = "") => {
  if (!c1 || !c2) return false;

  // Convert both to strings safely
  const str1 = typeof c1 === "string" ? c1 : String(c1);
  const str2 = typeof c2 === "string" ? c2 : String(c2);

  if (!str1 || !str2) return false;

  const lower1 = str1.toLowerCase();
  const lower2 = str2.toLowerCase();

  return lower1.includes(lower2) || lower2.includes(lower1);
};

const pairLogsBySimilarity = (source1Entries, source2Entries) => {
  const matchedRows = [];
  const usedSource2Indexes = new Set();

  source1Entries.forEach((log1) => {
    const matchIndex = source2Entries.findIndex((log2, idx) => {
      if (usedSource2Indexes.has(idx)) return false;
      return isCommentSimilar(log1.description, log2.description);
    });

    if (matchIndex > -1) {
      const log2 = source2Entries[matchIndex];
      usedSource2Indexes.add(matchIndex);
      const hoursMatch =
        round(parseFloat(log1.hours) || 0) ===
        round(parseFloat(log2.hours) || 0);
      matchedRows.push({
        log1,
        log2,
        difference: hoursMatch ? "Match" : "Hours differ",
        hoursMatch,
      });
    } else {
      matchedRows.push({
        log1,
        log2: undefined,
        difference: "Not match",
      });
    }
  });

  source2Entries.forEach((log2, idx) => {
    if (!usedSource2Indexes.has(idx)) {
      matchedRows.push({
        log1: undefined,
        log2,
        difference: "Not match",
      });
    }
  });

  return matchedRows;
};

const renderLogContent = (log, redmineBaseUrl) => {
  if (!log) return null;

  const source = log.source;
  const hours = round(log.hours);
  const description =
    log.description || log.comments || log.taskName || "No description";

  if (source === "redmine") {
    return (
      <>
        <Flex alignItems="center" gap="10px" mb="5px">
          <Text fontSize="14px" color="blue.600" fontWeight={500}>
            Issue: {log.issue?.id ?? "?"}
          </Text>
          <Text fontSize="12px" fontWeight={500}>
            Hours: {hours}h
          </Text>
        </Flex>
        {redmineBaseUrl ? (
          <Link
            href={`${redmineBaseUrl}/time_entries/${log.id}/edit`}
            isExternal
            fontSize="12px"
            onClick={(e) => e.stopPropagation()}
          >
            {description}
          </Link>
        ) : (
          <Text fontSize="12px">{description}</Text>
        )}
      </>
    );
  }

  if (source === "jira") {
    return (
      <>
        <Flex alignItems="center" gap="10px" mb="5px">
          {log.jiraUrl ? (
            <Link
              href={`https://${log.jiraUrl}/browse/${log.task}`}
              isExternal
              fontSize="12px"
              fontWeight={500}
              color="green"
              onClick={(e) => e.stopPropagation()}
            >
              Task: {log.task}
            </Link>
          ) : (
            <Text fontSize="14px" color="blue.600" fontWeight={500}>
              Task: {log.task}
            </Text>
          )}
          <Text fontSize="12px" fontWeight={500}>
            Hours: {hours}h
          </Text>
        </Flex>
        <Text fontSize="12px">{description}</Text>
      </>
    );
  }

  if (source === "clickup") {
    return (
      <>
        <Flex alignItems="center" gap="10px" mb="5px">
          {log.url ? (
            <Link
              href={log.url}
              isExternal
              fontSize="12px"
              fontWeight={500}
              color="purple.600"
              onClick={(e) => e.stopPropagation()}
            >
              Task: {log.taskKey || log.task}
            </Link>
          ) : (
            <Text fontSize="14px" color="purple.600" fontWeight={500}>
              Task: {log.taskKey || log.task}
            </Text>
          )}
          <Text fontSize="12px" fontWeight={500}>
            Hours: {hours}h
          </Text>
        </Flex>
        <Text fontSize="12px">{description}</Text>
      </>
    );
  }

  return null;
};

const SERVICE_LABELS = { jira: "Jira", clickup: "ClickUp", redmine: "Redmine" };

const SKIP_REASONS = {
  loading: "still searching for this person",
  notFound: "person not found on this site",
  noPermission: "no permission to search users on this site",
  error: "the search failed",
  choose: "waiting for your confirmation",
  suggest: "waiting for your confirmation",
};

const skipReason = (row) =>
  SKIP_REASONS[row?.status] || "waiting for your confirmation";

const sameRange = (a, b) =>
  a?.from?.getTime() === b?.from?.getTime() && a?.to?.getTime() === b?.to?.getTime();

const mergeGrouped = (target, grouped) => {
  Object.entries(grouped || {}).forEach(([date, logs]) => {
    (target[date] ||= []).push(...logs);
  });
};

const CompareActivityTable = ({ panelSize }) => {
  const { user: redmineUser, organizationURL: redmineBaseUrl } =
    useRedmineStore();
  const { user: jiraUser } = useJiraStore();
  const { user: clickUpUser } = useClickUpStore();
  const { settings, currentSettings } = useSettingsStore();
  const activePreset = isDemoActive() ? DEMO_PRESET : currentSettings;
  const presetSignature = credentialsSignature(activePreset);

  // The demo has worklogs for the last working days, so open on that range.
  const [range, setRange] = useState(() =>
    isDemoActive()
      ? { from: subDays(new Date(), 10), to: new Date() }
      : { from: new Date(), to: new Date() },
  );
  const [source1Services, setSource1Services] = useState(["jira", "clickup"]);
  const [source2Services, setSource2Services] = useState(["redmine"]);
  const [person, setPerson] = useState(null); // null = Me
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [generation, setGeneration] = useState(0);
  const generationRef = useRef(0);
  const personTokenRef = useRef(0);

  const resolution = usePersonResolution({ person, settings, activePreset });

  // Every change of person, preset, credentials or dates starts a new
  // generation: responses of the previous one are ignored and its results,
  // and any open edit, are dropped.
  const invalidate = useCallback(() => {
    generationRef.current += 1;
    setGeneration(generationRef.current);
    setLoading(false);
    setResults(null);
    setEditingLog(null);
    return generationRef.current;
  }, []);

  useEffect(() => {
    invalidate();
    personTokenRef.current += 1;
    setPerson(null);
  }, [presetSignature, invalidate]);

  const handlePersonChange = async (picked) => {
    invalidate();
    // A mail answer belongs to the person and preset it was asked for.
    const personToken = ++personTokenRef.current;
    if (!picked) {
      setPerson(null);
      return;
    }
    const next = {
      id: `redmine:${picked.id}`,
      redmineId: picked.id,
      name: picked.name,
      mail: picked.mail || "",
      mailLoading: !picked.mail,
    };
    setPerson(next);
    if (!picked.mail) {
      const mail = await getRedmineUserMail(picked.id, activePreset);
      if (personToken !== personTokenRef.current) return;
      setPerson((current) =>
        current?.id === next.id ? { ...current, mail, mailLoading: false } : current,
      );
    }
  };

  const handleRangeChange = (next) => {
    if (sameRange(next, range)) return;
    invalidate();
    setRange(next);
  };

  const isMe = !person;
  const demo = isDemoActive();
  const hasConnection = (service) =>
    resolution.connections.some((connection) => connection.service === service);
  // "Me" is offered for what the active preset itself declares; the demo has no
  // preset fields and answers from its own stores.
  const meJira = demo ? !!jiraUser : isJiraConfigured(activePreset);
  const meClickUp = demo ? !!clickUpUser : !!activePreset?.clickupApiKey;
  const hasRedmine = demo
    ? !!redmineUser
    : !!activePreset?.redmineUrl && !!activePreset?.redmineApiKey;
  const services = [
    { key: "jira", label: "Jira", available: isMe ? meJira : hasConnection("jira") },
    { key: "clickup", label: "ClickUp", available: isMe ? meClickUp : hasConnection("clickup") },
    { key: "redmine", label: "Redmine", available: hasRedmine },
  ];
  const isAvailable = (key) => services.find((service) => service.key === key)?.available;

  const handleSource1Toggle = (serviceKey) => {
    setSource1Services((prev) =>
      prev.includes(serviceKey)
        ? prev.filter((s) => s !== serviceKey)
        : [...prev, serviceKey],
    );
    // A service can't sit on both sides.
    setSource2Services((s2) => s2.filter((s) => s !== serviceKey));
  };

  const handleSource2Toggle = (serviceKey) => {
    setSource2Services((prev) =>
      prev.includes(serviceKey)
        ? prev.filter((s) => s !== serviceKey)
        : [...prev, serviceKey],
    );
    setSource1Services((s1) => s1.filter((s) => s !== serviceKey));
  };

  // One job per connection. Credentials and the person are taken from `ctx`,
  // captured when Compare was pressed, never read again later. For "Me" the
  // sites, workspaces and ids come from that preset's own declared hosts and
  // keys, not from the Jira/ClickUp/Redmine stores, which may still hold the
  // data of a previously active preset.
  const buildJobs = async (service, ctx) => {
    const { startDate, endDate, preset, target } = ctx;
    const common = { startDate, endDate, isMe: !target };
    const demo = isDemoActive();

    if (service === "redmine") {
      const host = normalizeServiceScope(preset?.redmineUrl);
      return [
        {
          label: host ? `Redmine · ${host}` : "Redmine",
          run: async () =>
            fetchCompareRedmine({
              ...common,
              userId: target
                ? target.redmineId
                : demo
                  ? redmineUser.id
                  : await getMeRedmineId(preset),
              credentials: preset,
            }),
        },
      ];
    }

    if (service === "jira") {
      if (!target) {
        const hosts = demo ? [getDemoJiraHost()] : [...new Set(declaredJiraHosts(preset))];
        return hosts.map((host) => ({
          label: `Jira · ${host}`,
          run: async () =>
            fetchCompareJira({
              ...common,
              host,
              accountId: demo ? jiraUser.accountId : await getMeJiraAccountId(preset, host),
              credentials: preset,
            }),
        }));
      }
      return ctx.connections
        .filter((connection) => connection.service === "jira")
        .map((connection) => {
          const row = ctx.rows[connection.id];
          const label = `Jira · ${connection.host}`;
          if (!row?.confirmed || !row.selectedId) return { label, skipped: skipReason(row) };
          return {
            label,
            run: () =>
              fetchCompareJira({
                ...common,
                host: connection.host,
                accountId: row.selectedId,
                credentials: connection.credentials,
              }),
          };
        });
    }

    if (!target) {
      if (demo) {
        return [
          {
            label: "ClickUp",
            run: () =>
              fetchCompareClickUp({ ...common, teamId: null, userId: clickUpUser.id, credentials: preset }),
          },
        ];
      }
      let me;
      try {
        me = await getMeClickUp(preset);
      } catch (error) {
        return [{ label: "ClickUp", failed: error.message }];
      }
      return me.teams.map((team) => ({
        label: `ClickUp · ${team.name || team.id}`,
        run: () =>
          fetchCompareClickUp({ ...common, teamId: team.id, userId: me.userId, credentials: preset }),
      }));
    }
    return ctx.connections
      .filter((connection) => connection.service === "clickup")
      .map((connection) => {
        const row = ctx.rows[connection.id];
        const label = `ClickUp · ${connection.name}`;
        if (!row?.confirmed || !row.selectedId) return { label, skipped: skipReason(row) };
        return {
          label,
          adminNote: true,
          run: () =>
            fetchCompareClickUp({
              ...common,
              teamId: connection.teamId,
              userId: row.selectedId,
              credentials: connection.credentials,
            }),
        };
      });
  };

  const runSource = async (serviceKeys, ctx) => {
    const jobs = (
      await Promise.all(serviceKeys.filter(isAvailable).map((key) => buildJobs(key, ctx)))
    ).flat();
    const settled = await Promise.all(
      jobs.map(async (job) => {
        if (job.skipped) return { label: job.label, status: "skipped", message: job.skipped };
        if (job.failed) return { label: job.label, status: "failed", message: job.failed };
        try {
          const grouped = await job.run();
          const count = Object.values(grouped).reduce((sum, logs) => sum + logs.length, 0);
          return {
            label: job.label,
            status: "ok",
            count,
            grouped,
            note: job.adminNote && count === 0 ? `No entries returned. ${CLICKUP_ADMIN_NOTE}` : "",
          };
        } catch (error) {
          return { label: job.label, status: "failed", message: error.message };
        }
      }),
    );
    const logs = {};
    settled.forEach((item) => mergeGrouped(logs, item.grouped));
    return { logs, info: settled.map(({ grouped, ...item }) => item) };
  };

  // Live context, read by guards captured when a mutation starts. The
  // generation is read from the ref: invalidate() bumps it before any render.
  const liveContextRef = useRef({});
  liveContextRef.current = {
    personId: person?.id ?? "me",
    presetId: activePreset?.id,
  };
  const captureMutationGuard = () =>
    captureContext(() => ({ ...liveContextRef.current, generation: generationRef.current }));

  // `stillCurrent` comes from a mutation that started earlier: if person,
  // preset or generation moved on meanwhile, nothing is refetched.
  const fetchLogs = async (stillCurrent) => {
    if (typeof stillCurrent === "function" && !stillCurrent()) return;
    if (!range?.from) return;
    const startDate = format(range.from, "yyyy-MM-dd");
    const endDate = format(range.to || range.from, "yyyy-MM-dd");

    const gen = invalidate();
    const ctx = {
      startDate,
      endDate,
      preset: activePreset,
      target: person,
      connections: resolution.connections,
      rows: resolution.rows,
    };
    const labelOf = (keys) =>
      keys.filter(isAvailable).map((key) => SERVICE_LABELS[key]).join(" + ");
    const context = { personId: person?.id ?? "me", presetId: activePreset?.id, generation: gen };

    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        runSource(source1Services, ctx),
        runSource(source2Services, ctx),
      ]);
      if (gen !== generationRef.current) return;
      setResults({
        context,
        person,
        source1Logs: a.logs,
        source2Logs: b.logs,
        source1Info: a.info,
        source2Info: b.info,
        source1Label: labelOf(source1Services),
        source2Label: labelOf(source2Services),
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      if (gen === generationRef.current) setLoading(false);
    }
  };

  const source1Logs = results?.source1Logs;
  const source2Logs = results?.source2Logs;
  const allDates = useMemo(() => {
    const dates1 = Object.keys(source1Logs || {});
    const dates2 = Object.keys(source2Logs || {});
    const uniqueDates = Array.from(new Set([...dates1, ...dates2]));
    uniqueDates.sort(
      (a, b) =>
        parse(b, "dd-MM-yyyy", new Date()) -
        parse(a, "dd-MM-yyyy", new Date()),
    );
    return uniqueDates;
  }, [source1Logs, source2Logs]);

  // Rows are editable only for the signed-in user, with the preset and the
  // generation the results were fetched with.
  const canEdit = canEditResults(results?.context, {
    personId: person?.id ?? "me",
    presetId: activePreset?.id,
    generation,
  });

  const compareDisabled =
    !range?.from ||
    resolution.loading ||
    !!person?.mailLoading ||
    [...source1Services, ...source2Services].filter(isAvailable).length === 0;

  return (
    <Collapse in={panelSize !== "collapsed"}>
      <Box
        p={4}
        height={
          panelSize === "partial"
            ? "400px"
            : panelSize === "full"
              ? "100vh"
              : "auto"
        }
        minH={"200px"}
        overflow={"auto"}
        sx={{
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#f1f1f1",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#A0AEC0",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#718096",
          },
        }}
      >
        <Heading as="h2" size="md" mb={4}>
          Compare Worklogs
        </Heading>

        <CompareToolbar
          person={person}
          onPersonChange={handlePersonChange}
          activePreset={activePreset}
          resolution={resolution}
          services={services}
          source1Services={source1Services}
          source2Services={source2Services}
          onToggleSource1={handleSource1Toggle}
          onToggleSource2={handleSource2Toggle}
          range={range}
          onRangeChange={handleRangeChange}
          onCompare={fetchLogs}
          loading={loading}
          compareDisabled={compareDisabled}
        />

        {person && (
          <Alert status="info" mb={4} borderRadius={0} fontSize="14px" py={2}>
            <AlertIcon />
            Viewing {person.name}
            {person.mail ? ` (${person.mail})` : ""} · read-only
          </Alert>
        )}

        {results && (
          <SourceSummary
            source1Label={results.source1Label}
            source1Info={results.source1Info}
            source2Label={results.source2Label}
            source2Info={results.source2Info}
          />
        )}

        {allDates.length === 0 ? (
          <Text>No data available for the selected period.</Text>
        ) : (
          allDates.map((date) => {
            const source1Entries = source1Logs[date] || [];
            const source2Entries = source2Logs[date] || [];
            const paired = pairLogsBySimilarity(source1Entries, source2Entries);
            const totalSource1Hours = source1Entries.reduce(
              (sum, log) => sum + (parseFloat(log.hours) || 0),
              0,
            );
            const totalSource2Hours = source2Entries.reduce(
              (sum, log) => sum + (parseFloat(log.hours) || 0),
              0,
            );

            return (
              <Box key={date} mb={8}>
                <Heading as="h3" size="sm" mb={2}>
                  {date}
                </Heading>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr w="100%">
                      <Th fontSize="14px" width="33.33%">
                        {results.source1Label || "Source A"}
                      </Th>
                      <Th fontSize="14px" width="33.33%" textAlign="center">
                        Difference
                      </Th>
                      <Th fontSize="14px" width="33.33%" textAlign="right">
                        {results.source2Label || "Source B"}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr bg="gray.100">
                      <Td fontWeight="bold">
                        Total: {round(totalSource1Hours)}h
                      </Td>
                      <Td></Td>
                      <Td fontWeight="bold" textAlign="right">
                        Total: {round(totalSource2Hours)}h
                      </Td>
                    </Tr>
                    {paired.map((row) => {
                      const { log1, log2, difference } = row;
                      // The edit page link in Redmine is for your own entries only.
                      const linkBase = canEdit ? redmineBaseUrl : null;
                      const source1Content = renderLogContent(log1, linkBase);
                      const source2Content = renderLogContent(log2, linkBase);
                      const rowKey = `${log1?.source || "e"}:${
                        log1?.id || "e"
                      }|${log2?.source || "e"}:${log2?.id || "e"}`;
                      const hoursDiffer = difference === "Hours differ";
                      const differenceColor =
                        difference === "Match"
                          ? "green.600"
                          : hoursDiffer
                            ? "orange.500"
                            : "red.600";

                      return (
                        <Tr key={rowKey} _hover={{ bg: "rgba(0, 0, 0, 0.05)" }}>
                          <Td
                            onClick={() => log1 && canEdit && setEditingLog(log1)}
                            cursor={log1 && canEdit ? "pointer" : "default"}
                            bg={hoursDiffer ? "orange.50" : undefined}
                          >
                            {source1Content}
                          </Td>
                          <Td textAlign="center">
                            <Text
                              fontSize="12px"
                              fontWeight={600}
                              color={differenceColor}
                            >
                              {difference}
                            </Text>
                            {hoursDiffer && (
                              <Text fontSize="11px" color="orange.500">
                                {round(parseFloat(log1?.hours) || 0)}h vs{" "}
                                {round(parseFloat(log2?.hours) || 0)}h
                              </Text>
                            )}
                          </Td>
                          <Td
                            textAlign="right"
                            onClick={() => log2 && canEdit && setEditingLog(log2)}
                            cursor={log2 && canEdit ? "pointer" : "default"}
                            bg={hoursDiffer ? "orange.50" : undefined}
                          >
                            {source2Content}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            );
          })
        )}
      </Box>

      <WorklogEditModal
        isOpen={!!editingLog && canEdit}
        log={canEdit ? editingLog : null}
        onClose={() => setEditingLog(null)}
        captureGuard={captureMutationGuard}
        onMutated={fetchLogs}
      />
    </Collapse>
  );
};

export default CompareActivityTable;
