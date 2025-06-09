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
} from "@chakra-ui/react";

import useRedmineStore from "../../store/redmineStore";
import useJiraStore from "../../store/jiraStore";
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

const fieldItems = [
  {
    name: "Preset Name",
    id: "presetName",
  },
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
  {
    name: "Main Jira URL",
    id: "jiraUrl",
    leftAddon: "https://",
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

    if (data?.additionalJiraUrls && data.additionalJiraUrls.length > 0) {
      data.additionalJiraUrls.forEach((urlObj) => {
        append({ url: urlObj.url });
      });
    } else {
      append({ url: "" });
    }
  }, []);

  return (
    <TabPanel>
      <SimpleGrid templateColumns="repeat(2, 1fr)" gap={4}>
        {fieldItems.map(({ id, name, content, leftAddon, rightAddon }) => (
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

      <Flex as={ModalFooter} gap={5} px={0} pt={10}>
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
