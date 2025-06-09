import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { get, getDatabase, push, ref, set } from "firebase/database";

import { initializeApp } from "firebase/app";
import useAuthStore from "../store/userStore";
import useJiraStore from "../store/jiraStore";
import useRedmineStore from "../store/redmineStore";
import useSettingsStore from "../store/settingsStore";
import useWorkLogsStore from "../store/worklogsStore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();
const auth = getAuth();

export const openLoginPopup = async () => {
  provider.addScope("profile");
  provider.addScope("email");
  await signInWithRedirect(auth, provider).then();
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
    const db = getDatabase();
    const usersRef = ref(db, "users");
    const userQuery = await get(usersRef);
    let existingUserData = null;

    if (userQuery.exists()) {
      userQuery.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        if (user.uid === uid) {
          existingUserData = user;
        }
      });
    }

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
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await loginUser(user);
    }
  });
};
