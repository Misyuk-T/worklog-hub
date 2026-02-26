import { useEffect } from "react";
import {
  Box,
  Button,
  ChakraProvider,
  Container,
  Flex,
  Stack,
  Text,
} from "@chakra-ui/react";
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
      redmineOrganization
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
        <Stack>
          <Flex justifyContent="space-between" gap={4}>
            <LatestActivityTabs />

            <Box>
              <GenerateCards isDisabled={!jiraUser || !user} />
            </Box>

            <Stack
              gap={1}
              alignSelf="flex-start"
              justifyContent="space-between"
              w="100%"
              height={"100%"}
              maxW={"160px"}
            >
              <Button
                display="flex"
                flexDirection="column"
                alignItems="center"
                onClick={handleRefresh}
                isDisabled={!user || !jiraUser}
                fontSize="xs"
                w={"100%"}
                p={3}
                gap={1}
                colorScheme="blue"
                boxShadow="md"
                whiteSpace="wrap"
              >
                <Text>Refresh Redmine & Jira</Text>
              </Button>
              <SettingModal />
            </Stack>

            <Stack width={"230px"} justifyContent={"space-between"}>
              <Avatar user={googleUser} />

              <Stack
                boxShadow="sm"
                py={"2px"}
                px={"5px"}
                w="100%"
                bg="white"
                gap={0}
                borderRadius={6}
              >
                <ServicesStatus title="redmine" user={user} />
                <ServicesStatus title="jira" user={jiraUser} />
              </Stack>
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
