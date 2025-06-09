import React from "react";
import { Flex, HStack, Button, Stack, Box, Text } from "@chakra-ui/react";
import useLatestActivityStore from "../../store/latestActivity";

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
    <title>arrow-down-from-line</title>
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
    <title>expand</title>
    <path d="M12 28.75h-8.75v-8.75c0-0.69-0.56-1.25-1.25-1.25s-1.25 0.56-1.25 1.25v10c0 0.69 0.56 1.25 1.25 1.25h10c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25zM30 18.75c-0.69 0.001-1.249 0.56-1.25 1.25v8.75h-8.75c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25h10c0.69-0.001 1.249-0.56 1.25-1.25v-10c-0.001-0.69-0.56-1.249-1.25-1.25zM12 0.75h-10c-0.69 0-1.25 0.56-1.25 1.25v10c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v-8.75h8.75c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25zM30 0.75h-10c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25h8.75v8.75c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v-10c-0.56-1.25-1.25-1.25-1.25-1.25z" />
  </svg>
);

const LatestActivityTabs = () => {
  const { activeTab, setActiveTab, panelSize, setPanelSize } =
    useLatestActivityStore();

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (panelSize === "collapsed") {
      setPanelSize("partial");
    }
  };

  return (
    <Flex
      alignItems={"center"}
      gap={"20px"}
      justifyContent={"space-between"}
      backgroundColor={"white"}
      p={"10px"}
      borderRadius={"5px"}
      boxShadow={"sm"}
      w={"435px"}
    >
      <Stack height={"100%"} justifyContent={"space-between"}>
        <Text
          fontSize="sm"
          color="gray.600"
          mt={"10px"}
          fontWeight={500}
          textTransform={"uppercase"}
        >
          Latest Activity
        </Text>{" "}
        <Text fontSize="sm" color="gray.600" whiteSpace={"nowrap"} mb={"10px"}>
          Table State: {panelSize}
        </Text>
      </Stack>
      <Stack spacing={0} gap={"8px"}>
        <Flex justifyContent="space-between" alignItems="center">
          <HStack spacing={3}>
            <Button
              size="sm"
              variant={activeTab === "redmine" ? "solid" : "outline"}
              onClick={() => handleTabClick("redmine")}
            >
              Redmine
            </Button>
            <Button
              size="sm"
              variant={activeTab === "jira" ? "solid" : "outline"}
              onClick={() => handleTabClick("jira")}
            >
              Jira
            </Button>
            <Button
              size="sm"
              variant={activeTab === "compare" ? "solid" : "outline"}
              onClick={() => handleTabClick("compare")}
            >
              Compare
            </Button>
          </HStack>
        </Flex>

        <Flex justifyContent="center" alignItems="center" gap={2}>
          <Button
            size="xs"
            onClick={() => setPanelSize("collapsed")}
            variant={panelSize === "collapsed" ? "solid" : "outline"}
            px={3}
          >
            <Box as="span" display="flex" alignItems="center">
              <CollapsedIcon />
            </Box>
          </Button>
          <Button
            size="xs"
            onClick={() => setPanelSize("partial")}
            variant={panelSize === "partial" ? "solid" : "outline"}
            px={3}
          >
            <Box as="span" display="flex" alignItems="center">
              <MediumIcon />
            </Box>
          </Button>
          <Button
            size="xs"
            onClick={() => setPanelSize("full")}
            variant={panelSize === "full" ? "solid" : "outline"}
            px={3}
          >
            <Box as="span" display="flex" alignItems="center">
              <FullIcon />
            </Box>
          </Button>
        </Flex>
      </Stack>
    </Flex>
  );
};

export default LatestActivityTabs;
