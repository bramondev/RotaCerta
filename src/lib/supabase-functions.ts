import { supabase } from "@/integrations/supabase/client";

export const invokeSupabaseFunction = async (
  functionName: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) => {
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();

  let accessToken = currentSession?.access_token;

  if (!accessToken) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError) {
      throw refreshError;
    }

    accessToken = refreshedSession?.access_token;
  }

  if (!accessToken) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  return supabase.functions.invoke(functionName, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });
};
