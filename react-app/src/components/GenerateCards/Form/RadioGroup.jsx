import { Controller } from "react-hook-form";
import {
  Box,
  Flex,
  IconButton,
  Image,
  Link,
  ListItem,
  OrderedList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Radio,
  RadioGroup as ChakraRadioGroup,
  Stack,
  Text,
} from "@chakra-ui/react";
import { QuestionIcon } from "@chakra-ui/icons";

import JiraAssistant0 from "../../../assets/JiraAssistant0.png";
import JiraAssistant1 from "../../../assets/JiraAssistant1.png";

const radioItem = [
  {
    name: "type",
    value: "jira",
    text: "Jira export",
    helper: (
      <OrderedList p={5}>
        <ListItem>
          <Text>
            Support export file from <strong>JiraAssistant</strong> chrome
            extension.
          </Text>
        </ListItem>
        <ListItem>
          <Text>
            Visit{" "}
            <Link
              target="blank"
              color="blue.500"
              href="https://jiraassistant.com/"
            >
              official site
            </Link>{" "}
            or{" "}
            <Link
              target="blank"
              color="blue.500"
              href="https://chrome.google.com/webstore/detail/jira-assistant-worklog-sp/momjbjbjpbcbnepbgkkiaofkgimihbii"
            >
              chrome market
            </Link>{" "}
            to install JiraAssistant.
          </Text>
        </ListItem>
        <ListItem>
          <Text>Link to the required jira account.</Text>
        </ListItem>
        <ListItem>
          Click on Worklog report btn
          <Image
            mx="auto"
            mt={2}
            w={300}
            src={JiraAssistant0}
            border="1px solid"
          />
        </ListItem>
        <ListItem>
          Adjust time range and click on export btn to export data as .xmls
          <Image
            mx="auto"
            mt={2}
            w={300}
            src={JiraAssistant1}
            border="1px solid"
          />
        </ListItem>
      </OrderedList>
    ),
  },
  {
    name: "type",
    value: "custom",
    text: "Custom text",
    helper: (
      <OrderedList p={5}>
        <ListItem>
          <Text mb={5}>Text file formatted as shown below:</Text>

          <Text as="div" p={2} border="1px solid" borderRadius="0">
            <Text fontWeight={600} mt={2}>
              12.06
            </Text>
            <pre />
            1. Daily meeting 0.5h blb
            <pre />
            2. ABC-101: Disable focus style when click on active. Adjust hover
            for disabled buttons 3h
            <pre />
            3. ABC-101: Resolve problem with close overlay click modal on dev
            env 1h
            <pre />
            <Text fontWeight={600} mt={2}>
              13.06
            </Text>
            <pre />
            1. Delete unnecessary import React from react 0.5h blb
            <pre />
            2. Replace slick carousel by react slick 2h blb
            <pre />
            3. AFS-617: Adjust next.config.js to enable pages file with .page
            ext blb
            <pre />
            ...
          </Text>
        </ListItem>
      </OrderedList>
    ),
  },
];

const RadioGroup = ({ control, onToggle }) => {
  return (
    <Controller
      control={control}
      name="type"
      defaultValue="custom"
      render={({ field: { onChange, onBlur, value, ref } }) => (
        <ChakraRadioGroup
          as={Stack}
          width="max-content"
          name="type"
          defaultValue="custom"
          onBlur={onBlur}
          onChange={(value) => {
            onChange(value);
            onToggle(false);
          }}
          ref={ref}
          value={value}
          gap={0}
        >
          {radioItem.map((item) => {
            return (
              <Flex alignItems="center" key={item.text}>
                <Radio name={item.name} value={item.value}>
                  {item.text}
                </Radio>

                <Popover>
                  <PopoverTrigger>
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
                  </PopoverTrigger>
                  <PopoverContent width="100%" borderRadius="0">
                    <PopoverArrow />
                    <PopoverCloseButton />
                    <PopoverHeader fontWeight={600} fontSize={18}>
                      How to get:{" "}
                    </PopoverHeader>
                    <PopoverBody>{item.helper}</PopoverBody>
                  </PopoverContent>
                </Popover>
              </Flex>
            );
          })}
        </ChakraRadioGroup>
      )}
    />
  );
};

export default RadioGroup;
