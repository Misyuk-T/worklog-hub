import { useEffect } from "react";
import {
  Box,
  ChakraProvider,
  Container,
  Flex,
  IconButton,
  Link,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import { ToastContainer } from "react-toastify";

import useRedmineStore from "./store/redmineStore";
import useJiraStore from "./store/jiraStore";
import useClickUpStore from "./store/clickupStore";

import GenerateCards from "./components/GenerateCards/GenerateCards";
import InformationTabs from "./components/Tabs/InformationTabs";
import BoxOverlay from "./components/BoxOverlay";
import Avatar from "./components/Avatar";
import SettingModal from "./components/SettingModal/SettingModal";
import ServicesStatus from "./components/ServicesStatus";
import Loader from "./components/Loader";

import theme from "./styles/index";
import { observeAuth } from "./actions/auth";
import useAuthStore from "./store/userStore";
import { fetchAllData } from "./actions/workLogs";
import { getOrganizationUrls } from "./helpers/getOrganizationUrl";
import useSettingsStore from "./store/settingsStore";
import LatestActivityPanels from "./components/LatestActivity/LatestActivityPanels";
import LatestActivityTabs from "./components/LatestActivity/LatestActivityTabs";

import { Welcome } from "./components/Welcome";
import { DemoBanner } from "./demo/DemoBanner";
import { DEMO_BUILD } from "./demo/demoMode";

import GitHubIcon from "./assets/GitHubIcon.svg";

const App = () => {
  const { currentSettings } = useSettingsStore();
  const {
    addUser: addJiraUser,
    addOrganizationURL: setJiraUrl,
    addAssignedIssues,
    addAdditionalAssignedIssues,
    resetAdditionalAssignedIssues,
    user: jiraUser,
  } = useJiraStore();
  const { addProjects, addLatestActivity, addUser, addOrganizationURL, user } =
    useRedmineStore();
  const {
    addUser: addClickUpUser,
    addTeams: addClickUpTeams,
    addAssignedTasks: addClickUpAssignedTasks,
    setSelectedTeamId,
    user: clickUpUser,
  } = useClickUpStore();
  const { isAuthObserve, user: googleUser, isLoading } = useAuthStore();
  const isDemo = DEMO_BUILD;
  const showWorkspace = Boolean(googleUser) || isDemo;

  const saveOrganizationUrls = (jiraOrganization, redmineOrganization) => {
    const { redmineUrl, jiraUrl } = getOrganizationUrls(
      jiraOrganization,
      redmineOrganization,
    );

    addOrganizationURL(redmineUrl);
    setJiraUrl(jiraUrl);
  };

  const handleRefresh = async () => {
    await fetchAllData({
      currentSettings,
      addJiraUser,
      addAssignedIssues,
      resetAdditionalAssignedIssues,
      addAdditionalAssignedIssues,
      addUser,
      addProjects,
      addLatestActivity,
      saveOrganizationUrls,
      addClickUpUser,
      addClickUpTeams,
      addClickUpAssignedTasks,
      setSelectedTeamId,
    });
  };

  const border = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.100", "gray.700");

  useEffect(() => {
    if (!isAuthObserve) {
      observeAuth();
      useAuthStore.setState({ isAuthObserve: true });
    }
  }, []);

  return (
    <ChakraProvider theme={theme} resetCSS>
      <Container
        as={Flex}
        position="relative"
        width="auto"
        maxW="1200px"
        px={["16px", "24px"]}
        flexGrow={1}
        flexShrink={0}
        alignItems="stretch"
        w="100%"
        pt={"10px"}
        centerContent
        gap="20px"
      >
        <Stack flex={1} minW={0} w="100%">
          <Flex
            alignItems="stretch"
            gap={3}
            w="100%"
            minW={0}
            flexWrap={{ base: "wrap", lg: "nowrap" }}
            display={showWorkspace ? "flex" : "none"}
          >
            <Box
              flex={{ base: "1 1 100%", md: "1 1 calc(50% - 6px)", lg: "1 1 35%" }}
              minW={0}
              maxW={{ base: "100%", md: "calc(50% - 6px)", lg: "35%" }}
            >
              <LatestActivityTabs />
            </Box>

            <Box
              flex={{ base: "1 1 100%", md: "1 1 calc(50% - 6px)", lg: "1 1 35%" }}
              minW={0}
              maxW={{ base: "100%", md: "calc(50% - 6px)", lg: "35%" }}
            >
              <GenerateCards isDisabled={!user} />
            </Box>

            <Stack
              flex={{ base: "1 1 100%", lg: "1 1 30%" }}
              minW={0}
              maxW={{ base: "100%", lg: "30%" }}
              alignSelf="stretch"
              justifyContent="space-between"
              gap={0}
            >
              <Avatar user={googleUser} />

              <Flex gap={0} align="stretch" w="100%" minW={0}>
                <Stack
                  flex={1}
                  minW={0}
                  boxShadow="sm"
                  py={1}
                  px={2}
                  bg="white"
                  gap={0}
                  borderRadius="0"
                  borderWidth="1px"
                  borderColor={border}
                >
                  <ServicesStatus title="redmine" user={user} />
                  <ServicesStatus title="jira" user={jiraUser} />
                  <ServicesStatus title="clickup" user={clickUpUser} />
                </Stack>

                <Flex
                  bg="white"
                  gap={0}
                  borderWidth="1px"
                  borderLeftWidth="0"
                  borderRadius="0"
                  borderColor={border}
                  overflow="hidden"
                  boxShadow="sm"
                  minH="52px"
                >
                  <IconButton
                    aria-label="Refresh Redmine, Jira & ClickUp"
                    icon={<RepeatIcon />}
                    size="sm"
                    variant="ghost"
                    borderRadius="0"
                    w="36px"
                    h="100%"
                    minH="52px"
                    onClick={handleRefresh}
                    isDisabled={!user || isDemo}
                    borderRightWidth="1px"
                    borderRightColor={border}
                    _hover={{ bg: hoverBg }}
                  />
                  <SettingModal
                    border={border}
                    hoverBg={hoverBg}
                    buttonMinH="52px"
                  />
                </Flex>
              </Flex>
            </Stack>
          </Flex>
          {DEMO_BUILD && <DemoBanner />}
          {showWorkspace ? <LatestActivityPanels /> : <Welcome />}
        </Stack>

        {showWorkspace && <InformationTabs />}

        <Flex as="footer" justify="center" w="100%" mt={"-15px"} py={"5px"}>
          <Link
            href="https://github.com/Misyuk-T/worklog-hub"
            isExternal
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            fontSize="14px"
            color="blue.600"
            borderRadius="md"
            px={2}
            py={1}
            sx={{
              "@keyframes githubStarHint": {
                "0%, 8%, 100%": {
                  backgroundColor: "transparent",
                  boxShadow: "0 0 0 0 rgba(49, 130, 206, 0)",
                },
                "2%, 6%": {
                  backgroundColor: "var(--chakra-colors-blue-50)",
                  boxShadow: "0 0 0 4px rgba(49, 130, 206, 0.12)",
                },
                "4%": {
                  backgroundColor: "transparent",
                  boxShadow: "0 0 0 0 rgba(49, 130, 206, 0)",
                },
              },
              animation: "githubStarHint 60s ease-in-out 12s infinite",
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
              },
            }}
            _hover={{
              color: "blue.700",
              textDecoration: "underline",
              animation: "none",
            }}
            _focusVisible={{ animation: "none", boxShadow: "outline" }}
          >
            <Box
              as="img"
              src={GitHubIcon}
              alt=""
              w={4}
              h={4}
              display="block"
              aria-hidden
            />
            Source on GitHub. A star helps if it saved you time
          </Link>
        </Flex>

        <Loader isVisible={isLoading} isFixed />
      </Container>
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <BoxOverlay bgColor="blackAlpha.50" />
    </ChakraProvider>
  );
};

export default App;
