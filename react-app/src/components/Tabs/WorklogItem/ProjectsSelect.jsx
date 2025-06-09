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
  const listValue = isNaN(value) ? value : getProjectValue(value, projects);
  const isUndefinedValue = !listValue.value;

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
            placeholder="Select project ..."
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
