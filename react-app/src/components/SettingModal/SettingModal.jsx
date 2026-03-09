import { useEffect, useState } from "react";
import {
  Button,
  IconButton,
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
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { AddIcon, SettingsIcon, StarIcon } from "@chakra-ui/icons";

import useRedmineStore from "../../store/redmineStore";
import useJiraStore from "../../store/jiraStore";
import useClickUpStore from "../../store/clickupStore";
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
import { getAssignedIssues, jiraLogin } from "../../actions/jira";
import {
  clickupLogin,
  getClickUpTeams,
  getAssignedTasks,
  getLatestClickUpTimeEntries,
} from "../../actions/clickup";

const defaultSetting = {
  presetName: "unnamed",
  redmineUrl: "",
  jiraUrl: "",
  redmineApiKey: "",
  jiraApiKey: "",
  jiraEmail: "",
  clickupApiKey: "",
};

const SettingModal = ({ border, hoverBg, buttonMinH }) => {
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
  const {
    addUser: addClickUpUser,
    addTeams: addClickUpTeams,
    addAssignedTasks: addClickUpAssignedTasks,
    setSelectedTeamId,
  } = useClickUpStore();

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const modalBorder = useColorModeValue("gray.200", "gray.700");
  const tabHoverBg = useColorModeValue("gray.100", "gray.700");

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

  const fetchClickUpUser = async () => {
    const user = await clickupLogin();
    if (user) {
      addClickUpUser(user);
      const teams = await getClickUpTeams();
      if (teams && teams.length > 0) {
        addClickUpTeams(teams);
        const firstTeamId = teams[0].id;
        setSelectedTeamId(firstTeamId);
        const assignedTasks = await getAssignedTasks(firstTeamId, user.id);
        addClickUpAssignedTasks(assignedTasks);
      }
    }
    return user;
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
      redmineOrganization,
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
                  [],
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
                    const additionalUser =
                      await fetchAdditionalJiraUser(jiraUrl);
                    if (additionalUser) {
                      const assignedIssues = await getAssignedIssues(
                        jiraUrl,
                        additionalUser.accountId,
                        null,
                        [],
                      );
                      addAdditionalAssignedIssues(jiraUrl, assignedIssues);
                    }
                  }
                },
              );
              await Promise.all(additionalFetches);
            }

            const redmineUser = await fetchRedmineUser();
            if (redmineUser) {
              addProjects(await getRedmineProjects(redmineUser.id));
              addLatestActivity(await getLatestRedmineWorkLogs(redmineUser.id));
            }

            const clickupApiKey = currentData?.clickupApiKey;
            if (clickupApiKey) {
              const clickupUser = await fetchClickUpUser();
              if (clickupUser) {
                await getLatestClickUpTimeEntries();
              }
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
      <IconButton
        aria-label="Settings"
        icon={isLoading ? <Spinner size="sm" /> : <SettingsIcon />}
        size="sm"
        variant="ghost"
        borderRadius="0"
        w="36px"
        h="100%"
        minH={buttonMinH}
        onClick={onOpen}
        isDisabled={!user || isLoading}
        _hover={{ bg: hoverBg }}
      />

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxWidth="fit-content" bg="gray.50" borderRadius="0">
          <ModalHeader
            w="100%"
            p="20px 30px"
            borderBottom="1px solid"
            borderColor="gray.300"
            fontSize="xs"
            fontWeight={700}
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            Settings
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
