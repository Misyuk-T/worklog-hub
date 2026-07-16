import { Controller } from "react-hook-form";
import Select from "react-select";
import {
  Box,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
} from "@chakra-ui/react";
import { QuestionIcon } from "@chakra-ui/icons";

import { transformToClickUpTaskData } from "../../../helpers/transformToSelectData";
import useClickUpTaskSearch from "../../../hooks/useClickUpTaskSearch";

const ClickUpTaskSelect = ({
  onChange,
  control,
  value,
  assignedTasks,
  teamId,
}) => {
  const formattedTaskData = transformToClickUpTaskData(assignedTasks || []);
  const isUndefinedValue = !value?.value;
  const taskSearch = useClickUpTaskSearch({
    teamId,
    options: formattedTaskData,
    onSelect: onChange,
  });

  const renderPopover = () => {
    return (
      <Popover boundary="scrollParent">
        <PopoverTrigger>
          <Box position="absolute" top="5px" left="80px">
            <IconButton
              opacity={0.5}
              p={0}
              h="15px"
              w="10px"
              background="transparent"
              aria-label="helper popup"
              icon={<QuestionIcon />}
              transition="all .3s"
              _hover={{
                background: "transparent",
                svg: {
                  opacity: "0.5",
                },
              }}
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent p={5} maxW="300px">
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader fontWeight={600} fontSize={16}>
            Warning
          </PopoverHeader>
          <PopoverBody>
            <Text mb={2}>
              Worklogs with{" "}
              <Text as="span" color="orange">
                undefined
              </Text>{" "}
              task <strong>will not be logged in ClickUp</strong>
            </Text>
            <Text fontSize="13px" color="gray.600">
              Task not listed (e.g. you were unassigned)? Type its id —{" "}
              <strong>86abc123</strong> or <strong>CP-170</strong> — and press
              Enter to load it.
            </Text>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Controller
      name="clickupTask"
      control={control}
      render={({ field }) => {
        return (
          <Box position="relative">
            <Select
              {...field}
              value={value}
              menuPlacement="auto"
              onChange={onChange}
              options={formattedTaskData}
              placeholder="undefined"
              menuPortalTarget={document.body}
              isLoading={taskSearch.isLoading}
              onInputChange={taskSearch.onInputChange}
              onMenuClose={taskSearch.onMenuClose}
              onKeyDown={taskSearch.onKeyDown}
              noOptionsMessage={taskSearch.noOptionsMessage}
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
                  color: isUndefinedValue ? "orange" : "black",
                  fontSize: "14px",
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: "orange",
                  fontSize: "14px",
                }),
              }}
            />
            {isUndefinedValue && renderPopover()}
          </Box>
        );
      }}
    />
  );
};

export default ClickUpTaskSelect;
