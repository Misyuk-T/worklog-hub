import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { loadConnections, resolveJiraConnection } from "../../../actions/people";
import { resolveClickUpMembers } from "../../../helpers/personMatching";
import { credentialsSignature } from "../../../helpers/trackerConnections";
import { captureContext } from "../../../helpers/contextGuard";

const EMPTY = { loading: false, connections: [], rows: {}, failures: [] };

// Finds the picked person in every Jira site / ClickUp workspace reachable with
// the keys of all presets. The mapping lives in memory for this session only.
// A row is fetched only once `confirmed`; see CompareActivityTable.
const usePersonResolution = ({ person, settings, activePreset }) => {
  const [state, setState] = useState(EMPTY);
  const tokenRef = useRef(0);

  const allKeysSignature = useMemo(
    () => Object.values(settings || {}).map(credentialsSignature).join("|"),
    [settings],
  );
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const personId = person?.id;
  const personName = person?.name;
  const personMail = person?.mail;
  const ready = Boolean(person) && !person.mailLoading;
  const activeId = activePreset?.id;

  // Live context for callbacks that finish after an await. Person and preset
  // are refreshed on every render, the generation is bumped by the effect below.
  const liveRef = useRef({});
  liveRef.current = { personId, presetId: `${activeId}|${allKeysSignature}` };
  const beginAction = useCallback(
    () => captureContext(() => ({ ...liveRef.current, generation: tokenRef.current })),
    [],
  );

  useEffect(() => {
    const token = ++tokenRef.current;
    const isCurrent = () => token === tokenRef.current;
    if (!personId || !ready) {
      setState(EMPTY);
      return undefined;
    }

    const target = { name: personName, mail: personMail };
    setState({ ...EMPTY, loading: true });

    (async () => {
      let loaded;
      try {
        loaded = await loadConnections({
          settings: settingsRef.current,
          activePresetId: activeId,
        });
      } catch (error) {
        if (isCurrent()) {
          setState({ ...EMPTY, failures: [{ presetName: "", message: error.message }] });
        }
        return;
      }
      if (!isCurrent()) return;

      const rows = {};
      loaded.jira.forEach((connection) => {
        rows[connection.id] = { status: "loading", candidates: [], selectedId: null, confirmed: false };
      });
      loaded.clickup.forEach((connection) => {
        rows[connection.id] = resolveClickUpMembers(connection.members, target);
      });
      setState({
        loading: loaded.jira.length > 0,
        connections: [...loaded.jira, ...loaded.clickup],
        rows,
        failures: loaded.failures,
      });

      await Promise.all(
        loaded.jira.map(async (connection) => {
          const row = await resolveJiraConnection(connection, target);
          if (!isCurrent()) return;
          setState((current) => ({
            ...current,
            rows: { ...current.rows, [connection.id]: row },
          }));
        }),
      );
      if (isCurrent()) setState((current) => ({ ...current, loading: false }));
    })();

    return () => {
      tokenRef.current += 1;
    };
  }, [personId, personName, personMail, ready, allKeysSignature, activeId]);

  const patchRow = useCallback((id, patch) => {
    setState((current) =>
      current.rows[id]
        ? { ...current, rows: { ...current.rows, [id]: { ...current.rows[id], ...patch } } }
        : current,
    );
  }, []);

  // Picking from the list is the user's explicit confirmation.
  const choose = useCallback(
    (id, candidateId) =>
      patchRow(
        id,
        candidateId
          ? { selectedId: candidateId, confirmed: true, status: "matched" }
          : { selectedId: null, confirmed: false, status: "choose" },
      ),
    [patchRow],
  );

  const confirm = useCallback(
    (id) => patchRow(id, { confirmed: true, status: "matched" }),
    [patchRow],
  );

  // A validated account id typed by the user for a site where search is not allowed.
  // `isCurrent` comes from beginAction(), called when the validation started.
  const setManual = useCallback(
    (id, candidate, isCurrent) => {
      if (isCurrent && !isCurrent()) return;
      patchRow(id, {
        status: "matched",
        candidates: [{ ...candidate, kind: "manual" }],
        selectedId: candidate.id,
        confirmed: true,
      });
    },
    [patchRow],
  );

  return { ...state, choose, confirm, setManual, beginAction };
};

export default usePersonResolution;
