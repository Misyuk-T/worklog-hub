import axios from "axios";
import { toast } from "react-toastify";
import { Stack, Text } from "@chakra-ui/react";
import useSettingsStore from "../store/settingsStore";

export const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

instance.interceptors.request.use(async (config) => {
  const settings = useSettingsStore.getState().currentSettings;
  if (config.url.includes("jira") && settings) {
    config.params = {
      ...config.params,
      jiraApiKey: settings.jiraApiKey,
      jiraEmail: settings.jiraEmail,
    };
  } else if (config.url.includes("redmine") && settings) {
    config.params = {
      ...config.params,
      redmineApiKey: settings.redmineApiKey,
      redmineUrl: settings.redmineUrl,
    };
  }

  return config;
});

instance.interceptors.response.use(null, (error) => {
  const errorText = error?.response?.data;
  const statusRequest = error?.response?.status;

  if (statusRequest === 500) {
    toast.error(
      <Stack>
        <Text fontWeight={600}>Status: {statusRequest}</Text>
        <Text>{errorText}</Text>
      </Stack>,
      {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      }
    );
  }

  return Promise.reject(error);
});
