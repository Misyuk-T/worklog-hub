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

import { transformToIssueData } from "../../../helpers/transformToSelectData";

const IssuesSelect = ({ onChange, control, value, assignedIssues }) => {
  const formattedIssueData = transformToIssueData(assignedIssues);
  const isUndefinedValue = !value?.value;

  const renderPopover = () => {
    return (
      <Popover boundary="scrollParent">
        <PopoverTrigger>
          <Box position="absolute" top="5px" left="70px">
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
            Worklogs with{" "}
            <Text as="span" color="orange">
              undefined
            </Text>{" "}
            task <strong>will not be logged in Jira</strong>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Controller
      name="task"
      control={control}
      render={({ field }) => {
        return (
          <Box position="relative">
            <Select
              {...field}
              value={value}
              menuPlacement="auto"
              onChange={onChange}
              options={formattedIssueData}
              placeholder="undefined"
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

export default IssuesSelect;
