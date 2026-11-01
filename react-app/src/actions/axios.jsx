import axios from "axios";
import { toast } from "react-toastify";
import { Stack, Text } from "@chakra-ui/react";
import useSettingsStore from "../store/settingsStore";
import { getApiErrorMessage } from "../helpers/apiErrors";
import {
  READ_ONLY_BLOCKED_CODE,
  shouldBlockRequest,
} from "../helpers/readOnlyGuard";
import {
  CREDENTIAL_HOST_MISMATCH_CODE,
  isJiraHostAllowed,
} from "../helpers/credentialHost";

export const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

// The preset in force right now. A fetch that spans several requests or pages
// calls this once at its start and passes the result as `credentials` on every
// request, so a preset switch mid-fetch cannot change whose keys are used.
export const captureCredentials = () => useSettingsStore.getState().currentSettings;

// Credentials go in request headers, not the query string, so they stay out of
// proxy and access logs. The proxy never forwards them upstream.
const setHeaders = (config, headers) => {
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === "string" && value) config.headers.set(name, value);
  }
};

// A request may carry `credentials` (a preset) to use instead of the active
// one, and `readOnly: true` when it is made on behalf of another person. Such
// requests, and any made with a non-active preset's keys, may only read.
instance.interceptors.request.use(async (config) => {
  const { currentSettings } = useSettingsStore.getState();
  const settings = config.credentials || currentSettings;

  if (
    shouldBlockRequest({
      method: config.method,
      url: config.url,
      readOnly: config.readOnly,
      credentialsPresetId: config.credentials?.id,
      activePresetId: currentSettings?.id,
    })
  ) {
    const error = new Error("Read-only: this request would change data.");
    error.code = READ_ONLY_BLOCKED_CODE;
    error.config = { ...config, skipErrorToast: true };
    return Promise.reject(error);
  }

  if (!settings) return config;

  if (
    config.url.includes("jira") &&
    !isJiraHostAllowed(settings, config.params?.jiraUrl)
  ) {
    const error = new Error(
      "Blocked: the Jira host of this request does not belong to the credentials it would use.",
    );
    error.code = CREDENTIAL_HOST_MISMATCH_CODE;
    error.config = { ...config, skipErrorToast: true };
    return Promise.reject(error);
  }

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
