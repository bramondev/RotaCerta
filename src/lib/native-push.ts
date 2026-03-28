const ANDROID_PUSH_PROMPT_STORAGE_KEY = "android_native_push_prompted_v1";

type AndroidPushBridge = {
  logoutUser: () => void;
  requestPermission: () => void;
  syncUser: (userId: string, userType: string) => void;
};

declare global {
  interface Window {
    AndroidPushBridge?: AndroidPushBridge;
  }
}

const getAndroidPushBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AndroidPushBridge ?? null;
};

export const isAndroidNativePushAvailable = () => Boolean(getAndroidPushBridge());

export const syncAndroidNativePushUser = async (
  userId: string | null | undefined,
  userType: string | null | undefined,
) => {
  const bridge = getAndroidPushBridge();

  if (!bridge) {
    return false;
  }

  if (!userId) {
    bridge.logoutUser();
    return true;
  }

  bridge.syncUser(userId, userType || "motoboy");
  return true;
};

export const promptAndroidNativePushPermissionOnce = async (
  userType: string | null | undefined,
) => {
  const bridge = getAndroidPushBridge();

  if (!bridge || !userType) {
    return false;
  }

  const hasPromptedBefore =
    localStorage.getItem(ANDROID_PUSH_PROMPT_STORAGE_KEY) === "true";

  if (hasPromptedBefore) {
    return true;
  }

  localStorage.setItem(ANDROID_PUSH_PROMPT_STORAGE_KEY, "true");
  bridge.requestPermission();
  return true;
};
