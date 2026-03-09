import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Button,
  Flex,
  Image,
  Link,
  ListItem,
  ModalFooter,
  OrderedList,
  SimpleGrid,
  TabPanel,
  Heading,
  Box,
} from "@chakra-ui/react";

import useRedmineStore from "../../store/redmineStore";
import useJiraStore from "../../store/jiraStore";
import useClickUpStore from "../../store/clickupStore";
import useSettingsStore from "../../store/settingsStore";

import {
  deleteSettings,
  sendCurrentSettings,
  sendSettings,
} from "../../actions/settings";

import SettingModalFieldItem from "./SettingModalFieldItem";

import RedmineApi from "../../assets/RedmineAPI.png";
import JiraUserName from "../../assets/JiraUserName.png";
import useAuthStore from "../../store/userStore";
import { fetchAllData } from "../../actions/workLogs";

const fieldSections = [
  {
    title: null,
    fields: [
      { name: "Preset Name", id: "presetName" },
    ],
  },
  {
    title: null,
    fields: [
      {
        name: "JIRA Email",
        id: "jiraEmail",
        content: (
          <OrderedList>
            <ListItem>Atlassian account username</ListItem>
            <Image mx="auto" border="1px solid" mt={5} src={JiraUserName} h={180} />
          </OrderedList>
        ),
        leftAddon: "",
        rightAddon: "",
      },
      {
        name: "JIRA API Key",
        id: "jiraApiKey",
        content: (
          <OrderedList>
            <ListItem>
              Open next link:{" "}
              <Link
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                color="blue.500"
              >
                Generate Jira API key
              </Link>
            </ListItem>
            <ListItem>Follow instruction to generate API key</ListItem>
          </OrderedList>
        ),
        leftAddon: "",
        rightAddon: "",
      },
    ],
  },
  {
    title: "Jira URLs",
    fields: [
      { name: "Main Jira URL", id: "jiraUrl", leftAddon: "https://" },
    ],
  },
  {
    title: "Redmine",
    fields: [
      {
        name: "Redmine URL",
        id: "redmineUrl",
        leftAddon: "https://redmine.",
        rightAddon: ".com",
      },
      {
        name: "Redmine API Key",
        id: "redmineApiKey",
        content: (
          <OrderedList>
            <ListItem>Open your redmine account</ListItem>
            <ListItem>
              On the top-right corner find show <strong>API access key</strong>
            </ListItem>
            <ListItem>Copy this key into field</ListItem>
            <Image mx="auto" border="1px solid" mt={5} src={RedmineApi} h={250} />
          </OrderedList>
        ),
        leftAddon: "",
        rightAddon: "",
      },
    ],
  },
  {
    title: "ClickUp",
    fields: [
      {
        name: "ClickUp API Key",
        id: "clickupApiKey",
        content: (
          <OrderedList>
            <ListItem>
              Open next link:{" "}
              <Link
                href="https://app.clickup.com/settings/apps"
                target="_blank"
                color="blue.500"
              >
                ClickUp API Settings
              </Link>
            </ListItem>
            <ListItem>Click "Generate" to create Personal API Token</ListItem>
            <ListItem>Copy the token into field below</ListItem>
          </OrderedList>
        ),
        leftAddon: "",
        rightAddon: "",
      },
    ],
  },
];

const SettingModalItem = ({
  data,
  onDelete,
  isLastItem,
  saveOrganizationUrls,
  isCurrent,
}) => {
  const { user } = useAuthStore();
  const { addProjects, addLatestActivity, addUser } = useRedmineStore();
  const {
    addUser: addJiraUser,
    addAssignedIssues,
    addAdditionalAssignedIssues,
    resetAdditionalAssignedIssues,
  } = useJiraStore();
  const {
    addUser: addClickUpUser,
    addTeams: addClickUpTeams,
    addAssignedTasks: addClickUpAssignedTasks,
    setSelectedTeamId,
  } = useClickUpStore();
  const { deleteSetting, updateSettings, addCurrentSettings } =
    useSettingsStore();

  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {},
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalJiraUrls",
  });

  const handleDelete = async () => {
    deleteSetting(data.id);
    await deleteSettings(user.ownerId, data.id);
    onDelete();
  };

  const handleUseSetting = async (formData) => {
    addCurrentSettings(formData);
    await sendCurrentSettings(user.ownerId, formData);
    await fetchAllData({
      currentSettings: formData,
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

  const handleSaveSettings = async (formData) => {
    const settingData = { ...formData, id: data.id };
    setIsLoading(true);
    await sendSettings(user.ownerId, settingData);
    updateSettings(settingData);
  };

  const handleSaveAndUse = async () => {
    setIsLoading(true);
    const currentData = { ...getValues(), id: data.id };

    await handleUseSetting(currentData);
    await handleSaveSettings(currentData);

    setIsLoading(false);
  };

  useEffect(() => {
    setValue("presetName", data?.presetName || "");
    setValue("redmineUrl", data?.redmineUrl || "");
    setValue("jiraUrl", data?.jiraUrl || "");
    setValue("redmineApiKey", data?.redmineApiKey || "");
    setValue("jiraApiKey", data?.jiraApiKey || "");
    setValue("jiraEmail", data?.jiraEmail || "");
    setValue("clickupApiKey", data?.clickupApiKey || "");

    if (data?.additionalJiraUrls && data.additionalJiraUrls.length > 0) {
      data.additionalJiraUrls.forEach((urlObj) => {
        append({ url: urlObj.url });
      });
    } else {
      append({ url: "" });
    }
  }, []);

  return (
    <TabPanel px={4} pb={4}>
      {fieldSections.map((section, sectionIndex) => (
        <Box
          key={section.title ?? `section-${sectionIndex}`}
          mb={4}
          p={4}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="0"
        >
          {section.title && (
            <Heading
              size="sm"
              mb={3}
              color="gray.700"
              fontSize="xs"
              fontWeight={700}
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              {section.title}
            </Heading>
          )}
          <SimpleGrid templateColumns="repeat(2, 1fr)" gap={4}>
            {section.fields.map(({ id, name, content, leftAddon, rightAddon }) => (
              <React.Fragment key={id}>
                <SettingModalFieldItem
                  id={id}
                  name={name}
                  register={register}
                  leftAddon={leftAddon}
                  rightAddon={rightAddon}
                  errors={errors}
                >
                  {content}
                </SettingModalFieldItem>

                {id === "jiraUrl" && (
                  <>
                    {fields.map((item, index) => (
                      <SettingModalFieldItem
                        key={item.id}
                        id={`additionalJiraUrls.${index}.url`}
                        name={`Additional Jira URL ${index + 1}`}
                        register={register}
                        errors={errors}
                        remove={() => remove(index)}
                        isDynamic
                        showAddButton={index === fields.length - 1}
                        leftAddon={"https://"}
                        append={() => append({ url: "" })}
                      />
                    ))}
                  </>
                )}
              </React.Fragment>
            ))}
          </SimpleGrid>
        </Box>
      ))}

      <Flex as={ModalFooter} gap={5} px={0} pt={6}>
        <Button
          colorScheme="red"
          onClick={handleDelete}
          variant="outline"
          isDisabled={isLastItem || isCurrent}
        >
          Delete
        </Button>

        <Button
          colorScheme="teal"
          onClick={handleSubmit(handleSaveAndUse)}
          isLoading={isLoading}
          loadingText="Saving..."
        >
          Save & Use
        </Button>
      </Flex>
    </TabPanel>
  );
};

export default SettingModalItem;
