import { useEffect } from "react";
import {
  Box,
  ChakraProvider,
  Container,
  Flex,
  IconButton,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import { ToastContainer } from "react-toastify";

import useRedmineStore from "./store/redmineStore";
import useJiraStore from "./store/jiraStore";

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
  const { isAuthObserve, user: googleUser, isLoading } = useAuthStore();

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
        h="100%"
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
            flexWrap="nowrap"
          >
            <Box flex="1 1 35%" minW={0} maxW="35%">
              <LatestActivityTabs />
            </Box>

            <Box flex="1 1 35%" minW={0} maxW="35%">
              <GenerateCards isDisabled={!user} />
            </Box>

            <Stack
              flex="1 1 30%"
              minW={0}
              maxW="30%"
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
                  py={2}
                  px={2}
                  bg="white"
                  gap={0}
                  borderRadius="0"
                  borderWidth="1px"
                  borderColor={border}
                >
                  <ServicesStatus title="redmine" user={user} />
                  <ServicesStatus title="jira" user={jiraUser} />
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
                    aria-label="Refresh Redmine & Jira"
                    icon={<RepeatIcon />}
                    size="sm"
                    variant="ghost"
                    borderRadius="0"
                    w="36px"
                    h="100%"
                    minH="52px"
                    onClick={handleRefresh}
                    isDisabled={!user || !jiraUser}
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
          <LatestActivityPanels />
        </Stack>

        <InformationTabs />
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
