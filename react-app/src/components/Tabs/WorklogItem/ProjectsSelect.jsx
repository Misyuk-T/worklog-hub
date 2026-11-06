import { Controller } from "react-hook-form";
import Select from "react-select";

import useRedmineStore from "../../../store/redmineStore";
import {
  getProjectValue,
  transformToProjectData,
} from "../../../helpers/transformToSelectData";

const ProjectsSelect = ({ onChange, control, value }) => {
  const { projects } = useRedmineStore();

  const formattedProjectData = transformToProjectData(projects);
  // No project (or an id not loaded yet) never shows as "undefined": an empty
  // value falls back to the placeholder, an unknown id shows its number.
  const resolved = !value
    ? null
    : isNaN(value)
      ? value
      : getProjectValue(value, projects);
  const listValue =
    resolved && resolved.value
      ? resolved
      : value && !isNaN(value)
        ? { value, label: `Project #${value}` }
        : null;
  const isUndefinedValue = !listValue || !listValue.value;

  return (
    <Controller
      name="project"
      control={control}
      render={({ field }) => {
        return (
          <Select
            {...field}
            value={listValue}
            menuPlacement="auto"
            onChange={onChange}
            options={formattedProjectData}
            placeholder="Select project"
            menuPortalTarget={document.body}
            styles={{
              control: (baseStyles, state) => ({
                ...baseStyles,
                cursor: "pointer",
                borderColor: state.isFocused
                  ? "grey"
                  : "transparent !important",
              }),
              indicatorsContainer: (baseStyles) => ({
                ...baseStyles,
                display: "none",
              }),
              container: (baseStyles) => ({
                ...baseStyles,
                width: "100%",
              }),
              singleValue: (provided) => ({
                ...provided,
                color: isUndefinedValue ? "tomato" : "black",
                fontSize: "14px",
              }),
            }}
          />
        );
      }}
    />
  );
};

export default ProjectsSelect;
