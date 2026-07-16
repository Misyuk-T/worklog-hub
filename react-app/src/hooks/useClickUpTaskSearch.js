import { useState } from "react";

import useClickUpStore from "../store/clickupStore";
import { getClickUpTaskById } from "../actions/clickup";

// Task selects only list tasks assigned to the user, so a task you were
// unassigned from disappears — even though ClickUp still accepts time entries
// for it. This lets the user type a task id (86abc123) or custom id (CP-170)
// and pull it into the options.
//
// Returns props to spread onto a react-select: typing an id that matches
// nothing offers "press Enter to load it".
const useClickUpTaskSearch = ({ teamId, options, onSelect }) => {
  const { addManualTask } = useClickUpStore();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const query = inputValue.trim();
  const hasMatch = options.some((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );

  const loadTaskById = async () => {
    if (!query || isLoading) return;

    setIsLoading(true);
    const task = await getClickUpTaskById(query, teamId);
    setIsLoading(false);

    if (!task) return;

    addManualTask(task.teamId || teamId, task);
    onSelect({ value: task.id, label: `${task.key} - ${task.summary}` });
    setInputValue("");
  };

  return {
    isLoading,
    onInputChange: (value, meta) => {
      if (meta.action === "input-change") {
        setInputValue(value);
      }
    },
    onMenuClose: () => setInputValue(""),
    onKeyDown: (event) => {
      if (event.key === "Enter" && query && !hasMatch) {
        event.preventDefault();
        loadTaskById();
      }
    },
    noOptionsMessage: () =>
      query
        ? `Press Enter to load "${query}" from ClickUp`
        : "No assigned tasks — paste a task id to load one",
  };
};

export default useClickUpTaskSearch;
