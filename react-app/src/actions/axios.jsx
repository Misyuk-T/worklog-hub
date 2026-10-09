import axios from "axios";
import { toast } from "react-toastify";
import { Stack, Text } from "@chakra-ui/react";
import useSettingsStore from "../store/settingsStore";
import { getApiErrorMessage } from "../helpers/apiErrors";

export const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

// Credentials go in request headers, not the query string, so they stay out of
// proxy and access logs. The proxy never forwards them upstream.
const setHeaders = (config, headers) => {
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === "string" && value) config.headers.set(name, value);
  }
};

instance.interceptors.request.use(async (config) => {
  const settings = useSettingsStore.getState().currentSettings;
  if (!settings) return config;

  if (config.url.includes("jira")) {
    setHeaders(config, {
      "X-Jira-Api-Key": settings.jiraApiKey,
      "X-Jira-Email": settings.jiraEmail,
    });
  } else if (config.url.includes("redmine")) {
    setHeaders(config, {
      "X-Redmine-Api-Key": settings.redmineApiKey,
      "X-Redmine-Url": settings.redmineUrl,
    });
  } else if (config.url.includes("clickup")) {
    setHeaders(config, { "X-ClickUp-Api-Key": settings.clickupApiKey });
  }

  return config;
});

instance.interceptors.response.use(null, (error) => {
  const errorText = getApiErrorMessage(error);
  error.message = errorText;
  const statusRequest = error?.response?.status;

  if (statusRequest === 500 && !error.config?.skipErrorToast) {
    toast.error(
      <Stack>
        <Text fontWeight={600}>Status: {statusRequest}</Text>
        <Text whiteSpace="pre-wrap">{errorText}</Text>
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
