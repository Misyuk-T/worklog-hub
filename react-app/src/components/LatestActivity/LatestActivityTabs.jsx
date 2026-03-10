import React, { useEffect } from "react";
import {
  Button,
  Flex,
  HStack,
  IconButton,
  Box,
  Text,
  useColorModeValue,
  Stack,
} from "@chakra-ui/react";
import useLatestActivityStore from "../../store/latestActivity";
import useJiraStore from "../../store/jiraStore";
import useClickUpStore from "../../store/clickupStore";
import useRedmineStore from "../../store/redmineStore";

const CollapsedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <line
      x1="4"
      y1="12"
      x2="20"
      y2="12"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const MediumIcon = () => (
  <svg
    fill="currentColor"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.115 24.115l-2.865 2.867v-18.982c0-0.69-0.56-1.25-1.25-1.25s-1.25 0.56-1.25 1.25v18.981l-2.866-2.866c-0.226-0.226-0.539-0.366-0.884-0.366-0.691 0-1.251 0.56-1.251 1.251 0 0.346 0.14 0.658 0.367 0.885l5 5c0.012 0.012 0.029 0.016 0.041 0.027 0.103 0.099 0.223 0.18 0.356 0.239l0.009 0.003c0.141 0.06 0.306 0.095 0.478 0.095 0.345 0 0.657-0.139 0.883-0.365l5.001-5c0.226-0.226 0.366-0.539 0.366-0.884 0-0.691-0.56-1.251-1.251-1.251-0.345 0-0.658 0.14-0.884 0.366zM30 0.75h-28c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25h28c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25z" />
  </svg>
);

const FullIcon = () => (
  <svg
    fill="currentColor"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 28.75h-8.75v-8.75c0-0.69-0.56-1.25-1.25-1.25s-1.25 0.56-1.25 1.25v10c0 0.69 0.56 1.25 1.25 1.25h10c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25zM30 18.75c-0.69 0.001-1.249 0.56-1.25 1.25v8.75h-8.75c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25h10c0.69-0.001 1.249-0.56 1.25-1.25v-10c-0.001-0.69-0.56-1.249-1.25-1.25zM12 0.75h-10c-0.69 0-1.25 0.56-1.25 1.25v10c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v-8.75h8.75c0.69 0 1.25 0.56 1.25 1.25s-0.56-1.25-1.25-1.25zM30 0.75h-10c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25h8.75v8.75c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v-10c-0.56-1.25-1.25-1.25-1.25-1.25z" />
  </svg>
);

