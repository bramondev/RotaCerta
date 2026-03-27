import OneSignal from "react-onesignal";

const FALLBACK_ONE_SIGNAL_APP_ID = "977604f7-a451-4b2a-8a3c-588c9f7ca553";
const PUSH_PROMPT_STORAGE_KEY = "onesignal_push_prompted_v1";

export const ONE_SIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID?.trim() || FALLBACK_ONE_SIGNAL_APP_ID;

let initPromise: Promise<void> | null = null;

export const ensureOneSignalInitialized = async () => {
  if (typeof window === "undefined" || !ONE_SIGNAL_APP_ID) {
    return false;
  }

  if (!initPromise) {
    initPromise = OneSignal.init({
      appId: ONE_SIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: "/push/onesignal/OneSignalSDKWorker.js",
      serviceWorkerUpdaterPath: "/push/onesignal/OneSignalSDKUpdaterWorker.js",
      serviceWorkerParam: {
        scope: "/push/onesignal/",
      },
    }).catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
  return true;
};

export const syncOneSignalUser = async (
  userId: string | null | undefined,
  userType: string | null | undefined,
) => {
  const isInitialized = await ensureOneSignalInitialized();

  if (!isInitialized) {
    return;
  }

  if (!userId) {
    await OneSignal.logout().catch(() => undefined);
    return;
  }

  await OneSignal.login(userId);
  OneSignal.User.addTags({
    app: "rota_certa",
    supabase_user_id: userId,
    user_role: userType || "motoboy",
  });
};

export const promptPushForMotoboyOnce = async (userType: string | null | undefined) => {
  const isInitialized = await ensureOneSignalInitialized();

  if (!isInitialized || userType !== "motoboy") {
    return false;
  }

  if (!OneSignal.Notifications.isPushSupported()) {
    return false;
  }

  if (OneSignal.User.PushSubscription.optedIn) {
    return true;
  }

  const hasPromptedBefore = localStorage.getItem(PUSH_PROMPT_STORAGE_KEY) === "true";

  if (hasPromptedBefore || OneSignal.Notifications.permissionNative !== "default") {
    return OneSignal.User.PushSubscription.optedIn ?? false;
  }

  localStorage.setItem(PUSH_PROMPT_STORAGE_KEY, "true");
  await OneSignal.Slidedown.promptPush();
  return OneSignal.User.PushSubscription.optedIn ?? false;
};
