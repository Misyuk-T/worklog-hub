import { useCallback, useEffect, useRef, useState } from "react";
import AsyncSelect from "react-select/async";

import { searchRedmineUsers } from "../../../actions/people";
import { captureContext } from "../../../helpers/contextGuard";
import { credentialsSignature } from "../../../helpers/trackerConnections";

export const compareSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 32,
    borderRadius: 0,
    fontSize: 14,
    boxShadow: "none",
    borderColor: state.isFocused ? "#4A5568" : "#CBD5E0",
    ":hover": { borderColor: "#718096" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 6px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 6px" }),
  placeholder: (base) => ({ ...base, fontSize: 14 }),
  singleValue: (base) => ({ ...base, fontSize: 14, color: "black" }),
  menu: (base) => ({ ...base, borderRadius: 0, fontSize: 14 }),
  option: (base) => ({ ...base, fontSize: 14 }),
  menuPortal: (base) => ({ ...base, zIndex: 1500 }),
};

const ME_OPTION = { value: "me", label: "Me (signed-in user)", person: null };

const toOption = (person) => ({
  value: String(person.id),
  label: person.mail ? `${person.name} · ${person.mail}` : person.name,
  person,
});

const DEBOUNCE_MS = 300;

// Async search over the people of the active preset's Redmine.
const PersonPicker = ({ person, onChange, credentials, inputId }) => {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const pendingRef = useRef(null);
  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const loadOptions = useCallback(
    (input) =>
      new Promise((resolve) => {
        clearTimeout(timerRef.current);
        pendingRef.current?.([]); // a newer keystroke supersedes the older search
        pendingRef.current = null;

        const query = input.trim();
        if (!query) {
          resolve([ME_OPTION]);
          return;
        }

        pendingRef.current = resolve;
        timerRef.current = setTimeout(async () => {
          pendingRef.current = null;
          // The search runs with the credentials current now; if the preset
          // changes before it answers, its people must not be offered.
          const credentials = credentialsRef.current;
          const isCurrent = captureContext(() => ({
            presetId: credentialsSignature(credentialsRef.current),
          }));
          setError("");
          try {
            const found = await searchRedmineUsers(query, {
              credentials,
              onProgress: (next) => isCurrent() && setProgress(next),
            });
            resolve(isCurrent() ? found.map(toOption) : []);
          } catch (searchError) {
            if (isCurrent()) setError(searchError.message);
            resolve([]);
          } finally {
            if (isCurrent()) setProgress(null);
          }
        }, DEBOUNCE_MS);
      }),
    [],
  );

  return (
    <AsyncSelect
      inputId={inputId}
      aria-label="Whose logs"
      value={person ? toOption(person) : ME_OPTION}
      defaultOptions={[ME_OPTION]}
      loadOptions={loadOptions}
      filterOption={null}
      onChange={(option) => onChange(option?.person ?? null)}
      styles={compareSelectStyles}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      placeholder="Type a name or email…"
      loadingMessage={() =>
        progress
          ? `Loading people… ${progress.done}/${progress.total} projects`
          : "Searching…"
      }
      noOptionsMessage={({ inputValue }) =>
        error
          ? `Could not load people: ${error}`
          : inputValue
            ? "No people found"
            : "Type a name or email"
      }
    />
  );
};

export default PersonPicker;