const LatestActivityTabs = () => {
  const { activeTab, setActiveTab, panelSize, setPanelSize } =
    useLatestActivityStore();
  const { user: jiraUser } = useJiraStore();
  const { user: clickUpUser } = useClickUpStore();
  const { user: redmineUser } = useRedmineStore();

  const bg = useColorModeValue("white", "gray.900");
  const border = useColorModeValue("gray.200", "gray.700");
  const subtle = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const shadow = useColorModeValue("sm", "sm");

  useEffect(() => {
    const isCurrentTabDisabled = 
      (activeTab === "jira" && !jiraUser) ||
      (activeTab === "clickup" && !clickUpUser) ||
      (activeTab === "redmine" && !redmineUser);
    
    if (isCurrentTabDisabled) {
      if (jiraUser) {
        setActiveTab("jira");
      } else if (clickUpUser) {
        setActiveTab("clickup");
      } else if (redmineUser) {
        setActiveTab("redmine");
      }
    }
  }, [jiraUser, clickUpUser, redmineUser, activeTab, setActiveTab]);

  const handleTabClick = (tab, disabled) => {
    if (disabled) return;
    setActiveTab(tab);
    if (panelSize === "collapsed") setPanelSize("partial");
  };

  const SquareTab = ({ tabKey, label, isFirst, isLast, disabled }) => {
    const isActive = activeTab === tabKey;
    return (
      <Button
        size="sm"
        onClick={() => handleTabClick(tabKey, disabled)}
        isDisabled={disabled}
        borderRadius="0"
        h="34px"
        px={4}
        fontWeight={600}
        bg={isActive ? "gray.900" : "transparent"}
        color={isActive ? "white" : "inherit"}
        borderWidth="1px"
        borderColor={border}
        _hover={{ bg: isActive ? "gray.800" : disabled ? "transparent" : hoverBg }}
        ml={isFirst ? 0 : "-1px"}
        _focusVisible={{ boxShadow: "outline" }}
        opacity={disabled ? 0.5 : 1}
        cursor={disabled ? "not-allowed" : "pointer"}
      >
        {label}
      </Button>
    );
  };

  const CompareButton = () => {
    const isActive = activeTab === "compare";
    return (
      <Button
        size="sm"
        onClick={() => handleTabClick("compare")}
        borderRadius="0"
        h="34px"
        px={4}
        fontWeight={600}
        bg={isActive ? "gray.900" : "transparent"}
        color={isActive ? "white" : "inherit"}
        borderWidth="1px"
        borderColor={border}
        _hover={{ bg: isActive ? "gray.800" : hoverBg }}
        flex="0 0 auto"
      >
        Compare
      </Button>
    );
  };

  const SizeButton = ({ value, icon, label }) => {
    const isActive = panelSize === value;
    return (
      <IconButton
        aria-label={label}
        icon={icon}
        size="sm"
        variant="ghost"
        borderRadius="0"
        w="36px"
        h="34px"
        borderWidth="1px"
        borderColor={border}
        bg={isActive ? "gray.900" : "transparent"}
        color={isActive ? "white" : "inherit"}
        _hover={{ bg: isActive ? "gray.800" : hoverBg }}
        ml="-1px"
        onClick={() => setPanelSize(value)}
      />
    );
  };

  const isCompare = activeTab === "compare";

  return (
    <Flex
      direction="column"
      bg={bg}
      borderWidth="1px"
      borderColor={border}
      borderRadius="0"
      boxShadow={shadow}
      w="full"
      maxW="720px"
      minW={0}
    >
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={3}
        gap={3}
        minW={0}
      >
        <Stack spacing={0} minW={0}>
          <Text
            fontSize="xs"
            color={subtle}
            fontWeight={700}
            letterSpacing="0.08em"
            whiteSpace="nowrap"
          >
            LATEST ACTIVITY
          </Text>
          <Text fontSize="sm" color={subtle} noOfLines={1}>
            Select a source
          </Text>
        </Stack>

        <HStack spacing={0} align="center" justify="center" flex="0 0 auto">
          <IconButton
            aria-label="Collapsed"
            icon={<CollapsedIcon />}
            size="sm"
            variant="ghost"
            borderRadius="0"
            w="36px"
            h="34px"
            borderWidth="1px"
            borderColor={border}
            bg={panelSize === "collapsed" ? "gray.900" : "transparent"}
            color={panelSize === "collapsed" ? "white" : "inherit"}
            _hover={{ bg: panelSize === "collapsed" ? "gray.800" : hoverBg }}
            onClick={() => setPanelSize("collapsed")}
          />
          <SizeButton value="partial" icon={<MediumIcon />} label="Partial" />
          <SizeButton value="full" icon={<FullIcon />} label="Full" />
        </HStack>
      </Flex>

      <Flex
        align="center"
        justify="space-between"
        px={4}
        pb={3}
        gap={3}
        minW={0}
      >
        <Flex
          minW={0}
          overflowX="auto"
          overflowY="hidden"
          sx={{ "&::-webkit-scrollbar": { display: "none" } }}
        >
          <HStack spacing={0} minW="max-content">
            <SquareTab tabKey="jira" label="Jira" isFirst disabled={!jiraUser} />
            <SquareTab tabKey="clickup" label="ClickUp" disabled={!clickUpUser} />
            <SquareTab tabKey="redmine" label="Redmine" isLast disabled={!redmineUser} />
          </HStack>
        </Flex>

        <CompareButton />
      </Flex>
    </Flex>
  );
};

export default LatestActivityTabs;
