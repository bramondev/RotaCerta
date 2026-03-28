import { supabase } from "@/integrations/supabase/client";

export const invokeSupabaseFunction = async (
  functionName: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  return supabase.functions.invoke(functionName, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  });
};
