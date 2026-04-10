import { getApp, getApps, initializeApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";

import { supabase } from "@/integrations/supabase/client";

const FIREBASE_PUSH_PROMPT_STORAGE_KEY = "firebase_push_prompted_v1";
const FIREBASE_PUSH_TOKEN_STORAGE_KEY = "firebase_push_token_v1";
const FIREBASE_PUSH_USER_STORAGE_KEY = "firebase_push_user_v1";
const FIREBASE_MESSAGING_SW_PATH = "/firebase-messaging-sw.js";

type PersistedPushUser = {
  userId: string;
  userType: string | null;
};

const firebaseConfig = {
  apiKey: "AIzaSyBjUkAMToriAZsCqt5lcgup3uUR5dHPs4s",
  authDomain: "rota-certa-43342.firebaseapp.com",
  projectId: "rota-certa-43342",
  storageBucket: "rota-certa-43342.firebasestorage.app",
  messagingSenderId: "401156619389",
  appId: "1:401156619389:web:51f4773768dac3a90f4514",
  measurementId: "G-XLKGL4WLVB",
};

export const FIREBASE_VAPID_KEY =
  "BPT4K4Pdp4CsuvH3jhT_eJZO556Bf3qobFde8mHG7pbg09GM1phcYXnJXRi7nY3ixHxFBIxZu4SB0XvkHaGffN4";

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const getMessagingInstance = async () => {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }

  if (!(await isSupported())) {
    return null;
  }

  return getMessaging(firebaseApp);
};

const getMessagingServiceWorkerRegistration = async () =>
  navigator.serviceWorker.register(FIREBASE_MESSAGING_SW_PATH);

const getPersistedFirebasePushUser = (): PersistedPushUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = localStorage.getItem(FIREBASE_PUSH_USER_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as PersistedPushUser;

    if (!parsedValue?.userId) {
      return null;
    }

    return {
      userId: parsedValue.userId,
      userType: parsedValue.userType ?? null,
    };
  } catch {
    return null;
  }
};

const persistFirebasePushToken = (token: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    localStorage.setItem(FIREBASE_PUSH_TOKEN_STORAGE_KEY, token);
    return;
  }

  localStorage.removeItem(FIREBASE_PUSH_TOKEN_STORAGE_KEY);
};

const persistFirebasePushUser = (userId: string | null, userType: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!userId) {
    localStorage.removeItem(FIREBASE_PUSH_USER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(
    FIREBASE_PUSH_USER_STORAGE_KEY,
    JSON.stringify({
      userId,
      userType,
    }),
  );
};

const syncFirebaseTokenWithProfile = async (userId: string, token: string | null) => {
  const { error } = await supabase.from("profiles").update({ fcm_token: token }).eq("id", userId);

  if (error) {
    throw error;
  }
};

const refreshFirebasePushToken = async () => {
  const messaging = await getMessagingInstance();

  if (!messaging) {
    return null;
  }

  const serviceWorkerRegistration = await getMessagingServiceWorkerRegistration();
  const token = await getToken(messaging, {
    serviceWorkerRegistration,
    vapidKey: FIREBASE_VAPID_KEY,
  });

  const normalizedToken = token || null;
  persistFirebasePushToken(normalizedToken);

  const persistedUser = getPersistedFirebasePushUser();

  if (persistedUser?.userId) {
    await syncFirebaseTokenWithProfile(persistedUser.userId, normalizedToken);
  }

  return normalizedToken;
};

export const ensureFirebaseMessagingInitialized = async () =>
  Boolean(await getMessagingInstance());

export const syncFirebasePushUser = async (
  userId: string | null | undefined,
  userType: string | null | undefined,
) => {
  if (!userId) {
    const persistedUser = getPersistedFirebasePushUser();
    const messaging = await getMessagingInstance();

    if (messaging) {
      try {
        await deleteToken(messaging);
      } catch {
        // Ignore token cleanup failures during logout.
      }
    }

    if (persistedUser?.userId) {
      await syncFirebaseTokenWithProfile(persistedUser.userId, null).catch(() => undefined);
    }

    persistFirebasePushToken(null);
    persistFirebasePushUser(null, null);
    return true;
  }

  persistFirebasePushUser(userId, userType || "motoboy");

  if (typeof window !== "undefined" && Notification.permission === "granted") {
    await refreshFirebasePushToken();
  }

  return true;
};

export const promptFirebasePushPermissionOnce = async (
  userType: string | null | undefined,
) => {
  if (typeof window === "undefined" || !userType) {
    return false;
  }

  const messaging = await getMessagingInstance();

  if (!messaging) {
    return false;
  }

  if (Notification.permission === "granted") {
    return Boolean(await refreshFirebasePushToken());
  }

  const hasPromptedBefore =
    localStorage.getItem(FIREBASE_PUSH_PROMPT_STORAGE_KEY) === "true";

  if (hasPromptedBefore || Notification.permission === "denied") {
    return false;
  }

  localStorage.setItem(FIREBASE_PUSH_PROMPT_STORAGE_KEY, "true");

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return false;
  }

  return Boolean(await refreshFirebasePushToken());
};
