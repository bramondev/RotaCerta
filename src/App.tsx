import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Login from "@/components/Login";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import PasswordAdvice from "@/components/PasswordAdvice";
import Register from "@/components/Register";
import TabOnboardingDialog from "@/components/TabOnboardingDialog";
import Welcome from "@/components/Welcome";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureOneSignalInitialized,
  promptPushPermissionOnce,
  syncOneSignalUser,
} from "@/lib/onesignal";
import {
  isAndroidNativePushAvailable,
  promptAndroidNativePushPermissionOnce,
  syncAndroidNativePushUser,
} from "@/lib/native-push";
import AddFuel from "@/pages/AddFuel";
import AdminFretes from "@/pages/AdminFretes";
import AdminLoja from "@/pages/AdminLoja";
import Community from "@/pages/Community";
import DeliveryPanel from "@/pages/DeliveryPanel";
import EditFuel from "@/pages/EditFuel";
import Goals from "@/pages/Goals";
import Home from "@/pages/Home";
import Maintenance from "@/pages/Maintenance";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Statistics from "@/pages/Statistics";
import StoreProfile from "@/pages/StoreProfile";
import Vehicles from "@/pages/Vehicles";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
};

const getCookie = (name: string) => {
  const namePrefix = `${name}=`;

  for (const cookie of document.cookie.split(";")) {
    const normalizedCookie = cookie.trim();
    if (normalizedCookie.startsWith(namePrefix)) {
      return normalizedCookie.slice(namePrefix.length);
    }
  }

  return null;
};

const SessionGate = ({
  children,
  fallbackPath,
  allowAuthenticated,
}: {
  children: ReactNode;
  fallbackPath: string;
  allowAuthenticated: boolean;
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setIsAuthenticated(Boolean(session));
      }
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (allowAuthenticated ? !isAuthenticated : isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: ReactNode }) => (
  <SessionGate allowAuthenticated={false} fallbackPath="/home">
    {children}
  </SessionGate>
);

const PrivateRoute = ({ children }: { children: ReactNode }) => (
  <SessionGate allowAuthenticated={true} fallbackPath="/">
    {children}
  </SessionGate>
);

const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      const now = Date.now().toString();
      localStorage.setItem("lastRoute", location.pathname);
      localStorage.setItem("lastNavigationTime", now);
      setCookie("lastRoute", location.pathname, 30);
      setCookie("lastNavigationTime", now, 30);
    } catch (error) {
      console.error("Error storing route information:", error);
    }
  }, [location.pathname]);

  return null;
};

const InitialRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/") {
      return;
    }

    try {
      const lastRoute = localStorage.getItem("lastRoute") ?? getCookie("lastRoute");

      if (
        lastRoute &&
        !["/", "/login", "/register"].includes(lastRoute)
      ) {
        navigate(lastRoute, { replace: true });
      }
    } catch (error) {
      console.error("Error accessing storage:", error);
    }
  }, [location.pathname, navigate]);

  return null;
};

const AppRoutes = () => (
  <>
    <Toaster />
    <RouteTracker />
    <InitialRedirect />
    <TabOnboardingDialog />
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <Welcome />
          </PublicRoute>
        }
      />
      <Route
        path="/password-advice"
        element={
          <PublicRoute>
            <PasswordAdvice />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route path="/loja/:id" element={<StoreProfile />} />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin-loja"
        element={
          <PrivateRoute>
            <AdminLoja />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin-fretes"
        element={
          <PrivateRoute>
            <AdminFretes />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/delivery-panel"
        element={
          <PrivateRoute>
            <DeliveryPanel />
          </PrivateRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <PrivateRoute>
            <Goals />
          </PrivateRoute>
        }
      />
      <Route
        path="/community"
        element={
          <PrivateRoute>
            <Community />
          </PrivateRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <PrivateRoute>
            <Vehicles />
          </PrivateRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <PrivateRoute>
            <Maintenance />
          </PrivateRoute>
        }
      />
      <Route
        path="/statistics"
        element={
          <PrivateRoute>
            <Statistics />
          </PrivateRoute>
        }
      />
      <Route
        path="/fuel/add"
        element={
          <PrivateRoute>
            <AddFuel />
          </PrivateRoute>
        }
      />
      <Route
        path="/fuel/edit/:id"
        element={
          <PrivateRoute>
            <EditFuel />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

function App() {
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAndroidNativePushAvailable() && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch((error) => {
        console.error("Falha ao registrar o service worker:", error);
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        previousUserIdRef.current = session?.user?.id ?? null;
      }
    };

    hydrateCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;

      if (previousUserIdRef.current !== nextUserId) {
        queryClient.clear();
        previousUserIdRef.current = nextUserId;
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveUserType = async (
      userId: string,
      metadataUserType: unknown,
    ) => {
      if (typeof metadataUserType === "string" && metadataUserType.length > 0) {
        return metadataUserType;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return typeof data?.user_type === "string" ? data.user_type : null;
    };

    const syncPushIdentity = async (
      userId: string | null | undefined,
      metadataUserType?: unknown,
    ) => {
      try {
        if (!userId) {
          if (isAndroidNativePushAvailable()) {
            await syncAndroidNativePushUser(null, null);
            return;
          }

          await ensureOneSignalInitialized();
          await syncOneSignalUser(null, null);
          return;
        }

        const userType = (await resolveUserType(userId, metadataUserType)) ?? "motoboy";

        if (!isMounted) {
          return;
        }

        if (isAndroidNativePushAvailable()) {
          await syncAndroidNativePushUser(userId, userType);
          await promptAndroidNativePushPermissionOnce(userType);
          return;
        }

        await ensureOneSignalInitialized();
        await syncOneSignalUser(userId, userType);
        await promptPushPermissionOnce(userType);
      } catch (error) {
        console.warn("Nao foi possivel sincronizar o OneSignal:", error);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) =>
        syncPushIdentity(session?.user?.id, session?.user?.user_metadata?.user_type),
      )
      .catch((error) => {
        console.warn("Nao foi possivel carregar a sessao para o OneSignal:", error);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncPushIdentity(session?.user?.id, session?.user?.user_metadata?.user_type);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </NotificationsProvider>
    </QueryClientProvider>
  );
}

export default App;
