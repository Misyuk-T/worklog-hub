import { getDatabase, ref, set, update, remove, get } from "firebase/database";
import { toast } from "react-toastify";
import { Stack, Text } from "@chakra-ui/react";

const db = getDatabase();

export const sendCurrentSettings = (ownerId, data) => {
  const userSettingsRef = ref(db, `users/${ownerId}`);
  return update(userSettingsRef, { currentSettings: data.id }).catch(
    (error) => {
      console.error("Error setting current settings:", error);
    }
  );
};

export const getCurrentSettings = (ownerId) => {
  const userRef = ref(db, `users/${ownerId}`);

  return get(userRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const currentSettingsId = userData.currentSettings;
        const settingsRef = ref(
          db,
          `users/${ownerId}/settings/${currentSettingsId}`
        );

        if (settingsRef) {
          return get(settingsRef).then((settingsSnapshot) => {
            return settingsSnapshot.val();
          });
        } else {
          return {};
        }
      }
    })
    .catch((error) => {
      console.error("Error getting user:", error);
      return null;
    });
};

export const sendSettings = (ownerId, data) => {
  const userSettingsRef = ref(db, `users/${ownerId}/settings/${data.id}`);
  set(userSettingsRef, data)
    .then(() => {
      toast.success(
        <Stack>
          <Text fontWeight={600}>
            Settings were successfully saved and set as current
          </Text>
        </Stack>,
        {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          progress: undefined,
          theme: "light",
        }
      );
    })
    .catch((error) => {
      console.error("Error saving settings:", error);
    });
};

export const deleteSettings = (ownerId, id) => {
  const userSettingsRef = ref(db, `users/${ownerId}/settings/${id}`);

  return remove(userSettingsRef)
    .then(() => {
      toast.success(
        <Stack>
          <Text fontWeight={600}>Settings were successfully deleted</Text>
        </Stack>,
        {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          progress: undefined,
          theme: "light",
        }
      );
    })
    .catch((error) => {
      console.error("Error deleting settings:", error);
    });
};

export const getSettings = (ownerId) => {
  const userSettingsRef = ref(db, `users/${ownerId}/settings`);

  return get(userSettingsRef)
    .then((snapshot) => {
      const settings = [];
      snapshot.forEach((childSnapshot) => {
        settings.push({
          ...childSnapshot.val(),
        });
      });

      return settings;
    })
    .catch((error) => {
      console.error("Error getting settings:", error);
      return [];
    });
};
