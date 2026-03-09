import { Controller } from "react-hook-form";
import Select from "react-select";
import { Box } from "@chakra-ui/react";

const ClickUpTeamSelect = ({ control, options, onChange, value }) => {
  return (
    <Controller
      name="clickupTeamId"
      control={control}
      render={({ field }) => (
        <Box width="100%">
          <Select
            {...field}
            options={options}
            value={value}
            onChange={onChange}
            placeholder="Select ClickUp Team..."
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
                color: "black",
                fontSize: "14px",
              }),
            }}
          />
        </Box>
      )}
    />
  );
};

export default ClickUpTeamSelect;
