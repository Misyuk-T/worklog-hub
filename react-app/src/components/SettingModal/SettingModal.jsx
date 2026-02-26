import { useEffect, useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Tab,
  TabList,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { AddIcon, StarIcon, UnlockIcon } from "@chakra-ui/icons";

import useRedmineStore from "../../store/redmineStore";
import useJiraStore from "../../store/jiraStore";
import useSettingsStore from "../../store/settingsStore";

import { getCurrentSettings, getSettings } from "../../actions/settings";
import { getOrganizationUrls } from "../../helpers/getOrganizationUrl";

import SettingModalItem from "./SettingModalItem";
import useAuthStore from "../../store/userStore";
import { v4 as uuidv4 } from "uuid";
import {
  getLatestRedmineWorkLogs,
  getRedmineProjects,
  redmineLogin,
} from "../../actions/redmine";
import {
  getAssignedIssues,
  jiraLogin,
} from "../../actions/jira";

const defaultSetting = {
  presetName: "unnamed",
  redmineUrl: "",
  jiraUrl: "",
  redmineApiKey: "",
  jiraApiKey: "",
  jiraEmail: "",
  clickupApiKey: "",
};

const SettingModal = () => {
  const {
    settings,
    updateSettings,
    addSettings,
    addCurrentSettings,
    currentSettings,
  } = useSettingsStore();
  const { user } = useAuthStore();
  const {
    addOrganizationURL: setJiraUrl,
    addUser: addJiraUser,
    resetAdditionalAssignedIssues,
    addAssignedIssues,
    addAdditionalAssignedIssues,
  } = useJiraStore();
  const { addOrganizationURL, addUser, addLatestActivity, addProjects } =
    useRedmineStore();

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isSettingsExist = settings && Object.entries(settings)?.length > 0;
  const settingsArray = isSettingsExist
    ? Object.entries(settings)
    : [[null, defaultSetting]];
  const isLastItem = settingsArray.length === 1;

  const fetchRedmineUser = async () => {
    const user = await redmineLogin();
    addUser(user);
    return user;
  };

  const fetchJiraUser = async (jiraUrl) => {
    const user = await jiraLogin(jiraUrl);
    addJiraUser(user);
    return user;
  };

  const fetchAdditionalJiraUser = async (jiraUrl) => {
    // Do not call addJiraUser here to avoid overwriting the main user it just for checking jira url
    return await jiraLogin(jiraUrl);
  };

  const handleAddNew = () => {
    updateSettings({ ...defaultSetting, id: uuidv4() });
    setActiveTab(() => {
      if (settings) {
        return settingsArray.length;
      } else {
        return 0;
      }
    });
  };

  const saveOrganizationUrls = (jiraOrganization, redmineOrganization) => {
    const { redmineUrl, jiraUrl } = getOrganizationUrls(
      jiraOrganization,
      redmineOrganization
    );

    addOrganizationURL(redmineUrl);
    setJiraUrl(jiraUrl);
  };

  const fetchSettings = async () => {
    const currentData = await getCurrentSettings(user.ownerId).then((data) => {
      addCurrentSettings(data);
      saveOrganizationUrls(data?.jiraUrl, data?.redmineUrl);
      return data;
    });

    const settingsData = await getSettings(user.ownerId).then((data) => {
      const settingsObject = data.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
      addSettings(settingsObject);
      return settingsObject;
    });
    return { currentData, settingsData };
  };

  const handleChangeTab = () => {
    setActiveTab((prevState) => {
      if (prevState !== 0) {
        return prevState - 1;
      } else {
        return 0;
      }
    });
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchSettings()
        .then(async ({ currentData, settingsData }) => {
          const isDataExist = Object.entries(settingsData).length > 0;
          if (isDataExist) {
            const currentJiraUrl = currentData?.jiraUrl;
            if (currentJiraUrl) {
              const jiraUser = await fetchJiraUser(currentJiraUrl);
              if (jiraUser) {
                const assignedIssues = await getAssignedIssues(
                  currentJiraUrl,
                  jiraUser.accountId,
                  null,
                  []
                );
                addAssignedIssues(assignedIssues);
              }
            }

            resetAdditionalAssignedIssues();
            const additionalJiraUrls = currentData?.additionalJiraUrls;
            if (additionalJiraUrls && additionalJiraUrls.length > 0) {
              const additionalFetches = additionalJiraUrls.map(
                async (jiraUrlObj) => {
                  const jiraUrl = jiraUrlObj.url;
                  if (jiraUrl && jiraUrl.length > 0) {
                    const additionalUser = await fetchAdditionalJiraUser(
                      jiraUrl
                    );
                    if (additionalUser) {
                      const assignedIssues = await getAssignedIssues(
                        jiraUrl,
                        additionalUser.accountId,
                        null,
                        []
                      );
                      addAdditionalAssignedIssues(jiraUrl, assignedIssues);
                    }
                  }
                }
              );
              await Promise.all(additionalFetches);
            }

            const redmineUser = await fetchRedmineUser();
            if (redmineUser) {
              addProjects(await getRedmineProjects(redmineUser.id));
              addLatestActivity(await getLatestRedmineWorkLogs(redmineUser.id));
            }
          } else {
            handleAddNew();
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  return (
    <>
      <Button
        display="flex"
        flexDirection="column"
        onClick={onOpen}
        fontSize="xs"
        p={3}
        gap={1}
        colorScheme="orange"
        boxShadow="md"
        isDisabled={!user || isLoading}
        w={"100%"}
      >
        {isLoading ? <Spinner flexShrink={0} size={"sm"} /> : <UnlockIcon />}
        <Text>Settings</Text>
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxWidth="fit-content">
          <ModalHeader
            w="100%"
            p="20px 30px"
            borderBottom="1px solid"
            borderColor="gray.300"
          >
            Settings:
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <Tabs
              isFitted
              index={activeTab}
              isManual
              onChange={(index) => {
                setActiveTab(index);
              }}
            >
              <TabList>
                {settings ? (
                  settingsArray.map((item) => {
                    const isCurrent = currentSettings?.id === item[1]?.id;

                    return (
                      <Tab key={item[1].id}>
                        <Text whiteSpace="nowrap" fontWeight={600}>
                          {item[1].presetName}
                        </Text>
                        {isCurrent && <StarIcon color="orange" ml={2} />}
                      </Tab>
                    );
                  })
                ) : (
                  <Tab>
                    <Text whiteSpace="nowrap" fontWeight={600}>
                      Preset Name
                    </Text>
                  </Tab>
                )}

                <Button
                  onClick={handleAddNew}
                  fontSize="xs"
                  borderRadius={0}
                  variant="ghost"
                >
                  <AddIcon />
                </Button>
              </TabList>

              <TabPanels>
                {settingsArray.map((item) => {
                  const isCurrent = currentSettings?.id === item[1]?.id;
                  return (
                    <SettingModalItem
                      data={item[1]}
                      isLastItem={isLastItem}
                      onDelete={handleChangeTab}
                      key={item[0]}
                      saveOrganizationUrls={saveOrganizationUrls}
                      isCurrent={isCurrent}
                    />
                  );
                })}
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SettingModal;
