import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  AtSign,
  Bike,
  Camera,
  FileText,
  Loader2,
  LogOut,
  Phone,
  Save,
  Store,
  User,
} from "lucide-react";

import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PROFILE_IMAGE_BUCKET = "rotacerta_images";
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const PROFILE_PHOTO_INPUT_ID = "profile-photo-upload";

const getReturnPath = (userType?: string | null) => {
  if (userType === "motopecas") {
    return "/admin-loja";
  }

  if (userType === "frete") {
    return "/admin-fretes";
  }

  return "/home";
};

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    avatarUrl: "",
    document: "",
    fullName: "",
    phone: "",
    username: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile-settings"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

      return { ...data, user };
    },
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFormData({
      avatarUrl: profile.avatar_url || "",
      document: profile.document || "",
      fullName: profile.full_name || "",
      phone: profile.phone || "",
      username: profile.username || "",
    });
  }, [profile]);

  const userType =
    typeof profile?.user_type === "string"
      ? profile.user_type
      : typeof profile?.user?.user_metadata?.user_type === "string"
        ? profile.user.user_metadata.user_type
        : null;

  const isMotoboy = userType === "motoboy";
  const isStoreAccount = userType === "motopecas" || userType === "frete";
  const pageTitle = isStoreAccount ? "Perfil da Loja" : "Meu Perfil";
  const returnPath = getReturnPath(userType);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Formato invalido",
          description: "Escolha uma imagem JPG, PNG ou WEBP.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > MAX_PROFILE_IMAGE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no maximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      if (!profile?.user?.id) {
        throw new Error("Usuario nao logado.");
      }

      setIsUploading(true);

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `profiles/${profile.user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_IMAGE_BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.user.id);

      if (updateError) {
        throw updateError;
      }

      setFormData((previous) => ({ ...previous, avatarUrl: publicUrl }));

      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-settings"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-shop"] });
      queryClient.invalidateQueries({ queryKey: ["store_offers"] });
      queryClient.invalidateQueries({ queryKey: ["store-details", profile.user.id] });

      toast({
        title: "Foto atualizada",
        description: isStoreAccount
          ? "A nova foto da loja ja esta salva."
          : "Sua foto de perfil foi atualizada.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (newData: typeof formData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nao autenticado.");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: newData.avatarUrl,
          document: newData.document,
          full_name: newData.fullName,
          phone: newData.phone,
          username: isMotoboy ? newData.username : null,
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      if (isStoreAccount) {
        const { error: offersError } = await supabase
          .from("store_offers")
          .update({ whatsapp: newData.phone })
          .eq("user_id", user.id);

        if (offersError) {
          throw offersError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile-settings"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-shop"] });
      queryClient.invalidateQueries({ queryKey: ["store_offers"] });
      queryClient.invalidateQueries({ queryKey: ["store-details", profile?.user?.id] });

      toast({
        title: "Perfil atualizado",
        description: isStoreAccount
          ? "Os dados da loja e o WhatsApp das ofertas foram atualizados."
          : "Seus dados foram salvos com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/login");
    toast({
      title: "Desconectado",
      description: "Voce saiu da sua conta com seguranca.",
    });
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 font-sans text-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-yellow-500/20 bg-zinc-950 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(returnPath)}
          className="gap-2 text-zinc-300 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          {isStoreAccount ? (
            <Store className="h-5 w-5 text-yellow-500" />
          ) : (
            <User className="h-5 w-5 text-yellow-500" />
          )}
          {pageTitle}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2 text-red-500 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>

      <main className="mx-auto mt-4 max-w-md space-y-6 p-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <label htmlFor={PROFILE_PHOTO_INPUT_ID} className="group relative cursor-pointer">
            <input
              id={PROFILE_PHOTO_INPUT_ID}
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-yellow-500 bg-zinc-900 shadow-lg shadow-yellow-500/20 transition-colors group-hover:border-white">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              ) : formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={isStoreAccount ? "Foto da loja" : "Avatar"}
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-70"
                />
              ) : isStoreAccount ? (
                <Store className="h-12 w-12 text-zinc-600 transition-colors group-hover:text-white" />
              ) : (
                <User className="h-12 w-12 text-zinc-600 transition-colors group-hover:text-white" />
              )}
            </div>

            <div className="absolute bottom-0 right-0 rounded-full border-2 border-black bg-yellow-500 p-2 text-black shadow-lg transition-all group-hover:scale-110 group-hover:bg-white">
              <Camera className="h-4 w-4" />
            </div>
          </label>

          <div className="text-center">
            <h2 className="text-xl font-black">{formData.fullName || "Sem Nome"}</h2>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold uppercase text-zinc-500">
              {isStoreAccount ? (
                <Store className="h-3 w-3" />
              ) : (
                <Bike className="h-3 w-3" />
              )}
              {profile?.email}
            </p>
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-zinc-400">
                  {isStoreAccount ? "Nome da Empresa" : "Nome Completo"}
                </Label>
                <div className="relative">
                  {isStoreAccount ? (
                    <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  ) : (
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  )}
                  <Input
                    className="border-zinc-800 bg-black pl-10 text-white"
                    value={formData.fullName}
                    onChange={(event) =>
                      setFormData({ ...formData, fullName: event.target.value })
                    }
                  />
                </div>
              </div>

              {isMotoboy && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-zinc-400">
                    Nome de Usuario (Comunidade)
                  </Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-500" />
                    <Input
                      placeholder="Ex: joao_motoca"
                      className="border-zinc-800 bg-black pl-10 text-white"
                      value={formData.username}
                      onChange={(event) =>
                        setFormData({ ...formData, username: event.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-zinc-400">
                  {isStoreAccount ? "CNPJ" : "CPF"}
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder={isStoreAccount ? "00.000.000/0001-00" : "000.000.000-00"}
                    className="border-zinc-800 bg-black pl-10 text-white"
                    value={formData.document}
                    onChange={(event) =>
                      setFormData({ ...formData, document: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-zinc-400">
                  Telefone / WhatsApp
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  <Input
                    placeholder="(11) 99999-9999"
                    className="border-zinc-800 bg-black pl-10 text-white"
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData({ ...formData, phone: event.target.value })
                    }
                  />
                </div>
                {isStoreAccount && (
                  <p className="text-xs text-zinc-500">
                    Esse e o numero que o motoboy abre ao tocar no produto na area Lojas.
                  </p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || isUploading}
                  className="h-12 w-full bg-yellow-500 font-black uppercase tracking-widest text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-400"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" /> Salvar Alteracoes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {isMotoboy ? <NavBar /> : null}
    </div>
  );
};

export default Profile;
