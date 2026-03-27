import { supabase } from "@/integrations/supabase/client";

const DEFAULT_STORE_AVATAR =
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=300";

export function sanitizePhone(phone?: string | null) {
  return (phone || "").replace(/\D/g, "");
}

export function buildStoreWhatsappUrl(phone?: string | null, message?: string) {
  const cleanPhone = sanitizePhone(phone);
  if (!cleanPhone) return null;

  const encodedMessage = encodeURIComponent(message || "Olá! Vim pelo app Rota Certa.");
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function getStoreName(offer: any) {
  return offer?.profiles?.full_name || offer?.shop || "Loja Parceira";
}

export function getStoreAvatar(offer: any) {
  return offer?.profiles?.avatar_url || offer?.image || DEFAULT_STORE_AVATAR;
}

export function getStorePhone(offer: any) {
  return offer?.profiles?.phone || offer?.whatsapp || "";
}

export function getDefaultStoreAvatar() {
  return DEFAULT_STORE_AVATAR;
}

export async function fetchOffersWithStoreProfiles() {
  const { data: offers, error: offersError } = await supabase
    .from("store_offers")
    .select("*")
    .order("created_at", { ascending: false });

  if (offersError) throw offersError;

  const userIds = Array.from(
    new Set((offers || []).map((offer: any) => offer.user_id).filter(Boolean))
  );

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profilesById = new Map(
    (profiles || []).map((profile: any) => [profile.id, profile])
  );

  return (offers || []).map((offer: any) => ({
    ...offer,
    profiles: profilesById.get(offer.user_id) || null,
  }));
}
