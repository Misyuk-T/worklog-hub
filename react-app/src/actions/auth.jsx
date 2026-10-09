import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  equalTo,
  get,
  orderByChild,
  push,
  query,
  ref,
  set,
} from "firebase/database";

import { auth, db, isFirebaseConfigured } from "../firebase";
import useAuthStore from "../store/userStore";
import useJiraStore from "../store/jiraStore";
import useRedmineStore from "../store/redmineStore";
import useClickUpStore from "../store/clickupStore";
import useSettingsStore from "../store/settingsStore";
import useWorkLogsStore from "../store/worklogsStore";

const provider = new GoogleAuthProvider();

export const openLoginPopup = async () => {
  if (!isFirebaseConfigured) return;
  provider.addScope("profile");
  provider.addScope("email");
  await signInWithPopup(auth, provider).then();
};

export const loginUser = async (googleUserData) => {
  try {
    useAuthStore.setState({ isLoading: true });
    const { displayName, email, photoURL, uid } = googleUserData;
    const userData = {
      name: displayName,
      email: email,
      photo: photoURL,
      uid: uid,
      currentSettings: "",
    };
    // Look up only this user's record. Reading the whole "users" node would
    // need a rule that lets every signed-in user read everyone's saved
    // tracker API keys; see database.rules.json.
    const usersRef = ref(db, "users");
    const userQuery = await get(
      query(usersRef, orderByChild("uid"), equalTo(uid)),
    );
    let existingUserData = null;

    userQuery.forEach((childSnapshot) => {
      existingUserData = { ownerId: childSnapshot.key, ...childSnapshot.val() };
      return true;
    });

    if (!existingUserData) {
      const newUserRef = push(usersRef);
      const newUserId = newUserRef.key;
      existingUserData = { ...userData, ownerId: newUserId };
      await set(newUserRef, existingUserData);
    }

    useAuthStore.setState({ user: existingUserData });
  } catch (err) {
    console.error(err);
  } finally {
    useAuthStore.setState({ isLoading: false });
  }
};

export const logoutUser = async () => {
  try {
    useAuthStore.setState({ isLoading: true });

    await signOut(auth);

    useJiraStore.getState().resetAll();
    useRedmineStore.getState().resetAll();
    useClickUpStore.getState().resetAll();
    useSettingsStore.getState().resetAll();
    useWorkLogsStore.getState().resetAll();

    useAuthStore.getState().logout();
  } catch (err) {
    console.error(err);
  } finally {
    useAuthStore.setState({ isLoading: false });
  }
};

export const observeAuth = () => {
  if (!isFirebaseConfigured) return;
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await loginUser(user);
    }
  });
};
